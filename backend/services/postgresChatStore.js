"use strict";

const { query, withTransaction, isPostgresConfigured, getPool } = require("../db/pool");
const {
  asArray,
  threadToRow,
  messageToRow,
  rowToThread,
} = require("../db/chatHelpers");

let chatReadyCache = null;
let chatReadyCheckedAt = 0;
const READY_TTL_MS = 15_000;

async function isChatPostgresReady() {
  if (!isPostgresConfigured()) {
    return false;
  }

  const now = Date.now();
  if (chatReadyCache != null && now - chatReadyCheckedAt < READY_TTL_MS) {
    return chatReadyCache;
  }

  try {
    await getPool();
    const result = await query(`
      SELECT
        to_regclass('public.chat_threads') AS chat_threads,
        to_regclass('public.chat_messages') AS chat_messages
    `);
    const row = result.rows[0] || {};
    chatReadyCache = Boolean(row.chat_threads && row.chat_messages);
  } catch (_) {
    chatReadyCache = false;
  }
  chatReadyCheckedAt = now;
  return chatReadyCache;
}

function invalidateChatReadyCache() {
  chatReadyCache = null;
  chatReadyCheckedAt = 0;
}

function buildThreadScopeFilters({ adminId = "", customerId = "" } = {}) {
  const filters = [];
  const params = [];
  if (adminId) {
    params.push(adminId);
    filters.push(`admin_id = $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    filters.push(`customer_id = $${params.length}`);
  }
  return {
    whereSql: filters.length ? `WHERE ${filters.join(" AND ")}` : "",
    params,
  };
}

async function upsertChatThreadRow(client, threadRow) {
  await client.query(
    `
    INSERT INTO chat_threads (
      id, admin_id, customer_id, product_id,
      customer_label, product_name, company_name,
      employee_rating, employee_rating_comment, employee_rating_updated_at,
      last_read_at, support_read_at, typing, extra_data,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10,
      $11, $12, $13::jsonb, $14::jsonb,
      $15, $16
    )
    ON CONFLICT (id) DO UPDATE SET
      admin_id = EXCLUDED.admin_id,
      customer_id = EXCLUDED.customer_id,
      product_id = EXCLUDED.product_id,
      customer_label = EXCLUDED.customer_label,
      product_name = EXCLUDED.product_name,
      company_name = EXCLUDED.company_name,
      employee_rating = EXCLUDED.employee_rating,
      employee_rating_comment = EXCLUDED.employee_rating_comment,
      employee_rating_updated_at = EXCLUDED.employee_rating_updated_at,
      last_read_at = EXCLUDED.last_read_at,
      support_read_at = EXCLUDED.support_read_at,
      typing = EXCLUDED.typing,
      extra_data = EXCLUDED.extra_data,
      updated_at = EXCLUDED.updated_at
    `,
    [
      threadRow.id,
      threadRow.admin_id,
      threadRow.customer_id,
      threadRow.product_id,
      threadRow.customer_label,
      threadRow.product_name,
      threadRow.company_name,
      threadRow.employee_rating,
      threadRow.employee_rating_comment,
      threadRow.employee_rating_updated_at,
      threadRow.last_read_at,
      threadRow.support_read_at,
      JSON.stringify(threadRow.typing || {}),
      JSON.stringify(threadRow.extra_data || {}),
      threadRow.created_at || new Date(),
      threadRow.updated_at || new Date(),
    ],
  );
}

async function upsertChatMessageRow(client, messageRow) {
  await client.query(
    `
    INSERT INTO chat_messages (
      id, thread_id, admin_id, customer_id,
      text, image_url, image_name, content_type,
      is_from_support, source,
      sender_name, sender_role, sender_id, sender_avatar_url,
      reply_to, edited_at, deleted_at, sent_at,
      extra_data, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10,
      $11, $12, $13, $14,
      $15::jsonb, $16, $17, $18,
      $19::jsonb, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      thread_id = EXCLUDED.thread_id,
      admin_id = EXCLUDED.admin_id,
      customer_id = EXCLUDED.customer_id,
      text = EXCLUDED.text,
      image_url = EXCLUDED.image_url,
      image_name = EXCLUDED.image_name,
      content_type = EXCLUDED.content_type,
      is_from_support = EXCLUDED.is_from_support,
      source = EXCLUDED.source,
      sender_name = EXCLUDED.sender_name,
      sender_role = EXCLUDED.sender_role,
      sender_id = EXCLUDED.sender_id,
      sender_avatar_url = EXCLUDED.sender_avatar_url,
      reply_to = EXCLUDED.reply_to,
      edited_at = EXCLUDED.edited_at,
      deleted_at = EXCLUDED.deleted_at,
      sent_at = EXCLUDED.sent_at,
      extra_data = EXCLUDED.extra_data,
      updated_at = NOW()
    `,
    [
      messageRow.id,
      messageRow.thread_id,
      messageRow.admin_id,
      messageRow.customer_id,
      messageRow.text,
      messageRow.image_url,
      messageRow.image_name,
      messageRow.content_type,
      messageRow.is_from_support,
      messageRow.source,
      messageRow.sender_name,
      messageRow.sender_role,
      messageRow.sender_id,
      messageRow.sender_avatar_url,
      messageRow.reply_to == null ? null : JSON.stringify(messageRow.reply_to),
      messageRow.edited_at,
      messageRow.deleted_at,
      messageRow.sent_at,
      JSON.stringify(messageRow.extra_data || {}),
    ],
  );
}

async function listChatThreadsFromPostgres(options = {}) {
  const { whereSql, params } = buildThreadScopeFilters(options);
  const [threadResult, messageResult] = await Promise.all([
    query(
      `
      SELECT *
      FROM chat_threads
      ${whereSql}
      ORDER BY updated_at DESC, id
      `,
      params,
    ),
    query(
      `
      SELECT *
      FROM chat_messages
      ${whereSql}
      ORDER BY sent_at ASC, id
      `,
      params,
    ),
  ]);

  const messagesByThread = new Map();
  for (const row of messageResult.rows) {
    const threadId = String(row.thread_id ?? "").trim();
    if (!threadId) {
      continue;
    }
    if (!messagesByThread.has(threadId)) {
      messagesByThread.set(threadId, []);
    }
    messagesByThread.get(threadId).push(row);
  }

  return threadResult.rows.map((threadRow) =>
    rowToThread(threadRow, messagesByThread.get(threadRow.id) || []),
  );
}

async function getChatThreadFromPostgres(threadId, options = {}) {
  const id = String(threadId ?? "").trim();
  if (!id) {
    return null;
  }
  const adminId = String(options.adminId ?? "").trim();
  const params = [id];
  let whereSql = "WHERE id = $1";
  if (adminId) {
    params.push(adminId);
    whereSql += ` AND admin_id = $${params.length}`;
  }

  const threadResult = await query(
    `SELECT * FROM chat_threads ${whereSql}`,
    params,
  );
  const threadRow = threadResult.rows[0];
  if (!threadRow) {
    return null;
  }

  const messageResult = await query(
    `
    SELECT *
    FROM chat_messages
    WHERE thread_id = $1
    ORDER BY sent_at ASC, id
    `,
    [id],
  );
  return rowToThread(threadRow, messageResult.rows);
}

async function syncChatThreadsToPostgres(threads, options = {}) {
  const deleteMissing = options.deleteMissing !== false;
  const scopeAdminId = String(options.adminId ?? "").trim();
  const scopeCustomerId = String(options.customerId ?? "").trim();

  const scopedSource = asArray(threads).filter((entry) => {
    if (scopeAdminId && String(entry?.adminId ?? "").trim() !== scopeAdminId) {
      return false;
    }
    if (
      scopeCustomerId
      && String(entry?.customerId ?? entry?.userId ?? "").trim() !== scopeCustomerId
    ) {
      return false;
    }
    return true;
  });

  const threadRows = [];
  for (const thread of scopedSource) {
    const row = threadToRow(thread);
    if (!row?.id) {
      continue;
    }
    threadRows.push(row);
  }
  const incomingThreadIds = threadRows.map((row) => row.id);

  await withTransaction(async (client) => {
    for (const threadRow of threadRows) {
      await upsertChatThreadRow(client, threadRow);

      const messageIds = [];
      for (const message of asArray(threadRow.messages)) {
        const messageRow = messageToRow(message, {
          threadId: threadRow.id,
          adminId: threadRow.admin_id,
          customerId: threadRow.customer_id,
        });
        if (!messageRow?.id) {
          continue;
        }
        messageIds.push(messageRow.id);
        await upsertChatMessageRow(client, messageRow);
      }

      if (messageIds.length) {
        await client.query(
          `
          DELETE FROM chat_messages
          WHERE thread_id = $1
            AND id <> ALL($2::text[])
          `,
          [threadRow.id, messageIds],
        );
      } else {
        await client.query(
          `DELETE FROM chat_messages WHERE thread_id = $1`,
          [threadRow.id],
        );
      }
    }

    if (!deleteMissing) {
      return;
    }

    const scopeFilters = [];
    const scopeParams = [];
    if (scopeAdminId) {
      scopeParams.push(scopeAdminId);
      scopeFilters.push(`admin_id = $${scopeParams.length}`);
    }
    if (scopeCustomerId) {
      scopeParams.push(scopeCustomerId);
      scopeFilters.push(`customer_id = $${scopeParams.length}`);
    }
    const scopeSql = scopeFilters.length
      ? ` AND ${scopeFilters.join(" AND ")}`
      : "";

    if (incomingThreadIds.length) {
      await client.query(
        `DELETE FROM chat_threads WHERE id <> ALL($1::text[])${scopeSql.replace(
          /\$(\d+)/g,
          (_, n) => `$${Number(n) + 1}`,
        )}`,
        [incomingThreadIds, ...scopeParams],
      );
    } else if (scopeAdminId || scopeCustomerId) {
      await client.query(
        `DELETE FROM chat_threads${scopeSql.replace(" AND ", " WHERE ")}`,
        scopeParams,
      );
    } else {
      await client.query(`DELETE FROM chat_threads`);
    }
  });
}

async function deleteChatThreadFromPostgres(threadId, options = {}) {
  const id = String(threadId ?? "").trim();
  if (!id) {
    return false;
  }
  const adminId = String(options.adminId ?? "").trim();
  const params = [id];
  let whereSql = "WHERE id = $1";
  if (adminId) {
    params.push(adminId);
    whereSql += ` AND admin_id = $${params.length}`;
  }
  const result = await query(`DELETE FROM chat_threads ${whereSql}`, params);
  return (result.rowCount || 0) > 0;
}

module.exports = {
  isChatPostgresReady,
  invalidateChatReadyCache,
  listChatThreadsFromPostgres,
  getChatThreadFromPostgres,
  syncChatThreadsToPostgres,
  deleteChatThreadFromPostgres,
};

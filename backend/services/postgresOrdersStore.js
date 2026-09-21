"use strict";

const { query, withTransaction } = require("../db/pool");
const {
  asArray,
  assignOrderGroupIds,
  groupOrderEntries,
  orderGroupToRow,
  orderItemToRow,
  rowToOrderEntry,
  movementsFromOrderEntry,
} = require("../db/catalogHelpers");
const { upsertInventoryMovements } = require("./postgresProductsStore");

function buildOrderScopeFilters({ adminId = "", accountId = "" } = {}) {
  const filters = [];
  const params = [];
  if (adminId) {
    params.push(adminId);
    filters.push(`admin_id = $${params.length}`);
  }
  if (accountId) {
    params.push(accountId);
    filters.push(`account_id = $${params.length}`);
  }
  return {
    whereSql: filters.length ? `WHERE ${filters.join(" AND ")}` : "",
    params,
  };
}

function paymentTrackingUpdateSql(table) {
  return `
          payment_provider = CASE WHEN EXCLUDED.payment_provider <> '' THEN EXCLUDED.payment_provider ELSE ${table}.payment_provider END,
          payment_intent_id = CASE WHEN EXCLUDED.payment_intent_id <> '' THEN EXCLUDED.payment_intent_id ELSE ${table}.payment_intent_id END,
          payment_checkout_session_id = CASE WHEN EXCLUDED.payment_checkout_session_id <> '' THEN EXCLUDED.payment_checkout_session_id ELSE ${table}.payment_checkout_session_id END,
          payment_idempotency_key = COALESCE(NULLIF(${table}.payment_idempotency_key, ''), EXCLUDED.payment_idempotency_key),
          payment_client_key = CASE WHEN EXCLUDED.payment_client_key <> '' THEN EXCLUDED.payment_client_key ELSE ${table}.payment_client_key END,
          payment_reference = CASE WHEN EXCLUDED.payment_reference <> '' THEN EXCLUDED.payment_reference ELSE ${table}.payment_reference END,
          payment_status = CASE WHEN EXCLUDED.payment_status <> '' THEN EXCLUDED.payment_status ELSE ${table}.payment_status END,
          tracking_number = CASE WHEN EXCLUDED.tracking_number <> '' THEN EXCLUDED.tracking_number ELSE ${table}.tracking_number END`;
}

async function listOrdersFromPostgres(options = {}) {
  const { whereSql, params } = buildOrderScopeFilters(options);
  const [groupResult, itemResult] = await Promise.all([
    query(`SELECT * FROM orders ${whereSql}`, params),
    query(
      `
      SELECT *
      FROM order_items
      ${whereSql}
      ORDER BY created_at_epoch_ms DESC, id
      `,
      params,
    ),
  ]);

  const groupsById = new Map(
    groupResult.rows.map((row) => [row.id, row]),
  );

  return itemResult.rows.map((itemRow) =>
    rowToOrderEntry(itemRow, groupsById.get(itemRow.order_group_id)),
  );
}

async function listOrdersPageFromPostgres({
  adminId = "",
  accountId = "",
  limit = 50,
  offset = 0,
} = {}) {
  const { whereSql, params } = buildOrderScopeFilters({ adminId, accountId });
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM order_items ${whereSql}`,
    params,
  );
  const total = countResult.rows[0]?.total || 0;

  params.push(Math.max(1, Number(limit) || 50));
  params.push(Math.max(0, Number(offset) || 0));
  const itemResult = await query(
    `
    SELECT *
    FROM order_items
    ${whereSql}
    ORDER BY created_at_epoch_ms DESC, id
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params,
  );

  const groupIds = [...new Set(itemResult.rows.map((row) => row.order_group_id).filter(Boolean))];
  const groupResult = groupIds.length
    ? await query(`SELECT * FROM orders WHERE id = ANY($1::text[])`, [groupIds])
    : { rows: [] };
  const groupsById = new Map(groupResult.rows.map((row) => [row.id, row]));
  const items = itemResult.rows.map((itemRow) =>
    rowToOrderEntry(itemRow, groupsById.get(itemRow.order_group_id)),
  );

  return {
    items,
    total,
    limit: Math.max(1, Number(limit) || 50),
    offset: Math.max(0, Number(offset) || 0),
    hasMore: Math.max(0, Number(offset) || 0) + items.length < total,
  };
}

async function syncOrdersToPostgres(orders, options = {}) {
  const deleteMissing = options.deleteMissing !== false;
  const scopeAdminId = String(options.adminId ?? "").trim();
  const scopeAccountId = String(options.accountId ?? "").trim();
  const scopedSource = asArray(orders).filter((entry) => {
    if (scopeAdminId && String(entry?.adminId ?? "").trim() !== scopeAdminId) {
      return false;
    }
    if (scopeAccountId && String(entry?.accountId ?? "").trim() !== scopeAccountId) {
      return false;
    }
    return true;
  });
  const incomingIds = scopedSource
    .map((entry) => String(entry?.id ?? "").trim())
    .filter(Boolean);
  let existingEntries = asArray(options.existingEntries);
  if (!existingEntries.length && incomingIds.length) {
    const existingResult = await query(
      `SELECT id, order_group_id AS "orderGroupId", admin_id AS "adminId",
              account_id AS "accountId", created_at_epoch_ms AS "createdAtEpochMs"
       FROM order_items
       WHERE id = ANY($1::text[])`,
      [incomingIds],
    );
    existingEntries = existingResult.rows;
  }
  const incoming = assignOrderGroupIds(scopedSource, {
    mode: options.mode === "stable" ? "stable" : "random",
    existingEntries,
  });
  const groups = groupOrderEntries(incoming);
  const incomingGroupIds = groups.map((group) => group.orderGroupId).filter(Boolean);
  const incomingItemIds = incoming
    .map((entry) => String(entry?.id ?? "").trim())
    .filter(Boolean);

  await withTransaction(async (client) => {
    for (const group of groups) {
      const groupRow = orderGroupToRow(group);
      await client.query(
        `
        INSERT INTO orders (
          id, order_group_id, admin_id, account_id, created_at_epoch_ms,
          stage, paid_at, packed_at, shipped_at, received_at, cancelled_at,
          return_requested_at, waybill_printed_at,
          payment_provider, payment_intent_id, payment_checkout_session_id,
          payment_idempotency_key, payment_client_key, payment_reference,
          payment_status, tracking_number,
          extra_data, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21,
          $22::jsonb, $23, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          order_group_id = EXCLUDED.order_group_id,
          admin_id = EXCLUDED.admin_id,
          account_id = EXCLUDED.account_id,
          created_at_epoch_ms = EXCLUDED.created_at_epoch_ms,
          stage = EXCLUDED.stage,
          paid_at = COALESCE(orders.paid_at, EXCLUDED.paid_at),
          packed_at = COALESCE(orders.packed_at, EXCLUDED.packed_at),
          shipped_at = COALESCE(orders.shipped_at, EXCLUDED.shipped_at),
          received_at = COALESCE(orders.received_at, EXCLUDED.received_at),
          cancelled_at = COALESCE(orders.cancelled_at, EXCLUDED.cancelled_at),
          return_requested_at = COALESCE(orders.return_requested_at, EXCLUDED.return_requested_at),
          waybill_printed_at = COALESCE(orders.waybill_printed_at, EXCLUDED.waybill_printed_at),
          ${paymentTrackingUpdateSql("orders")},
          extra_data = EXCLUDED.extra_data,
          updated_at = NOW()
        `,
        [
          groupRow.id,
          groupRow.order_group_id,
          groupRow.admin_id,
          groupRow.account_id,
          groupRow.created_at_epoch_ms,
          groupRow.stage,
          groupRow.paid_at,
          groupRow.packed_at,
          groupRow.shipped_at,
          groupRow.received_at,
          groupRow.cancelled_at,
          groupRow.return_requested_at,
          groupRow.waybill_printed_at,
          groupRow.payment_provider,
          groupRow.payment_intent_id,
          groupRow.payment_checkout_session_id,
          groupRow.payment_idempotency_key,
          groupRow.payment_client_key,
          groupRow.payment_reference,
          groupRow.payment_status,
          groupRow.tracking_number,
          JSON.stringify(groupRow.extra_data || {}),
          groupRow.created_at,
        ],
      );

      const itemIds = [];
      for (const entry of group.items) {
        const itemRow = orderItemToRow(entry, group.orderGroupId, itemIds.length);
        if (!itemRow.id) {
          continue;
        }
        itemIds.push(itemRow.id);
        await client.query(
          `
          INSERT INTO order_items (
            id, order_group_id, admin_id, account_id, product_id, variant_id,
            quantity, unit_price, stage, created_at_epoch_ms,
            paid_at, packed_at, shipped_at, received_at, cancelled_at,
            return_requested_at, waybill_printed_at,
            payment_provider, payment_intent_id, payment_checkout_session_id,
            payment_idempotency_key, payment_client_key, payment_reference,
            payment_status, tracking_number,
            extra_data, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17,
            $18, $19, $20,
            $21, $22, $23,
            $24, $25,
            $26::jsonb, $27, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            order_group_id = EXCLUDED.order_group_id,
            admin_id = EXCLUDED.admin_id,
            account_id = EXCLUDED.account_id,
            product_id = EXCLUDED.product_id,
            variant_id = EXCLUDED.variant_id,
            quantity = EXCLUDED.quantity,
            unit_price = EXCLUDED.unit_price,
            stage = EXCLUDED.stage,
            created_at_epoch_ms = EXCLUDED.created_at_epoch_ms,
            paid_at = COALESCE(order_items.paid_at, EXCLUDED.paid_at),
            packed_at = COALESCE(order_items.packed_at, EXCLUDED.packed_at),
            shipped_at = COALESCE(order_items.shipped_at, EXCLUDED.shipped_at),
            received_at = COALESCE(order_items.received_at, EXCLUDED.received_at),
            cancelled_at = COALESCE(order_items.cancelled_at, EXCLUDED.cancelled_at),
            return_requested_at = COALESCE(
              order_items.return_requested_at,
              EXCLUDED.return_requested_at
            ),
            waybill_printed_at = COALESCE(
              order_items.waybill_printed_at,
              EXCLUDED.waybill_printed_at
            ),
            ${paymentTrackingUpdateSql("order_items")},
            extra_data = EXCLUDED.extra_data,
            updated_at = NOW()
          `,
          [
            itemRow.id,
            itemRow.order_group_id,
            itemRow.admin_id,
            itemRow.account_id,
            itemRow.product_id,
            itemRow.variant_id,
            itemRow.quantity,
            itemRow.unit_price,
            itemRow.stage,
            itemRow.created_at_epoch_ms,
            itemRow.paid_at,
            itemRow.packed_at,
            itemRow.shipped_at,
            itemRow.received_at,
            itemRow.cancelled_at,
            itemRow.return_requested_at,
            itemRow.waybill_printed_at,
            itemRow.payment_provider,
            itemRow.payment_intent_id,
            itemRow.payment_checkout_session_id,
            itemRow.payment_idempotency_key,
            itemRow.payment_client_key,
            itemRow.payment_reference,
            itemRow.payment_status,
            itemRow.tracking_number,
            JSON.stringify(itemRow.extra_data || {}),
            itemRow.created_at,
          ],
        );

        await upsertInventoryMovements(
          client,
          movementsFromOrderEntry({ ...entry, orderGroupId: group.orderGroupId }),
        );
      }

      if (itemIds.length) {
        await client.query(
          `
          DELETE FROM order_items
          WHERE order_group_id = $1
            AND id <> ALL($2::text[])
          `,
          [group.orderGroupId, itemIds],
        );
      }
    }

    if (deleteMissing) {
      const scopeFilters = [];
      const scopeParams = [];
      if (scopeAdminId) {
        scopeParams.push(scopeAdminId);
        scopeFilters.push(`admin_id = $${scopeParams.length}`);
      }
      if (scopeAccountId) {
        scopeParams.push(scopeAccountId);
        scopeFilters.push(`account_id = $${scopeParams.length}`);
      }
      const scopeSql = scopeFilters.length ? ` AND ${scopeFilters.join(" AND ")}` : "";

      if (incomingGroupIds.length) {
        await client.query(
          `DELETE FROM orders WHERE id <> ALL($1::text[])${scopeSql.replace(
            /\$(\d+)/g,
            (_, n) => `$${Number(n) + 1}`,
          )}`,
          [incomingGroupIds, ...scopeParams],
        );
      } else if (scopeAdminId || scopeAccountId) {
        await client.query(
          `DELETE FROM orders${scopeSql.replace(" AND ", " WHERE ")}`,
          scopeParams,
        );
      } else {
        await client.query(`DELETE FROM orders`);
      }

      if (incomingItemIds.length) {
        await client.query(
          `DELETE FROM order_items WHERE id <> ALL($1::text[])${scopeSql.replace(
            /\$(\d+)/g,
            (_, n) => `$${Number(n) + 1}`,
          )}`,
          [incomingItemIds, ...scopeParams],
        );
      } else if (scopeAdminId || scopeAccountId) {
        await client.query(
          `DELETE FROM order_items${scopeSql.replace(" AND ", " WHERE ")}`,
          scopeParams,
        );
      } else if (!incoming.length) {
        await client.query(`DELETE FROM order_items`);
      }
    }
  });

  return incoming;
}

module.exports = {
  listOrdersFromPostgres,
  listOrdersPageFromPostgres,
  syncOrdersToPostgres,
};

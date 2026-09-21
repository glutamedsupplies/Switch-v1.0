"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isPostgresConfigured, closePool, query } = require("../db/pool");

function loadEnvFile(filePath) {
  const fs = require("fs");
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmedLine.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmedLine.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2 &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (_) {
    // ignore
  }
}

loadEnvFile(require("path").join(__dirname, "..", ".env"));

const skip = !isPostgresConfigured();

test("Postgres chat stores threads and messages", { skip }, async (t) => {
  const { runMigrations } = require("../db/migrate");
  const {
    isChatPostgresReady,
    invalidateChatReadyCache,
    syncChatThreadsToPostgres,
    listChatThreadsFromPostgres,
    getChatThreadFromPostgres,
    deleteChatThreadFromPostgres,
  } = require("../services/postgresChatStore");

  await runMigrations();
  invalidateChatReadyCache();
  assert.equal(await isChatPostgresReady(), true);

  const suffix = `t${Date.now()}`;
  const adminId = `admin_chat_${suffix}`;
  const otherAdminId = `admin_other_${suffix}`;
  const customerId = `cust_${suffix}`;
  const threadId = `thread-${customerId}-${adminId}-prd_${suffix}`;
  const otherThreadId = `thread-${customerId}-${otherAdminId}-prd_${suffix}`;

  t.after(async () => {
    try {
      await query(`DELETE FROM chat_threads WHERE admin_id = ANY($1::text[])`, [
        [adminId, otherAdminId],
      ]);
    } finally {
      await closePool();
    }
  });

  await syncChatThreadsToPostgres(
    [
      {
        threadId,
        adminId,
        customerId,
        userId: customerId,
        customerLabel: "Chat Tester",
        customerEmail: "chat@example.com",
        productId: `prd_${suffix}`,
        productName: "Chat Product",
        companyName: "Switch Test",
        updatedAt: "2026-03-10T10:00:00.000Z",
        lastReadAt: "2026-03-10T09:00:00.000Z",
        typing: { user: { isTyping: false } },
        messages: [
          {
            id: `msg-user-${suffix}`,
            text: "Need help",
            isFromSupport: false,
            source: "user",
            timestamp: "2026-03-10T09:30:00.000Z",
          },
          {
            id: `msg-support-${suffix}`,
            text: "Happy to help",
            isFromSupport: true,
            source: "support",
            timestamp: "2026-03-10T09:31:00.000Z",
            senderName: "Agent",
          },
        ],
      },
      {
        threadId: otherThreadId,
        adminId: otherAdminId,
        customerId,
        productId: `prd_${suffix}`,
        productName: "Other Product",
        updatedAt: "2026-03-10T11:00:00.000Z",
        messages: [
          {
            id: `msg-other-${suffix}`,
            text: "Other tenant",
            isFromSupport: false,
            timestamp: "2026-03-10T10:30:00.000Z",
          },
        ],
      },
    ],
    { deleteMissing: false },
  );

  const listed = await listChatThreadsFromPostgres({ adminId });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].threadId, threadId);
  assert.equal(listed[0].customerEmail, "chat@example.com");
  assert.equal(listed[0].messages.length, 2);
  assert.equal(listed[0].messages[0].text, "Need help");
  assert.equal(listed[0].messages[1].isFromSupport, true);

  const fetched = await getChatThreadFromPostgres(threadId, { adminId });
  assert.ok(fetched);
  assert.equal(fetched.messages.length, 2);

  await syncChatThreadsToPostgres(
    [
      {
        threadId,
        adminId,
        customerId,
        productId: `prd_${suffix}`,
        productName: "Chat Product Updated",
        updatedAt: "2026-03-10T12:00:00.000Z",
        messages: [
          {
            id: `msg-user-${suffix}`,
            text: "Need help",
            isFromSupport: false,
            timestamp: "2026-03-10T09:30:00.000Z",
          },
        ],
      },
    ],
    { adminId, deleteMissing: true },
  );

  const afterScopedSync = await listChatThreadsFromPostgres({ adminId });
  assert.equal(afterScopedSync.length, 1);
  assert.equal(afterScopedSync[0].productName, "Chat Product Updated");
  assert.equal(afterScopedSync[0].messages.length, 1);

  const otherStillThere = await getChatThreadFromPostgres(otherThreadId, {
    adminId: otherAdminId,
  });
  assert.ok(otherStillThere);

  const deleted = await deleteChatThreadFromPostgres(threadId, { adminId });
  assert.equal(deleted, true);
  assert.equal(await getChatThreadFromPostgres(threadId, { adminId }), null);
});

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isChatJsonBackupEnabled,
  threadToRow,
  rowToThread,
  messageToRow,
  rowToMessage,
} = require("../db/chatHelpers");

test("isChatJsonBackupEnabled defaults on and accepts off flags", () => {
  assert.equal(isChatJsonBackupEnabled({}), true);
  assert.equal(isChatJsonBackupEnabled({ CHAT_JSON_BACKUP: "1" }), true);
  assert.equal(isChatJsonBackupEnabled({ CHAT_JSON_BACKUP: "0" }), false);
  assert.equal(isChatJsonBackupEnabled({ CHAT_JSON_BACKUP: "false" }), false);
});

test("threadToRow / rowToThread round-trips core fields and extra_data", () => {
  const thread = {
    threadId: "thread-cust-admin-prd1",
    adminId: "admin_a",
    customerId: "cust_1",
    userId: "cust_1",
    customerLabel: "Ada",
    customerEmail: "ada@example.com",
    productId: "prd1",
    productName: "Serum",
    productOriginalPrice: 199,
    companyName: "Switch Co",
    employeeRating: 4.5,
    employeeRatingComment: "helpful",
    employeeRatingUpdatedAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-02T12:00:00.000Z",
    lastReadAt: "2026-03-02T11:00:00.000Z",
    supportReadAt: null,
    typing: { user: { isTyping: true } },
    agentHandoffRequested: true,
    messages: [
      {
        id: "msg-1",
        text: "Hello",
        isFromSupport: false,
        source: "user",
        timestamp: "2026-03-02T11:30:00.000Z",
        reactionEmoji: "👍",
      },
    ],
  };

  const row = threadToRow(thread);
  assert.equal(row.id, "thread-cust-admin-prd1");
  assert.equal(row.admin_id, "admin_a");
  assert.equal(row.customer_id, "cust_1");
  assert.equal(row.extra_data.customerEmail, "ada@example.com");
  assert.equal(row.extra_data.productOriginalPrice, 199);
  assert.equal(row.extra_data.agentHandoffRequested, true);

  const messageRow = messageToRow(thread.messages[0], thread);
  assert.equal(messageRow.id, "msg-1");
  assert.equal(messageRow.thread_id, "thread-cust-admin-prd1");
  assert.equal(messageRow.extra_data.reactionEmoji, "👍");

  const restoredMessage = rowToMessage({
    ...messageRow,
    reply_to: null,
    extra_data: messageRow.extra_data,
  });
  assert.equal(restoredMessage.reactionEmoji, "👍");
  assert.equal(restoredMessage.text, "Hello");

  const restored = rowToThread(
    {
      ...row,
      typing: row.typing,
      extra_data: row.extra_data,
    },
    [
      {
        ...messageRow,
        reply_to: null,
        extra_data: messageRow.extra_data,
      },
    ],
  );
  assert.equal(restored.threadId, thread.threadId);
  assert.equal(restored.customerEmail, "ada@example.com");
  assert.equal(restored.agentHandoffRequested, true);
  assert.equal(restored.messages.length, 1);
  assert.equal(restored.messages[0].id, "msg-1");
});

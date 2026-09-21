"use strict";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIso(value) {
  if (value == null || value === "") {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toTimestamp(value) {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstNonEmptyString(values) {
  for (const value of asArray(values)) {
    const text = String(value ?? "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function isChatJsonBackupEnabled(env = process.env) {
  const raw = String(env?.CHAT_JSON_BACKUP ?? "1").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off" && raw !== "no";
}

const THREAD_COLUMN_API_KEYS = new Set([
  "threadId",
  "id",
  "adminId",
  "customerId",
  "userId",
  "customerLabel",
  "productId",
  "productName",
  "companyName",
  "employeeRating",
  "employeeRatingComment",
  "employeeRatingUpdatedAt",
  "lastReadAt",
  "supportReadAt",
  "updatedAt",
  "createdAt",
  "typing",
  "messages",
]);

const MESSAGE_COLUMN_API_KEYS = new Set([
  "id",
  "text",
  "imageUrl",
  "imageName",
  "contentType",
  "isFromSupport",
  "source",
  "senderName",
  "senderRole",
  "senderId",
  "senderAvatarUrl",
  "replyTo",
  "editedAt",
  "deletedAt",
  "timestamp",
  "sentAt",
]);

function resolveThreadId(thread) {
  return firstNonEmptyString([
    thread?.threadId,
    thread?.id,
  ]);
}

function resolveCustomerId(thread) {
  return firstNonEmptyString([
    thread?.customerId,
    thread?.userId,
    thread?.accountId,
    thread?.customerAccountId,
  ]) || "customer-local";
}

function resolveAdminId(thread) {
  return firstNonEmptyString([thread?.adminId]) || "admin";
}

function buildExtraData(source, reservedKeys) {
  const entry = asObject(source);
  const extra = {};
  for (const [key, value] of Object.entries(entry)) {
    if (reservedKeys.has(key)) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    extra[key] = value;
  }
  return extra;
}

function parseJsonb(value, fallback) {
  if (value == null) {
    return fallback;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return value;
}

function messageToRow(message, thread) {
  const entry = asObject(message);
  const threadId = resolveThreadId(thread);
  const adminId = resolveAdminId(thread);
  const customerId = resolveCustomerId(thread);
  const id = firstNonEmptyString([entry.id]);
  if (!id || !threadId) {
    return null;
  }

  const sentAt =
    toTimestamp(entry.timestamp ?? entry.sentAt) || new Date();
  const extra = buildExtraData(entry, MESSAGE_COLUMN_API_KEYS);
  if (entry.isSentToServer !== undefined) {
    extra.isSentToServer = entry.isSentToServer === true;
  }

  return {
    id,
    thread_id: threadId,
    admin_id: adminId,
    customer_id: customerId,
    text: String(entry.text ?? "").trim(),
    image_url: String(entry.imageUrl ?? "").trim(),
    image_name: String(entry.imageName ?? "").trim(),
    content_type: String(entry.contentType ?? entry.mimeType ?? "").trim(),
    is_from_support: entry.isFromSupport === true,
    source: firstNonEmptyString([entry.source]) || (entry.isFromSupport === true ? "support" : "user"),
    sender_name: String(entry.senderName ?? "").trim(),
    sender_role: String(entry.senderRole ?? "").trim(),
    sender_id: String(entry.senderId ?? "").trim(),
    sender_avatar_url: String(entry.senderAvatarUrl ?? "").trim(),
    reply_to: entry.replyTo == null ? null : asObject(entry.replyTo),
    edited_at: toTimestamp(entry.editedAt),
    deleted_at: toTimestamp(entry.deletedAt),
    sent_at: sentAt,
    extra_data: extra,
  };
}

function rowToMessage(row) {
  const extra = asObject(parseJsonb(row?.extra_data, {}));
  const timestamp = toIso(row?.sent_at) || new Date().toISOString();
  const replyToRaw = parseJsonb(row?.reply_to, null);
  const message = {
    id: String(row?.id ?? "").trim(),
    text: String(row?.text ?? ""),
    imageUrl: String(row?.image_url ?? ""),
    imageName: String(row?.image_name ?? ""),
    contentType: String(row?.content_type ?? ""),
    isFromSupport: row?.is_from_support === true,
    isSentToServer:
      extra.isSentToServer === true || row?.is_from_support !== true,
    timestamp,
    source: String(row?.source ?? "").trim() || (row?.is_from_support === true ? "support" : "user"),
    editedAt: toIso(row?.edited_at) || null,
    deletedAt: toIso(row?.deleted_at) || null,
    replyTo: replyToRaw && typeof replyToRaw === "object" ? replyToRaw : null,
    senderName: String(row?.sender_name ?? ""),
    senderRole: String(row?.sender_role ?? ""),
    senderId: String(row?.sender_id ?? ""),
    senderAvatarUrl: String(row?.sender_avatar_url ?? ""),
  };

  for (const [key, value] of Object.entries(extra)) {
    if (key === "isSentToServer" || MESSAGE_COLUMN_API_KEYS.has(key)) {
      continue;
    }
    if (message[key] === undefined) {
      message[key] = value;
    }
  }
  return message;
}

function threadToRow(thread) {
  const entry = asObject(thread);
  const threadId = resolveThreadId(entry);
  if (!threadId) {
    return null;
  }

  const customerId = resolveCustomerId(entry);
  const adminId = resolveAdminId(entry);
  const updatedAt =
    toTimestamp(entry.updatedAt) || new Date();
  const createdAt =
    toTimestamp(entry.createdAt) || updatedAt;

  return {
    id: threadId,
    admin_id: adminId,
    customer_id: customerId,
    product_id: String(entry.productId ?? "").trim(),
    customer_label:
      firstNonEmptyString([entry.customerLabel]) || "App User",
    product_name: String(entry.productName ?? "").trim(),
    company_name: String(entry.companyName ?? entry.storeName ?? "").trim(),
    employee_rating: toNumber(entry.employeeRating, 0),
    employee_rating_comment: String(entry.employeeRatingComment ?? "").trim(),
    employee_rating_updated_at: toTimestamp(entry.employeeRatingUpdatedAt),
    last_read_at: toTimestamp(entry.lastReadAt),
    support_read_at: toTimestamp(entry.supportReadAt),
    typing: asObject(entry.typing),
    extra_data: buildExtraData(entry, THREAD_COLUMN_API_KEYS),
    created_at: createdAt,
    updated_at: updatedAt,
    messages: asArray(entry.messages),
  };
}

function rowToThread(threadRow, messageRows = []) {
  const extra = asObject(parseJsonb(threadRow?.extra_data, {}));
  const typing = asObject(parseJsonb(threadRow?.typing, {}));
  const customerId = String(threadRow?.customer_id ?? "").trim() || "customer-local";
  const threadId = String(threadRow?.id ?? "").trim();
  const messages = asArray(messageRows)
    .map(rowToMessage)
    .filter((message) => message.id);

  const thread = {
    threadId,
    adminId: String(threadRow?.admin_id ?? "").trim(),
    customerId,
    userId: customerId,
    customerLabel:
      String(threadRow?.customer_label ?? "").trim() || "App User",
    productId: String(threadRow?.product_id ?? "").trim(),
    productName: String(threadRow?.product_name ?? "").trim(),
    companyName: String(threadRow?.company_name ?? "").trim(),
    employeeRating: toNumber(threadRow?.employee_rating, 0),
    employeeRatingComment: String(threadRow?.employee_rating_comment ?? "").trim(),
    employeeRatingUpdatedAt:
      toIso(threadRow?.employee_rating_updated_at) || null,
    updatedAt: toIso(threadRow?.updated_at) || new Date().toISOString(),
    lastReadAt: toIso(threadRow?.last_read_at) || null,
    supportReadAt: toIso(threadRow?.support_read_at) || null,
    typing,
    messages,
  };

  for (const [key, value] of Object.entries(extra)) {
    if (THREAD_COLUMN_API_KEYS.has(key) || key === "messages") {
      continue;
    }
    if (thread[key] === undefined) {
      thread[key] = value;
    }
  }

  return thread;
}

module.exports = {
  asObject,
  asArray,
  toIso,
  toTimestamp,
  toNumber,
  firstNonEmptyString,
  isChatJsonBackupEnabled,
  resolveThreadId,
  resolveCustomerId,
  resolveAdminId,
  messageToRow,
  rowToMessage,
  threadToRow,
  rowToThread,
};

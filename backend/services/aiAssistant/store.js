"use strict";

const crypto = require("crypto");
const fsPromises = require("fs/promises");
const path = require("path");

const MAX_MESSAGES_PER_SESSION = 80;
const MAX_JSON_ACTION_LOG_ENTRIES = 20_000;
const MAX_CART_LINES = 50;

function nowIso(nowFn) {
  return new Date(nowFn()).toISOString();
}

function newSessionId() {
  return `ais_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(String(error?.message || ""));
}

/**
 * Persistence for the AI assistant. Uses PostgreSQL (migration 027) when it is
 * configured and migrated, otherwise JSON files under DATA_DIR, matching the
 * rest of the backend's optional-Postgres pattern.
 */
function createAssistantStore({
  dataDir,
  pg = null,
  now = () => Date.now(),
  logger = console,
} = {}) {
  let pgDisabled = !pg || typeof pg.query !== "function" || !pg.isPostgresConfigured?.();
  let warnedFallback = false;
  const files = {
    sessions: path.join(dataDir, "ai_assistant_sessions.json"),
    actions: path.join(dataDir, "ai_action_log.json"),
    carts: path.join(dataDir, "buyer_carts.json"),
  };
  const cache = new Map();
  let queue = Promise.resolve();

  function serialize(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  async function withPg(pgTask, jsonTask) {
    if (!pgDisabled) {
      try {
        return await pgTask();
      } catch (error) {
        if (!isMissingTableError(error)) throw error;
        pgDisabled = true;
        if (!warnedFallback) {
          warnedFallback = true;
          logger.warn?.(
            "[ai-assistant] PostgreSQL tables missing (run `npm run db:migrate`); using JSON storage.",
          );
        }
      }
    }
    return jsonTask();
  }

  async function readJson(key, fallback) {
    if (cache.has(key)) return cache.get(key);
    let value = fallback;
    try {
      const raw = await fsPromises.readFile(files[key], "utf8");
      value = raw.trim() ? JSON.parse(raw) : fallback;
    } catch (error) {
      if (error?.code !== "ENOENT") logger.warn?.(`[ai-assistant] unable to read ${files[key]}:`, error?.message);
    }
    cache.set(key, value);
    return value;
  }

  async function writeJson(key, value) {
    cache.set(key, value);
    await fsPromises.mkdir(path.dirname(files[key]), { recursive: true });
    const tmp = `${files[key]}.${process.pid}.${Date.now()}.tmp`;
    await fsPromises.writeFile(tmp, JSON.stringify(value, null, 2));
    await fsPromises.rename(tmp, files[key]);
  }

  function rowToSession(row) {
    return {
      id: row.id,
      userKey: row.user_key,
      role: row.role,
      accountId: row.account_id || "",
      adminId: row.admin_id || "",
      companyId: row.company_id || "",
      riderId: row.rider_id || "",
      sessionType: row.session_type || "assistant",
      state: row.state && typeof row.state === "object" ? row.state : {},
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ""),
    };
  }

  function stripMessages(session) {
    if (!session) return session;
    const { messages, ...rest } = session;
    return rest;
  }

  async function getOrCreateSession(owner) {
    const userKey = String(owner.userKey || "").trim();
    const role = String(owner.role || "").trim();
    const adminId = String(owner.adminId || "").trim();
    if (!userKey || !role) throw new Error("Assistant session owner is required.");
    return withPg(
      async () => {
        const existing = await pg.query(
          `SELECT * FROM ai_assistant_sessions WHERE user_key = $1 AND role = $2 AND admin_id = $3`,
          [userKey, role, adminId],
        );
        if (existing.rows[0]) return rowToSession(existing.rows[0]);
        const inserted = await pg.query(
          `INSERT INTO ai_assistant_sessions (id, user_key, role, account_id, admin_id, company_id, rider_id, session_type, state)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}'::jsonb)
           ON CONFLICT (user_key, role, admin_id) DO UPDATE SET updated_at = ai_assistant_sessions.updated_at
           RETURNING *`,
          [
            newSessionId(),
            userKey,
            role,
            String(owner.accountId || ""),
            adminId,
            String(owner.companyId || ""),
            String(owner.riderId || ""),
            String(owner.sessionType || "assistant"),
          ],
        );
        return rowToSession(inserted.rows[0]);
      },
      () =>
        serialize(async () => {
          const data = await readJson("sessions", { sessions: {} });
          const found = Object.values(data.sessions).find(
            (entry) => entry.userKey === userKey && entry.role === role && (entry.adminId || "") === adminId,
          );
          if (found) return stripMessages(found);
          const stamp = nowIso(now);
          const session = {
            id: newSessionId(),
            userKey,
            role,
            accountId: String(owner.accountId || ""),
            adminId,
            companyId: String(owner.companyId || ""),
            riderId: String(owner.riderId || ""),
            sessionType: String(owner.sessionType || "assistant"),
            state: {},
            createdAt: stamp,
            updatedAt: stamp,
            messages: [],
          };
          data.sessions[session.id] = session;
          await writeJson("sessions", data);
          return stripMessages(session);
        }),
    );
  }

  async function saveSessionState(sessionId, state) {
    const safeState = state && typeof state === "object" ? state : {};
    return withPg(
      async () => {
        await pg.query(`UPDATE ai_assistant_sessions SET state = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
          sessionId,
          JSON.stringify(safeState),
        ]);
      },
      () =>
        serialize(async () => {
          const data = await readJson("sessions", { sessions: {} });
          const session = data.sessions[sessionId];
          if (!session) return;
          session.state = safeState;
          session.updatedAt = nowIso(now);
          await writeJson("sessions", data);
        }),
    );
  }

  async function resetSession(sessionId) {
    return withPg(
      async () => {
        await pg.query(`DELETE FROM ai_assistant_messages WHERE session_id = $1`, [sessionId]);
        await pg.query(`UPDATE ai_assistant_sessions SET state = '{}'::jsonb, updated_at = NOW() WHERE id = $1`, [sessionId]);
      },
      () =>
        serialize(async () => {
          const data = await readJson("sessions", { sessions: {} });
          const session = data.sessions[sessionId];
          if (!session) return;
          session.state = {};
          session.messages = [];
          session.updatedAt = nowIso(now);
          await writeJson("sessions", data);
        }),
    );
  }

  async function appendMessages(sessionId, messages) {
    const rows = (Array.isArray(messages) ? messages : [])
      .filter((message) => message && (message.author === "user" || message.author === "assistant"))
      .map((message) => ({
        author: message.author,
        text: String(message.text || "").slice(0, 4000),
        blocks: Array.isArray(message.blocks) ? message.blocks : [],
        createdAt: nowIso(now),
      }));
    if (!rows.length) return;
    return withPg(
      async () => {
        for (const row of rows) {
          await pg.query(
            `INSERT INTO ai_assistant_messages (session_id, author, text, blocks) VALUES ($1, $2, $3, $4::jsonb)`,
            [sessionId, row.author, row.text, JSON.stringify(row.blocks)],
          );
        }
        await pg.query(
          `DELETE FROM ai_assistant_messages WHERE session_id = $1 AND id NOT IN (
             SELECT id FROM ai_assistant_messages WHERE session_id = $1 ORDER BY id DESC LIMIT $2
           )`,
          [sessionId, MAX_MESSAGES_PER_SESSION],
        );
      },
      () =>
        serialize(async () => {
          const data = await readJson("sessions", { sessions: {} });
          const session = data.sessions[sessionId];
          if (!session) return;
          session.messages = [...(session.messages || []), ...rows].slice(-MAX_MESSAGES_PER_SESSION);
          session.updatedAt = nowIso(now);
          await writeJson("sessions", data);
        }),
    );
  }

  async function listMessages(sessionId, limit = 30) {
    const safeLimit = Math.max(1, Math.min(MAX_MESSAGES_PER_SESSION, Number(limit) || 30));
    return withPg(
      async () => {
        const result = await pg.query(
          `SELECT author, text, blocks, created_at FROM ai_assistant_messages WHERE session_id = $1 ORDER BY id DESC LIMIT $2`,
          [sessionId, safeLimit],
        );
        return result.rows.reverse().map((row) => ({
          author: row.author,
          text: row.text,
          blocks: Array.isArray(row.blocks) ? row.blocks : [],
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ""),
        }));
      },
      async () => {
        const data = await readJson("sessions", { sessions: {} });
        return (data.sessions[sessionId]?.messages || []).slice(-safeLimit);
      },
    );
  }

  async function logAction(entry) {
    const row = {
      userKey: String(entry.userKey || ""),
      role: String(entry.role || ""),
      accountId: String(entry.accountId || ""),
      adminId: String(entry.adminId || ""),
      riderId: String(entry.riderId || ""),
      tool: String(entry.tool || ""),
      risk: String(entry.risk || "low"),
      source: String(entry.source || ""),
      entityType: String(entry.entityType || ""),
      entityId: String(entry.entityId || ""),
      ok: entry.ok !== false,
      latencyMs: Math.max(0, Math.round(Number(entry.latencyMs) || 0)),
      request: entry.request && typeof entry.request === "object" ? entry.request : {},
      result: entry.result && typeof entry.result === "object" ? entry.result : {},
      createdAt: nowIso(now),
    };
    return withPg(
      async () => {
        await pg.query(
          `INSERT INTO ai_action_log (user_key, role, account_id, admin_id, rider_id, tool, risk, source, entity_type, entity_id, ok, latency_ms, request, result)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)`,
          [
            row.userKey, row.role, row.accountId, row.adminId, row.riderId, row.tool, row.risk, row.source,
            row.entityType, row.entityId, row.ok, row.latencyMs, JSON.stringify(row.request), JSON.stringify(row.result),
          ],
        );
      },
      () =>
        serialize(async () => {
          const list = await readJson("actions", []);
          const next = [row, ...(Array.isArray(list) ? list : [])].slice(0, MAX_JSON_ACTION_LOG_ENTRIES);
          await writeJson("actions", next);
        }),
    );
  }

  async function listActions({ userKey = "", role = "", limit = 100, sinceMs = 0 } = {}) {
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
    return withPg(
      async () => {
        const params = [];
        const where = [];
        if (userKey) {
          params.push(userKey);
          where.push(`user_key = $${params.length}`);
        }
        if (role) {
          params.push(role);
          where.push(`role = $${params.length}`);
        }
        if (sinceMs) {
          params.push(new Date(sinceMs));
          where.push(`created_at >= $${params.length}`);
        }
        const result = await pg.query(
          `SELECT * FROM ai_action_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ${safeLimit}`,
          params,
        );
        return result.rows.map((r) => ({
          userKey: r.user_key, role: r.role, accountId: r.account_id, adminId: r.admin_id, riderId: r.rider_id,
          tool: r.tool, risk: r.risk, source: r.source, entityType: r.entity_type, entityId: r.entity_id,
          ok: r.ok, latencyMs: r.latency_ms, request: r.request, result: r.result,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ""),
        }));
      },
      async () => {
        const list = await readJson("actions", []);
        return (Array.isArray(list) ? list : [])
          .filter((r) => (!userKey || r.userKey === userKey) && (!role || r.role === role))
          .filter((r) => !sinceMs || Date.parse(r.createdAt) >= sinceMs)
          .slice(0, safeLimit);
      },
    );
  }

  function normalizeCartItems(items) {
    const seen = new Map();
    for (const raw of Array.isArray(items) ? items : []) {
      const productId = String(raw?.productId || "").trim();
      if (!productId) continue;
      const variantId = String(raw?.variantId || "").trim();
      const quantity = Math.max(1, Math.min(999, Math.trunc(Number(raw?.quantity) || 1)));
      const key = `${productId}::${variantId}`;
      seen.set(key, { productId, variantId, quantity, addedAt: String(raw?.addedAt || nowIso(now)) });
    }
    return [...seen.values()].slice(0, MAX_CART_LINES);
  }

  async function getCart(accountId) {
    const key = String(accountId || "").trim();
    if (!key) return [];
    return withPg(
      async () => {
        const result = await pg.query(`SELECT items FROM buyer_carts WHERE account_id = $1`, [key]);
        return normalizeCartItems(result.rows[0]?.items);
      },
      async () => {
        const data = await readJson("carts", {});
        return normalizeCartItems(data[key]?.items);
      },
    );
  }

  async function saveCart(accountId, items) {
    const key = String(accountId || "").trim();
    if (!key) throw new Error("Account is required.");
    const normalized = normalizeCartItems(items);
    await withPg(
      async () => {
        await pg.query(
          `INSERT INTO buyer_carts (account_id, items, updated_at) VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (account_id) DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()`,
          [key, JSON.stringify(normalized)],
        );
      },
      () =>
        serialize(async () => {
          const data = await readJson("carts", {});
          data[key] = { items: normalized, updatedAt: nowIso(now) };
          await writeJson("carts", data);
        }),
    );
    return normalized;
  }

  function storageMode() {
    return pgDisabled ? "json" : "postgres";
  }

  return {
    getOrCreateSession,
    saveSessionState,
    resetSession,
    appendMessages,
    listMessages,
    logAction,
    listActions,
    getCart,
    saveCart,
    storageMode,
  };
}

module.exports = {
  createAssistantStore,
  MAX_MESSAGES_PER_SESSION,
};

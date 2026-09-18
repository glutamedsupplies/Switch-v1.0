"use strict";

const { Pool } = require("pg");

let pool = null;
let initPromise = null;
let lastInitError = null;

function getDatabaseUrl() {
  const url = String(process.env.DATABASE_URL ?? "").trim();
  return url || "";
}

function isPostgresConfigured() {
  return Boolean(getDatabaseUrl());
}

function createPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30_000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 5_000,
  });
}

async function getPool() {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (pool) {
    return pool;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const nextPool = createPool();
      const client = await nextPool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
      pool = nextPool;
      lastInitError = null;
      return pool;
    })().catch((error) => {
      lastInitError = error;
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

async function query(text, params = []) {
  const activePool = await getPool();
  if (!activePool) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL in backend/.env.");
  }
  return activePool.query(text, params);
}

async function withTransaction(work) {
  const activePool = await getPool();
  if (!activePool) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL in backend/.env.");
  }

  const client = await activePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (!pool) {
    return;
  }
  const closing = pool;
  pool = null;
  initPromise = null;
  await closing.end();
}

function getLastInitError() {
  return lastInitError;
}

module.exports = {
  isPostgresConfigured,
  getDatabaseUrl,
  getPool,
  query,
  withTransaction,
  closePool,
  getLastInitError,
};

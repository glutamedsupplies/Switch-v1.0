"use strict";

/**
 * One-shot / idempotent import of chat_threads.json into Postgres.
 *
 * Usage:
 *   node scripts/migrate-chat-json-to-postgres.js
 *
 * Reads (when present):
 *   backend/data/chat_threads.json
 *
 * Re-running upserts by stable threadId / message id.
 * This script does not seed or log passwords, API keys, or session secrets.
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
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
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return { missing: true, items: [] };
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const decoded = JSON.parse(raw);
    if (!Array.isArray(decoded)) {
      throw new Error(`${path.basename(filePath)} is not an array.`);
    }
    return { missing: false, items: decoded };
  } catch (error) {
    throw new Error(
      `Unable to parse ${filePath}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function main() {
  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));

  const { runMigrations } = require("../db/migrate");
  const { closePool } = require("../db/pool");
  const {
    isChatPostgresReady,
    syncChatThreadsToPostgres,
    listChatThreadsFromPostgres,
    invalidateChatReadyCache,
  } = require("../services/postgresChatStore");

  await runMigrations();
  invalidateChatReadyCache();

  if (!(await isChatPostgresReady())) {
    throw new Error("PostgreSQL chat schema is not ready. Check DATABASE_URL and db:migrate.");
  }

  const dataDir = path.join(__dirname, "..", "data");
  const chatFile = path.join(dataDir, "chat_threads.json");
  const { missing, items } = readJsonArray(chatFile);

  if (missing) {
    console.log(`No chat file at ${chatFile}; nothing to import.`);
  } else {
    console.log(`Importing ${items.length} chat thread(s) from ${chatFile}...`);
    await syncChatThreadsToPostgres(items, { deleteMissing: false });
  }

  const stored = await listChatThreadsFromPostgres();
  console.log(`PostgreSQL chat_threads count: ${stored.length}`);
  console.log(
    `Total messages: ${stored.reduce((sum, thread) => sum + (thread.messages?.length || 0), 0)}`,
  );
  await closePool();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    const { closePool } = require("../db/pool");
    await closePool();
  } catch (_) {
    // ignore
  }
  process.exitCode = 1;
});

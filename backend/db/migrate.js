"use strict";

const fs = require("fs");
const path = require("path");
const { getPool, isPostgresConfigured, closePool } = require("./pool");

async function loadEnvFiles() {
  const loadEnvFile = (filePath) => {
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
  };

  loadEnvFile(path.join(__dirname, "..", ".env"));
  loadEnvFile(path.join(__dirname, "..", "..", ".env"));
}

async function runMigrations() {
  await loadEnvFiles();

  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not set. Add it to backend/.env first.");
  }

  const pool = await getPool();
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  for (const fileName of files) {
    const migrationId = fileName;
    const existing = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1",
      [migrationId],
    );
    if (existing.rowCount > 0) {
      console.log(`skip  ${migrationId}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (id) VALUES ($1)",
        [migrationId],
      );
      await client.query("COMMIT");
      console.log(`apply ${migrationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      console.log("Migrations complete.");
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Migration failed:", error.message || error);
      try {
        await closePool();
      } catch (_) {
        // ignore
      }
      process.exit(1);
    });
}

module.exports = { runMigrations };

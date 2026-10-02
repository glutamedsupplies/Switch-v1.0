"use strict";

/**
 * Seeds ~10 mock trending search rows for Super Admin / public Top Searches QA.
 *
 * Usage:
 *   node scripts/seed-sample-trending-searches.js
 *   node scripts/seed-sample-trending-searches.js --clear
 *
 * Requires DATABASE_URL (Postgres). Idempotent — re-run replaces sample rows only.
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return;
    }
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key || process.env[key] != null) {
        continue;
      }
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.error(`Unable to load env file: ${filePath}`, error);
  }
}

loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", "..", ".env"));

const SAMPLE_ID_PREFIX = "trend-sample-";
const SAMPLE_SOURCE = "sample-seed";

/** Ten mock search terms with descending hit counts for list UI testing. */
const SAMPLE_TERMS = [
  { term: "wireless earbuds", hits: 428 },
  { term: "milk tea", hits: 391 },
  { term: "running shoes", hits: 356 },
  { term: "korean fried chicken", hits: 312 },
  { term: "office chair", hits: 287 },
  { term: "iced coffee", hits: 241 },
  { term: "phone case", hits: 198 },
  { term: "backpack", hits: 164 },
  { term: "skincare set", hits: 129 },
  { term: "mechanical keyboard", hits: 96 },
];

function normalizeTerm(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizeTermKey(value) {
  return normalizeTerm(value).toLowerCase();
}

function currentMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function sampleId(index) {
  return `${SAMPLE_ID_PREFIX}${String(index + 1).padStart(2, "0")}`;
}

function monthlyId(index) {
  return `${SAMPLE_ID_PREFIX}m-${String(index + 1).padStart(2, "0")}`;
}

async function clearSampleRows(query) {
  const keys = SAMPLE_TERMS.map((row) => normalizeTermKey(row.term));
  await query(
    `DELETE FROM trending_search_unique_hits
     WHERE term_normalized = ANY($1::text[])`,
    [keys],
  ).catch(() => null);
  await query(
    `DELETE FROM trending_search_dim_unique_hits
     WHERE term_normalized = ANY($1::text[])`,
    [keys],
  ).catch(() => null);
  await query(
    `DELETE FROM trending_search_dim_monthly
     WHERE term_normalized = ANY($1::text[])
        OR id LIKE $2`,
    [keys, `${SAMPLE_ID_PREFIX}%`],
  ).catch(() => null);
  await query(
    `DELETE FROM trending_search_monthly
     WHERE term_normalized = ANY($1::text[])
        OR id LIKE $2`,
    [keys, `${SAMPLE_ID_PREFIX}%`],
  );
  await query(
    `DELETE FROM trending_searches
     WHERE term_normalized = ANY($1::text[])
        OR id LIKE $2`,
    [keys, `${SAMPLE_ID_PREFIX}%`],
  );
}

async function seedPostgres(query) {
  const monthKey = currentMonthKey();
  await clearSampleRows(query);

  for (let index = 0; index < SAMPLE_TERMS.length; index += 1) {
    const sample = SAMPLE_TERMS[index];
    const term = normalizeTerm(sample.term);
    const termNormalized = normalizeTermKey(term);
    const catalogId = sampleId(index);
    const hits = Math.max(1, Number(sample.hits) || 1);

    await query(
      `INSERT INTO trending_searches
         (id, term, term_normalized, is_active, is_manual, manual_rank, hit_count)
       VALUES ($1, $2, $3, TRUE, FALSE, 0, $4)
       ON CONFLICT (term_normalized) DO UPDATE SET
         id = EXCLUDED.id,
         term = EXCLUDED.term,
         is_active = TRUE,
         is_manual = FALSE,
         manual_rank = 0,
         hit_count = EXCLUDED.hit_count,
         updated_at = NOW()`,
      [catalogId, term, termNormalized, hits],
    );

    await query(
      `INSERT INTO trending_search_monthly
         (id, term, term_normalized, month_key, hit_count)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (term_normalized, month_key) DO UPDATE SET
         id = EXCLUDED.id,
         term = EXCLUDED.term,
         hit_count = EXCLUDED.hit_count,
         updated_at = NOW()`,
      [monthlyId(index), term, termNormalized, monthKey, hits],
    );

    // Default dim bucket so filtered SA views still see sample volume.
    await query(
      `INSERT INTO trending_search_dim_monthly
         (id, term, term_normalized, month_key, platform_id, category, store_type, client, hit_count)
       VALUES ($1, $2, $3, $4, '', '', '', 'web', $5)
       ON CONFLICT (term_normalized, month_key, platform_id, category, store_type, client)
       DO UPDATE SET
         term = EXCLUDED.term,
         hit_count = EXCLUDED.hit_count,
         updated_at = NOW()`,
      [`${SAMPLE_ID_PREFIX}d-${String(index + 1).padStart(2, "0")}`, term, termNormalized, monthKey, hits],
    ).catch(() => null);
  }

  return { monthKey, count: SAMPLE_TERMS.length };
}

async function main() {
  const clearOnly = process.argv.includes("--clear");
  const { isPostgresConfigured, query, closePool } = require("../db/pool");

  if (!isPostgresConfigured()) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL in backend/.env.");
  }

  // Touch pool
  await query("SELECT 1");

  if (clearOnly) {
    await clearSampleRows(query);
    console.log("Cleared sample trending search rows.");
    await closePool();
    return;
  }

  const result = await seedPostgres(query);
  console.log(`Seeded ${result.count} mock trending searches for ${result.monthKey}.`);
  SAMPLE_TERMS.forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.term} — ${row.hits} hits (${sampleId(index)})`);
  });
  console.log(`Source tag: ${SAMPLE_SOURCE}`);
  console.log("Open Super Admin → Trending Searches to review.");

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
  process.exit(1);
});

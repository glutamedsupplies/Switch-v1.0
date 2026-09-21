"use strict";

const path = require("path");
const crypto = require("crypto");
const fsPromises = require("fs/promises");
const { isPostgresConfigured, query } = require("../db/pool");

const MAX_TRENDING_PUBLIC = 24;
const MAX_RECENT_PER_USER = 30;
const MAX_TERM_LENGTH = 80;
const MAX_MONTHLY_JSON_ROWS = 5000;

function createTrendingSearchesApi(deps) {
  const {
    DATA_DIR,
    ensureStoragePaths,
    writeJsonFileAtomically,
    requireSuperAdmin,
    sendJson,
    parseRequestBody,
    getRequestAccountIdentifier,
  } = deps;

  const TRENDING_FILE = path.join(DATA_DIR, "trending_searches.json");
  const MONTHLY_FILE = path.join(DATA_DIR, "trending_searches_monthly.json");
  const UNIQUE_HITS_FILE = path.join(DATA_DIR, "trending_search_unique_hits.json");
  const DIM_MONTHLY_FILE = path.join(DATA_DIR, "trending_searches_dim_monthly.json");
  const DIM_UNIQUE_HITS_FILE = path.join(
    DATA_DIR,
    "trending_search_dim_unique_hits.json",
  );
  const HISTORY_FILE = path.join(DATA_DIR, "user_search_history.json");

  let monthlySchemaReady = false;

  const CLIENT_LABELS = {
    web: "Web",
    android: "Android",
    ios: "iOS",
    app: "App",
  };

  function normalizeTerm(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, MAX_TERM_LENGTH);
  }

  function normalizeTermKey(value) {
    return normalizeTerm(value).toLowerCase();
  }

  function resolveActorKey({ accountId = "", clientKey = "" } = {}) {
    const account = String(accountId || "").trim();
    const client = String(clientKey || "").trim();
    if (account) return `account:${account}`;
    if (client) return `client:${client}`;
    return "";
  }

  function newId() {
    return crypto.randomBytes(12).toString("hex");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function monthKeyFromDate(date = new Date()) {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
    }).format(date);
    return String(formatted || "").slice(0, 7);
  }

  function currentMonthKey() {
    return monthKeyFromDate(new Date());
  }

  function normalizeMonthKey(value) {
    const raw = String(value || "").trim();
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    return currentMonthKey();
  }

  function normalizeDimValue(value, { max = 80 } = {}) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, max);
  }

  function normalizePlatformId(value) {
    return normalizeDimValue(value, { max: 64 }).toLowerCase();
  }

  function normalizeCategory(value) {
    return normalizeDimValue(value, { max: 80 });
  }

  function normalizeStoreType(value) {
    return normalizeDimValue(value, { max: 80 });
  }

  function normalizeClient(value) {
    const raw = normalizeDimValue(value, { max: 32 }).toLowerCase();
    if (!raw) return "";
    if (raw === "android" || raw === "ios" || raw === "web" || raw === "app") {
      return raw;
    }
    if (raw.includes("android")) return "android";
    if (raw.includes("ios") || raw.includes("iphone") || raw.includes("ipad")) {
      return "ios";
    }
    if (raw.includes("web") || raw.includes("browser")) return "web";
    if (raw.includes("flutter") || raw.includes("mobile") || raw.includes("app")) {
      return "app";
    }
    return raw.slice(0, 24);
  }

  function normalizeSearchContext(raw = {}) {
    return {
      platformId: normalizePlatformId(
        raw.platformId ?? raw.platform ?? raw.buyerPlatform ?? "",
      ),
      category: normalizeCategory(raw.category ?? raw.categoryFilter ?? ""),
      storeType: normalizeStoreType(
        raw.storeType ?? raw.businessType ?? raw.type ?? "",
      ),
      client: normalizeClient(raw.client ?? raw.clientType ?? raw.device ?? ""),
    };
  }

  function parseListFilters(source = {}) {
    const get = (key) => {
      if (source instanceof URLSearchParams) {
        return source.get(key);
      }
      return source[key];
    };
    const platform = normalizePlatformId(get("platform") || "all");
    const category = normalizeCategory(get("category") || "all");
    const storeType = normalizeStoreType(get("storeType") || get("type") || "all");
    const client = normalizeClient(get("client") || "all") || "all";
    const sourceFilter = String(get("source") || "all")
      .trim()
      .toLowerCase();
    const visibility = String(get("visibility") || "all")
      .trim()
      .toLowerCase();
    const q = normalizeTerm(get("q") || get("search") || "");
    return {
      platform: !platform || platform === "all" ? "all" : platform,
      category:
        !category || category.toLowerCase() === "all" ? "all" : category,
      storeType:
        !storeType || storeType.toLowerCase() === "all" ? "all" : storeType,
      client: !client || client === "all" ? "all" : client,
      source:
        sourceFilter === "pinned" || sourceFilter === "organic"
          ? sourceFilter
          : "all",
      visibility:
        visibility === "visible" || visibility === "hidden"
          ? visibility
          : "all",
      q,
    };
  }

  function hasDimensionalFilter(filters = {}) {
    return (
      (filters.platform && filters.platform !== "all") ||
      (filters.category && filters.category !== "all") ||
      (filters.storeType && filters.storeType !== "all") ||
      (filters.client && filters.client !== "all")
    );
  }

  function applyMetaFilters(items, filters = {}) {
    let next = Array.isArray(items) ? [...items] : [];
    if (filters.source === "pinned") {
      next = next.filter((item) => item.isManual);
    } else if (filters.source === "organic") {
      next = next.filter((item) => !item.isManual);
    }
    if (filters.visibility === "visible") {
      next = next.filter((item) => item.isActive);
    } else if (filters.visibility === "hidden") {
      next = next.filter((item) => !item.isActive);
    }
    if (filters.q) {
      const needle = normalizeTermKey(filters.q);
      next = next.filter((item) =>
        normalizeTermKey(item.term).includes(needle),
      );
    }
    return next;
  }

  function mapTrendingRow(row) {
    return {
      id: String(row.id ?? ""),
      term: String(row.term ?? ""),
      termNormalized: String(row.term_normalized ?? row.termNormalized ?? ""),
      isActive: Boolean(row.is_active ?? row.isActive ?? true),
      isManual: Boolean(row.is_manual ?? row.isManual ?? false),
      manualRank: Number(row.manual_rank ?? row.manualRank ?? 0) || 0,
      hitCount: Number(row.hit_count ?? row.hitCount ?? 0) || 0,
      monthKey: String(row.month_key ?? row.monthKey ?? ""),
      createdAt: String(row.created_at ?? row.createdAt ?? nowIso()),
      updatedAt: String(row.updated_at ?? row.updatedAt ?? nowIso()),
    };
  }

  async function readJsonArray(filePath) {
    await ensureStoragePaths();
    try {
      const raw = await fsPromises.readFile(filePath, "utf8");
      const decoded = JSON.parse(raw);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_) {
      return [];
    }
  }

  async function writeJsonArray(filePath, entries) {
    await writeJsonFileAtomically(filePath, Array.isArray(entries) ? entries : []);
  }

  async function ensureMonthlySchema() {
    if (!isPostgresConfigured() || monthlySchemaReady) return monthlySchemaReady;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS trending_search_monthly (
          id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
          term              TEXT NOT NULL,
          term_normalized   TEXT NOT NULL,
          month_key         TEXT NOT NULL,
          hit_count         BIGINT NOT NULL DEFAULT 0,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT trending_search_monthly_term_month_key UNIQUE (term_normalized, month_key)
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_trending_search_monthly_month_hits
          ON trending_search_monthly (month_key, hit_count DESC, updated_at DESC)
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS trending_search_unique_hits (
          id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
          actor_key         TEXT NOT NULL,
          term_normalized   TEXT NOT NULL,
          month_key         TEXT NOT NULL,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT trending_search_unique_hits_actor_term_month_key
            UNIQUE (actor_key, term_normalized, month_key)
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_trending_search_unique_hits_month_term
          ON trending_search_unique_hits (month_key, term_normalized)
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS trending_search_dim_monthly (
          id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
          term              TEXT NOT NULL,
          term_normalized   TEXT NOT NULL,
          month_key         TEXT NOT NULL,
          platform_id       TEXT NOT NULL DEFAULT '',
          category          TEXT NOT NULL DEFAULT '',
          store_type        TEXT NOT NULL DEFAULT '',
          client            TEXT NOT NULL DEFAULT '',
          hit_count         BIGINT NOT NULL DEFAULT 0,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT trending_search_dim_monthly_unique
            UNIQUE (term_normalized, month_key, platform_id, category, store_type, client)
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_trending_search_dim_monthly_month
          ON trending_search_dim_monthly (month_key, hit_count DESC)
      `);
      await query(`
        CREATE TABLE IF NOT EXISTS trending_search_dim_unique_hits (
          id                TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'hex'),
          actor_key         TEXT NOT NULL,
          term_normalized   TEXT NOT NULL,
          month_key         TEXT NOT NULL,
          platform_id       TEXT NOT NULL DEFAULT '',
          category          TEXT NOT NULL DEFAULT '',
          store_type        TEXT NOT NULL DEFAULT '',
          client            TEXT NOT NULL DEFAULT '',
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT trending_search_dim_unique_hits_unique
            UNIQUE (
              actor_key,
              term_normalized,
              month_key,
              platform_id,
              category,
              store_type,
              client
            )
        )
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_trending_search_dim_unique_hits_month
          ON trending_search_dim_unique_hits (month_key, term_normalized)
      `);
      monthlySchemaReady = true;
    } catch (_) {
      monthlySchemaReady = false;
    }
    return monthlySchemaReady;
  }

  function sortByHits(items, sort = "hits-desc") {
    const next = [...items];
    next.sort((a, b) => {
      if (a.isManual !== b.isManual) {
        return a.isManual ? -1 : 1;
      }
      if (sort === "hits-asc") {
        if (a.hitCount !== b.hitCount) return a.hitCount - b.hitCount;
      } else if (sort === "alpha") {
        const cmp = String(a.term).localeCompare(String(b.term), undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp;
      } else if (a.hitCount !== b.hitCount) {
        return b.hitCount - a.hitCount;
      }
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
    return next.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  async function listCatalogJson() {
    const existing = await readJsonArray(TRENDING_FILE);
    return existing.map(mapTrendingRow);
  }

  async function listMonthlyJson(monthKey) {
    const key = normalizeMonthKey(monthKey);
    const rows = await readJsonArray(MONTHLY_FILE);
    return rows
      .filter((row) => String(row.monthKey || row.month_key || "") === key)
      .map((row) => ({
        term: String(row.term || ""),
        termNormalized: String(row.termNormalized || row.term_normalized || ""),
        hitCount: Number(row.hitCount || row.hit_count || 0) || 0,
        monthKey: key,
        updatedAt: String(row.updatedAt || row.updated_at || nowIso()),
      }));
  }

  async function listAvailableMonthsJson() {
    const rows = await readJsonArray(MONTHLY_FILE);
    const byMonth = new Map();
    for (const row of rows) {
      const monthKey = String(row.monthKey || row.month_key || "").trim();
      if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
      const hits = Number(row.hitCount || row.hit_count || 0) || 0;
      const prev = byMonth.get(monthKey) || { monthKey, totalHits: 0, termCount: 0 };
      prev.totalHits += hits;
      prev.termCount += 1;
      byMonth.set(monthKey, prev);
    }
    return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  async function backfillMonthFromCatalogJson(monthKey) {
    const key = normalizeMonthKey(monthKey);
    const monthly = await readJsonArray(MONTHLY_FILE);
    const hasMonth = monthly.some(
      (row) => String(row.monthKey || row.month_key || "") === key,
    );
    if (hasMonth) return;
    const catalog = await listCatalogJson();
    const seeded = catalog
      .filter((item) => item.hitCount > 0)
      .map((item) => ({
        id: newId(),
        term: item.term,
        termNormalized: item.termNormalized,
        monthKey: key,
        hitCount: item.hitCount,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }));
    if (!seeded.length) return;
    await writeJsonArray(MONTHLY_FILE, [...seeded, ...monthly].slice(0, MAX_MONTHLY_JSON_ROWS));
  }

  async function listTrendingForMonthJson(monthKey, { sort = "hits-desc" } = {}) {
    const key = normalizeMonthKey(monthKey);
    await backfillMonthFromCatalogJson(key);
    const monthly = await listMonthlyJson(key);
    const catalog = await listCatalogJson();
    const catalogByKey = new Map(
      catalog.map((item) => [item.termNormalized, item]),
    );
    const items = monthly
      .map((row) => {
        const meta = catalogByKey.get(row.termNormalized);
        return mapTrendingRow({
          id: meta?.id || `monthly-${row.termNormalized}-${key}`,
          term: meta?.term || row.term,
          term_normalized: row.termNormalized,
          is_active: meta ? meta.isActive : true,
          is_manual: meta ? meta.isManual : false,
          manual_rank: 0,
          hit_count: row.hitCount,
          month_key: key,
          created_at: meta?.createdAt || row.updatedAt,
          updated_at: row.updatedAt,
        });
      })
      .filter((item) => item.term && item.hitCount > 0);
    return sortByHits(items, sort);
  }

  function matchesDimFilters(row, filters = {}) {
    const platformId = String(row.platformId || row.platform_id || "");
    const category = String(row.category || "");
    const storeType = String(row.storeType || row.store_type || "");
    const client = String(row.client || "");
    if (filters.platform && filters.platform !== "all" && platformId !== filters.platform) {
      return false;
    }
    if (
      filters.category &&
      filters.category !== "all" &&
      category.toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.storeType &&
      filters.storeType !== "all" &&
      storeType.toLowerCase() !== filters.storeType.toLowerCase()
    ) {
      return false;
    }
    if (filters.client && filters.client !== "all" && client !== filters.client) {
      return false;
    }
    return true;
  }

  async function listTrendingForMonthDimJson(monthKey, filters = {}, { sort = "hits-desc" } = {}) {
    const key = normalizeMonthKey(monthKey);
    const rows = await readJsonArray(DIM_MONTHLY_FILE);
    const catalog = await listCatalogJson();
    const catalogByKey = new Map(
      catalog.map((item) => [item.termNormalized, item]),
    );
    const byTerm = new Map();
    for (const row of rows) {
      if (String(row.monthKey || row.month_key || "") !== key) continue;
      if (!matchesDimFilters(row, filters)) continue;
      const termNormalized = String(row.termNormalized || row.term_normalized || "");
      if (!termNormalized) continue;
      const hits = Number(row.hitCount || row.hit_count || 0) || 0;
      if (hits <= 0) continue;
      const prev = byTerm.get(termNormalized) || {
        term: String(row.term || ""),
        termNormalized,
        hitCount: 0,
        updatedAt: String(row.updatedAt || row.updated_at || nowIso()),
      };
      prev.hitCount += hits;
      if (String(row.updatedAt || row.updated_at || "") > prev.updatedAt) {
        prev.updatedAt = String(row.updatedAt || row.updated_at || prev.updatedAt);
        prev.term = String(row.term || prev.term);
      }
      byTerm.set(termNormalized, prev);
    }
    const items = [...byTerm.values()]
      .map((row) => {
        const meta = catalogByKey.get(row.termNormalized);
        return mapTrendingRow({
          id: meta?.id || `dim-${row.termNormalized}-${key}`,
          term: meta?.term || row.term,
          term_normalized: row.termNormalized,
          is_active: meta ? meta.isActive : true,
          is_manual: meta ? meta.isManual : false,
          manual_rank: 0,
          hit_count: row.hitCount,
          month_key: key,
          created_at: meta?.createdAt || row.updatedAt,
          updated_at: row.updatedAt,
        });
      })
      .filter((item) => item.term && item.hitCount > 0);
    return sortByHits(items, sort);
  }

  async function listAvailableMonthsPostgres() {
    await ensureMonthlySchema();
    const result = await query(
      `SELECT month_key AS "monthKey",
              COALESCE(SUM(hit_count), 0)::bigint AS "totalHits",
              COUNT(*)::int AS "termCount"
       FROM trending_search_monthly
       GROUP BY month_key
       ORDER BY month_key DESC`,
    );
    return result.rows.map((row) => ({
      monthKey: String(row.monthKey || ""),
      totalHits: Number(row.totalHits || 0) || 0,
      termCount: Number(row.termCount || 0) || 0,
    }));
  }

  async function backfillMonthFromCatalogPostgres(monthKey) {
    const key = normalizeMonthKey(monthKey);
    await ensureMonthlySchema();
    const existing = await query(
      `SELECT 1 FROM trending_search_monthly WHERE month_key = $1 LIMIT 1`,
      [key],
    );
    if (existing.rows.length) return;
    await query(
      `INSERT INTO trending_search_monthly
         (id, term, term_normalized, month_key, hit_count)
       SELECT encode(gen_random_bytes(12), 'hex'), term, term_normalized, $1, hit_count
       FROM trending_searches
       WHERE hit_count > 0
       ON CONFLICT (term_normalized, month_key) DO NOTHING`,
      [key],
    );
  }

  async function listTrendingForMonthPostgres(monthKey, { sort = "hits-desc" } = {}) {
    const key = normalizeMonthKey(monthKey);
    await ensureMonthlySchema();
    await backfillMonthFromCatalogPostgres(key);
    const result = await query(
      `SELECT
          COALESCE(t.id, m.id) AS id,
          COALESCE(t.term, m.term) AS term,
          m.term_normalized,
          COALESCE(t.is_active, TRUE) AS is_active,
          COALESCE(t.is_manual, FALSE) AS is_manual,
          0 AS manual_rank,
          m.hit_count,
          m.month_key,
          COALESCE(t.created_at, m.created_at) AS created_at,
          m.updated_at
       FROM trending_search_monthly m
       LEFT JOIN trending_searches t
         ON t.term_normalized = m.term_normalized
       WHERE m.month_key = $1
         AND m.hit_count > 0
       ORDER BY m.hit_count DESC, m.updated_at DESC`,
      [key],
    );
    return sortByHits(result.rows.map(mapTrendingRow), sort);
  }

  async function listTrendingForMonthDimPostgres(
    monthKey,
    filters = {},
    { sort = "hits-desc" } = {},
  ) {
    const key = normalizeMonthKey(monthKey);
    await ensureMonthlySchema();
    const clauses = ["m.month_key = $1", "m.hit_count > 0"];
    const params = [key];
    if (filters.platform && filters.platform !== "all") {
      params.push(filters.platform);
      clauses.push(`m.platform_id = $${params.length}`);
    }
    if (filters.category && filters.category !== "all") {
      params.push(filters.category);
      clauses.push(`LOWER(m.category) = LOWER($${params.length})`);
    }
    if (filters.storeType && filters.storeType !== "all") {
      params.push(filters.storeType);
      clauses.push(`LOWER(m.store_type) = LOWER($${params.length})`);
    }
    if (filters.client && filters.client !== "all") {
      params.push(filters.client);
      clauses.push(`m.client = $${params.length}`);
    }
    const result = await query(
      `SELECT
          COALESCE(MAX(t.id), MIN(m.id)) AS id,
          COALESCE(MAX(t.term), MAX(m.term)) AS term,
          m.term_normalized,
          COALESCE(BOOL_OR(t.is_active), TRUE) AS is_active,
          COALESCE(BOOL_OR(t.is_manual), FALSE) AS is_manual,
          0 AS manual_rank,
          SUM(m.hit_count)::bigint AS hit_count,
          $1::text AS month_key,
          MIN(COALESCE(t.created_at, m.created_at)) AS created_at,
          MAX(m.updated_at) AS updated_at
       FROM trending_search_dim_monthly m
       LEFT JOIN trending_searches t
         ON t.term_normalized = m.term_normalized
       WHERE ${clauses.join(" AND ")}
       GROUP BY m.term_normalized
       HAVING SUM(m.hit_count) > 0
       ORDER BY hit_count DESC, updated_at DESC`,
      params,
    );
    return sortByHits(result.rows.map(mapTrendingRow), sort);
  }

  async function listFilterOptionsJson(monthKey) {
    const key = normalizeMonthKey(monthKey);
    const rows = await readJsonArray(DIM_MONTHLY_FILE);
    const platforms = new Map();
    const categories = new Map();
    const storeTypes = new Map();
    const clients = new Map();
    for (const row of rows) {
      if (String(row.monthKey || row.month_key || "") !== key) continue;
      const hits = Number(row.hitCount || row.hit_count || 0) || 0;
      if (hits <= 0) continue;
      const platformId = String(row.platformId || row.platform_id || "").trim();
      const category = String(row.category || "").trim();
      const storeType = String(row.storeType || row.store_type || "").trim();
      const client = String(row.client || "").trim();
      if (platformId) {
        platforms.set(platformId, (platforms.get(platformId) || 0) + hits);
      }
      if (category) {
        categories.set(category, (categories.get(category) || 0) + hits);
      }
      if (storeType) {
        storeTypes.set(storeType, (storeTypes.get(storeType) || 0) + hits);
      }
      if (client) {
        clients.set(client, (clients.get(client) || 0) + hits);
      }
    }
    const toOptions = (map, labelFn) =>
      [...map.entries()]
        .map(([id, totalHits]) => ({
          id,
          label: labelFn ? labelFn(id) : id,
          totalHits,
        }))
        .sort((a, b) => b.totalHits - a.totalHits || a.label.localeCompare(b.label));
    return {
      platforms: toOptions(platforms, (id) => id.charAt(0).toUpperCase() + id.slice(1)),
      categories: toOptions(categories),
      storeTypes: toOptions(storeTypes),
      clients: toOptions(
        clients,
        (id) => CLIENT_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      ),
    };
  }

  async function listFilterOptionsPostgres(monthKey) {
    const key = normalizeMonthKey(monthKey);
    await ensureMonthlySchema();
    const [platforms, categories, storeTypes, clients] = await Promise.all([
      query(
        `SELECT platform_id AS id, COALESCE(SUM(hit_count), 0)::bigint AS "totalHits"
         FROM trending_search_dim_monthly
         WHERE month_key = $1 AND platform_id <> '' AND hit_count > 0
         GROUP BY platform_id
         ORDER BY "totalHits" DESC, platform_id ASC`,
        [key],
      ),
      query(
        `SELECT category AS id, COALESCE(SUM(hit_count), 0)::bigint AS "totalHits"
         FROM trending_search_dim_monthly
         WHERE month_key = $1 AND category <> '' AND hit_count > 0
         GROUP BY category
         ORDER BY "totalHits" DESC, category ASC`,
        [key],
      ),
      query(
        `SELECT store_type AS id, COALESCE(SUM(hit_count), 0)::bigint AS "totalHits"
         FROM trending_search_dim_monthly
         WHERE month_key = $1 AND store_type <> '' AND hit_count > 0
         GROUP BY store_type
         ORDER BY "totalHits" DESC, store_type ASC`,
        [key],
      ),
      query(
        `SELECT client AS id, COALESCE(SUM(hit_count), 0)::bigint AS "totalHits"
         FROM trending_search_dim_monthly
         WHERE month_key = $1 AND client <> '' AND hit_count > 0
         GROUP BY client
         ORDER BY "totalHits" DESC, client ASC`,
        [key],
      ),
    ]);
    const mapRows = (result, labelFn) =>
      result.rows
        .map((row) => {
          const id = String(row.id || "").trim();
          if (!id) return null;
          return {
            id,
            label: labelFn ? labelFn(id) : id,
            totalHits: Number(row.totalHits || 0) || 0,
          };
        })
        .filter(Boolean);
    return {
      platforms: mapRows(platforms, (id) => id.charAt(0).toUpperCase() + id.slice(1)),
      categories: mapRows(categories),
      storeTypes: mapRows(storeTypes),
      clients: mapRows(
        clients,
        (id) => CLIENT_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      ),
    };
  }

  async function listFilterOptions(monthKey) {
    if (isPostgresConfigured()) {
      try {
        return await listFilterOptionsPostgres(monthKey);
      } catch (_) {
        // fall through
      }
    }
    return listFilterOptionsJson(monthKey);
  }

  async function listAvailableMonths() {
    if (isPostgresConfigured()) {
      try {
        const months = await listAvailableMonthsPostgres();
        const current = currentMonthKey();
        if (!months.some((item) => item.monthKey === current)) {
          months.unshift({ monthKey: current, totalHits: 0, termCount: 0 });
        }
        return months;
      } catch (_) {
        // fall through
      }
    }
    const months = await listAvailableMonthsJson();
    const current = currentMonthKey();
    if (!months.some((item) => item.monthKey === current)) {
      months.unshift({ monthKey: current, totalHits: 0, termCount: 0 });
    }
    return months;
  }

  async function listTrendingForMonth(monthKey, options = {}) {
    const sort = options.sort || "hits-desc";
    const filters = {
      platform: options.platform || "all",
      category: options.category || "all",
      storeType: options.storeType || "all",
      client: options.client || "all",
      source: options.source || "all",
      visibility: options.visibility || "all",
      q: options.q || "",
    };
    let items = [];
    const useDim = hasDimensionalFilter(filters);
    if (isPostgresConfigured()) {
      try {
        items = useDim
          ? await listTrendingForMonthDimPostgres(monthKey, filters, { sort })
          : await listTrendingForMonthPostgres(monthKey, { sort });
      } catch (_) {
        items = useDim
          ? await listTrendingForMonthDimJson(monthKey, filters, { sort })
          : await listTrendingForMonthJson(monthKey, { sort });
      }
    } else {
      items = useDim
        ? await listTrendingForMonthDimJson(monthKey, filters, { sort })
        : await listTrendingForMonthJson(monthKey, { sort });
    }
    return sortByHits(applyMetaFilters(items, filters), sort);
  }

  async function listPublicTrending(limit = 12) {
    const monthKey = currentMonthKey();
    const items = await listTrendingForMonth(monthKey, { sort: "hits-desc" });
    return items
      .filter((item) => item.isActive && item.term && item.hitCount > 0)
      .slice(0, Math.min(MAX_TRENDING_PUBLIC, Math.max(1, limit)));
  }

  async function listAllTrending(monthKey, options = {}) {
    return listTrendingForMonth(monthKey || currentMonthKey(), options);
  }

  async function readMonthlyHitCountJson(termNormalized, monthKey) {
    const monthly = await readJsonArray(MONTHLY_FILE);
    const row = monthly.find(
      (entry) =>
        String(entry.termNormalized || entry.term_normalized || "") === termNormalized &&
        String(entry.monthKey || entry.month_key || "") === monthKey,
    );
    return Number(row?.hitCount || row?.hit_count || 0) || 0;
  }

  async function claimUniqueHitJson({ actorKey, termNormalized, monthKey }) {
    if (!actorKey || !termNormalized || !monthKey) return false;
    const rows = await readJsonArray(UNIQUE_HITS_FILE);
    const exists = rows.some(
      (row) =>
        String(row.actorKey || "") === actorKey &&
        String(row.termNormalized || "") === termNormalized &&
        String(row.monthKey || "") === monthKey,
    );
    if (exists) return false;
    rows.unshift({
      id: newId(),
      actorKey,
      termNormalized,
      monthKey,
      createdAt: nowIso(),
    });
    await writeJsonArray(UNIQUE_HITS_FILE, rows.slice(0, MAX_MONTHLY_JSON_ROWS));
    return true;
  }

  async function claimUniqueHitPostgres({ actorKey, termNormalized, monthKey }) {
    if (!actorKey || !termNormalized || !monthKey) return false;
    await ensureMonthlySchema();
    const result = await query(
      `INSERT INTO trending_search_unique_hits (id, actor_key, term_normalized, month_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (actor_key, term_normalized, month_key) DO NOTHING
       RETURNING id`,
      [newId(), actorKey, termNormalized, monthKey],
    );
    return Boolean(result.rows.length);
  }

  async function claimDimUniqueHitJson({
    actorKey,
    termNormalized,
    monthKey,
    platformId = "",
    category = "",
    storeType = "",
    client = "",
  }) {
    if (!actorKey || !termNormalized || !monthKey) return false;
    const rows = await readJsonArray(DIM_UNIQUE_HITS_FILE);
    const exists = rows.some(
      (row) =>
        String(row.actorKey || "") === actorKey &&
        String(row.termNormalized || "") === termNormalized &&
        String(row.monthKey || "") === monthKey &&
        String(row.platformId || "") === platformId &&
        String(row.category || "") === category &&
        String(row.storeType || "") === storeType &&
        String(row.client || "") === client,
    );
    if (exists) return false;
    rows.unshift({
      id: newId(),
      actorKey,
      termNormalized,
      monthKey,
      platformId,
      category,
      storeType,
      client,
      createdAt: nowIso(),
    });
    await writeJsonArray(DIM_UNIQUE_HITS_FILE, rows.slice(0, MAX_MONTHLY_JSON_ROWS));
    return true;
  }

  async function claimDimUniqueHitPostgres({
    actorKey,
    termNormalized,
    monthKey,
    platformId = "",
    category = "",
    storeType = "",
    client = "",
  }) {
    if (!actorKey || !termNormalized || !monthKey) return false;
    await ensureMonthlySchema();
    const result = await query(
      `INSERT INTO trending_search_dim_unique_hits
         (id, actor_key, term_normalized, month_key, platform_id, category, store_type, client)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (
         actor_key, term_normalized, month_key, platform_id, category, store_type, client
       ) DO NOTHING
       RETURNING id`,
      [
        newId(),
        actorKey,
        termNormalized,
        monthKey,
        platformId,
        category,
        storeType,
        client,
      ],
    );
    return Boolean(result.rows.length);
  }

  async function incrementDimMonthlyJson({
    display,
    termNormalized,
    monthKey,
    platformId = "",
    category = "",
    storeType = "",
    client = "",
  }) {
    const monthly = await readJsonArray(DIM_MONTHLY_FILE);
    const index = monthly.findIndex(
      (row) =>
        String(row.termNormalized || row.term_normalized || "") === termNormalized &&
        String(row.monthKey || row.month_key || "") === monthKey &&
        String(row.platformId || row.platform_id || "") === platformId &&
        String(row.category || "") === category &&
        String(row.storeType || row.store_type || "") === storeType &&
        String(row.client || "") === client,
    );
    if (index >= 0) {
      monthly[index] = {
        ...monthly[index],
        term: display,
        hitCount: (Number(monthly[index].hitCount || monthly[index].hit_count || 0) || 0) + 1,
        updatedAt: nowIso(),
      };
    } else {
      monthly.unshift({
        id: newId(),
        term: display,
        termNormalized,
        monthKey,
        platformId,
        category,
        storeType,
        client,
        hitCount: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    await writeJsonArray(DIM_MONTHLY_FILE, monthly.slice(0, MAX_MONTHLY_JSON_ROWS));
  }

  async function incrementDimMonthlyPostgres({
    display,
    termNormalized,
    monthKey,
    platformId = "",
    category = "",
    storeType = "",
    client = "",
  }) {
    await ensureMonthlySchema();
    await query(
      `INSERT INTO trending_search_dim_monthly
         (id, term, term_normalized, month_key, platform_id, category, store_type, client, hit_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
       ON CONFLICT (term_normalized, month_key, platform_id, category, store_type, client)
       DO UPDATE SET
         hit_count = trending_search_dim_monthly.hit_count + 1,
         term = EXCLUDED.term,
         updated_at = NOW()`,
      [
        newId(),
        display,
        termNormalized,
        monthKey,
        platformId,
        category,
        storeType,
        client,
      ],
    );
  }

  async function recordDimensionalHit({
    display,
    termNormalized,
    monthKey,
    actorKey,
    platformId = "",
    category = "",
    storeType = "",
    client = "",
  }) {
    if (!actorKey || !termNormalized || !monthKey) return false;
    const dims = {
      platformId: platformId || "",
      category: category || "",
      storeType: storeType || "",
      client: client || "",
    };
    if (isPostgresConfigured()) {
      try {
        const isNew = await claimDimUniqueHitPostgres({
          actorKey,
          termNormalized,
          monthKey,
          ...dims,
        });
        if (!isNew) return false;
        await incrementDimMonthlyPostgres({
          display,
          termNormalized,
          monthKey,
          ...dims,
        });
        return true;
      } catch (_) {
        // fall through to JSON
      }
    }
    const isNew = await claimDimUniqueHitJson({
      actorKey,
      termNormalized,
      monthKey,
      ...dims,
    });
    if (!isNew) return false;
    await incrementDimMonthlyJson({
      display,
      termNormalized,
      monthKey,
      ...dims,
    });
    return true;
  }

  async function ensureCatalogTermJson(display, key) {
    const items = await listCatalogJson();
    const index = items.findIndex((item) => item.termNormalized === key);
    if (index >= 0) {
      if (!items[index].isManual && items[index].term !== display) {
        items[index] = {
          ...items[index],
          term: display,
          updatedAt: nowIso(),
        };
        await writeJsonArray(TRENDING_FILE, items);
      }
      return items[index];
    }
    const created = mapTrendingRow({
      id: newId(),
      term: display,
      term_normalized: key,
      is_active: true,
      is_manual: false,
      manual_rank: 0,
      hit_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    });
    items.unshift(created);
    await writeJsonArray(TRENDING_FILE, items.slice(0, 500));
    return created;
  }

  async function upsertHitJson(term, identity = {}) {
    const display = normalizeTerm(term);
    const key = normalizeTermKey(display);
    if (!key) return null;
    const monthKey = currentMonthKey();
    const accountId = String(identity.accountId || "").trim();
    const clientKey = String(identity.clientKey || "").trim();
    const context = normalizeSearchContext(identity);
    const actorKey = resolveActorKey({ accountId, clientKey });
    const catalogItem = await ensureCatalogTermJson(display, key);

    if (!actorKey) {
      return {
        ...catalogItem,
        hitCount: await readMonthlyHitCountJson(key, monthKey),
        monthKey,
        counted: false,
      };
    }

    const isNewUniqueHit = await claimUniqueHitJson({
      actorKey,
      termNormalized: key,
      monthKey,
    });

    // Dimensional counts are independent of the global unique-hit ledger.
    await recordDimensionalHit({
      display,
      termNormalized: key,
      monthKey,
      actorKey,
      ...context,
    });

    if (!isNewUniqueHit) {
      return {
        ...catalogItem,
        hitCount: await readMonthlyHitCountJson(key, monthKey),
        monthKey,
        counted: false,
      };
    }

    const items = await listCatalogJson();
    const index = items.findIndex((item) => item.termNormalized === key);
    if (index >= 0) {
      items[index] = {
        ...items[index],
        term: items[index].isManual ? items[index].term : display,
        hitCount: items[index].hitCount + 1,
        updatedAt: nowIso(),
      };
      await writeJsonArray(TRENDING_FILE, items);
    }

    const monthly = await readJsonArray(MONTHLY_FILE);
    const monthlyIndex = monthly.findIndex(
      (row) =>
        String(row.termNormalized || row.term_normalized || "") === key &&
        String(row.monthKey || row.month_key || "") === monthKey,
    );
    let monthlyHits = 1;
    if (monthlyIndex >= 0) {
      monthlyHits = (Number(monthly[monthlyIndex].hitCount || 0) || 0) + 1;
      monthly[monthlyIndex] = {
        ...monthly[monthlyIndex],
        term: catalogItem.isManual ? monthly[monthlyIndex].term || display : display,
        hitCount: monthlyHits,
        updatedAt: nowIso(),
      };
    } else {
      monthly.unshift({
        id: newId(),
        term: display,
        termNormalized: key,
        monthKey,
        hitCount: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    await writeJsonArray(MONTHLY_FILE, monthly.slice(0, MAX_MONTHLY_JSON_ROWS));

    const refreshed = index >= 0 ? items[index] : catalogItem;
    return {
      ...refreshed,
      hitCount: monthlyHits,
      monthKey,
      counted: true,
    };
  }

  async function upsertHitPostgres(term, identity = {}) {
    const display = normalizeTerm(term);
    const key = normalizeTermKey(display);
    if (!key) return null;
    const monthKey = currentMonthKey();
    const accountId = String(identity.accountId || "").trim();
    const clientKey = String(identity.clientKey || "").trim();
    const context = normalizeSearchContext(identity);
    const actorKey = resolveActorKey({ accountId, clientKey });

    try {
      await ensureMonthlySchema();
      const catalog = await query(
        `INSERT INTO trending_searches (id, term, term_normalized, is_active, is_manual, manual_rank, hit_count)
         VALUES ($1, $2, $3, TRUE, FALSE, 0, 0)
         ON CONFLICT (term_normalized) DO UPDATE SET
           term = CASE WHEN trending_searches.is_manual THEN trending_searches.term ELSE EXCLUDED.term END,
           updated_at = NOW()
         RETURNING id, term, term_normalized, is_active, is_manual, manual_rank, hit_count, created_at, updated_at`,
        [newId(), display, key],
      );
      const base = mapTrendingRow(catalog.rows[0]);

      if (!actorKey) {
        const existingMonthly = await query(
          `SELECT hit_count FROM trending_search_monthly
           WHERE term_normalized = $1 AND month_key = $2
           LIMIT 1`,
          [key, monthKey],
        );
        return {
          ...base,
          hitCount: Number(existingMonthly.rows[0]?.hit_count || 0) || 0,
          monthKey,
          counted: false,
        };
      }

      await recordDimensionalHit({
        display,
        termNormalized: key,
        monthKey,
        actorKey,
        ...context,
      });

      const isNewUniqueHit = await claimUniqueHitPostgres({
        actorKey,
        termNormalized: key,
        monthKey,
      });
      if (!isNewUniqueHit) {
        const existingMonthly = await query(
          `SELECT hit_count FROM trending_search_monthly
           WHERE term_normalized = $1 AND month_key = $2
           LIMIT 1`,
          [key, monthKey],
        );
        return {
          ...base,
          hitCount: Number(existingMonthly.rows[0]?.hit_count || 0) || 0,
          monthKey,
          counted: false,
        };
      }

      await query(
        `UPDATE trending_searches
         SET hit_count = trending_searches.hit_count + 1,
             updated_at = NOW()
         WHERE term_normalized = $1`,
        [key],
      );
      const monthly = await query(
        `INSERT INTO trending_search_monthly (id, term, term_normalized, month_key, hit_count)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (term_normalized, month_key) DO UPDATE SET
           hit_count = trending_search_monthly.hit_count + 1,
           term = CASE
             WHEN EXISTS (
               SELECT 1 FROM trending_searches ts
               WHERE ts.term_normalized = EXCLUDED.term_normalized AND ts.is_manual = TRUE
             ) THEN trending_search_monthly.term
             ELSE EXCLUDED.term
           END,
           updated_at = NOW()
         RETURNING id, term, term_normalized, month_key, hit_count, created_at, updated_at`,
        [newId(), display, key, monthKey],
      );
      const refreshed = await query(
        `SELECT id, term, term_normalized, is_active, is_manual, manual_rank, hit_count, created_at, updated_at
         FROM trending_searches WHERE term_normalized = $1 LIMIT 1`,
        [key],
      );
      return {
        ...mapTrendingRow(refreshed.rows[0] || catalog.rows[0]),
        hitCount: Number(monthly.rows[0]?.hit_count || 0) || 0,
        monthKey,
        counted: true,
      };
    } catch (_) {
      return upsertHitJson(term, identity);
    }
  }

  async function recordSearchHit(term, identity = {}) {
    if (isPostgresConfigured()) {
      return upsertHitPostgres(term, identity);
    }
    return upsertHitJson(term, identity);
  }

  async function listHistoryJson({ accountId = "", clientKey = "" } = {}) {
    const rows = await readJsonArray(HISTORY_FILE);
    const account = String(accountId || "").trim();
    const client = String(clientKey || "").trim();
    return rows
      .filter((row) => {
        const rowAccount = String(row.accountId || "").trim();
        const rowClient = String(row.clientKey || "").trim();
        if (account && rowAccount === account) return true;
        if (client && rowClient === client) return true;
        return false;
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }

  async function saveHistoryJson(rows) {
    await writeJsonArray(HISTORY_FILE, rows.slice(0, 5000));
  }

  async function appendRecentSearch({ term, accountId = "", clientKey = "" } = {}) {
    const display = normalizeTerm(term);
    const key = normalizeTermKey(display);
    if (!key) return [];
    const account = String(accountId || "").trim();
    const client = String(clientKey || "").trim();
    if (!account && !client) return [];

    if (isPostgresConfigured()) {
      try {
        await query(
          `DELETE FROM user_search_history
           WHERE term_normalized = $1
             AND (
               ($2 <> '' AND account_id = $2)
               OR ($3 <> '' AND client_key = $3)
             )`,
          [key, account, client],
        );
        await query(
          `INSERT INTO user_search_history (id, account_id, client_key, search_term, term_normalized)
           VALUES ($1, $2, $3, $4, $5)`,
          [newId(), account, client, display, key],
        );
        const result = await query(
          `SELECT search_term, created_at
           FROM user_search_history
           WHERE ($1 <> '' AND account_id = $1) OR ($2 <> '' AND client_key = $2)
           ORDER BY created_at DESC
           LIMIT $3`,
          [account, client, MAX_RECENT_PER_USER],
        );
        await query(
          `DELETE FROM user_search_history
           WHERE id IN (
             SELECT id FROM user_search_history
             WHERE ($1 <> '' AND account_id = $1) OR ($2 <> '' AND client_key = $2)
             ORDER BY created_at DESC
             OFFSET $3
           )`,
          [account, client, MAX_RECENT_PER_USER],
        );
        return result.rows.map((row) => String(row.search_term || ""));
      } catch (_) {
        // fall through to JSON
      }
    }

    const all = await readJsonArray(HISTORY_FILE);
    const filtered = all.filter((row) => {
      const rowAccount = String(row.accountId || "").trim();
      const rowClient = String(row.clientKey || "").trim();
      const sameOwner =
        (account && rowAccount === account) || (client && rowClient === client);
      if (!sameOwner) return true;
      return normalizeTermKey(row.searchTerm) !== key;
    });
    filtered.unshift({
      id: newId(),
      accountId: account,
      clientKey: client,
      searchTerm: display,
      termNormalized: key,
      createdAt: nowIso(),
    });
    await saveHistoryJson(filtered);
    return filtered
      .filter((row) => {
        const rowAccount = String(row.accountId || "").trim();
        const rowClient = String(row.clientKey || "").trim();
        return (account && rowAccount === account) || (client && rowClient === client);
      })
      .slice(0, MAX_RECENT_PER_USER)
      .map((row) => String(row.searchTerm || ""));
  }

  async function listRecentSearches({ accountId = "", clientKey = "", limit = 20 } = {}) {
    const account = String(accountId || "").trim();
    const client = String(clientKey || "").trim();
    const capped = Math.min(MAX_RECENT_PER_USER, Math.max(1, Number(limit) || 20));
    if (!account && !client) return [];

    if (isPostgresConfigured()) {
      try {
        const result = await query(
          `SELECT search_term
           FROM user_search_history
           WHERE ($1 <> '' AND account_id = $1) OR ($2 <> '' AND client_key = $2)
           ORDER BY created_at DESC
           LIMIT $3`,
          [account, client, capped],
        );
        return result.rows.map((row) => String(row.search_term || "")).filter(Boolean);
      } catch (_) {
        // fall through
      }
    }

    const rows = await listHistoryJson({ accountId: account, clientKey: client });
    return rows.slice(0, capped).map((row) => String(row.searchTerm || "")).filter(Boolean);
  }

  async function deleteRecentSearch({ term, accountId = "", clientKey = "", clearAll = false } = {}) {
    const account = String(accountId || "").trim();
    const client = String(clientKey || "").trim();
    if (!account && !client) return [];

    if (isPostgresConfigured()) {
      try {
        if (clearAll) {
          await query(
            `DELETE FROM user_search_history
             WHERE ($1 <> '' AND account_id = $1) OR ($2 <> '' AND client_key = $2)`,
            [account, client],
          );
        } else {
          const key = normalizeTermKey(term);
          await query(
            `DELETE FROM user_search_history
             WHERE term_normalized = $1
               AND (
                 ($2 <> '' AND account_id = $2)
                 OR ($3 <> '' AND client_key = $3)
               )`,
            [key, account, client],
          );
        }
        return listRecentSearches({ accountId: account, clientKey: client });
      } catch (_) {
        // fall through
      }
    }

    const all = await readJsonArray(HISTORY_FILE);
    const key = normalizeTermKey(term);
    const next = all.filter((row) => {
      const rowAccount = String(row.accountId || "").trim();
      const rowClient = String(row.clientKey || "").trim();
      const sameOwner =
        (account && rowAccount === account) || (client && rowClient === client);
      if (!sameOwner) return true;
      if (clearAll) return false;
      return normalizeTermKey(row.searchTerm) !== key;
    });
    await saveHistoryJson(next);
    return listRecentSearches({ accountId: account, clientKey: client });
  }

  async function updateTrending(id, patch = {}) {
    const targetId = String(id || "").trim();
    if (!targetId) {
      throw new Error("Trending search id is required.");
    }

    if (isPostgresConfigured()) {
      try {
        const current = await query(
          `SELECT id, term, term_normalized, is_active, is_manual, manual_rank, hit_count, created_at, updated_at
           FROM trending_searches WHERE id = $1 LIMIT 1`,
          [targetId],
        );
        if (!current.rows.length) {
          throw new Error("Trending search not found.");
        }
        const prev = mapTrendingRow(current.rows[0]);
        const nextActive =
          patch.isActive === undefined ? prev.isActive : Boolean(patch.isActive);
        const nextManual =
          patch.isManual === undefined ? prev.isManual : Boolean(patch.isManual);
        const updated = await query(
          `UPDATE trending_searches
           SET is_active = $2,
               is_manual = $3,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, term, term_normalized, is_active, is_manual, manual_rank, hit_count, created_at, updated_at`,
          [targetId, nextActive, nextManual],
        );
        return mapTrendingRow(updated.rows[0]);
      } catch (error) {
        if (error instanceof Error && error.message === "Trending search not found.") {
          throw error;
        }
      }
    }

    const items = await listCatalogJson();
    const index = items.findIndex((item) => item.id === targetId);
    if (index < 0) {
      throw new Error("Trending search not found.");
    }
    items[index] = {
      ...items[index],
      isActive:
        patch.isActive === undefined ? items[index].isActive : Boolean(patch.isActive),
      isManual:
        patch.isManual === undefined ? items[index].isManual : Boolean(patch.isManual),
      updatedAt: nowIso(),
    };
    await writeJsonArray(TRENDING_FILE, items);
    return items[index];
  }

  async function deleteTrending(id) {
    const targetId = String(id || "").trim();
    if (!targetId) {
      throw new Error("Trending search id is required.");
    }

    if (isPostgresConfigured()) {
      try {
        const current = await query(
          `SELECT term_normalized FROM trending_searches WHERE id = $1 LIMIT 1`,
          [targetId],
        );
        if (current.rows.length) {
          const termKey = String(current.rows[0].term_normalized || "");
          await query(`DELETE FROM trending_searches WHERE id = $1`, [targetId]);
          if (termKey) {
            await ensureMonthlySchema();
            await query(
              `DELETE FROM trending_search_monthly WHERE term_normalized = $1`,
              [termKey],
            );
            await query(
              `DELETE FROM trending_search_dim_monthly WHERE term_normalized = $1`,
              [termKey],
            );
            await query(
              `DELETE FROM trending_search_dim_unique_hits WHERE term_normalized = $1`,
              [termKey],
            );
          }
          return true;
        }
      } catch (_) {
        // fall through
      }
    }

    const items = await listCatalogJson();
    const target = items.find((item) => item.id === targetId);
    if (!target) {
      throw new Error("Trending search not found.");
    }
    await writeJsonArray(
      TRENDING_FILE,
      items.filter((item) => item.id !== targetId),
    );
    const monthly = await readJsonArray(MONTHLY_FILE);
    await writeJsonArray(
      MONTHLY_FILE,
      monthly.filter(
        (row) =>
          String(row.termNormalized || row.term_normalized || "") !==
          target.termNormalized,
      ),
    );
    const dimMonthly = await readJsonArray(DIM_MONTHLY_FILE);
    await writeJsonArray(
      DIM_MONTHLY_FILE,
      dimMonthly.filter(
        (row) =>
          String(row.termNormalized || row.term_normalized || "") !==
          target.termNormalized,
      ),
    );
    const dimUnique = await readJsonArray(DIM_UNIQUE_HITS_FILE);
    await writeJsonArray(
      DIM_UNIQUE_HITS_FILE,
      dimUnique.filter(
        (row) => String(row.termNormalized || "") !== target.termNormalized,
      ),
    );
    return true;
  }

  async function buildSuperAdminListPayload(monthKey, sort, filters = {}) {
    const trending = await listTrendingForMonth(monthKey, { sort, ...filters });
    const filterOptions = await listFilterOptions(monthKey);
    return {
      monthKey,
      sort,
      filters: {
        platform: filters.platform || "all",
        category: filters.category || "all",
        storeType: filters.storeType || "all",
        client: filters.client || "all",
        source: filters.source || "all",
        visibility: filters.visibility || "all",
        q: filters.q || "",
      },
      filterOptions,
      months: await listAvailableMonths(),
      trending,
      total: trending.length,
      activeCount: trending.filter((item) => item.isActive).length,
    };
  }

  async function tryHandleTrendingSearchRoutes(request, response, requestUrl) {
    const { pathname } = requestUrl;

    if (pathname === "/api/trending-searches" && request.method === "GET") {
      try {
        const limit = Number(requestUrl.searchParams.get("limit") || 12) || 12;
        const monthKey = normalizeMonthKey(
          requestUrl.searchParams.get("month") || currentMonthKey(),
        );
        const platformId = normalizePlatformId(
          requestUrl.searchParams.get("platformId") ||
            requestUrl.searchParams.get("platform") ||
            "",
        );
        const listOptions = {
          sort: "hits-desc",
          ...(platformId ? { platform: platformId } : {}),
        };
        const trending = (await listTrendingForMonth(monthKey, listOptions))
          .filter((item) => item.isActive && item.term && item.hitCount > 0)
          .slice(0, Math.min(MAX_TRENDING_PUBLIC, Math.max(1, limit)));
        sendJson(response, 200, {
          monthKey,
          platformId: platformId || "",
          trending: trending.map((item) => ({
            id: item.id,
            term: item.term,
            hitCount: item.hitCount,
            isManual: item.isManual,
            rank: item.rank,
          })),
        });
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : "Unable to load trending searches.",
        });
      }
      return true;
    }

    if (pathname === "/api/search-events" && request.method === "POST") {
      try {
        const payload = await parseRequestBody(request);
        const term = normalizeTerm(payload.term ?? payload.query ?? payload.searchTerm);
        if (!term) {
          throw new Error("Search term is required.");
        }
        const accountId = String(getRequestAccountIdentifier(request, requestUrl).id).trim();
        const clientKey = String(payload.clientKey ?? payload.deviceKey ?? "").trim();
        const context = normalizeSearchContext(payload);
        const hit = await recordSearchHit(term, {
          accountId,
          clientKey,
          ...context,
        });
        const recent = await appendRecentSearch({ term, accountId, clientKey });
        sendJson(response, 201, {
          message: hit?.counted
            ? "Search recorded."
            : "Search recorded (already counted for this user this month).",
          monthKey: currentMonthKey(),
          counted: Boolean(hit?.counted),
          trending: hit
            ? { id: hit.id, term: hit.term, hitCount: hit.hitCount }
            : null,
          recent,
        });
      } catch (error) {
        sendJson(response, 400, {
          message: error instanceof Error ? error.message : "Unable to record search.",
        });
      }
      return true;
    }

    if (pathname === "/api/recent-searches" && request.method === "GET") {
      try {
        const recent = await listRecentSearches({
          accountId: getRequestAccountIdentifier(request, requestUrl).id,
          clientKey:
            requestUrl.searchParams.get("clientKey") ||
            requestUrl.searchParams.get("deviceKey") ||
            "",
          limit: Number(requestUrl.searchParams.get("limit") || 20) || 20,
        });
        sendJson(response, 200, { recent });
      } catch (error) {
        sendJson(response, 500, {
          message: error instanceof Error ? error.message : "Unable to load recent searches.",
        });
      }
      return true;
    }

    if (pathname === "/api/recent-searches" && request.method === "DELETE") {
      try {
        const payload = await parseRequestBody(request).catch(() => ({}));
        const recent = await deleteRecentSearch({
          term: payload.term ?? requestUrl.searchParams.get("term") ?? "",
          accountId: getRequestAccountIdentifier(request, requestUrl).id,
          clientKey:
            payload.clientKey ??
            payload.deviceKey ??
            requestUrl.searchParams.get("clientKey") ??
            "",
          clearAll: Boolean(payload.clearAll ?? requestUrl.searchParams.get("clearAll")),
        });
        sendJson(response, 200, { recent, message: "Recent searches updated." });
      } catch (error) {
        sendJson(response, 400, {
          message: error instanceof Error ? error.message : "Unable to update recent searches.",
        });
      }
      return true;
    }

    if (pathname === "/api/super-admin/trending-searches") {
      if (!requireSuperAdmin(request, response)) {
        return true;
      }

      if (request.method === "GET") {
        try {
          const monthKey = normalizeMonthKey(
            requestUrl.searchParams.get("month") || currentMonthKey(),
          );
          const sort = String(requestUrl.searchParams.get("sort") || "hits-desc")
            .trim()
            .toLowerCase();
          const filters = parseListFilters(requestUrl.searchParams);
          const payload = await buildSuperAdminListPayload(monthKey, sort, filters);
          sendJson(response, 200, payload);
        } catch (error) {
          sendJson(response, 500, {
            message:
              error instanceof Error ? error.message : "Unable to load trending searches.",
          });
        }
        return true;
      }

      if (request.method === "POST") {
        sendJson(response, 403, {
          message:
            "Adding top searches is disabled. Rank comes from real monthly search volume.",
        });
        return true;
      }

      if (request.method === "PUT") {
        try {
          const payload = await parseRequestBody(request);
          const id = payload.id ?? payload.trendingId;
          const monthKey = normalizeMonthKey(payload.month || currentMonthKey());
          const sort = String(payload.sort || "hits-desc").trim().toLowerCase();
          const filters = parseListFilters(payload);
          await updateTrending(id, {
            isActive: payload.isActive,
            isManual: payload.isManual,
          });
          const list = await buildSuperAdminListPayload(monthKey, sort, filters);
          sendJson(response, 200, {
            ...list,
            message: "Top search updated.",
          });
        } catch (error) {
          sendJson(response, 400, {
            message: error instanceof Error ? error.message : "Unable to update top search.",
          });
        }
        return true;
      }

      if (request.method === "DELETE") {
        try {
          const payload = await parseRequestBody(request).catch(() => ({}));
          const id =
            payload.id ??
            payload.trendingId ??
            requestUrl.searchParams.get("id") ??
            "";
          const monthKey = normalizeMonthKey(
            payload.month || requestUrl.searchParams.get("month") || currentMonthKey(),
          );
          const sort = String(
            payload.sort || requestUrl.searchParams.get("sort") || "hits-desc",
          )
            .trim()
            .toLowerCase();
          const filters = parseListFilters({
            ...Object.fromEntries(requestUrl.searchParams.entries()),
            ...payload,
          });
          await deleteTrending(id);
          const list = await buildSuperAdminListPayload(monthKey, sort, filters);
          sendJson(response, 200, {
            ...list,
            message: "Top search removed.",
          });
        } catch (error) {
          sendJson(response, 400, {
            message: error instanceof Error ? error.message : "Unable to remove top search.",
          });
        }
        return true;
      }

      sendJson(response, 405, { message: "Method not allowed." });
      return true;
    }

    return false;
  }

  return {
    tryHandleTrendingSearchRoutes,
    listPublicTrending,
    listAllTrending,
    listAvailableMonths,
    currentMonthKey,
  };
}

module.exports = {
  createTrendingSearchesApi,
};

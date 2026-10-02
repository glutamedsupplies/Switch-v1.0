"use strict";

/**
 * Trending search quality gates:
 * - Reject meaningless / empty-result noise (e.g. "hhh")
 * - Only count terms that resolve to existing catalog content
 * - Typo-tolerant match (e.g. "strewberry" → "strawberry") with canonical display
 */

const MAX_TERM_LENGTH = 80;
const MIN_MEANINGFUL_LENGTH = 2;
/** Minimum buyer-live-search-style score to count as a catalog hit for trending. */
const MIN_CATALOG_MATCH_SCORE = 45;
/** Skip filler words when matching multi-word app queries like "masarap na milktea". */
const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "ang",
  "at",
  "ay",
  "de",
  "del",
  "for",
  "in",
  "is",
  "it",
  "mga",
  "na",
  "ng",
  "of",
  "on",
  "sa",
  "the",
  "to",
  "with",
]);

function normalizeSearchTerm(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_TERM_LENGTH);
}

function normalizeSearchKey(value) {
  return normalizeSearchTerm(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchKey(value) {
  return normalizeSearchKey(value).replace(/\s+/g, "");
}

function significantQueryTokens(queryKey) {
  return normalizeSearchKey(queryKey)
    .split(" ")
    .filter((token) => token.length >= 3 && !QUERY_STOPWORDS.has(token));
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  if (Math.abs(left.length - right.length) > 8) {
    return Math.abs(left.length - right.length);
  }
  const prev = Array.from({ length: right.length + 1 }, (_, index) => index);
  const curr = Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    const leftChar = left.charCodeAt(i - 1);
    for (let j = 1; j <= right.length; j += 1) {
      const cost = leftChar === right.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) prev[j] = curr[j];
  }
  return prev[right.length];
}

function maxEditsForQuery(query) {
  const length = String(query || "").length;
  if (length <= 2) return 0;
  if (length <= 4) return 1;
  if (length <= 8) return 2;
  return 3;
}

/**
 * Same scoring model as buyer live search (main_dart.js / search_bar.dart).
 * Higher = stronger match. Returns -1 when nothing matches.
 */
function catalogMatchScore(haystack, normalizedQuery) {
  const key = normalizeSearchKey(haystack);
  const query = normalizeSearchKey(normalizedQuery);
  if (!key || !query) return -1;

  if (key === query) return 300;
  if (key.startsWith(query)) return 200;
  if (key.includes(query)) return 100;

  const compactKey = key.replace(/\s+/g, "");
  const compactQuery = query.replace(/\s+/g, "");
  if (compactKey.includes(compactQuery)) return 95;
  if (compactKey.startsWith(compactQuery)) return 90;

  const keyTokens = key.split(" ").filter(Boolean);
  const queryTokens = query.split(" ").filter(Boolean);

  if (
    queryTokens.length &&
    queryTokens.every((queryToken) =>
      keyTokens.some(
        (keyToken) =>
          keyToken === queryToken ||
          keyToken.startsWith(queryToken) ||
          keyToken.includes(queryToken) ||
          queryToken.includes(keyToken),
      ),
    )
  ) {
    return 85;
  }

  if (
    queryTokens.some((queryToken) =>
      keyTokens.some(
        (keyToken) =>
          keyToken.startsWith(queryToken) || queryToken.startsWith(keyToken),
      ),
    )
  ) {
    return 75;
  }

  const maxEdits = maxEditsForQuery(compactQuery);
  if (maxEdits > 0) {
    if (editDistance(compactKey, compactQuery) <= maxEdits) return 65;
    for (const token of keyTokens) {
      if (Math.abs(token.length - compactQuery.length) > maxEdits) continue;
      if (editDistance(token, compactQuery) <= maxEdits) return 60;
    }
    if (compactQuery.length >= 3 && compactKey.length >= compactQuery.length) {
      const prefix = compactKey.slice(0, compactQuery.length);
      if (editDistance(prefix, compactQuery) <= 1) return 50;
    }
    for (const token of keyTokens) {
      if (token.length < compactQuery.length) continue;
      for (
        let start = 0;
        start <= token.length - compactQuery.length;
        start += 1
      ) {
        const slice = token.slice(start, start + compactQuery.length);
        if (editDistance(slice, compactQuery) <= 1) return 45;
      }
    }
  }

  return -1;
}

function isRepeatedCharacterNoise(key) {
  const compact = compactSearchKey(key);
  if (compact.length < 2) return false;
  return /^(.)\1+$/.test(compact);
}

function isMeaningfulSearchTerm(value) {
  const display = normalizeSearchTerm(value);
  const key = normalizeSearchKey(display);
  if (!key || key.length < MIN_MEANINGFUL_LENGTH) {
    return { ok: false, reason: "too_short", display, key };
  }
  if (!/[a-z0-9]/i.test(key)) {
    return { ok: false, reason: "no_alnum", display, key };
  }
  if (isRepeatedCharacterNoise(key)) {
    return { ok: false, reason: "repeated_noise", display, key };
  }
  // Mostly the same 1–2 characters mashed (e.g. "hghghg", "asasas").
  const compact = compactSearchKey(key);
  if (compact.length >= 4) {
    const unique = new Set(compact.split(""));
    if (unique.size <= 2 && compact.length >= 5) {
      return { ok: false, reason: "low_entropy", display, key };
    }
  }
  return { ok: true, reason: "", display, key };
}

function normalizeCatalogEntries(rawEntries = []) {
  const seen = new Set();
  const out = [];
  for (const entry of Array.isArray(rawEntries) ? rawEntries : []) {
    const display = normalizeSearchTerm(
      entry?.display ?? entry?.term ?? entry?.name ?? entry,
    );
    const key = normalizeSearchKey(entry?.key || display);
    if (!display || !key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      display,
      key,
      source: String(entry?.source || "catalog"),
    });
  }
  return out;
}

/**
 * Resolve a user query to the best existing catalog term (typo-tolerant).
 * Also matches significant tokens inside longer phrases
 * (e.g. "masarap na milktea" → "Milktea") the same way app live search can surface hits.
 * Returns null when nothing in the system meaningfully matches.
 */
function resolveCatalogSearchMatch(query, catalogEntries = [], options = {}) {
  const minScore = Number(options.minScore ?? MIN_CATALOG_MATCH_SCORE) || MIN_CATALOG_MATCH_SCORE;
  const display = normalizeSearchTerm(query);
  const key = normalizeSearchKey(display);
  if (!key) return null;

  const catalog = normalizeCatalogEntries(catalogEntries);
  let best = null;

  function consider(entry, score, viaToken = "") {
    if (score < minScore) return;
    if (
      !best ||
      score > best.score ||
      (score === best.score && entry.display.length < best.display.length) ||
      (score === best.score &&
        entry.display.length === best.display.length &&
        entry.display.localeCompare(best.display) < 0)
    ) {
      best = {
        display: entry.display,
        key: entry.key,
        source: entry.source,
        score,
        query: display,
        queryKey: key,
        viaToken: viaToken || "",
        canonicalized: entry.key !== key,
      };
    }
  }

  for (const entry of catalog) {
    consider(entry, catalogMatchScore(entry.key, key));
  }

  // Multi-word / descriptive app queries: match on meaningful tokens only.
  if (!best || best.score < 85) {
    const tokens = significantQueryTokens(key);
    for (const token of tokens) {
      for (const entry of catalog) {
        const score = catalogMatchScore(entry.key, token);
        // Token hits are slightly preferred when they equal full-query weak scores.
        consider(entry, score, token);
      }
    }
  }

  return best;
}

function parseClientResultHints({
  clientResultCount = null,
  clientHasResults = null,
} = {}) {
  const parsedCount =
    clientResultCount === null ||
    clientResultCount === undefined ||
    clientResultCount === ""
      ? null
      : Number(clientResultCount);
  const hasResultsHint =
    clientHasResults === true ||
    clientHasResults === "true" ||
    clientHasResults === 1 ||
    clientHasResults === "1" ||
    (parsedCount !== null && Number.isFinite(parsedCount) && parsedCount > 0);
  const noResultsHint =
    clientHasResults === false ||
    clientHasResults === "false" ||
    clientHasResults === 0 ||
    clientHasResults === "0" ||
    (parsedCount !== null && Number.isFinite(parsedCount) && parsedCount <= 0);
  return {
    parsedCount:
      parsedCount !== null && Number.isFinite(parsedCount) ? parsedCount : null,
    hasResultsHint,
    noResultsHint,
  };
}

/**
 * Decide whether a search event should create trending evidence.
 * Recent history may still store the raw term; trending uses catalog matches,
 * or the typed term when the app itself returned live search hits.
 */
function evaluateTrendingSearchEligibility({
  term,
  catalogEntries = [],
  clientResultCount = null,
  clientHasResults = null,
} = {}) {
  const meaning = isMeaningfulSearchTerm(term);
  if (!meaning.ok) {
    return {
      eligible: false,
      reason: meaning.reason || "meaningless",
      term: meaning.display,
      canonicalTerm: "",
      match: null,
    };
  }

  const { hasResultsHint, noResultsHint } = parseClientResultHints({
    clientResultCount,
    clientHasResults,
  });

  const match = resolveCatalogSearchMatch(meaning.display, catalogEntries);
  if (match) {
    return {
      eligible: true,
      reason: match.viaToken
        ? "token_catalog_match"
        : match.canonicalized
          ? "fuzzy_catalog_match"
          : "catalog_match",
      term: meaning.display,
      // Prefer the real product/seller label for Top Searches.
      canonicalTerm: match.display,
      match,
    };
  }

  // App live search found listings/companies even if our catalog index missed a soft match.
  if (hasResultsHint && !noResultsHint) {
    return {
      eligible: true,
      reason: "app_search_results",
      term: meaning.display,
      canonicalTerm: meaning.display,
      match: null,
    };
  }

  return {
    eligible: false,
    reason: noResultsHint ? "no_results" : "no_catalog_match",
    term: meaning.display,
    canonicalTerm: "",
    match: null,
  };
}

function catalogKeySet(catalogEntries = []) {
  return new Set(
    normalizeCatalogEntries(catalogEntries).map((entry) => entry.key),
  );
}

function termExistsInCatalog(term, catalogEntries = []) {
  const key = normalizeSearchKey(term);
  if (!key) return false;
  return catalogKeySet(catalogEntries).has(key);
}

/** Public Top Searches filter: exact key OR soft/token catalog resolve still valid. */
function isTrendingTermCatalogValid(term, catalogEntries = []) {
  if (termExistsInCatalog(term, catalogEntries)) return true;
  return Boolean(resolveCatalogSearchMatch(term, catalogEntries));
}

function extractProductListingImageUrl(product = {}) {
  const candidates = [
    product.imageUrl,
    product.thumbnailUrl,
    product.photoUrl,
    product.coverImageUrl,
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    ...(Array.isArray(product.images) ? product.images : []),
  ];
  for (const candidate of candidates) {
    const imageUrl = String(
      candidate && typeof candidate === "object"
        ? candidate.url ?? candidate.imageUrl ?? candidate.src ?? ""
        : candidate ?? "",
    ).trim();
    if (imageUrl) {
      return imageUrl;
    }
  }
  return "";
}

function productCategoryHaystacks(product = {}) {
  const values = [];
  const push = (value) => {
    const text = String(value ?? "").trim();
    if (text) values.push(text);
  };
  push(product.category);
  push(product.primaryCategory);
  if (Array.isArray(product.categories)) {
    for (const entry of product.categories) {
      if (entry && typeof entry === "object") {
        push(entry.name ?? entry.label ?? entry.title);
      } else {
        push(entry);
      }
    }
  }
  if (Array.isArray(product.categoryNames)) {
    for (const name of product.categoryNames) push(name);
  }
  return values;
}

/**
 * Pick up to `limit` listing photos for a trending term.
 * Prefers stronger name matches and distinct seller admins so milktea
 * can rotate images from different stores that actually list milktea.
 */
function collectListingPreviewImages(term, products = [], options = {}) {
  const limit = Math.max(1, Math.min(6, Number(options.limit) || 3));
  const minScore = Number.isFinite(Number(options.minScore))
    ? Number(options.minScore)
    : MIN_CATALOG_MATCH_SCORE;
  const query = normalizeSearchTerm(term);
  if (!query || !Array.isArray(products) || !products.length) {
    return [];
  }

  const queryTokens = significantQueryTokens(query);
  const scored = [];

  for (const product of products) {
    if (!product || product.isActive === false) continue;
    const imageUrl = extractProductListingImageUrl(product);
    if (!imageUrl) continue;

    const adminId = String(
      product.adminId ?? product.admin_id ?? product.accountId ?? "",
    ).trim();
    const productId = String(product.id ?? product.productId ?? "").trim();
    const name = String(product.name ?? product.title ?? product.productName ?? "").trim();
    if (!name) continue;

    let bestScore = catalogMatchScore(name, query);
    for (const category of productCategoryHaystacks(product)) {
      bestScore = Math.max(bestScore, catalogMatchScore(category, query));
    }
    for (const token of queryTokens) {
      bestScore = Math.max(bestScore, catalogMatchScore(name, token));
      for (const category of productCategoryHaystacks(product)) {
        bestScore = Math.max(bestScore, catalogMatchScore(category, token));
      }
    }
    if (bestScore < minScore) continue;

    scored.push({
      url: imageUrl,
      adminId,
      productId,
      productName: name,
      score: bestScore,
      sold: Math.max(0, Math.trunc(Number(product.sold ?? product.unitsSold) || 0)),
    });
  }

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      right.sold - left.sold ||
      left.productName.localeCompare(right.productName, undefined, {
        sensitivity: "base",
      }),
  );

  const picked = [];
  const usedAdmins = new Set();
  const usedUrls = new Set();

  for (const entry of scored) {
    if (picked.length >= limit) break;
    const adminKey = entry.adminId || `product:${entry.productId || entry.url}`;
    if (usedAdmins.has(adminKey)) continue;
    const urlKey = entry.url.toLowerCase();
    if (usedUrls.has(urlKey)) continue;
    usedAdmins.add(adminKey);
    usedUrls.add(urlKey);
    picked.push({
      url: entry.url,
      adminId: entry.adminId,
      productId: entry.productId,
      productName: entry.productName,
    });
  }

  // If fewer than limit from distinct sellers, fill with next best unique urls.
  if (picked.length < limit) {
    for (const entry of scored) {
      if (picked.length >= limit) break;
      const urlKey = entry.url.toLowerCase();
      if (usedUrls.has(urlKey)) continue;
      usedUrls.add(urlKey);
      picked.push({
        url: entry.url,
        adminId: entry.adminId,
        productId: entry.productId,
        productName: entry.productName,
      });
    }
  }

  return picked;
}

module.exports = {
  MAX_TERM_LENGTH,
  MIN_MEANINGFUL_LENGTH,
  MIN_CATALOG_MATCH_SCORE,
  QUERY_STOPWORDS,
  normalizeSearchTerm,
  normalizeSearchKey,
  compactSearchKey,
  significantQueryTokens,
  editDistance,
  maxEditsForQuery,
  catalogMatchScore,
  isMeaningfulSearchTerm,
  normalizeCatalogEntries,
  resolveCatalogSearchMatch,
  evaluateTrendingSearchEligibility,
  catalogKeySet,
  termExistsInCatalog,
  isTrendingTermCatalogValid,
  extractProductListingImageUrl,
  collectListingPreviewImages,
};

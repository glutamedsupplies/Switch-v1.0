"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isMeaningfulSearchTerm,
  catalogMatchScore,
  resolveCatalogSearchMatch,
  evaluateTrendingSearchEligibility,
  termExistsInCatalog,
} = require("../services/trendingSearchQuality");

const CATALOG = [
  { display: "Strawberry", source: "product" },
  { display: "Banana Shake", source: "product" },
  { display: "Jollibee", source: "seller" },
];

test("rejects meaningless mashed queries like hhh", () => {
  const meaning = isMeaningfulSearchTerm("hhh");
  assert.equal(meaning.ok, false);
  assert.equal(meaning.reason, "repeated_noise");

  const eligibility = evaluateTrendingSearchEligibility({
    term: "hhh",
    catalogEntries: CATALOG,
  });
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.canonicalTerm, "");
});

test("rejects low-entropy keyboard mash", () => {
  const eligibility = evaluateTrendingSearchEligibility({
    term: "asasas",
    catalogEntries: CATALOG,
  });
  assert.equal(eligibility.eligible, false);
});

test("fuzzy-matches strewberry to Strawberry for top search", () => {
  assert.ok(catalogMatchScore("Strawberry", "strewberry") >= 45);

  const match = resolveCatalogSearchMatch("strewberry", CATALOG);
  assert.ok(match);
  assert.equal(match.display, "Strawberry");
  assert.equal(match.canonicalized, true);

  const eligibility = evaluateTrendingSearchEligibility({
    term: "strewberry",
    catalogEntries: CATALOG,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.canonicalTerm, "Strawberry");
  assert.equal(eligibility.reason, "fuzzy_catalog_match");
});

test("rejects mc do when McDonald's is not in the catalog", () => {
  const eligibility = evaluateTrendingSearchEligibility({
    term: "mc do",
    catalogEntries: CATALOG,
  });
  assert.equal(eligibility.eligible, false);
  assert.ok(
    eligibility.reason === "no_catalog_match" || eligibility.reason === "no_results",
  );
});

test("accepts exact existing seller/product terms", () => {
  const eligibility = evaluateTrendingSearchEligibility({
    term: "jollibee",
    catalogEntries: CATALOG,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.canonicalTerm, "Jollibee");
});

test("termExistsInCatalog is exact-key based for public list filtering", () => {
  assert.equal(termExistsInCatalog("Strawberry", CATALOG), true);
  assert.equal(termExistsInCatalog("strewberry", CATALOG), false);
  assert.equal(termExistsInCatalog("hhh", CATALOG), false);
});

test("counts descriptive app queries that hit an existing product token", () => {
  const catalog = [
    { display: "Classic Milktea", source: "product" },
    { display: "Strawberry", source: "product" },
  ];
  const eligibility = evaluateTrendingSearchEligibility({
    term: "masarap na milktea",
    catalogEntries: catalog,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.canonicalTerm, "Classic Milktea");
  assert.equal(eligibility.reason, "token_catalog_match");
});

test("counts when app reports live search results even without catalog soft match", () => {
  const eligibility = evaluateTrendingSearchEligibility({
    term: "masarap na milktea special",
    catalogEntries: [{ display: "Jollibee", source: "seller" }],
    clientResultCount: 3,
    clientHasResults: true,
  });
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.reason, "app_search_results");
  assert.equal(eligibility.canonicalTerm, "masarap na milktea special");
});

test("still rejects empty-result nonsense even if somehow meaningful-looking", () => {
  const eligibility = evaluateTrendingSearchEligibility({
    term: "zzzznotreal",
    catalogEntries: [{ display: "Strawberry", source: "product" }],
    clientResultCount: 0,
  });
  assert.equal(eligibility.eligible, false);
});

test("collectListingPreviewImages picks up to 3 listing photos from distinct sellers", () => {
  const { collectListingPreviewImages } = require("../services/trendingSearchQuality");
  const products = [
    {
      id: "p1",
      adminId: "seller-a",
      name: "Classic Milktea",
      imageUrl: "/uploads/a-milktea.jpg",
      sold: 12,
    },
    {
      id: "p2",
      adminId: "seller-b",
      name: "Wintermelon Milktea",
      imageUrl: "/uploads/b-milktea.jpg",
      sold: 8,
    },
    {
      id: "p3",
      adminId: "seller-c",
      name: "Okinawa Milktea",
      imageUrl: "/uploads/c-milktea.jpg",
      sold: 4,
    },
    {
      id: "p4",
      adminId: "seller-a",
      name: "Taro Milktea",
      imageUrl: "/uploads/a-taro.jpg",
      sold: 20,
    },
    {
      id: "p5",
      adminId: "seller-d",
      name: "Cheeseburger",
      imageUrl: "/uploads/burger.jpg",
      sold: 99,
    },
  ];

  const images = collectListingPreviewImages("milktea", products, { limit: 3 });
  assert.equal(images.length, 3);
  assert.deepEqual(
    images.map((entry) => entry.adminId).sort(),
    ["seller-a", "seller-b", "seller-c"],
  );
  assert.ok(images.every((entry) => /milktea/i.test(entry.productName)));
  assert.ok(images.every((entry) => entry.url.startsWith("/uploads/")));
});

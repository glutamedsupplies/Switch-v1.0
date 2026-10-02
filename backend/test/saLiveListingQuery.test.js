"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  filterAndSortLiveListings,
  paginateLiveListings,
  parseLiveListingQuery,
} = require("../services/saLiveListingQuery");

function listing(index, overrides = {}) {
  return {
    id: `prd-${index}`,
    name: `Listing ${String(index).padStart(3, "0")}`,
    approvalStatus: "approved",
    approvedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    originalPrice: 100 + index,
    salesPrice: 100 + index,
    categories: ["Shoes"],
    imageUrls: ["/uploads/a.webp"],
    companyName: "Acme Store",
    ...overrides,
  };
}

const hundred = Array.from({ length: 100 }, (_, index) => listing(index + 1));

function query(params) {
  return parseLiveListingQuery(new URLSearchParams(params));
}

test("returns only the requested page of 10", () => {
  const first = paginateLiveListings(hundred, query({ page: "1", pageSize: "10" }));
  assert.equal(first.items.length, 10);
  assert.equal(first.total, 100);
  assert.equal(first.totalPages, 10);
  assert.equal(first.items[0].id, "prd-100");

  const second = paginateLiveListings(hundred, query({ page: "2", pageSize: "10" }));
  assert.equal(second.items.length, 10);
  assert.equal(second.items[0].id, "prd-90");
  assert.ok(!second.items.some((item) => first.items.includes(item)));
});

test("clamps page past the end and caps page size", () => {
  const past = paginateLiveListings(hundred, query({ page: "99", pageSize: "10" }));
  assert.equal(past.page, 10);
  assert.equal(past.items.length, 10);
  assert.equal(query({ pageSize: "5000" }).pageSize, 100);
  assert.equal(query({}).pageSize, 10);
});

test("search runs across all listings before paging", () => {
  const products = [...hundred, listing(500, { name: "Beef Noodle Soup", companyName: "Noodle House" })];
  const result = paginateLiveListings(products, query({ page: "1", pageSize: "10", q: "NOODLE" }));
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "prd-500");
});

test("filters and sorts like the Super Admin client", () => {
  const products = [
    listing(1, { salesPrice: 80, originalPrice: 100 }),
    listing(2, { categories: [], category: "" }),
    listing(3, { imageUrls: [], imageUrl: "", mainImageUrl: "" }),
    listing(4, { videoUrl: "/uploads/v.mp4" }),
  ];
  assert.deepEqual(filterAndSortLiveListings(products, query({ pricing: "discounted" })).map((p) => p.id), ["prd-1"]);
  assert.deepEqual(filterAndSortLiveListings(products, query({ category: "no-category" })).map((p) => p.id), ["prd-2"]);
  assert.deepEqual(filterAndSortLiveListings(products, query({ signal: "missing-image" })).map((p) => p.id), ["prd-3"]);
  assert.deepEqual(filterAndSortLiveListings(products, query({ signal: "has-video" })).map((p) => p.id), ["prd-4"]);
  assert.deepEqual(
    filterAndSortLiveListings(products, query({ sort: "price-asc" })).map((p) => p.id),
    ["prd-1", "prd-2", "prd-3", "prd-4"],
  );
  assert.deepEqual(
    filterAndSortLiveListings(products, query({ sort: "oldest" })).map((p) => p.id),
    ["prd-1", "prd-2", "prd-3", "prd-4"],
  );
});

test("focus id jumps to the page that contains it", () => {
  const result = paginateLiveListings(hundred, query({ page: "1", pageSize: "10" }), { focusId: "prd-45" });
  assert.equal(result.page, 6);
  assert.ok(result.items.some((item) => item.id === "prd-45"));
});

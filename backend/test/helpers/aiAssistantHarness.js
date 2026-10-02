"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");

const flashDealPricing = require("../../services/flashDealPricing");
const voucherRules = require("../../services/voucherRules");
const { createAiAssistantApi } = require("../../services/aiAssistant");
const { isPlatformSettingEnabled, getPlatformSettingDefaults } = require("../../services/platformSettings");

const SESSIONS = Object.freeze({
  "tok-buyer": { role: "buyer", accountId: "buyer-1", email: "buyer1@test.ph", adminId: "" },
  "tok-buyer-2": { role: "buyer", accountId: "buyer-2", email: "buyer2@test.ph", adminId: "" },
  "tok-seller-a": { role: "seller", accountId: "acc-a", email: "a@shop.ph", adminId: "seller-a" },
  "tok-seller-b": { role: "seller", accountId: "acc-b", email: "b@shop.ph", adminId: "seller-b" },
  "tok-rider": { role: "rider", accountId: "rider-1", email: "", adminId: "" },
  "tok-rider-2": { role: "rider", accountId: "rider-2", email: "", adminId: "" },
});

function baseProducts() {
  return [
    {
      id: "p-white",
      name: "Aero White Sneakers",
      description: "Lightweight white running shoes for men",
      category: "Shoes",
      categories: ["Shoes"],
      originalPrice: 1500,
      salesPrice: 1250,
      stock: 10,
      isActive: true,
      approvalStatus: "approved",
      adminId: "seller-a",
      companyName: "Shop A",
      rating: 4.6,
      soldCount: 40,
      variants: [
        { id: "v-m", name: "M", stock: 5 },
        { id: "v-l", name: "L", stock: 0 },
        { id: "v-s", name: "S", stock: 2 },
      ],
    },
    {
      id: "p-black",
      name: "Street Black Shoes",
      description: "Black casual shoes",
      category: "Shoes",
      categories: ["Shoes"],
      originalPrice: 1300,
      stock: 3,
      isActive: true,
      approvalStatus: "approved",
      adminId: "seller-a",
      companyName: "Shop A",
      rating: 4.1,
      soldCount: 5,
      variants: [],
    },
    {
      id: "p-tote",
      name: "Canvas Tote Bag",
      description: "Everyday canvas tote",
      category: "Bags",
      categories: ["Bags"],
      originalPrice: 500,
      stock: 2,
      isActive: true,
      approvalStatus: "approved",
      adminId: "seller-b",
      companyName: "Shop B",
      rating: 4.8,
      soldCount: 12,
      variants: [],
    },
  ];
}

function baseRiderJob() {
  return {
    id: "job-1",
    deliveryCode: "SR-1001",
    orderReference: "ABCD1234",
    status: "RIDER_TO_PICKUP",
    pickup: { name: "Shop A", address: "12 Seller St, Makati", area: "Makati", phone: "+639170000001", lat: 14.55, lng: 121.02 },
    dropoff: { name: "", address: "", area: "Taguig", phone: "", lat: null, lng: null },
    packageCount: 1,
    packageNotes: "",
    distanceKm: 4.2,
    estimatedMinutes: 20,
    riderEarning: 85,
    paymentMethod: "COD",
    codAmount: 1300,
    codCollected: false,
    deliveryConfirmationType: "",
  };
}

function createHarness(options = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "switch-ai-"));
  const settings = { ...getPlatformSettingDefaults(), ...(options.settings || {}) };
  const products = options.products || baseProducts();
  const orders = options.orders ? [...options.orders] : [];
  const calls = [];
  const riderJobs = options.riderJobs || { "rider-1": [baseRiderJob()], "rider-2": [] };
  const riderOffers = options.riderOffers || {};
  const pins = { pickup: "4321", delivery: "8765" };
  const tickets = [];
  let nowMs = options.nowMs || Date.parse("2026-09-30T04:00:00Z");
  let checkoutCounter = 0;

  const addressBook = {
    selectedId: "addr-1",
    entries: [
      {
        id: "addr-1",
        label: "Home",
        fullName: "Juan Dela Cruz",
        phoneNumber: "+639171234567",
        street: "5 Mabini St",
        barangay: "Poblacion",
        city: "Makati",
        province: "Metro Manila",
        lat: 0,
        lng: 0,
      },
    ],
  };
  const deliveryPartners = [{ id: "dp-jnt", branch: "J&T Express", enabled: true }];
  const paymentPartners = [{ id: "pp-gcash", branch: "GCash", paymongoMethod: "gcash", enabled: true }];

  function respond(response, status, body) {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  }

  function readJson(request) {
    return new Promise((resolve) => {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try {
          resolve(text ? JSON.parse(text) : {});
        } catch (_) {
          resolve({});
        }
      });
    });
  }

  function findRiderJob(riderId, jobId) {
    return (riderJobs[riderId] || []).find((job) => job.id === jobId) || null;
  }

  /** Stand-in for server.js: every route re-checks the session like the real one does. */
  async function handler(request, response) {
    const url = new URL(request.url, "http://internal");
    const method = request.method;
    const session = SESSIONS[request.headers["x-switch-session"]] || null;
    const body = method === "GET" ? {} : await readJson(request);
    calls.push({ method, path: url.pathname, body, role: session?.role || "", actor: session?.accountId || "" });
    const parts = url.pathname.split("/").filter(Boolean);

    if (url.pathname.startsWith("/api/rider/")) {
      if (!session || session.role !== "rider") return respond(response, 401, { message: "Please sign in to Switch Rider." });
      const riderId = session.accountId;
      const [, , section, a, b] = parts;
      if (section === "meta") return respond(response, 200, { support: { hotline: "+6328000000", email: "help@switch.ph", emergencyNumber: "911" } });
      if (section === "jobs" && !a) return respond(response, 200, { jobs: riderJobs[riderId] || [] });
      if (section === "jobs" && a && !b) {
        const job = findRiderJob(riderId, a);
        return job ? respond(response, 200, { job }) : respond(response, 404, { message: "Delivery not found." });
      }
      if (section === "jobs" && a && b) {
        const job = findRiderJob(riderId, a);
        if (!job) return respond(response, 404, { message: "Delivery not found." });
        const expect = (allowed) => allowed.includes(job.status);
        const conflict = () => respond(response, 409, { message: `Can't do that while ${job.status}.`, code: "INVALID_STATUS" });
        if (b === "start-pickup") { if (!expect(["RIDER_ASSIGNED"])) return conflict(); job.status = "RIDER_TO_PICKUP"; }
        else if (b === "arrived-pickup") { if (!expect(["RIDER_ASSIGNED", "RIDER_TO_PICKUP"])) return conflict(); job.status = "ARRIVED_AT_PICKUP"; }
        else if (b === "confirm-pickup") {
          if (!expect(["ARRIVED_AT_PICKUP"])) return conflict();
          if (body.pin !== pins.pickup) return respond(response, 422, { message: "Incorrect PIN. 4 attempts left.", code: "PIN_INCORRECT", attemptsRemaining: 4 });
          job.status = "PICKED_UP";
          job.dropoff = { name: "Maria", address: "8 Bonifacio Ave, Taguig", area: "Taguig", phone: "+639180000002", lat: 14.52, lng: 121.05 };
        } else if (b === "start-delivery") { if (!expect(["PICKED_UP"])) return conflict(); job.status = "IN_TRANSIT"; }
        else if (b === "arrived-dropoff") { if (!expect(["PICKED_UP", "IN_TRANSIT"])) return conflict(); job.status = "ARRIVED_AT_DROPOFF"; }
        else if (b === "collect-cod") {
          if (!expect(["ARRIVED_AT_DROPOFF"])) return conflict();
          if (Math.round(Number(body.amount) * 100) !== Math.round(job.codAmount * 100)) {
            return respond(response, 422, { message: `Collect exactly ₱${job.codAmount.toFixed(2)}.`, code: "COD_AMOUNT_MISMATCH" });
          }
          job.codCollected = true;
        } else if (b === "complete") {
          if (!expect(["ARRIVED_AT_DROPOFF"])) return conflict();
          if (job.paymentMethod === "COD" && !job.codCollected) return respond(response, 409, { message: "Confirm the cash collection first.", code: "COD_NOT_COLLECTED" });
          if (body.method !== "PIN" || body.pin !== pins.delivery) return respond(response, 422, { message: "Incorrect PIN. 4 attempts left.", code: "PIN_INCORRECT" });
          job.status = "DELIVERED";
        } else return respond(response, 404, { message: "Not found." });
        return respond(response, 200, { ok: true, job });
      }
      if (section === "offers" && a === "current") return respond(response, 200, { offer: riderOffers[riderId] || null });
      if (section === "offers" && a && (b === "accept" || b === "decline")) {
        const offer = riderOffers[riderId];
        if (!offer || offer.offerId !== a) return respond(response, 404, { message: "Offer not found." });
        delete riderOffers[riderId];
        if (b === "decline") return respond(response, 200, { accepted: false });
        const job = { ...baseRiderJob(), id: offer.deliveryId, deliveryCode: offer.deliveryCode, status: "RIDER_ASSIGNED" };
        riderJobs[riderId] = [job, ...(riderJobs[riderId] || [])];
        return respond(response, 200, { accepted: true, deliveryId: job.id, job });
      }
      if (section === "earnings") {
        return respond(response, 200, { earnings: { today: 255, week: 1400, month: 5200, todayDeliveries: 3, balances: { available: 900, pending: 300 } } });
      }
      if (section === "cash") return respond(response, 200, { cash: { collected: 4200, remittedAwaitingVerification: 1000, verified: 2000, outstanding: 1200 } });
      if (section === "history") {
        return respond(response, 200, { history: [{ deliveryCode: "SR-0999", route: "Makati → Pasig", statusLabel: "Delivered", earning: 90, finishedAt: "2026-09-29T08:00:00Z" }] });
      }
      if (section === "support" && a === "tickets" && method === "POST") {
        const ticket = { id: `inc-${tickets.length + 1}`, ...body, riderId };
        tickets.push(ticket);
        return respond(response, 201, { ticket });
      }
      if (section === "availability") return respond(response, 200, { rider: { availabilityStatus: body.online ? "ONLINE" : "OFFLINE" } });
      return respond(response, 404, { message: "Not found." });
    }

    if (session?.role === "rider") return respond(response, 401, { message: "A signed-in account session is required." });

    if (url.pathname === "/api/products" && method === "GET") {
      return respond(response, 200, { products: products.map((product) => ({ ...product })) });
    }
    if (url.pathname === "/api/products" && method === "POST") {
      if (!session || session.role !== "seller") return respond(response, 403, { message: "Seller session required." });
      const created = { id: `p-new-${products.length + 1}`, ...body, adminId: session.adminId, approvalStatus: "pending" };
      products.push(created);
      return respond(response, 201, { product: created, message: "Listing submitted for review." });
    }
    if (url.pathname.startsWith("/api/products/") && method === "PUT") {
      if (!session || session.role !== "seller") return respond(response, 403, { message: "Seller session required." });
      const product = products.find((entry) => entry.id === decodeURIComponent(parts[2]));
      if (!product || product.adminId !== session.adminId) return respond(response, 404, { message: "Product not found." });
      if (!body.name || !body.category) return respond(response, 400, { message: "Name and category are required." });
      Object.assign(product, body);
      return respond(response, 200, { product, message: "Product updated." });
    }
    if (url.pathname === "/api/account/delivery-addresses") {
      if (!session || session.role !== "buyer") return respond(response, 401, { message: "Sign in required." });
      return respond(response, 200, { book: addressBook });
    }
    if (url.pathname === "/api/delivery-partners") return respond(response, 200, { partners: deliveryPartners });
    if (url.pathname === "/api/payment-partners") return respond(response, 200, { partners: paymentPartners });
    if (url.pathname === "/api/switch-rider/quote") return respond(response, 200, { quote: { available: false } });
    if (url.pathname === "/api/vouchers") return respond(response, 200, { vouchers: [] });
    if (url.pathname === "/api/orders" && method === "POST") {
      if (!session || session.role !== "buyer") return respond(response, 401, { message: "Sign in required." });
      const incoming = Array.isArray(body.orders) ? body.orders : [];
      for (const entry of incoming) {
        if (entry.accountId !== session.accountId) return respond(response, 403, { message: "Wrong account." });
        const stored = { ...entry, orderGroupId: entry.orderGroupId || `grp-${entry.createdAtEpochMs}` };
        if (String(stored.paymentOptionLabel).toLowerCase().startsWith("cod")) {
          stored.stage = "toPay";
          stored.amountToPayAmount = Math.min(stored.grandTotalAmount, Math.max(stored.grandTotalAmount * 0.1, 500));
        }
        const existing = orders.findIndex((order) => order.id === stored.id);
        if (existing >= 0) orders[existing] = { ...orders[existing], ...stored };
        else orders.push(stored);
      }
      return respond(response, 200, { orders: orders.filter((order) => order.accountId === session.accountId) });
    }
    if (url.pathname === "/api/orders/checkout-session" && method === "POST") {
      if (!session || session.role !== "buyer") return respond(response, 401, { message: "Sign in required." });
      checkoutCounter += 1;
      return respond(response, 200, { checkoutUrl: `https://checkout.paymongo.test/cs_${checkoutCounter}`, alreadyPaid: false, provider: "paymongo" });
    }
    if (url.pathname === "/api/analytics/summary") return respond(response, 200, { summary: { totals: {}, funnel: {}, topProducts: [] } });
    if (url.pathname === "/api/chat-support" && method === "GET") return respond(response, 200, { threads: [] });
    if (url.pathname === "/api/admin/flash-deals" && method === "POST") return respond(response, 201, { deal: { id: "fd-1", status: "pending" }, message: "Flash Deal submitted." });
    if (url.pathname === "/api/admin/vouchers" && method === "POST") return respond(response, 201, { voucher: { id: "vc-1", status: "active" }, message: "Voucher created." });
    return respond(response, 404, { message: `No fake route for ${method} ${url.pathname}` });
  }

  const readOrders = async ({ accountId = "", adminId = "" } = {}) =>
    orders.filter((entry) => (!accountId || entry.accountId === accountId) && (!adminId || entry.adminId === adminId));

  const api = createAiAssistantApi({
    DATA_DIR: dataDir,
    pg: null,
    sendJson(response, status, body) {
      response.status = status;
      response.body = body;
      response.headersSent = true;
    },
    getSessionToken: (request) => request.headers["x-switch-session"] || "",
    getHandler: () => handler,
    getPlatformSettings: async () => settings,
    isPlatformSettingEnabled,
    flashDealPricing,
    flashDealsApi: { readFlashDeals: async () => [], readFlashCampaigns: async () => [] },
    vouchersApi: { readVouchers: async () => [] },
    voucherRules,
    readOrders,
    getBuyerProfile: async (accountId) => (accountId ? { name: "Juan Dela Cruz", phone: "+639171234567" } : null),
    getSwitchRiderBuyerTracking: async () => null,
    isSwitchRiderPartnerName: (name) => /switch rider/i.test(String(name || "")),
    resolveLaunchedProvider: async () => null,
    isSuperAdminAuthorized: (request) => request.headers["x-super-admin"] === "yes",
    confirmationSecret: "test-confirmation-secret",
    env: { AI_ASSISTANT_PROVIDER: "rules", AI_ASSISTANT_RATE_MAX: String(options.rateMax || 500) },
    llm: options.llm === undefined ? null : options.llm,
    now: () => nowMs,
    logger: { warn() {}, error() {}, log() {} },
  });

  /** Calls an assistant route the way server.js would after attachAppSession. */
  async function call(method, pathname, { token = "", body, headers = {} } = {}) {
    const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
    request.method = method;
    request.url = pathname;
    request.headers = { host: "test", ...(token ? { "x-switch-session": token } : {}), ...headers };
    const session = SESSIONS[token] || null;
    const isRiderApi = pathname.startsWith("/api/rider/");
    request.riderSession = session?.role === "rider" && isRiderApi ? session : null;
    request.authSession = session?.role === "rider" || isRiderApi ? null : session;
    request.socket = { remoteAddress: "127.0.0.1" };
    const response = {};
    const handled = await api.tryHandleAssistantRoutes(request, response, new URL(pathname, "http://test"));
    return { handled, status: response.status, body: response.body };
  }

  const chat = (token, message, extra = {}) => {
    const prefix = SESSIONS[token]?.role === "rider" ? "/api/rider/assistant" : "/api/assistant";
    return call("POST", `${prefix}/chat`, { token, body: { message, ...extra } });
  };
  const confirm = (token, confirmToken, extra = {}) => {
    const prefix = SESSIONS[token]?.role === "rider" ? "/api/rider/assistant" : "/api/assistant";
    return call("POST", `${prefix}/confirm`, { token, body: { token: confirmToken, ...extra } });
  };
  const action = (token, tool, args = {}) => {
    const prefix = SESSIONS[token]?.role === "rider" ? "/api/rider/assistant" : "/api/assistant";
    return call("POST", `${prefix}/actions`, { token, body: { tool, args } });
  };

  function cleanup() {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  return {
    api,
    call,
    chat,
    confirm,
    action,
    calls,
    products,
    orders,
    settings,
    riderJobs,
    riderOffers,
    tickets,
    pins,
    dataDir,
    setNow: (value) => { nowMs = value; },
    cleanup,
  };
}

function findBlock(response, type) {
  return (response.body?.blocks || []).find((block) => block.type === type) || null;
}

function confirmTokenFrom(response) {
  for (const block of response.body?.blocks || []) {
    if (block.type === "confirmation" && block.token) return block.token;
    const action = (block.actions || []).find((entry) => entry.kind === "confirm");
    if (action) return action.token;
  }
  return "";
}

module.exports = { createHarness, findBlock, confirmTokenFrom, SESSIONS, baseProducts, baseRiderJob };

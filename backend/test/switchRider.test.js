"use strict";

// Switch Rider tests.
//
// Pure rule tests always run. Integration tests run the real service against
// PostgreSQL inside a throwaway schema (created and dropped by this file). They
// use SWITCH_RIDER_TEST_DATABASE_URL, DATABASE_URL, or backend/.env, and are
// skipped when no database is reachable.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { canTransition, isVehicleCompatible } = require("../services/switchRider/constants");
const { calculateDeliveryPricing, checkServiceability, settleCustomerFee } = require("../services/switchRider/pricing");
const { normalizeSettings } = require("../services/switchRider/settings");
const { derivePin, pinsMatch, signQuote, verifyQuote } = require("../services/switchRider/tokens");
const { evaluateRiderEligibility } = require("../services/switchRider/eligibility");
const { serializeOfferForRider, serializeJobForRider } = require("../services/switchRider/serializers");
const { createSwitchRiderService } = require("../services/switchRider/service");
const { createPrivateFileStore } = require("../services/switchRider/privateFiles");
const { createSwitchRiderOrderBridge, isSwitchRiderOrderEntry } = require("../services/switchRider/orderBridge");
const { createAppSessionAuth } = require("../security/appSessionAuth");

const SECRET = "switch-rider-test-secret";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const PICKUP = { lat: 14.5547, lng: 121.0244 }; // Makati
const DROPOFF = { lat: 14.5794, lng: 121.0359 }; // Mandaluyong
const NEAR_PICKUP = { lat: 14.556, lng: 121.026 };
const CEBU = { lat: 10.3157, lng: 123.8854 };
const METRO_ZONE = { id: "metro-manila", name: "Metro Manila", centerLat: 14.58, centerLng: 121.03, radiusKm: 30 };

async function expectError(promise, { status, code }) {
  await assert.rejects(promise, (error) => {
    if (status !== undefined) assert.equal(error.statusCode, status, `status for ${error.code}: ${error.message}`);
    if (code !== undefined) assert.equal(error.code, code, error.message);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Pure rules
// ---------------------------------------------------------------------------

test("delivery status machine blocks skipped and backwards steps", () => {
  assert.equal(canTransition("ARRIVED_AT_PICKUP", "PICKED_UP"), true);
  assert.equal(canTransition("ARRIVED_AT_PICKUP", "DELIVERED"), false);
  assert.equal(canTransition("RIDER_ASSIGNED", "DELIVERED"), false);
  assert.equal(canTransition("PICKED_UP", "CANCELLED"), false, "no plain cancel once the rider has the parcel");
  assert.equal(canTransition("DELIVERED", "IN_TRANSIT"), false);
  assert.equal(canTransition("CANCELLED", "WAITING_FOR_RIDER"), false);
  assert.equal(canTransition("FAILED_DELIVERY", "RETURN_REQUIRED"), true);
});

test("vehicle compatibility respects size and the bicycle distance cap", () => {
  assert.equal(isVehicleCompatible("CAR", "MOTORCYCLE"), true);
  assert.equal(isVehicleCompatible("MOTORCYCLE", "CAR"), false);
  assert.equal(isVehicleCompatible("BICYCLE", "BICYCLE", 3, 5), true);
  assert.equal(isVehicleCompatible("BICYCLE", "BICYCLE", 9, 5), false);
});

test("pricing is server-side, respects the minimum fee, and splits exactly", () => {
  const settings = normalizeSettings({ enabled: true, serviceZones: [METRO_ZONE] });
  const short = calculateDeliveryPricing(settings, { distanceKm: 1, vehicleType: "MOTORCYCLE" });
  assert.equal(short.deliveryFee, 59, "motorcycle minimum fee");
  const long = calculateDeliveryPricing(settings, { distanceKm: 10, vehicleType: "MOTORCYCLE" });
  assert.equal(long.deliveryFee, 49 + 10 * 7);
  assert.ok(long.deliveryFee > short.deliveryFee, "a farther delivery must cost more than a nearby delivery");
  assert.equal(long.snapshot.quotedBaseFee + long.snapshot.quotedDistanceFee, long.deliveryFee);
  assert.equal(long.riderEarning, Math.round((long.riderBaseFee + long.riderDistanceFee) * 100) / 100);
  assert.ok(long.riderEarning < long.deliveryFee);

  const settled = settleCustomerFee(long, 0);
  assert.equal(settled.customerDeliveryFee, 0);
  assert.equal(settled.platformSubsidy, long.deliveryFee, "free shipping is subsidised by the platform");
});

test("service area fails closed without zones and rejects out-of-zone addresses", () => {
  const noZones = normalizeSettings({ enabled: true });
  assert.equal(checkServiceability(noZones, PICKUP, DROPOFF).code, "PICKUP_NOT_SERVICEABLE");
  const disabled = normalizeSettings({ enabled: false, serviceZones: [METRO_ZONE] });
  assert.equal(checkServiceability(disabled, PICKUP, DROPOFF).code, "SWITCH_RIDER_DISABLED");
  const zoned = normalizeSettings({ enabled: true, serviceZones: [METRO_ZONE] });
  assert.equal(checkServiceability(zoned, PICKUP, CEBU).code, "DROPOFF_NOT_SERVICEABLE");
  assert.equal(checkServiceability(zoned, PICKUP, null).code, "DROPOFF_LOCATION_MISSING");
  assert.equal(checkServiceability(zoned, PICKUP, DROPOFF).serviceable, true);
});

test("PINs are derived per delivery and purpose; quotes are tamper-proof", () => {
  const job = { deliveryId: "dlv_1", pinNonce: "nonce-a" };
  const pickup = derivePin(SECRET, { ...job, purpose: "pickup" });
  const delivery = derivePin(SECRET, { ...job, purpose: "delivery" });
  assert.match(pickup, /^\d{6}$/);
  assert.notEqual(pickup, delivery);
  assert.equal(derivePin(SECRET, { ...job, purpose: "pickup" }), pickup, "deterministic");
  assert.notEqual(derivePin(SECRET, { ...job, pinNonce: "nonce-b", purpose: "pickup" }), pickup, "rotating the nonce changes PINs");
  assert.equal(pinsMatch(pickup, ` ${pickup.slice(0, 3)}-${pickup.slice(3)} `), true);
  assert.equal(pinsMatch(pickup, "000000") && pickup !== "000000", false);

  const nowMs = Date.parse("2026-09-30T02:00:00Z");
  const token = signQuote(SECRET, { v: 1, fee: 59, exp: Math.floor(nowMs / 1000) + 60 });
  assert.equal(verifyQuote(SECRET, token, nowMs).fee, 59);
  const [prefix, body, sig] = token.split(".");
  const forgedBody = Buffer.from(JSON.stringify({ v: 1, fee: 1, exp: Math.floor(nowMs / 1000) + 60 })).toString("base64url");
  assert.equal(verifyQuote(SECRET, `${prefix}.${forgedBody}.${sig}`, nowMs), null, "edited fee is rejected");
  assert.equal(verifyQuote(SECRET, `${prefix}.${body}.${sig}`, nowMs + 120_000), null, "expired quote is rejected");
  assert.equal(verifyQuote("other-secret", token, nowMs), null);
});

test("eligibility blocks offline, suspended, overloaded, stale, and far riders", () => {
  const settings = normalizeSettings({ enabled: true, serviceZones: [METRO_ZONE] });
  const nowMs = Date.parse("2026-09-30T02:00:00Z");
  const job = { vehicle_type_required: "MOTORCYCLE", distance_km: 4 };
  const rider = {
    status: "ACTIVE",
    availability_status: "ONLINE",
    vehicle_type: "MOTORCYCLE",
    last_location_at: new Date(nowMs - 30_000),
  };
  const ctx = { activeJobs: 0, distanceToPickupKm: 2, nowMs, mode: "auto" };
  assert.deepEqual(evaluateRiderEligibility(rider, job, settings, ctx), { eligible: true, reasons: [] });
  assert.deepEqual(evaluateRiderEligibility({ ...rider, availability_status: "OFFLINE" }, job, settings, ctx).reasons, ["RIDER_OFFLINE"]);
  assert.ok(evaluateRiderEligibility({ ...rider, status: "SUSPENDED" }, job, settings, ctx).reasons.includes("RIDER_SUSPENDED"));
  assert.ok(evaluateRiderEligibility(rider, job, settings, { ...ctx, activeJobs: 1 }).reasons.includes("RIDER_AT_CAPACITY"));
  assert.ok(evaluateRiderEligibility(rider, job, settings, { ...ctx, distanceToPickupKm: 50 }).reasons.includes("TOO_FAR_FROM_PICKUP"));
  assert.ok(
    evaluateRiderEligibility({ ...rider, last_location_at: new Date(nowMs - 3_600_000) }, job, settings, ctx).reasons.includes("LOCATION_STALE"),
  );
  // Manual assignment skips proximity but never safety rules.
  const manual = { activeJobs: 0, nowMs, mode: "manual" };
  assert.equal(evaluateRiderEligibility({ ...rider, last_location_at: null }, job, settings, manual).eligible, true);
  assert.equal(evaluateRiderEligibility({ ...rider, availability_status: "OFFLINE" }, job, settings, manual).eligible, false);
});

test("offer and pre-pickup views never expose customer identity", () => {
  const job = {
    id: "dlv_1",
    delivery_code: "SRD-100001",
    status: "OFFERED",
    pickup_name: "Test Shop",
    pickup_address: "123 Ayala Avenue, Bel-Air, Makati City",
    pickup_area: "Bel-Air, Makati City",
    dropoff_name: "Juan Dela Cruz",
    dropoff_contact_phone: "09179998888",
    dropoff_address: "45 Shaw Boulevard, Wack-Wack, Mandaluyong City",
    dropoff_area: "Wack-Wack, Mandaluyong City",
    payment_method: "COD",
    cod_amount: "500.00",
    rider_earning: "44.25",
  };
  const offer = serializeOfferForRider({ id: "ofr_1", status: "PENDING", expires_at: new Date(Date.now() + 30_000) }, job);
  const offerJson = JSON.stringify(offer);
  for (const secret of ["Juan", "09179998888", "45 Shaw", "123 Ayala"]) assert.ok(!offerJson.includes(secret), secret);
  assert.equal(offer.dropoffArea, "Wack-Wack, Mandaluyong City");
  assert.equal(offer.codAmount, 500);

  const delivered = serializeJobForRider({ ...job, status: "DELIVERED" });
  assert.equal(delivered.dropoff.phone, "", "customer phone hidden after the job ends");
  assert.equal(delivered.dropoff.address, "");
  const inTransit = serializeJobForRider({ ...job, status: "IN_TRANSIT" });
  assert.equal(inTransit.dropoff.name, "Juan", "first name only");
  assert.equal(inTransit.dropoff.phone, "09179998888");
});

test("rider sessions are a separate role with their own lifetime", () => {
  const auth = createAppSessionAuth({ APP_SESSION_SECRET: "x".repeat(40) });
  const session = auth.issueSession({ role: "rider", accountId: "rdr_1", ttlSeconds: 7 * 24 * 3600 });
  const verified = auth.verifySession(session.token);
  assert.equal(verified.role, "rider");
  assert.equal(verified.accountId, "rdr_1");
  assert.equal(session.expiresInSeconds, 7 * 24 * 3600);
});

test("order bridge requires a signed quote for new Switch Rider orders", () => {
  const bridge = createSwitchRiderOrderBridge({
    readOrders: async () => [],
    writeOrders: async () => {},
    catalogWriteScope: (scope) => scope,
    normalizeStoredOrderEntry: (entry) => entry,
    isScopedOrderGroupEntry: () => false,
    isCodPaymentOption: (value) => String(value).toLowerCase().startsWith("cod"),
    readProducts: async () => [],
    writeProducts: async () => {},
    isRecordInAdminScope: () => true,
    readAccounts: async () => [],
    findAdminAccountByScopeId: () => null,
  });
  bridge.attachService({ validateCheckoutQuote: () => ({ deliveryFee: 59 }) });
  const entry = {
    id: "o1",
    adminId: "seller-1",
    accountId: "buyer-1",
    createdAtEpochMs: 111,
    deliveryPartnerName: "Switch Rider",
    clientLatitude: DROPOFF.lat,
    clientLongitude: DROPOFF.lng,
    shippingFeeAmount: 59,
  };
  assert.equal(isSwitchRiderOrderEntry(entry), true);
  assert.equal(isSwitchRiderOrderEntry({ deliveryPartnerName: "Lalamove" }), false);
  assert.throws(
    () => bridge.prepareCheckout({ rawPayload: [entry], incomingOrders: [entry], existingOrders: [], buyerAccountId: "buyer-1" }),
    (error) => error.code === "SWITCH_RIDER_QUOTE_REQUIRED",
  );
  const pending = bridge.prepareCheckout({
    rawPayload: [{ ...entry, switchRiderQuoteToken: "srq1.x.y" }],
    incomingOrders: [entry],
    existingOrders: [],
    buyerAccountId: "buyer-1",
  });
  assert.equal(pending.length, 1);
  assert.deepEqual(
    bridge.prepareCheckout({ rawPayload: [entry], incomingOrders: [entry], existingOrders: [entry], buyerAccountId: "buyer-1" }),
    [],
    "existing order groups are not re-validated",
  );
});

// ---------------------------------------------------------------------------
// PostgreSQL integration
// ---------------------------------------------------------------------------

function resolveTestDatabaseUrl() {
  const explicit = String(process.env.SWITCH_RIDER_TEST_DATABASE_URL || process.env.DATABASE_URL || "").trim();
  if (explicit) return explicit;
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    const line = raw.split(/\r?\n/).find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
    return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : "";
  } catch (_) {
    return "";
  }
}

const TABLES = [
  "switch_rider_audit_log", "buyer_delivery_notifications", "rider_notifications", "delivery_incidents", "rider_ratings",
  "rider_remittances", "cod_transactions", "rider_payouts", "rider_wallet_transactions", "rider_earnings", "delivery_proofs",
  "rider_locations", "delivery_status_history", "delivery_offers", "delivery_jobs", "rider_documents", "riders",
  "seller_pickup_locations",
];

const harness = {
  ready: null,
  skipReason: "",
  pool: null,
  schema: `sr_test_${process.pid}_${Date.now()}`,
  filesDir: fs.mkdtempSync(path.join(os.tmpdir(), "switch-rider-test-")),
  clock: 0,
  sellerNotices: [],
  saNotices: [],
  orderEvents: [],
  service: null,
};

async function setupDatabase() {
  const url = resolveTestDatabaseUrl();
  if (!url) {
    harness.skipReason = "No PostgreSQL configured (set SWITCH_RIDER_TEST_DATABASE_URL or DATABASE_URL).";
    return false;
  }
  let Pool;
  try {
    ({ Pool } = require("pg"));
  } catch (_) {
    harness.skipReason = "pg module is not installed.";
    return false;
  }
  const bootstrap = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
  try {
    await bootstrap.query(`CREATE SCHEMA ${harness.schema}`);
  } catch (error) {
    harness.skipReason = `PostgreSQL unreachable: ${error.message}`;
    await bootstrap.end().catch(() => {});
    return false;
  }
  await bootstrap.end();
  harness.pool = new Pool({ connectionString: url, max: 12, options: `-c search_path=${harness.schema}` });
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "migrations", "026_switch_rider.sql"), "utf8");
  await harness.pool.query(sql);

  const pool = harness.pool;
  const db = {
    query: (text, params) => pool.query(text, params),
    async withTransaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
  harness.service = createSwitchRiderService({
    db,
    secret: SECRET,
    now: () => harness.clock,
    notifier: {
      notifySeller: async (adminId, notice) => harness.sellerNotices.push({ adminId, ...notice }),
      notifySuperAdmin: async (notice) => harness.saNotices.push(notice),
    },
    orderBridge: {
      applyCourierUpdate: async (job, event) => harness.orderEvents.push({ deliveryId: job.id, event }),
    },
    privateFiles: createPrivateFileStore({ env: {}, baseDir: harness.filesDir, logger: { warn() {}, error() {}, log() {} } }),
    verifyRegistrationEmail: async ({ email, verificationToken, socialProvider, idToken, accessToken }) => {
      assert.match(email, /@gmail\.com$/);
      if (socialProvider) {
        assert.ok(idToken || accessToken);
        return;
      }
      assert.ok(verificationToken);
    },
    verifyRiderSocialCredential: async ({ provider, idToken, accessToken }) => {
      assert.ok(idToken || accessToken);
      return {
        provider,
        email: "switch.rider.social@gmail.com",
        firstName: "Social",
        lastName: "Rider",
        displayName: "Social Rider",
        picture: "",
      };
    },
    logger: { error() {}, warn() {}, log() {} },
  });
  return true;
}

async function resetState() {
  await harness.pool.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  harness.clock = Date.parse("2026-09-30T02:00:00Z");
  harness.sellerNotices.length = 0;
  harness.saNotices.length = 0;
  harness.orderEvents.length = 0;
  await harness.service.updateSettings(
    {
      enabled: true,
      autoDispatch: true,
      dispatchOnCheckout: true,
      serviceZones: [METRO_ZONE],
      offerTimeoutSeconds: 30,
      earningsHoldHours: 24,
      failedAttemptRiderPercent: 50,
    },
    { type: "super_admin", id: "sa-test" },
  );
  await harness.service.upsertPickupLocation("seller-1", {
    ...PICKUP,
    address: "123 Ayala Avenue, Bel-Air, Makati City",
    contactName: "Test Shop",
    contactPhone: "09171234567",
  });
}

function dbTest(name, fn) {
  test(name, async (t) => {
    if (harness.ready === null) harness.ready = setupDatabase();
    if (!(await harness.ready)) {
      t.skip(harness.skipReason);
      return;
    }
    await resetState();
    await fn(harness.service, t);
  });
}

test.after(async () => {
  if (harness.pool) {
    await harness.pool.query(`DROP SCHEMA IF EXISTS ${harness.schema} CASCADE`).catch(() => {});
    await harness.pool.end().catch(() => {});
  }
  fs.rmSync(harness.filesDir, { recursive: true, force: true });
});

const advance = (ms) => {
  harness.clock += ms;
};
const SA = { type: "super_admin", id: "sa-test" };
const SELLER = { type: "seller", id: "seller-1" };
let mobileCounter = 0;

function riderInput(overrides = {}) {
  mobileCounter += 1;
  const suffix = String(1000 + mobileCounter).slice(-4);
  return {
    firstName: "Ramon",
    lastName: "Santos",
    mobileNumber: `0917123${suffix}`,
    email: `switch.rider.${suffix}@gmail.com`,
    verificationToken: `verified-${suffix}`,
    password: "rider1234",
    birthday: "1994-03-10",
    vehicle: { vehicleType: "MOTORCYCLE", plateNumber: "NAB 1234", vehicleModel: "Honda Click 125", vehicleColor: "Black" },
    emergencyContact: { name: "Liza Santos", phone: `0918765${suffix}`, relationship: "Sister" },
    ...overrides,
  };
}

async function uploadRequiredDocuments(service, riderId, vehicleType = "MOTORCYCLE") {
  for (const type of service.requiredDocumentTypes(vehicleType)) {
    await service.uploadDocument(riderId, type, PNG, "image/png");
  }
}

async function createApprovedRider(service, { online = true, location = NEAR_PICKUP, ...overrides } = {}) {
  const rider = await service.registerRider(riderInput(overrides));
  await uploadRequiredDocuments(service, rider.id);
  await service.setRiderStatus(rider.id, "approve", {}, SA);
  if (online) await service.goOnline(rider.id, location);
  return rider.id;
}

let orderCounter = 0;
function makeOrder(overrides = {}) {
  orderCounter += 1;
  return {
    orderGroupId: `grp-${orderCounter}`,
    createdAtEpochMs: 1_780_000_000_000 + orderCounter,
    sellerAdminId: "seller-1",
    buyerAccountId: "buyer-1",
    sellerName: "Test Shop",
    customerName: "Juan Dela Cruz",
    customerPhone: "09179998888",
    dropoffAddress: "45 Shaw Boulevard, Wack-Wack, Mandaluyong City",
    dropoff: DROPOFF,
    customerDeliveryFee: 59,
    isCod: false,
    codAmount: 0,
    packageCount: 1,
    packageNotes: "2 items",
    isPacked: true,
    isSwitchRider: true,
    ...overrides,
  };
}

async function readyJob(service, order = makeOrder()) {
  const { job } = await service.markReadyForRider(order, SELLER);
  return { order, job: await service.getActiveJobForOrderGroup(order.orderGroupId) ?? job };
}

async function getJob(id) {
  return (await harness.pool.query("SELECT * FROM delivery_jobs WHERE id = $1", [id])).rows[0];
}

async function getRiderRow(id) {
  return (await harness.pool.query("SELECT * FROM riders WHERE id = $1", [id])).rows[0];
}

async function auditActions(deliveryId) {
  return (await harness.pool.query("SELECT action FROM switch_rider_audit_log WHERE delivery_id = $1 ORDER BY id", [deliveryId])).rows.map(
    (row) => row.action,
  );
}

/** Rider accepts the current offer and walks the job up to a target step. */
async function acceptAndAdvance(service, riderId, jobId, target) {
  const offer = await service.getCurrentOffer(riderId);
  assert.ok(offer, "rider should have an offer");
  assert.equal(offer.deliveryId, jobId);
  await service.respondToOffer(riderId, offer.offerId, { decision: "ACCEPT" });
  const steps = ["ARRIVED_AT_PICKUP", "PICKED_UP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"];
  for (const step of steps.slice(0, steps.indexOf(target) + 1)) {
    if (step === "ARRIVED_AT_PICKUP") await service.arriveAtPickup(riderId, jobId);
    if (step === "PICKED_UP") await service.confirmPickup(riderId, jobId, { pin: service.pinFor(await getJob(jobId), "pickup") });
    if (step === "IN_TRANSIT") await service.startDelivery(riderId, jobId);
    if (step === "ARRIVED_AT_DROPOFF") await service.arriveAtDropoff(riderId, jobId);
  }
}

// 1. Rider registration
dbTest("rider registration creates a pending rider and alerts Super Admin", async (service) => {
  const input = riderInput();
  const rider = await service.registerRider(input);
  assert.equal(rider.status, "PENDING_VERIFICATION");
  assert.match(rider.rider_code, /^SR-\d+$/);
  const row = await getRiderRow(rider.id);
  assert.notEqual(row.password_hash, input.password, "password is hashed");
  assert.ok(harness.saNotices.some((notice) => notice.type === "rider-registration"));

  await expectError(service.registerRider(input), { status: 409, code: "RIDER_ALREADY_REGISTERED" });
  await expectError(service.registerRider(riderInput({ birthday: "2012-01-01" })), { status: 422 });
  await expectError(service.registerRider(riderInput({ password: "short" })), { status: 422 });
  await expectError(service.registerRider(riderInput({ email: "rider@yahoo.com" })), { status: 422, code: "INVALID_GMAIL" });
  await expectError(service.registerRider(riderInput({ verificationToken: "" })), {
    status: 422,
    code: "EMAIL_VERIFICATION_REQUIRED",
  });

  const newSocial = await service.authenticateSocialRider({ provider: "google", idToken: "new-google-token" });
  assert.equal(newSocial.rider, null);
  assert.equal(newSocial.profile.email, "switch.rider.social@gmail.com");
  const socialRider = await service.registerRider(riderInput({
    email: "switch.rider.social@gmail.com",
    socialProvider: "google",
    idToken: "new-google-token",
    verificationToken: "",
  }));
  const socialLogin = await service.authenticateSocialRider({ provider: "google", idToken: "new-google-token" });
  assert.equal(socialLogin.rider.id, socialRider.id);
  const login = await service.authenticateRider({ mobileNumber: input.mobileNumber, password: input.password });
  assert.equal(login.id, rider.id);
  await expectError(service.authenticateRider({ mobileNumber: input.mobileNumber, password: "wrong-pass1" }), {
    status: 401,
    code: "INVALID_CREDENTIALS",
  });
});

// 2. Rider approval
dbTest("rider approval requires documents and unlocks going online", async (service) => {
  const rider = await service.registerRider(riderInput());
  await expectError(service.goOnline(rider.id, NEAR_PICKUP), { status: 403, code: "RIDER_NOT_OPERATIONAL" });
  await expectError(service.setRiderStatus(rider.id, "approve", {}, SA), { status: 409, code: "DOCUMENTS_INCOMPLETE" });
  await expectError(service.uploadDocument(rider.id, "GOVERNMENT_ID", Buffer.from("not an image"), "image/png"), { status: 415 });

  await uploadRequiredDocuments(service, rider.id);
  assert.ok(harness.saNotices.some((notice) => notice.type === "rider-documents-uploaded"));
  const approved = await service.setRiderStatus(rider.id, "approve", {}, SA);
  assert.equal(approved.status, "APPROVED");
  const docs = await service.listDocuments(rider.id);
  assert.ok(docs.every((doc) => doc.reviewStatus === "APPROVED"));

  const online = await service.goOnline(rider.id, NEAR_PICKUP);
  assert.equal(online.status, "ACTIVE");
  assert.equal(online.availabilityStatus, "ONLINE");
  const notes = await service.listRiderNotifications(rider.id);
  assert.ok(JSON.stringify(notes).includes("Account approved"));
});

// 3. Suspended rider cannot go online
dbTest("suspended rider cannot go online", async (service) => {
  const riderId = await createApprovedRider(service);
  await expectError(service.setRiderStatus(riderId, "suspend", {}, SA), { status: 422, code: "REASON_REQUIRED" });
  const suspended = await service.setRiderStatus(riderId, "suspend", { reason: "Documents expired" }, SA);
  assert.equal(suspended.status, "SUSPENDED");
  assert.equal(suspended.availabilityStatus, "OFFLINE");
  await expectError(service.goOnline(riderId, NEAR_PICKUP), { status: 403, code: "RIDER_NOT_OPERATIONAL" });
  await service.setRiderStatus(riderId, "reactivate", {}, SA);
  assert.equal((await service.goOnline(riderId, NEAR_PICKUP)).availabilityStatus, "ONLINE");
});

// 4. Offline rider does not receive jobs
dbTest("offline rider does not receive jobs", async (service) => {
  const riderId = await createApprovedRider(service, { online: false });
  const { job } = await readyJob(service);
  assert.equal((await getJob(job.id)).status, "WAITING_FOR_RIDER");
  assert.equal(await service.getCurrentOffer(riderId), null);
});

// 5. Online rider receives eligible job
dbTest("online rider near pickup receives a privacy-safe offer; far rider does not", async (service) => {
  const farId = await createApprovedRider(service, { location: CEBU });
  const nearId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  const stored = await getJob(job.id);
  assert.equal(stored.status, "OFFERED");
  assert.equal(await service.getCurrentOffer(farId), null);
  const offer = await service.getCurrentOffer(nearId);
  assert.ok(offer);
  assert.equal(offer.riderEarning, Number(stored.rider_earning));
  const json = JSON.stringify(offer);
  for (const secret of ["Juan", "09179998888", "45 Shaw"]) assert.ok(!json.includes(secret), `offer leaks ${secret}`);
});

dbTest("pending delivery offers prioritize the nearest pickup instead of the newest offer", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job: nearJob } = await readyJob(service);
  const nearOffer = await service.getCurrentOffer(riderId);
  assert.ok(nearOffer);
  assert.equal(nearOffer.deliveryId, nearJob.id);

  const farJob = (await service.createJobForOrder(makeOrder(), { actor: SELLER })).job;
  const farOfferId = `ofr-far-${Date.now()}`;
  await harness.pool.query(
    `UPDATE delivery_jobs
        SET status = 'OFFERED', current_offer_id = $2,
            pickup_latitude = 15.1000, pickup_longitude = 121.1000
      WHERE id = $1`,
    [farJob.id, farOfferId],
  );
  await harness.pool.query(
    `INSERT INTO delivery_offers
       (id, delivery_id, rider_id, status, distance_to_pickup_km, offered_at, expires_at)
     VALUES ($1, $2, $3, 'PENDING', 99, $4, $5)`,
    [farOfferId, farJob.id, riderId, new Date(harness.clock + 1000), new Date(harness.clock + 60_000)],
  );

  const priority = await service.getCurrentOffer(riderId);
  assert.equal(priority.offerId, nearOffer.offerId, "the older nearby pickup stays ahead of the newer far pickup");
  assert.ok(priority.distanceToPickupKm < 99, "distance is refreshed from the rider's latest GPS");
});

// 6. Two riders cannot accept the same job
dbTest("two riders cannot accept the same job", async (service) => {
  const riderA = await createApprovedRider(service, { online: false });
  const riderB = await createApprovedRider(service, { online: false });
  const { job } = await readyJob(service);
  await service.goOnline(riderA, NEAR_PICKUP);
  await service.goOnline(riderB, NEAR_PICKUP);

  // Concurrent dispatchers still create exactly one pending offer for the job.
  await Promise.all([service.dispatchJob(job.id), service.dispatchJob(job.id), service.dispatchJob(job.id)]);
  const pending = (await harness.pool.query("SELECT rider_id FROM delivery_offers WHERE delivery_id = $1 AND status = 'PENDING'", [job.id])).rows;
  assert.equal(pending.length, 1);
  const holder = pending[0].rider_id;
  const other = holder === riderA ? riderB : riderA;
  const offer = await service.getCurrentOffer(holder);

  // The other rider cannot claim someone else's offer.
  await expectError(service.respondToOffer(other, offer.offerId, { decision: "ACCEPT" }), { status: 404, code: "OFFER_NOT_FOUND" });

  // Double-tap accept: exactly one wins.
  const results = await Promise.allSettled([
    service.respondToOffer(holder, offer.offerId, { decision: "ACCEPT" }),
    service.respondToOffer(holder, offer.offerId, { decision: "ACCEPT" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.statusCode, 409);
  const stored = await getJob(job.id);
  assert.equal(stored.rider_id, holder);
  assert.equal(stored.status, "RIDER_ASSIGNED");
});

// 7. Rider accepts job
dbTest("rider accepts a job and is locked to it", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  const offer = await service.getCurrentOffer(riderId);
  const result = await service.respondToOffer(riderId, offer.offerId, { decision: "ACCEPT" });
  assert.equal(result.accepted, true);
  const stored = await getJob(job.id);
  assert.equal(stored.status, "RIDER_ASSIGNED");
  const rider = await getRiderRow(riderId);
  assert.equal(rider.availability_status, "ON_DELIVERY");
  assert.equal(rider.current_delivery_id, job.id);
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-assigned" && notice.adminId === "seller-1"));
  assert.ok(harness.orderEvents.some((event) => event.event === "RIDER_ASSIGNED"));
  assert.ok((await auditActions(job.id)).includes("OFFER_ACCEPTED"));
  await expectError(service.goOffline(riderId), { status: 409, code: "ACTIVE_DELIVERY" });
});

dbTest("declined and expired offers move on to the next rider", async (service) => {
  const riderA = await createApprovedRider(service, { location: { lat: 14.5549, lng: 121.0246 } });
  const riderB = await createApprovedRider(service, { location: { lat: 14.56, lng: 121.03 } });
  const { job } = await readyJob(service);
  const first = await service.getCurrentOffer(riderA);
  assert.ok(first, "closest rider is offered first");
  await service.respondToOffer(riderA, first.offerId, { decision: "DECLINE", reason: "Too far" });
  const second = await service.getCurrentOffer(riderB);
  assert.ok(second, "next rider gets the offer after a decline");

  advance(31_000);
  await service.goOnline(riderA, NEAR_PICKUP);
  await service.expireDueOffers();
  const stored = await getJob(job.id);
  assert.notEqual(stored.status, "OFFERED", "offer was not left dangling");
  assert.equal(await service.getCurrentOffer(riderA), null, "a rider who declined is not re-offered the same job");
  await expectError(service.respondToOffer(riderB, second.offerId, { decision: "ACCEPT" }), { code: "OFFER_NO_LONGER_AVAILABLE" });
});

// 8. Rider arrives at pickup
dbTest("rider heads to and arrives at pickup; seller is notified", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  const offer = await service.getCurrentOffer(riderId);
  await service.respondToOffer(riderId, offer.offerId, { decision: "ACCEPT" });
  await expectError(service.confirmPickup(riderId, job.id, { pin: "123456" }), { status: 409, code: "INVALID_STATUS_TRANSITION" });
  await service.startPickup(riderId, job.id);
  assert.equal((await getJob(job.id)).status, "RIDER_TO_PICKUP");
  await service.arriveAtPickup(riderId, job.id);
  assert.equal((await getJob(job.id)).status, "ARRIVED_AT_PICKUP");
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-arrived-pickup"));
});

// 9. Invalid pickup PIN
dbTest("invalid pickup PIN is counted, then locks; support can reset", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_PICKUP");
  const correct = service.pinFor(await getJob(job.id), "pickup");
  const wrong = correct === "000000" ? "111111" : "000000";

  await assert.rejects(service.confirmPickup(riderId, job.id, { pin: wrong }), (error) => {
    assert.equal(error.code, "PIN_INCORRECT");
    assert.equal(error.attemptsRemaining, 4);
    return true;
  });
  assert.equal((await getJob(job.id)).pickup_pin_attempts, 1, "attempt persisted despite the error");
  for (let i = 0; i < 4; i += 1) {
    await assert.rejects(service.confirmPickup(riderId, job.id, { pin: wrong }));
  }
  await expectError(service.confirmPickup(riderId, job.id, { pin: correct }), { status: 423, code: "PIN_LOCKED" });
  assert.equal((await getJob(job.id)).status, "ARRIVED_AT_PICKUP");
  assert.ok((await auditActions(job.id)).includes("PIN_MISMATCH"));

  await service.adminIntervene(job.id, { action: "RESET_PIN_ATTEMPTS", note: "Seller confirmed identity" }, SA);
  await service.confirmPickup(riderId, job.id, { pin: correct });
  assert.equal((await getJob(job.id)).status, "PICKED_UP");
});

// 10 + 11. Valid pickup PIN, picked up
dbTest("valid pickup PIN from the seller marks the parcel picked up", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_PICKUP");
  const sellerView = await service.getSellerDelivery("seller-1", order.orderGroupId);
  assert.match(sellerView.pickupPin, /^\d{6}$/);
  assert.equal(sellerView.rider.firstName, "Ramon");
  assert.equal(sellerView.rider.lastName, undefined, "seller sees limited rider info");

  await service.confirmPickup(riderId, job.id, { pin: sellerView.pickupPin });
  const stored = await getJob(job.id);
  assert.equal(stored.status, "PICKED_UP");
  assert.ok(stored.picked_up_at);
  assert.ok(harness.orderEvents.some((event) => event.event === "PICKED_UP"));
  assert.ok((await auditActions(job.id)).includes("PICKUP_VERIFIED"));
  const after = await service.getSellerDelivery("seller-1", order.orderGroupId);
  assert.equal(after.pickupPin, "", "pickup PIN is hidden after pickup");
});

// 12. Delivery tracking
dbTest("buyer tracking shows limited rider info, PIN, live location and route once a rider accepts", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  const waiting = await service.getBuyerTracking("buyer-1", order.orderGroupId);
  assert.equal(waiting.rider, null);
  assert.equal(waiting.riderLocation, null);
  assert.equal(waiting.route.phase, "PLANNED", "store → buyer route before a rider accepts");
  assert.deepEqual([waiting.pickup.lat, waiting.pickup.lng], [PICKUP.lat, PICKUP.lng]);
  assert.equal(await service.getBuyerTracking("buyer-2", order.orderGroupId), null, "other buyers see nothing");
  assert.ok(await service.getBuyerTracking("buyer-1", String(order.createdAtEpochMs)), "buyer app can look up by createdAtEpochMs");

  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_PICKUP");
  const assigned = await service.getBuyerTracking("buyer-1", order.orderGroupId);
  assert.equal(assigned.rider.firstName, "Ramon");
  assert.equal(assigned.rider.lastName, undefined);
  assert.match(assigned.deliveryPin, /^\d{6}$/);
  assert.ok(assigned.riderLocation, "buyer sees the rider heading to the store");
  assert.equal(assigned.route.phase, "TO_PICKUP");
  assert.deepEqual(assigned.route.segments.map((segment) => segment.kind), ["TO_PICKUP", "PLANNED"]);
  assert.ok(assigned.route.etaSeconds > 0);

  await service.confirmPickup(riderId, job.id, { pin: service.pinFor(await getJob(job.id), "pickup") });
  await service.startDelivery(riderId, job.id);
  advance(60_000);
  const location = await service.recordLocation(riderId, { lat: 14.559, lng: 121.029, accuracy: 8 });
  assert.equal(location.accepted, true);
  const moving = await service.getBuyerTracking("buyer-1", order.orderGroupId);
  assert.deepEqual([moving.riderLocation.lat, moving.riderLocation.lng], [14.559, 121.029]);
  assert.equal(moving.route.phase, "TO_DROPOFF");
  assert.equal(moving.route.segments[0].source, "estimate", "no Google key in tests → straight-line estimate");
  assert.equal(moving.timeline.find((step) => step.key === "picked_up").done, true);
  assert.equal(moving.estimateNote, "Estimated time, not guaranteed.");
  assert.equal(Array.isArray(moving.riderLocation), false, "only the latest point, never the history");
});

dbTest("rider route changes from trip overview to pickup and then drop-off", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  const offer = await service.getCurrentOffer(riderId);
  assert.ok(offer);

  const preview = await service.getOfferRouteForRider(riderId, offer.offerId);
  assert.equal(preview.phase, "OVERVIEW");
  assert.equal(preview.origin.kind, "PICKUP");
  assert.equal(preview.destination.kind, "DROPOFF");
  assert.ok(preview.distanceMeters > 0);

  await service.respondToOffer(riderId, offer.offerId, { decision: "ACCEPT" });
  const toPickup = await service.getJobRouteForRider(riderId, job.id);
  assert.equal(toPickup.phase, "TO_PICKUP");
  assert.equal(toPickup.origin.kind, "RIDER");
  assert.equal(toPickup.destination.kind, "PICKUP");

  const deviceGps = { lat: 14.5484, lng: 121.0218 };
  const fromDevice = await service.getJobRouteForRider(riderId, job.id, deviceGps);
  assert.deepEqual(
    [fromDevice.origin.lat, fromDevice.origin.lng],
    [deviceGps.lat, deviceGps.lng],
    "the live route starts from the authenticated rider device GPS",
  );

  await service.arriveAtPickup(riderId, job.id);
  await service.confirmPickup(riderId, job.id, {
    pin: service.pinFor(await getJob(job.id), "pickup"),
  });
  const toDropoff = await service.getJobRouteForRider(riderId, job.id);
  assert.equal(toDropoff.phase, "TO_DROPOFF");
  assert.equal(toDropoff.destination.kind, "DROPOFF");
});

dbTest("checkout dispatch offers the job to the nearest rider to the store, who must still accept", async (service) => {
  const BUYER = { type: "buyer", id: "buyer-1" };
  const farRiderId = await createApprovedRider(service, { location: { lat: 14.676, lng: 121.0437 } });
  const nearRiderId = await createApprovedRider(service);
  const { job } = await service.createJobForOrder(makeOrder({ isPacked: false }), { actor: BUYER });
  assert.equal(job.status, "PREPARING");

  const started = await service.startDispatchAfterCheckout(job.id, { actor: BUYER });
  assert.equal(started.started, true);
  const offered = await getJob(job.id);
  assert.equal(offered.status, "OFFERED");
  assert.equal(offered.rider_id, null, "nobody is assigned until the rider accepts");
  assert.equal(await service.getCurrentOffer(farRiderId), null, "riders outside the offer radius get nothing");
  const offer = await service.getCurrentOffer(nearRiderId);
  assert.ok(offer, "the rider nearest to the store gets the offer");
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-finding"), "seller is told to prepare the parcel");
  await service.respondToOffer(nearRiderId, offer.offerId, { decision: "ACCEPT" });
  assert.equal((await getJob(job.id)).status, "RIDER_ASSIGNED");

  await service.updateSettings({ dispatchOnCheckout: false }, SA);
  const second = await service.createJobForOrder(makeOrder(), { actor: BUYER });
  assert.equal((await service.startDispatchAfterCheckout(second.job.id)).started, false);
  assert.equal((await getJob(second.job.id)).status, "PREPARING", "seller's Ready for Rider starts dispatch instead");
});

dbTest("location updates are validated and rate-limited", async (service) => {
  const riderId = await createApprovedRider(service);
  await expectError(service.recordLocation(riderId, { lat: 14.56, lng: 121.03 }), { status: 429, code: "LOCATION_RATE_LIMITED" });
  advance(11_000);
  assert.equal((await service.recordLocation(riderId, { lat: 14.5565, lng: 121.0265, accuracy: 5 })).accepted, true);
  advance(20_000);
  const jump = await service.recordLocation(riderId, CEBU);
  assert.equal(jump.accepted, false, "teleporting 500 km in 20 s is rejected");
  await expectError(service.recordLocation(riderId, { lat: 200, lng: 0 }), { status: 422, code: "INVALID_LOCATION" });
  await service.goOffline(riderId);
  advance(11_000);
  await expectError(service.recordLocation(riderId, NEAR_PICKUP), { status: 409, code: "RIDER_OFFLINE" });
});

// 13 + 14. COD collection; COD modification rejected
dbTest("COD must be collected in the exact backend amount", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service, makeOrder({ isCod: true, codAmount: 500 }));
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  const deliveryPin = service.pinFor(await getJob(job.id), "delivery");

  await expectError(service.completeDelivery(riderId, job.id, { method: "PIN", pin: deliveryPin }), { status: 409, code: "COD_NOT_COLLECTED" });
  await assert.rejects(service.collectCod(riderId, job.id, { amount: 450 }), (error) => {
    assert.equal(error.code, "COD_AMOUNT_MISMATCH");
    assert.equal(error.expectedAmount, 500);
    return true;
  });
  await expectError(service.collectCod(riderId, job.id, { amount: 500.01 }), { code: "COD_AMOUNT_MISMATCH" });
  await service.collectCod(riderId, job.id, { amount: 500 });
  const stored = await getJob(job.id);
  assert.equal(Number(stored.cod_amount), 500, "COD amount never changes");
  assert.equal(Number(stored.cod_collected_amount), 500);
  assert.ok((await auditActions(job.id)).includes("COD_COLLECTED"));
  await expectError(service.completeDelivery(riderId, job.id, { method: "PHOTO", proofId: "x", leftAtDoor: true }), {
    status: 409,
    code: "COD_REQUIRES_HANDOVER",
  });
  await service.completeDelivery(riderId, job.id, { method: "PIN", pin: deliveryPin });
  assert.equal((await getJob(job.id)).status, "DELIVERED");
});

dbTest("prepaid orders cannot have cash collected", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  await expectError(service.collectCod(riderId, job.id, { amount: 100 }), { status: 409, code: "NOT_COD" });
});

// 15. Delivery PIN verification
dbTest("delivery PIN is verified before completing", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  const correct = service.pinFor(await getJob(job.id), "delivery");
  await expectError(service.completeDelivery(riderId, job.id, { method: "PIN", pin: correct === "999999" ? "888888" : "999999" }), {
    status: 422,
    code: "PIN_INCORRECT",
  });
  await service.completeDelivery(riderId, job.id, { method: "PIN", pin: correct });
  const stored = await getJob(job.id);
  assert.equal(stored.status, "DELIVERED");
  assert.equal(stored.delivery_pin_verified, true);
  assert.equal(stored.delivery_pin_attempts, 1);
});

// 16 + 17. Proof of delivery; successful delivery
dbTest("photo proof completes a delivery, frees the rider, and notifies seller and order", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  await expectError(service.completeDelivery(riderId, job.id, { method: "PIN", pin: "123456", leftAtDoor: true }), {
    status: 422,
    code: "PHOTO_REQUIRED",
  });
  await expectError(service.completeDelivery(riderId, job.id, { method: "PHOTO", proofId: "missing" }), { status: 422, code: "PROOF_REQUIRED" });
  await expectError(service.uploadProof(riderId, job.id, "DELIVERY", Buffer.from("plain text"), "image/jpeg"), { status: 415 });

  const { proofId } = await service.uploadProof(riderId, job.id, "DELIVERY", PNG, "image/png");
  await service.completeDelivery(riderId, job.id, { method: "PHOTO", proofId, leftAtDoor: true });
  const stored = await getJob(job.id);
  assert.equal(stored.status, "DELIVERED");
  assert.equal(stored.delivery_confirmation_type, "PHOTO");
  assert.equal(stored.proof_of_delivery_id, proofId);

  const rider = await getRiderRow(riderId);
  assert.equal(rider.availability_status, "ONLINE");
  assert.equal(rider.current_delivery_id, null);
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-delivered"));
  assert.ok(harness.orderEvents.some((event) => event.event === "DELIVERED"));
  assert.ok((await auditActions(job.id)).includes("DELIVERY_COMPLETED"));

  const file = await service.readProofFile(proofId, { type: "buyer", id: "buyer-1" });
  assert.ok(file, "the buyer can view their proof photo");
  await assert.rejects(service.readProofFile(proofId, { type: "buyer", id: "buyer-2" }));
  const tracking = await service.getBuyerTracking("buyer-1", order.orderGroupId);
  assert.equal(tracking.canRate, true);
  await service.rateRider("buyer-1", order.orderGroupId, { stars: 5, comment: "Fast" });
  await expectError(service.rateRider("buyer-1", order.orderGroupId, { stars: 4 }), { status: 409, code: "ALREADY_RATED" });
  await expectError(service.rateRider("buyer-2", order.orderGroupId, { stars: 1 }), { status: 404 });
  assert.equal(Number((await getRiderRow(riderId)).rating_average), 5);
});

// 18. Rider earnings
dbTest("rider earnings follow the ledger: pending, then available, then paid", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service, makeOrder({ isCod: true, codAmount: 800 }));
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  await service.collectCod(riderId, job.id, { amount: 800 });
  await service.completeDelivery(riderId, job.id, { method: "PIN", pin: service.pinFor(await getJob(job.id), "delivery") });
  const riderEarning = Number((await getJob(job.id)).rider_earning);

  const summary = await service.getEarningsSummary(riderId);
  assert.equal(summary.today, riderEarning);
  assert.equal(summary.todayDeliveries, 1);
  assert.deepEqual(summary.balances, { pending: riderEarning, available: 0, paid: 0 });
  assert.ok(summary.today < 800, "COD cash is never counted as earnings");
  assert.equal(summary.earnings[0].baseFee + summary.earnings[0].distanceFee, riderEarning);

  await expectError(service.createPayout(riderId, { amount: riderEarning, method: "GCASH", reference: "R1" }, SA), {
    status: 409,
    code: "INSUFFICIENT_AVAILABLE_BALANCE",
  });
  advance(25 * 3600 * 1000);
  await service.releaseDueEarnings();
  assert.equal((await service.getEarningsSummary(riderId)).balances.available, riderEarning);
  await service.createPayout(riderId, { amount: riderEarning, method: "GCASH", reference: "GC-123" }, SA);
  const paid = await service.getEarningsSummary(riderId);
  assert.deepEqual(paid.balances, { pending: 0, available: 0, paid: riderEarning });
  assert.equal(paid.earnings[0].status, "PAID");
});

// 19. COD wallet balance
dbTest("COD wallet tracks collected, remitted, and verified cash", async (service) => {
  const riderId = await createApprovedRider(service);
  const { job } = await readyJob(service, makeOrder({ isCod: true, codAmount: 500 }));
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  await service.collectCod(riderId, job.id, { amount: 500 });
  await service.completeDelivery(riderId, job.id, { method: "PIN", pin: service.pinFor(await getJob(job.id), "delivery") });

  let wallet = await service.getCashWallet(riderId);
  assert.equal(wallet.collected, 500);
  assert.equal(wallet.outstanding, 500);
  await expectError(service.submitRemittance(riderId, { amount: 600, method: "GCASH", reference: "X" }), {
    status: 409,
    code: "REMITTANCE_EXCEEDS_OUTSTANDING",
  });
  await expectError(service.submitRemittance(riderId, { amount: 500, method: "GCASH" }), { status: 422, code: "REFERENCE_REQUIRED" });
  const remittance = await service.submitRemittance(riderId, { amount: 500, method: "GCASH", reference: "GC-555" });
  assert.ok(harness.saNotices.some((notice) => notice.type === "switch-rider-remittance-submitted"));
  wallet = await service.getCashWallet(riderId);
  assert.equal(wallet.remittedAwaitingVerification, 500);
  assert.equal(wallet.outstanding, 0);

  await expectError(service.reviewRemittance(remittance.id, { decision: "REJECTED" }, SA), { status: 422, code: "REASON_REQUIRED" });
  await service.reviewRemittance(remittance.id, { decision: "REJECTED", note: "Reference not found" }, SA);
  wallet = await service.getCashWallet(riderId);
  assert.equal(wallet.outstanding, 500, "rejected remittance puts the cash back on the rider");
  const second = await service.submitRemittance(riderId, { amount: 500, method: "CASH_AT_HUB" });
  await service.reviewRemittance(second.id, { decision: "VERIFIED" }, SA);
  wallet = await service.getCashWallet(riderId);
  assert.equal(wallet.verified, 500);
  assert.equal(wallet.outstanding, 0);
  assert.equal(wallet.transactions[0].status, "VERIFIED");
});

// 20. Failed delivery
dbTest("failed delivery needs evidence and starts a return", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_DROPOFF");
  await expectError(service.failDelivery(riderId, job.id, { reason: "CUSTOMER_UNREACHABLE" }), { status: 422, code: "PROOF_REQUIRED" });
  await expectError(service.failDelivery(riderId, job.id, { reason: "NOT_A_REASON" }), { status: 422, code: "INVALID_REASON" });
  const { proofId } = await service.uploadProof(riderId, job.id, "FAILED_ATTEMPT", PNG, "image/png");
  await service.failDelivery(riderId, job.id, { reason: "CUSTOMER_UNREACHABLE", note: "Called 3 times", proofId });
  const stored = await getJob(job.id);
  assert.equal(stored.status, "RETURN_REQUIRED");
  assert.equal(stored.failure_reason, "CUSTOMER_UNREACHABLE");
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-delivery-failed"));
  assert.ok(harness.saNotices.some((notice) => notice.type === "switch-rider-delivery-failed"));
  assert.ok((await auditActions(job.id)).includes("DELIVERY_FAILED"));
  const tracking = await service.getBuyerTracking("buyer-1", order.orderGroupId);
  assert.equal(tracking.exception, true);
  assert.equal(tracking.deliveryPin, "");
  await expectError(service.goOffline(riderId), { status: 409, code: "ACTIVE_DELIVERY" });
});

// 21. Return to seller
dbTest("return to seller is confirmed with the seller's return PIN", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "IN_TRANSIT");
  await service.failDelivery(riderId, job.id, { reason: "CUSTOMER_REFUSED" });
  await service.startReturn(riderId, job.id);
  const sellerView = await service.getSellerDelivery("seller-1", order.orderGroupId);
  assert.match(sellerView.returnPin, /^\d{6}$/);
  assert.ok(sellerView.riderPhone, "seller can call the returning rider");

  const wrong = sellerView.returnPin === "000000" ? "111111" : "000000";
  await expectError(service.confirmReturn(riderId, job.id, { pin: wrong }), { status: 422, code: "PIN_INCORRECT" });
  await service.confirmReturn(riderId, job.id, { pin: sellerView.returnPin });
  const stored = await getJob(job.id);
  assert.equal(stored.status, "RETURNED_TO_SELLER");
  const earning = (await harness.pool.query("SELECT * FROM rider_earnings WHERE delivery_id = $1", [job.id])).rows[0];
  assert.equal(earning.earning_type, "FAILED_ATTEMPT");
  assert.equal(Number(earning.total), Math.round(Number(stored.pricing_snapshot.riderBaseFee) * 50) / 100);
  assert.equal((await getRiderRow(riderId)).availability_status, "ONLINE");
  assert.ok((await auditActions(job.id)).includes("RETURN_CONFIRMED"));
});

// 22. Cancellation before pickup
dbTest("cancellation before pickup frees the rider and allows a new job", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "ARRIVED_AT_PICKUP");
  assert.deepEqual(await service.canCancelOrderGroup(order.orderGroupId), { allowed: true });
  await expectError(service.cancelJob(job.id, { reason: "" }, SELLER), { status: 422, code: "REASON_REQUIRED" });
  await expectError(service.cancelJob(job.id, { reason: "x" }, { type: "seller", id: "seller-2" }), { status: 404 });

  await service.cancelJobForOrderGroup(order.orderGroupId, { reason: "Buyer cancelled" }, SELLER);
  const stored = await getJob(job.id);
  assert.equal(stored.status, "CANCELLED");
  assert.equal(stored.cancellation_stage, "ARRIVED_AT_PICKUP");
  const rider = await getRiderRow(riderId);
  assert.equal(rider.availability_status, "ONLINE");
  assert.equal(rider.current_delivery_id, null);
  const notes = await service.listRiderNotifications(riderId);
  assert.ok(JSON.stringify(notes).includes("Delivery cancelled"));
  assert.ok(harness.saNotices.some((notice) => notice.type === "switch-rider-seller-cancelled"), "Super Admin sees seller cancellations");

  const again = await service.createJobForOrder(order, { actor: SELLER });
  assert.equal(again.created, true, "a cancelled job does not block a new one for the same order");
});

// 23. Cancellation after pickup
dbTest("cancellation after pickup requires Super Admin intervention", async (service) => {
  const riderId = await createApprovedRider(service);
  const { order, job } = await readyJob(service);
  await acceptAndAdvance(service, riderId, job.id, "PICKED_UP");
  await expectError(service.cancelJob(job.id, { reason: "Changed my mind" }, SELLER), { status: 409, code: "CANCEL_REQUIRES_INTERVENTION" });
  assert.equal((await service.canCancelOrderGroup(order.orderGroupId)).allowed, false);
  await expectError(service.setRiderStatus(riderId, "suspend", { reason: "Complaint" }, SA), { status: 409, code: "RIDER_HAS_PARCEL" });

  await service.adminIntervene(job.id, { action: "FORCE_RETURN", note: "Buyer cancelled after pickup" }, SA);
  assert.equal((await getJob(job.id)).status, "RETURN_REQUIRED");
  assert.ok(harness.sellerNotices.some((notice) => notice.type === "switch-rider-force-return"));
  assert.ok((await auditActions(job.id)).includes("INTERVENTION_FORCE_RETURN"));
});

// 24. Unauthorized rider accessing another delivery
dbTest("a rider cannot see or act on another rider's delivery", async (service) => {
  const owner = await createApprovedRider(service);
  const intruder = await createApprovedRider(service, { location: CEBU });
  const { job } = await readyJob(service);
  await acceptAndAdvance(service, owner, job.id, "ARRIVED_AT_DROPOFF");
  const { proofId } = await service.uploadProof(owner, job.id, "DELIVERY", PNG, "image/png");

  await expectError(service.getJobForRider(intruder, job.id), { status: 404, code: "DELIVERY_NOT_FOUND" });
  await expectError(service.completeDelivery(intruder, job.id, { method: "PHOTO", proofId }), { status: 404 });
  await expectError(service.collectCod(intruder, job.id, { amount: 1 }), { status: 404 });
  await expectError(service.uploadProof(intruder, job.id, "DELIVERY", PNG, "image/png"), { status: 404 });
  await assert.rejects(service.readProofFile(proofId, { type: "rider", id: intruder }));
  assert.equal(await service.getSellerDelivery("seller-2", job.order_group_id), null, "other sellers see nothing");
  assert.equal((await service.listActiveJobs(intruder)).length, 0);
});

// 25. Super Admin manual assignment
dbTest("Super Admin manual assignment enforces eligibility and supports reassignment", async (service) => {
  await service.updateSettings({ autoDispatch: false }, SA);
  const offline = await createApprovedRider(service, { online: false });
  const first = await createApprovedRider(service);
  const second = await createApprovedRider(service, { location: CEBU });
  const suspended = await createApprovedRider(service);
  await service.setRiderStatus(suspended, "suspend", { reason: "Test" }, SA);
  const { job } = await readyJob(service);
  assert.equal((await getJob(job.id)).status, "WAITING_FOR_RIDER");

  const candidates = await service.listEligibleRidersForJob(job.id);
  const offlineEntry = candidates.find((candidate) => candidate.id === offline);
  assert.equal(offlineEntry.eligible, false);
  assert.ok(offlineEntry.blockedReasons.some((reason) => reason.code === "RIDER_OFFLINE"));
  assert.equal(candidates.some((candidate) => candidate.id === suspended), false, "suspended riders are not listed");
  assert.equal(candidates.find((candidate) => candidate.id === second).eligible, true, "manual mode ignores distance");

  await expectError(service.manualAssign(job.id, offline, {}, SA), { status: 409, code: "RIDER_NOT_ELIGIBLE" });
  await service.manualAssign(job.id, first, { note: "Closest" }, SA);
  assert.equal((await getJob(job.id)).rider_id, first);
  assert.ok(harness.sellerNotices.length > 0, "seller hears about the assignment");

  await service.manualAssign(job.id, second, { note: "Reassign" }, SA);
  const reassigned = await getJob(job.id);
  assert.equal(reassigned.rider_id, second);
  assert.equal((await getRiderRow(first)).availability_status, "ONLINE", "previous rider is freed");
  assert.ok(JSON.stringify(await service.listRiderNotifications(first)).includes("reassigned"));

  await service.arriveAtPickup(second, job.id);
  await service.confirmPickup(second, job.id, { pin: service.pinFor(await getJob(job.id), "pickup") });
  await expectError(service.manualAssign(job.id, first, {}, SA), { status: 409, code: "CANNOT_ASSIGN" });
});

// 26. Service area validation
dbTest("checkout quotes validate service area and cannot be tampered with", async (service) => {
  const quote = await service.quoteForCheckout({ sellerAdminId: "seller-1", buyerAccountId: "buyer-1", dropoff: DROPOFF });
  assert.equal(quote.available, true);
  assert.ok(quote.deliveryFee >= 59);
  assert.match(quote.estimateLabel, /not guaranteed/);

  const outside = await service.quoteForCheckout({ sellerAdminId: "seller-1", buyerAccountId: "buyer-1", dropoff: CEBU });
  assert.deepEqual([outside.available, outside.code], [false, "DROPOFF_NOT_SERVICEABLE"]);
  const noPickup = await service.quoteForCheckout({ sellerAdminId: "seller-9", buyerAccountId: "buyer-1", dropoff: DROPOFF });
  assert.deepEqual([noPickup.available, noPickup.code], [false, "PICKUP_LOCATION_MISSING"]);

  const base = { sellerAdminId: "seller-1", buyerAccountId: "buyer-1", dropoff: DROPOFF, customerFee: quote.deliveryFee };
  assert.equal(service.validateCheckoutQuote(quote.quoteToken, base).deliveryFee, quote.deliveryFee);
  assert.throws(() => service.validateCheckoutQuote(quote.quoteToken, { ...base, customerFee: 1 }), { code: "SWITCH_RIDER_FEE_MISMATCH" });
  assert.throws(() => service.validateCheckoutQuote(quote.quoteToken, { ...base, dropoff: { lat: 14.62, lng: 121.05 } }), {
    code: "SWITCH_RIDER_QUOTE_MISMATCH",
  });
  assert.throws(() => service.validateCheckoutQuote(quote.quoteToken, { ...base, sellerAdminId: "seller-2" }), {
    code: "SWITCH_RIDER_QUOTE_MISMATCH",
  });
  assert.throws(() => service.validateCheckoutQuote(quote.quoteToken, { ...base, buyerAccountId: "buyer-2" }), {
    code: "SWITCH_RIDER_QUOTE_MISMATCH",
  });
  assert.equal(
    service.validateCheckoutQuote(quote.quoteToken, { ...base, customerFee: 0, freeShippingClaimed: true }).deliveryFee,
    quote.deliveryFee,
    "free shipping keeps the rider's pay; the platform covers the fee",
  );
  advance(16 * 60 * 1000);
  assert.throws(() => service.validateCheckoutQuote(quote.quoteToken, base), { code: "SWITCH_RIDER_QUOTE_INVALID" });

  harness.sellerNotices.length = 0;
  await service.updateSettings({ enabled: false }, SA);
  const disabled = await service.quoteForCheckout({ sellerAdminId: "seller-1", buyerAccountId: "buyer-1", dropoff: DROPOFF });
  assert.deepEqual([disabled.available, disabled.code], [false, "SWITCH_RIDER_DISABLED"]);
  assert.deepEqual(
    harness.sellerNotices.map((notice) => [notice.adminId, notice.type]),
    [["seller-1", "switch_rider_disabled"]],
    "sellers with a pickup location hear that Switch Rider was paused",
  );
  await service.updateSettings({ autoDispatch: false }, SA);
  assert.equal(harness.sellerNotices.length, 1, "unrelated settings changes don't notify sellers");
  await service.updateSettings({ enabled: true }, SA);
  assert.equal(harness.sellerNotices.at(-1).type, "switch_rider_enabled");
});

dbTest("orders cancelled through any path cancel their pre-pickup delivery", async (service) => {
  const { order, job } = await readyJob(service);
  const orders = [
    { id: "e1", adminId: "seller-1", accountId: "buyer-1", orderGroupId: order.orderGroupId, createdAtEpochMs: order.createdAtEpochMs, stage: "cancelled" },
  ];
  const bridge = createSwitchRiderOrderBridge({
    readOrders: async () => orders,
    writeOrders: async () => {},
    catalogWriteScope: (scope) => scope,
    normalizeStoredOrderEntry: (entry) => entry,
    isScopedOrderGroupEntry: (entry, adminId, key) =>
      entry.adminId === adminId && (entry.orderGroupId === key || String(entry.createdAtEpochMs) === key),
    isCodPaymentOption: () => false,
    readProducts: async () => [],
    writeProducts: async () => {},
    isRecordInAdminScope: () => true,
    readAccounts: async () => [],
    findAdminAccountByScopeId: () => null,
    logger: { warn() {}, error() {} },
  });
  bridge.attachService(service);
  assert.equal(await bridge.reconcileCancelledOrders(), 1);
  assert.equal((await getJob(job.id)).status, "CANCELLED");
});

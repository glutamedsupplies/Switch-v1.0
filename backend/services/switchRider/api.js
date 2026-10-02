"use strict";

const {
  DOCUMENT_TYPES,
  FAILURE_REASONS,
  INCIDENT_CATEGORIES,
  RIDER_RELEASE_REASONS,
  VEHICLE_TYPES,
} = require("./constants");
const { MAX_PRIVATE_FILE_BYTES } = require("./privateFiles");
const { requiredDocumentTypes, DOCUMENT_LABELS } = require("./riders");

const RIDER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const ERROR_EXTRAS = [
  "attemptsRemaining",
  "expectedAmount",
  "expectedFee",
  "reasons",
  "retryAfterSeconds",
  "missing",
  "riderStatus",
  "currentStatus",
];

const RIDER_JOB_STEPS = Object.freeze({
  "start-pickup": (service, riderId, jobId) => service.startPickup(riderId, jobId),
  "arrived-pickup": (service, riderId, jobId) => service.arriveAtPickup(riderId, jobId),
  "confirm-pickup": (service, riderId, jobId, body) => service.confirmPickup(riderId, jobId, { pin: body.pin }),
  "start-delivery": (service, riderId, jobId) => service.startDelivery(riderId, jobId),
  "arrived-dropoff": (service, riderId, jobId) => service.arriveAtDropoff(riderId, jobId),
  "collect-cod": (service, riderId, jobId, body) => service.collectCod(riderId, jobId, { amount: body.amount }),
  complete: (service, riderId, jobId, body) =>
    service.completeDelivery(riderId, jobId, {
      method: body.method,
      pin: body.pin,
      proofId: body.proofId,
      leftAtDoor: body.leftAtDoor === true,
    }),
  fail: (service, riderId, jobId, body) =>
    service.failDelivery(riderId, jobId, { reason: body.reason, note: body.note, proofId: body.proofId }),
  "start-return": (service, riderId, jobId) => service.startReturn(riderId, jobId),
  "confirm-return": (service, riderId, jobId, body) => service.confirmReturn(riderId, jobId, { pin: body.pin }),
  release: (service, riderId, jobId, body) => service.riderReleaseJob(riderId, jobId, { reason: body.reason, note: body.note }),
});

function readBinaryBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        const error = new Error("Photos must be 8 MB or smaller.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

/**
 * HTTP layer for Switch Rider.
 *   /api/rider/*                    rider app (rider session only)
 *   /api/switch-rider/*             buyer + seller surfaces
 *   /api/super-admin/switch-rider/* Super Admin (already gated by requireSuperAdmin)
 */
function createSwitchRiderApi(deps) {
  const {
    service,
    appSessionAuth,
    sendJson,
    parseRequestBody,
    setCorsHeaders,
    isSuperAdminAuthorized,
    loginLockout,
    getRequestIpAddress,
    loadSellerOrderGroup,
    superAdminActorId = "super-admin",
    supportContacts = {},
    logger = console,
  } = deps;

  function sendError(response, error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) logger.error?.("[switch-rider] request failed:", error?.stack || error);
    const body = {
      message: status >= 500 && !error?.code ? "Something went wrong. Please try again." : error?.message || "Request failed.",
      code: error?.code || (status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED"),
    };
    for (const key of ERROR_EXTRAS) if (error && error[key] !== undefined) body[key] = error[key];
    if (status === 429 && body.retryAfterSeconds) response.setHeader("Retry-After", String(body.retryAfterSeconds));
    sendJson(response, status, body);
  }

  function sendFile(response, { buffer, contentType }) {
    setCorsHeaders(response);
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": buffer.length,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    });
    response.end(buffer);
  }

  async function readJson(request) {
    try {
      const body = await parseRequestBody(request);
      return body && typeof body === "object" ? body : {};
    } catch (error) {
      error.statusCode = error.statusCode || 400;
      throw error;
    }
  }

  function issueRiderSession(rider) {
    const session = appSessionAuth.issueSession({
      role: "rider",
      accountId: rider.id,
      ttlSeconds: RIDER_SESSION_TTL_SECONDS,
    });
    return { sessionToken: session.token, sessionExpiresAt: session.expiresAt };
  }

  /** Resolves the rider behind a rider session (fresh DB check so deactivation is immediate). */
  async function requireRider(request, response) {
    const session = request.riderSession;
    if (!session || session.role !== "rider") {
      sendJson(response, 401, { message: "Please sign in to Switch Rider.", code: "RIDER_SESSION_REQUIRED" });
      return null;
    }
    try {
      const me = await service.getRiderSelf(session.accountId);
      if (me.status === "DEACTIVATED") {
        sendJson(response, 403, { message: "This rider account has been deactivated.", code: "RIDER_DEACTIVATED" });
        return null;
      }
      return me;
    } catch (error) {
      if (error?.statusCode === 404) {
        sendJson(response, 401, { message: "Please sign in to Switch Rider.", code: "RIDER_SESSION_REQUIRED" });
        return null;
      }
      throw error;
    }
  }

  function sessionRole(request) {
    return String(request.authSession?.role || "");
  }

  function sellerAdminIdFrom(request) {
    const role = sessionRole(request);
    if (role !== "seller" && role !== "employee") return "";
    return String(request.authSession?.adminId || "").trim();
  }

  function buyerIdFrom(request) {
    return sessionRole(request) === "buyer" ? String(request.authSession?.accountId || "").trim() : "";
  }

  function viewerFrom(request) {
    if (isSuperAdminAuthorized(request)) return { type: "super_admin", id: superAdminActorId };
    const buyerId = buyerIdFrom(request);
    if (buyerId) return { type: "buyer", id: buyerId };
    const adminId = sellerAdminIdFrom(request);
    if (adminId) return { type: "seller", id: adminId };
    return null;
  }

  // ------------------------------------------------------------ rider routes

  async function handleRiderRoutes(request, response, url, method, parts) {
    // parts: ["api","rider", ...]
    const [, , section, a, b] = parts;

    if (section === "auth" && a === "register" && method === "POST") {
      const body = await readJson(request);
      const rider = await service.registerRider(body);
      const self = await service.getRiderSelf(rider.id);
      sendJson(response, 201, { rider: self, ...issueRiderSession(rider) });
      return;
    }

    if (section === "auth" && a === "social" && method === "POST") {
      const body = await readJson(request);
      const result = await service.authenticateSocialRider(body);
      if (!result.rider) {
        sendJson(response, 200, { requiresApplication: true, profile: result.profile });
        return;
      }
      const self = await service.getRiderSelf(result.rider.id);
      sendJson(response, 200, {
        requiresApplication: false,
        rider: self,
        ...issueRiderSession(result.rider),
      });
      return;
    }

    if (section === "auth" && a === "login" && method === "POST") {
      const body = await readJson(request);
      const identifier = `rider:${String(body.countryCode || "+63")}${String(body.mobileNumber || "").replace(/\D/g, "")}`;
      const attempt = { ip: getRequestIpAddress(request) || "unknown", identifier };
      const locked = loginLockout.check(attempt);
      if (!locked.ok) {
        sendError(response, Object.assign(new Error("Too many login attempts. Please try again later."), {
          statusCode: 429,
          code: "LOGIN_LOCKED",
          retryAfterSeconds: locked.retryAfterSeconds,
        }));
        return;
      }
      try {
        const rider = await service.authenticateRider(body);
        loginLockout.recordSuccess(attempt);
        const self = await service.getRiderSelf(rider.id);
        sendJson(response, 200, { rider: self, ...issueRiderSession(rider) });
      } catch (error) {
        if (error?.statusCode === 401) loginLockout.recordFailure(attempt);
        throw error;
      }
      return;
    }

    if (section === "meta" && method === "GET") {
      sendJson(response, 200, {
        vehicleTypes: VEHICLE_TYPES,
        documentTypes: DOCUMENT_TYPES.map((type) => ({ type, label: DOCUMENT_LABELS[type] })),
        requiredDocuments: Object.fromEntries(VEHICLE_TYPES.map((type) => [type, requiredDocumentTypes(type)])),
        failureReasons: Object.entries(FAILURE_REASONS).map(([code, rule]) => ({ code, ...rule })),
        releaseReasons: Object.entries(RIDER_RELEASE_REASONS).map(([code, label]) => ({ code, label })),
        incidentCategories: Object.entries(INCIDENT_CATEGORIES).map(([code, rule]) => ({ code, ...rule })),
        support: {
          hotline: supportContacts.hotline || "",
          email: supportContacts.email || "",
          emergencyNumber: "911",
          emergencyNote: "Switch is not an emergency service. In an emergency, call 911 first.",
        },
        maxUploadBytes: MAX_PRIVATE_FILE_BYTES,
      });
      return;
    }

    const me = await requireRider(request, response);
    if (!me) return;
    const riderId = me.id;

    if (section === "auth" && a === "logout" && method === "POST") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (section === "me" && !a) {
      if (method === "GET") return sendJson(response, 200, { rider: me });
      if (method === "PATCH") {
        const body = await readJson(request);
        return sendJson(response, 200, { rider: await service.updateRiderProfile(riderId, body) });
      }
    }
    if (section === "me" && a === "password" && method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 200, await service.changeRiderPassword(riderId, body));
    }

    if (section === "documents" && !a) {
      if (method === "GET") return sendJson(response, 200, { documents: await service.listDocuments(riderId), missing: me.missingDocuments });
      if (method === "POST") {
        const buffer = await readBinaryBody(request, MAX_PRIVATE_FILE_BYTES + 1024);
        const doc = await service.uploadDocument(riderId, url.searchParams.get("type"), buffer, request.headers["content-type"]);
        return sendJson(response, 201, { document: doc, rider: await service.getRiderSelf(riderId) });
      }
    }
    if (section === "documents" && a && b === "file" && method === "GET") {
      return sendFile(response, await service.readDocumentFile(decodeURIComponent(a), { riderId }));
    }
    if (section === "photo" && method === "GET") {
      return sendFile(response, await service.readRiderPhoto(riderId, { type: "rider", id: riderId }));
    }

    if (section === "dashboard" && method === "GET") {
      return sendJson(response, 200, { rider: me, dashboard: await service.getRiderDashboard(riderId) });
    }

    if (section === "availability" && method === "POST") {
      const body = await readJson(request);
      const rider = body.online === true
        ? await service.goOnline(riderId, body.location || (body.lat !== undefined ? body : null))
        : await service.goOffline(riderId);
      return sendJson(response, 200, { rider });
    }

    if (section === "location" && method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 200, await service.recordLocation(riderId, body));
    }

    if (section === "offers") {
      if (a === "current" && method === "GET") {
        return sendJson(response, 200, { offer: await service.getCurrentOffer(riderId) });
      }
      if (a && b === "route" && method === "GET") {
        return sendJson(response, 200, {
          route: await service.getOfferRouteForRider(riderId, decodeURIComponent(a)),
        });
      }
      if (a && (b === "accept" || b === "decline") && method === "POST") {
        const body = await readJson(request);
        const result = await service.respondToOffer(riderId, decodeURIComponent(a), {
          decision: b === "accept" ? "ACCEPT" : "DECLINE",
          reason: body.reason,
        });
        const job = result.accepted ? await service.getJobForRider(riderId, result.deliveryId) : null;
        return sendJson(response, 200, { ...result, job });
      }
    }

    if (section === "jobs") {
      if (!a && method === "GET") return sendJson(response, 200, { jobs: await service.listActiveJobs(riderId) });
      const jobId = a ? decodeURIComponent(a) : "";
      if (jobId && !b && method === "GET") return sendJson(response, 200, { job: await service.getJobForRider(riderId, jobId) });
      if (jobId && b === "route" && method === "GET") {
        return sendJson(response, 200, {
          route: await service.getJobRouteForRider(riderId, jobId, {
            lat: url.searchParams.get("lat"),
            lng: url.searchParams.get("lng"),
          }),
        });
      }
      if (jobId && b === "proofs" && method === "POST") {
        const buffer = await readBinaryBody(request, MAX_PRIVATE_FILE_BYTES + 1024);
        const proof = await service.uploadProof(riderId, jobId, url.searchParams.get("type"), buffer, request.headers["content-type"]);
        return sendJson(response, 201, { proof });
      }
      if (jobId && b && RIDER_JOB_STEPS[b] && method === "POST") {
        const body = await readJson(request);
        const result = await RIDER_JOB_STEPS[b](service, riderId, jobId, body);
        const job = b === "release" ? null : await service.getJobForRider(riderId, jobId);
        return sendJson(response, 200, { ok: true, released: Boolean(result?.released), job });
      }
    }

    if (section === "proofs" && a && method === "GET") {
      return sendFile(response, await service.readProofFile(decodeURIComponent(a), { type: "rider", id: riderId }));
    }

    if (section === "history" && method === "GET") {
      return sendJson(response, 200, {
        history: await service.getRiderHistory(riderId, {
          limit: url.searchParams.get("limit"),
          offset: url.searchParams.get("offset"),
        }),
      });
    }
    if (section === "performance" && method === "GET") {
      return sendJson(response, 200, { performance: await service.getRiderPerformance(riderId) });
    }
    if (section === "earnings" && method === "GET") {
      return sendJson(response, 200, { earnings: await service.getEarningsSummary(riderId) });
    }
    if (section === "cash") {
      if (!a && method === "GET") return sendJson(response, 200, { cash: await service.getCashWallet(riderId) });
      if (a === "remittances" && method === "POST") {
        const body = await readJson(request);
        const remittance = await service.submitRemittance(riderId, body);
        return sendJson(response, 201, { remittance, cash: await service.getCashWallet(riderId) });
      }
    }
    if (section === "notifications") {
      if (!a && method === "GET") return sendJson(response, 200, await service.listRiderNotifications(riderId));
      if (a === "read" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 200, await service.markRiderNotificationsRead(riderId, { ids: body.ids }));
      }
    }
    if (section === "support" && a === "tickets") {
      if (method === "GET") return sendJson(response, 200, { tickets: await service.listRiderIncidents(riderId) });
      if (method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 201, { ticket: await service.createIncident(riderId, body) });
      }
    }

    sendJson(response, 404, { message: "Not found.", code: "NOT_FOUND" });
  }

  // ---------------------------------------------------- buyer + seller routes

  async function handlePublicRoutes(request, response, url, method, parts) {
    // parts: ["api","switch-rider", ...]
    const [, , section, a, b] = parts;

    if (section === "status" && method === "GET") {
      const settings = await service.getSettings();
      return sendJson(response, 200, { enabled: settings.enabled });
    }

    if (section === "quote" && method === "POST") {
      const buyerId = buyerIdFrom(request);
      if (!buyerId) return sendJson(response, 401, { message: "Sign in to get a delivery quote.", code: "APP_SESSION_INVALID" });
      const body = await readJson(request);
      const quote = await service.quoteForCheckout({
        sellerAdminId: body.sellerAdminId,
        buyerAccountId: buyerId,
        dropoff: { lat: body.lat, lng: body.lng },
        packageCount: body.packageCount,
      });
      return sendJson(response, 200, { quote });
    }

    if (section === "tracking" && a) {
      const buyerId = buyerIdFrom(request);
      if (!buyerId) return sendJson(response, 401, { message: "Sign in to track your order.", code: "APP_SESSION_INVALID" });
      const orderGroupId = decodeURIComponent(a);
      if (!b && method === "GET") {
        return sendJson(response, 200, { tracking: await service.getBuyerTracking(buyerId, orderGroupId) });
      }
      if (b === "rating" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 201, { rating: await service.rateRider(buyerId, orderGroupId, body) });
      }
    }

    if (section === "buyer" && a === "notifications" && method === "GET") {
      const buyerId = buyerIdFrom(request);
      if (!buyerId) return sendJson(response, 401, { message: "Sign in to see notifications.", code: "APP_SESSION_INVALID" });
      return sendJson(response, 200, { notifications: await service.listBuyerNotifications(buyerId) });
    }

    if (section === "riders" && a && b === "photo" && method === "GET") {
      const viewer = viewerFrom(request);
      if (!viewer) return sendJson(response, 401, { message: "Sign in required.", code: "APP_SESSION_INVALID" });
      return sendFile(response, await service.readRiderPhoto(decodeURIComponent(a), viewer));
    }

    if (section === "proofs" && a && method === "GET") {
      const viewer = viewerFrom(request);
      if (!viewer) return sendJson(response, 401, { message: "Sign in required.", code: "APP_SESSION_INVALID" });
      return sendFile(response, await service.readProofFile(decodeURIComponent(a), viewer));
    }

    if (section === "seller") {
      const adminId = sellerAdminIdFrom(request);
      if (!adminId) return sendJson(response, 401, { message: "Seller sign-in required.", code: "APP_SESSION_INVALID" });
      const actor = { type: "seller", id: adminId };

      if (a === "pickup-location") {
        if (method === "GET") return sendJson(response, 200, { pickupLocation: await service.getPickupLocation(adminId) });
        if (method === "PUT") {
          const body = await readJson(request);
          return sendJson(response, 200, { pickupLocation: await service.upsertPickupLocation(adminId, body) });
        }
      }

      if (a === "deliveries" && !b && method === "GET") {
        const ids = String(url.searchParams.get("orderGroupIds") || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        return sendJson(response, 200, { deliveries: await service.listSellerDeliveries(adminId, { orderGroupIds: ids }) });
      }

      if (a === "deliveries" && b) {
        const orderGroupId = decodeURIComponent(b);
        const action = parts[5] || "";
        if (!action && method === "GET") {
          return sendJson(response, 200, { delivery: await service.getSellerDelivery(adminId, orderGroupId) });
        }
        if (action === "ready" && method === "POST") {
          const order = await loadSellerOrderGroup({ adminId, orderGroupId });
          if (!order) return sendJson(response, 404, { message: "Order not found.", code: "ORDER_NOT_FOUND" });
          if (!order.isSwitchRider) {
            return sendJson(response, 409, { message: "This order does not use Switch Rider.", code: "NOT_SWITCH_RIDER" });
          }
          await service.markReadyForRider(order, actor);
          return sendJson(response, 200, { delivery: await service.getSellerDelivery(adminId, orderGroupId) });
        }
      }
    }

    sendJson(response, 404, { message: "Not found.", code: "NOT_FOUND" });
  }

  // ------------------------------------------------------ Super Admin routes

  async function handleSuperAdminRoutes(request, response, url, method, parts) {
    // parts: ["api","super-admin","switch-rider", ...]
    const [, , , section, a, b] = parts;
    const actor = { type: "super_admin", id: superAdminActorId };
    const q = (key) => url.searchParams.get(key);

    if (section === "overview" && method === "GET") {
      return sendJson(response, 200, { overview: await service.getAdminOverview(), settings: await service.getSettings() });
    }
    if (section === "settings") {
      if (method === "GET") return sendJson(response, 200, { settings: await service.getSettings({ fresh: true }) });
      if (method === "PUT") {
        const body = await readJson(request);
        return sendJson(response, 200, { settings: await service.updateSettings(body.settings || body, actor) });
      }
    }

    if (section === "riders") {
      if (!a && method === "GET") {
        return sendJson(response, 200, await service.listRidersForAdmin({ view: q("view") || "all", search: q("search") || "", limit: q("limit"), offset: q("offset") }));
      }
      const riderId = a ? decodeURIComponent(a) : "";
      if (riderId && !b && method === "GET") return sendJson(response, 200, await service.getRiderDetailForAdmin(riderId));
      if (riderId && b === "status" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 200, { rider: await service.setRiderStatus(riderId, body.action, { reason: body.reason }, actor) });
      }
      if (riderId && b === "photo" && method === "GET") {
        return sendFile(response, await service.readRiderPhoto(riderId, { type: "super_admin", id: superAdminActorId }));
      }
      if (riderId && b === "payouts" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 201, { payout: await service.createPayout(riderId, body, actor) });
      }
      if (riderId && b === "adjustments" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 201, { balances: await service.adjustEarnings(riderId, body, actor) });
      }
    }

    if (section === "documents" && a) {
      const documentId = decodeURIComponent(a);
      if (b === "file" && method === "GET") return sendFile(response, await service.readDocumentFile(documentId));
      if (b === "review" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 200, { document: await service.reviewDocument(documentId, body, actor) });
      }
    }

    if (section === "deliveries") {
      if (!a && method === "GET") {
        return sendJson(response, 200, await service.listDeliveriesForAdmin({ view: q("view") || "all", search: q("search") || "", limit: q("limit"), offset: q("offset") }));
      }
      const jobId = a ? decodeURIComponent(a) : "";
      if (jobId && !b && method === "GET") return sendJson(response, 200, { delivery: await service.getDeliveryDetailForAdmin(jobId) });
      if (jobId && b === "eligible-riders" && method === "GET") {
        return sendJson(response, 200, { riders: await service.listEligibleRidersForJob(jobId) });
      }
      if (jobId && b === "assign" && method === "POST") {
        const body = await readJson(request);
        await service.manualAssign(jobId, String(body.riderId || ""), { note: body.note }, actor);
        return sendJson(response, 200, { delivery: await service.getDeliveryDetailForAdmin(jobId) });
      }
      if (jobId && b === "cancel" && method === "POST") {
        const body = await readJson(request);
        await service.cancelJob(jobId, { reason: body.reason }, actor);
        return sendJson(response, 200, { delivery: await service.getDeliveryDetailForAdmin(jobId) });
      }
      if (jobId && b === "intervene" && method === "POST") {
        const body = await readJson(request);
        await service.adminIntervene(jobId, { action: body.action, note: body.note }, actor);
        return sendJson(response, 200, { delivery: await service.getDeliveryDetailForAdmin(jobId) });
      }
      if (jobId && b === "redispatch" && method === "POST") {
        const result = await service.dispatchJob(jobId);
        return sendJson(response, 200, { result, delivery: await service.getDeliveryDetailForAdmin(jobId) });
      }
    }

    if (section === "proofs" && a && method === "GET") {
      return sendFile(response, await service.readProofFile(decodeURIComponent(a), { type: "super_admin", id: superAdminActorId }));
    }

    if (section === "remittances") {
      if (!a && method === "GET") return sendJson(response, 200, await service.listRemittancesForAdmin({ status: q("status") || "REMITTED" }));
      if (a && b === "review" && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 200, { remittance: await service.reviewRemittance(decodeURIComponent(a), body, actor) });
      }
    }

    if (section === "incidents") {
      if (!a && method === "GET") return sendJson(response, 200, { incidents: await service.listIncidentsForAdmin({ status: q("status") || "ACTIVE" }) });
      if (a && !b && method === "POST") {
        const body = await readJson(request);
        return sendJson(response, 200, { incident: await service.updateIncident(decodeURIComponent(a), body, actor) });
      }
    }

    sendJson(response, 404, { message: "Not found.", code: "NOT_FOUND" });
  }

  async function tryHandleSwitchRiderRoutes(request, response, url) {
    const pathname = url.pathname;
    const method = String(request.method || "GET").toUpperCase();
    const parts = pathname.split("/").filter(Boolean);
    try {
      if (pathname.startsWith("/api/rider/")) {
        await handleRiderRoutes(request, response, url, method, parts);
        return true;
      }
      if (pathname.startsWith("/api/switch-rider/")) {
        await handlePublicRoutes(request, response, url, method, parts);
        return true;
      }
      if (pathname.startsWith("/api/super-admin/switch-rider/")) {
        await handleSuperAdminRoutes(request, response, url, method, parts);
        return true;
      }
    } catch (error) {
      if (!response.headersSent) sendError(response, error);
      else logger.error?.("[switch-rider] error after headers sent:", error?.message || error);
      return true;
    }
    return false;
  }

  return { tryHandleSwitchRiderRoutes };
}

module.exports = { createSwitchRiderApi, RIDER_SESSION_TTL_SECONDS };

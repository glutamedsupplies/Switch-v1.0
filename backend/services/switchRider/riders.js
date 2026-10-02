"use strict";

const crypto = require("crypto");
const { hashPassword, verifyPassword } = require("../../db/password");
const {
  AVAILABILITY,
  ASSIGNED_PRE_PICKUP_STATUSES,
  DOCUMENT_TYPES,
  OPERATIONAL_RIDER_STATUSES,
  PARCEL_IN_RIDER_CUSTODY_STATUSES,
  RIDER_STATUS,
  VEHICLE_TYPES,
} = require("./constants");
const { srError } = require("./core");
const { haversineKm, normalizeCoordinates, toFiniteNumber } = require("./geo");
const { serializeRiderForAdmin, serializeRiderSelf, iso } = require("./serializers");
const { newId } = require("./tokens");

const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{0,59}$/u;
const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;
const PLATE_PATTERN = /^[A-Z0-9 -]{3,12}$/;
const MAX_PLAUSIBLE_SPEED_KPH = 250;

function cleanText(value, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeCountryCode(value) {
  const digits = String(value ?? "+63").replace(/\D/g, "");
  return `+${digits || "63"}`;
}

/** Returns the national number (PH: 9XXXXXXXXX) or "" when invalid. */
function normalizeMobile(countryCode, value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (countryCode === "+63") {
    if (digits.length === 12 && digits.startsWith("63")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return /^9\d{9}$/.test(digits) ? digits : "";
  }
  return /^\d{6,14}$/.test(digits) ? digits : "";
}

function validatePasswordStrength(password) {
  const value = String(password ?? "");
  if (value.length < 8 || value.length > 128 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    throw srError(422, "WEAK_PASSWORD", "Password must be 8+ characters with at least one letter and one number.");
  }
  return value;
}

function parseBirthday(value, nowMs) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw srError(422, "INVALID_BIRTHDAY", "Birthday must be YYYY-MM-DD.");
  const date = new Date(`${text}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw srError(422, "INVALID_BIRTHDAY", "Birthday is not a valid date.");
  const eighteen = new Date(nowMs);
  eighteen.setUTCFullYear(eighteen.getUTCFullYear() - 18);
  if (date > eighteen) throw srError(422, "RIDER_UNDERAGE", "Riders must be at least 18 years old.");
  return text;
}

function requiredDocumentTypes(vehicleType) {
  return vehicleType === "BICYCLE"
    ? ["GOVERNMENT_ID", "SELFIE"]
    : ["DRIVERS_LICENSE", "VEHICLE_REGISTRATION", "GOVERNMENT_ID", "SELFIE"];
}

const DOCUMENT_LABELS = Object.freeze({
  DRIVERS_LICENSE: "Driver's license",
  VEHICLE_REGISTRATION: "Vehicle registration",
  GOVERNMENT_ID: "Government ID",
  SELFIE: "Selfie verification",
  PROFILE_PHOTO: "Profile photo",
});

function createRiderAccounts(ctx) {
  const { db } = ctx;

  function validateRegistration(input, nowMs) {
    const firstName = cleanText(input.firstName, 60);
    const lastName = cleanText(input.lastName, 60);
    if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
      throw srError(422, "INVALID_NAME", "Enter your first and last name.");
    }
    const countryCode = normalizeCountryCode(input.countryCode);
    const mobileNumber = normalizeMobile(countryCode, input.mobileNumber);
    if (!mobileNumber) throw srError(422, "INVALID_MOBILE", "Enter a valid mobile number.");
    const email = cleanText(input.email, 160).toLowerCase();
    if (!GMAIL_PATTERN.test(email)) {
      throw srError(422, "INVALID_GMAIL", "Use a valid Gmail address ending in @gmail.com.");
    }
    const socialProvider = cleanText(input.socialProvider, 24).toLowerCase();
    if (socialProvider && socialProvider !== "google" && socialProvider !== "facebook") {
      throw srError(422, "INVALID_SOCIAL_PROVIDER", "Choose Google or Facebook to continue.");
    }
    const password = socialProvider
      ? crypto.randomBytes(32).toString("hex")
      : validatePasswordStrength(input.password);
    const birthday = parseBirthday(input.birthday, nowMs);

    const vehicle = input.vehicle && typeof input.vehicle === "object" ? input.vehicle : input;
    const vehicleType = String(vehicle.vehicleType ?? vehicle.type ?? "").trim().toUpperCase();
    if (!VEHICLE_TYPES.includes(vehicleType)) throw srError(422, "INVALID_VEHICLE", "Choose a vehicle type.");
    const plateNumber = cleanText(vehicle.plateNumber, 12).toUpperCase();
    if (vehicleType !== "BICYCLE" && !PLATE_PATTERN.test(plateNumber)) {
      throw srError(422, "INVALID_PLATE", "Enter your vehicle plate number.");
    }
    const vehicleModel = cleanText(vehicle.vehicleModel ?? vehicle.model, 60);
    const vehicleColor = cleanText(vehicle.vehicleColor ?? vehicle.color, 30);
    if (vehicleType !== "BICYCLE" && (!vehicleModel || !vehicleColor)) {
      throw srError(422, "INVALID_VEHICLE_DETAILS", "Enter your vehicle model and color.");
    }

    const emergency = input.emergencyContact && typeof input.emergencyContact === "object" ? input.emergencyContact : {};
    const emergencyName = cleanText(emergency.name, 80);
    const emergencyPhoneDigits = normalizeMobile(countryCode, emergency.phone);
    const emergencyRelation = cleanText(emergency.relationship ?? emergency.relation, 40);
    if (!emergencyName || !emergencyPhoneDigits || !emergencyRelation) {
      throw srError(422, "INVALID_EMERGENCY_CONTACT", "Enter an emergency contact name, mobile number, and relationship.");
    }
    if (emergencyPhoneDigits === mobileNumber) {
      throw srError(422, "INVALID_EMERGENCY_CONTACT", "Your emergency contact must be a different number.");
    }

    return {
      firstName,
      lastName,
      countryCode,
      mobileNumber,
      email: email || null,
      verificationToken: cleanText(input.verificationToken, 160),
      socialProvider,
      idToken: cleanText(input.idToken, 4096),
      accessToken: cleanText(input.accessToken, 4096),
      password,
      birthday,
      vehicleType,
      plateNumber,
      vehicleModel,
      vehicleColor,
      emergencyName,
      emergencyPhone: `${countryCode}${emergencyPhoneDigits}`,
      emergencyRelation,
    };
  }

  async function registerRider(input = {}) {
    const data = validateRegistration(input, ctx.now());
    const existing = await db.query(
      "SELECT id FROM riders WHERE (country_code = $1 AND mobile_number = $2) OR email = $3 LIMIT 1",
      [data.countryCode, data.mobileNumber, data.email],
    );
    if (existing.rows[0]) {
      throw srError(409, "RIDER_ALREADY_REGISTERED", "A rider account already exists for this mobile number or email.");
    }
    if (typeof ctx.verifyRegistrationEmail !== "function") {
      throw srError(503, "EMAIL_VERIFICATION_UNAVAILABLE", "Email verification is temporarily unavailable.");
    }
    try {
      await ctx.verifyRegistrationEmail({
        email: data.email,
        verificationToken: data.verificationToken,
        socialProvider: data.socialProvider,
        idToken: data.idToken,
        accessToken: data.accessToken,
      });
    } catch (error) {
      throw srError(422, "EMAIL_VERIFICATION_REQUIRED", error?.message || "Verify your Gmail address before applying.");
    }
    const passwordHash = await hashPassword(data.password);
    try {
      return await ctx.runInTx(async (client, effects) => {
        const id = newId("rdr");
        const result = await client.query(
          `INSERT INTO riders (
             id, rider_code, first_name, last_name, country_code, mobile_number, email, password_hash, birthday,
             vehicle_type, plate_number, vehicle_model, vehicle_color,
             emergency_contact_name, emergency_contact_phone, emergency_contact_relation, created_at, updated_at
           ) VALUES (
             $1, 'SR-' || nextval('rider_code_seq'), $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16, $16
           ) RETURNING *`,
          [
            id, data.firstName, data.lastName, data.countryCode, data.mobileNumber, data.email, passwordHash, data.birthday,
            data.vehicleType, data.plateNumber, data.vehicleModel, data.vehicleColor,
            data.emergencyName, data.emergencyPhone, data.emergencyRelation, ctx.nowDate(),
          ],
        );
        const rider = result.rows[0];
        await ctx.audit(client, { actor: { type: "rider", id }, action: "RIDER_REGISTERED", riderId: id });
        await ctx.notifyRider(client, id, {
          type: "ACCOUNT_VERIFICATION",
          title: "Application received",
          body: "Upload your documents so our team can verify your account.",
        });
        ctx.queueDetachedSuperAdminNotice(effects, {
          type: "rider-registration",
          title: "New rider application",
          message: `${rider.first_name} ${rider.last_name} (${rider.rider_code}) applied as a ${rider.vehicle_type.toLowerCase()} rider.`,
          riderId: id,
          priority: "normal",
        });
        return rider;
      });
    } catch (error) {
      if (error?.code === "23505") {
        throw srError(409, "RIDER_ALREADY_REGISTERED", "A rider account already exists for this mobile number or email.");
      }
      throw error;
    }
  }

  async function authenticateRider({ countryCode, mobileNumber, password } = {}) {
    const code = normalizeCountryCode(countryCode);
    const mobile = normalizeMobile(code, mobileNumber);
    const invalid = () => srError(401, "INVALID_CREDENTIALS", "Incorrect mobile number or password.");
    if (!mobile || !password) throw invalid();
    const rider = (
      await db.query("SELECT * FROM riders WHERE country_code = $1 AND mobile_number = $2", [code, mobile])
    ).rows[0];
    if (!rider || !(await verifyPassword(password, rider.password_hash))) throw invalid();
    if (rider.status === RIDER_STATUS.DEACTIVATED) {
      throw srError(403, "RIDER_DEACTIVATED", "This rider account has been deactivated. Contact Switch support.");
    }
    const updated = (
      await db.query("UPDATE riders SET last_login_at = $2 WHERE id = $1 RETURNING *", [rider.id, ctx.nowDate()])
    ).rows[0];
    return updated;
  }

  async function authenticateSocialRider({ provider, idToken, accessToken } = {}) {
    if (typeof ctx.verifyRiderSocialCredential !== "function") {
      throw srError(503, "SOCIAL_AUTH_UNAVAILABLE", "Social sign-in is temporarily unavailable.");
    }
    let profile;
    try {
      profile = await ctx.verifyRiderSocialCredential({ provider, idToken, accessToken });
    } catch (error) {
      throw srError(401, "SOCIAL_AUTH_FAILED", error?.message || "Unable to verify this social account.");
    }
    const email = cleanText(profile?.email, 160).toLowerCase();
    if (!GMAIL_PATTERN.test(email)) {
      throw srError(422, "INVALID_GMAIL", "Switch Rider currently accepts social accounts using an @gmail.com address.");
    }
    const rider = (await db.query("SELECT * FROM riders WHERE email = $1 LIMIT 1", [email])).rows[0] || null;
    if (!rider) {
      return {
        rider: null,
        profile: {
          provider: cleanText(profile.provider || provider, 24).toLowerCase(),
          email,
          firstName: cleanText(profile.firstName, 60),
          lastName: cleanText(profile.lastName, 60),
          displayName: cleanText(profile.displayName, 120),
          picture: cleanText(profile.picture, 2048),
        },
      };
    }
    if (rider.status === RIDER_STATUS.DEACTIVATED) {
      throw srError(403, "RIDER_DEACTIVATED", "This rider account has been deactivated. Contact Switch support.");
    }
    const updated = (
      await db.query("UPDATE riders SET last_login_at = $2 WHERE id = $1 RETURNING *", [rider.id, ctx.nowDate()])
    ).rows[0];
    return { rider: updated, profile: null };
  }

  async function getRiderOrThrow(riderId) {
    const rider = await ctx.getRider(db, riderId);
    if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
    return rider;
  }

  async function getRiderSelf(riderId) {
    const rider = await getRiderOrThrow(riderId);
    const documents = await listDocuments(riderId);
    const required = requiredDocumentTypes(rider.vehicle_type);
    const missing = required.filter(
      (type) => !documents.some((doc) => doc.docType === type && doc.reviewStatus !== "REJECTED"),
    );
    return serializeRiderSelf(rider, {
      requiredDocuments: required,
      missingDocuments: missing,
      canGoOnline: OPERATIONAL_RIDER_STATUSES.has(rider.status),
    });
  }

  async function updateRiderProfile(riderId, input = {}) {
    const rider = await getRiderOrThrow(riderId);
    const fields = {};
    if (input.email !== undefined) {
      const email = cleanText(input.email, 160).toLowerCase();
      if (email && !EMAIL_PATTERN.test(email)) throw srError(422, "INVALID_EMAIL", "Enter a valid email address.");
      fields.email = email || null;
    }
    if (input.emergencyContact && typeof input.emergencyContact === "object") {
      const name = cleanText(input.emergencyContact.name, 80);
      const phone = normalizeMobile(rider.country_code, input.emergencyContact.phone);
      const relation = cleanText(input.emergencyContact.relationship ?? input.emergencyContact.relation, 40);
      if (!name || !phone || !relation) {
        throw srError(422, "INVALID_EMERGENCY_CONTACT", "Enter an emergency contact name, mobile number, and relationship.");
      }
      if (phone === rider.mobile_number) {
        throw srError(422, "INVALID_EMERGENCY_CONTACT", "Your emergency contact must be a different number.");
      }
      fields.emergency_contact_name = name;
      fields.emergency_contact_phone = `${rider.country_code}${phone}`;
      fields.emergency_contact_relation = relation;
    }
    if (!Object.keys(fields).length) return getRiderSelf(riderId);
    try {
      await ctx.updateRider(db, riderId, fields);
    } catch (error) {
      if (error?.code === "23505") throw srError(409, "EMAIL_IN_USE", "That email is already used by another rider.");
      throw error;
    }
    await ctx.audit(db, { actor: { type: "rider", id: riderId }, action: "PROFILE_UPDATED", riderId, metadata: { fields: Object.keys(fields) } });
    return getRiderSelf(riderId);
  }

  async function changeRiderPassword(riderId, { currentPassword, newPassword } = {}) {
    const rider = await getRiderOrThrow(riderId);
    if (!(await verifyPassword(currentPassword, rider.password_hash))) {
      throw srError(401, "INVALID_CREDENTIALS", "Your current password is incorrect.");
    }
    const hash = await hashPassword(validatePasswordStrength(newPassword));
    await ctx.updateRider(db, riderId, { password_hash: hash });
    await ctx.audit(db, { actor: { type: "rider", id: riderId }, action: "PASSWORD_CHANGED", riderId });
    return { ok: true };
  }

  // ---------------------------------------------------------------- documents

  function serializeDocument(row) {
    return {
      id: row.id,
      docType: row.doc_type,
      label: DOCUMENT_LABELS[row.doc_type] || row.doc_type,
      reviewStatus: row.review_status,
      reviewNote: row.review_note || "",
      contentType: row.content_type,
      byteSize: Number(row.byte_size) || 0,
      uploadedAt: iso(row.uploaded_at),
      reviewedAt: iso(row.reviewed_at),
    };
  }

  async function listDocuments(riderId) {
    const result = await db.query(
      `SELECT * FROM rider_documents WHERE rider_id = $1 AND review_status <> 'SUPERSEDED'
       ORDER BY uploaded_at DESC`,
      [riderId],
    );
    return result.rows.map(serializeDocument);
  }

  async function uploadDocument(riderId, docTypeInput, buffer, declaredType = "") {
    const docType = String(docTypeInput ?? "").trim().toUpperCase();
    if (!DOCUMENT_TYPES.includes(docType)) throw srError(422, "INVALID_DOCUMENT_TYPE", "Unknown document type.");
    if (!ctx.privateFiles) throw srError(503, "PRIVATE_STORAGE_UNAVAILABLE", "Document storage is not configured.");
    const rider = await getRiderOrThrow(riderId);
    if (rider.status === RIDER_STATUS.DEACTIVATED) {
      throw srError(403, "RIDER_DEACTIVATED", "This rider account has been deactivated.");
    }
    const saved = await ctx.privateFiles.saveImage(buffer, { category: docType.toLowerCase(), declaredType });
    return ctx.runInTx(async (client, effects) => {
      const locked = await ctx.lockRider(client, riderId);
      await client.query(
        `UPDATE rider_documents SET review_status = 'SUPERSEDED'
         WHERE rider_id = $1 AND doc_type = $2 AND review_status <> 'SUPERSEDED'`,
        [riderId, docType],
      );
      const doc = (
        await client.query(
          `INSERT INTO rider_documents (id, rider_id, doc_type, storage_key, content_type, byte_size, uploaded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [newId("rdoc"), riderId, docType, saved.storageKey, saved.contentType, saved.byteSize, ctx.nowDate()],
        )
      ).rows[0];
      if (docType === "PROFILE_PHOTO") {
        await ctx.updateRider(client, riderId, { profile_photo_key: saved.storageKey });
      }
      let resubmitted = false;
      if (locked.status === RIDER_STATUS.REJECTED && docType !== "PROFILE_PHOTO") {
        await ctx.updateRider(client, riderId, { status: RIDER_STATUS.PENDING_VERIFICATION, status_reason: "" });
        resubmitted = true;
      }
      await ctx.audit(client, { actor: { type: "rider", id: riderId }, action: "DOCUMENT_UPLOADED", riderId, metadata: { docType, documentId: doc.id } });

      const docs = (
        await client.query(
          `SELECT doc_type FROM rider_documents WHERE rider_id = $1 AND review_status IN ('PENDING','APPROVED')`,
          [riderId],
        )
      ).rows.map((row) => row.doc_type);
      const required = requiredDocumentTypes(locked.vehicle_type);
      const complete = required.every((type) => docs.includes(type));
      const awaitingReview =
        (locked.status === RIDER_STATUS.PENDING_VERIFICATION || resubmitted) && docType !== "PROFILE_PHOTO";
      if (awaitingReview && complete && (resubmitted || required.includes(docType))) {
        ctx.queueSuperAdminNotice(effects, {
          type: "rider-documents-uploaded",
          title: resubmitted ? "Rider resubmitted documents" : "Rider documents ready for review",
          message: `${locked.first_name} ${locked.last_name} (${locked.rider_code}) uploaded ${DOCUMENT_LABELS[docType]}. All required documents are in.`,
          riderId,
          priority: "normal",
        });
      }
      return serializeDocument(doc);
    });
  }

  async function readDocumentFile(documentId, { riderId = null } = {}) {
    const doc = (await db.query("SELECT * FROM rider_documents WHERE id = $1", [documentId])).rows[0];
    if (!doc || (riderId && doc.rider_id !== riderId)) throw srError(404, "DOCUMENT_NOT_FOUND", "Document not found.");
    const file = await ctx.privateFiles.read(doc.storage_key);
    if (!file) throw srError(404, "DOCUMENT_NOT_FOUND", "Document file is missing.");
    return { buffer: file, contentType: doc.content_type || "application/octet-stream" };
  }

  async function reviewDocument(documentId, { decision, note = "" } = {}, actor) {
    const status = String(decision ?? "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(status)) throw srError(422, "INVALID_DECISION", "Choose approve or reject.");
    const cleanNote = cleanText(note, 300);
    if (status === "REJECTED" && !cleanNote) throw srError(422, "REASON_REQUIRED", "Tell the rider why the document was rejected.");
    return ctx.runInTx(async (client) => {
      const doc = (await client.query("SELECT * FROM rider_documents WHERE id = $1 FOR UPDATE", [documentId])).rows[0];
      if (!doc || doc.review_status === "SUPERSEDED") throw srError(404, "DOCUMENT_NOT_FOUND", "Document not found.");
      const updated = (
        await client.query(
          `UPDATE rider_documents SET review_status = $2, review_note = $3, reviewed_by = $4, reviewed_at = $5
           WHERE id = $1 RETURNING *`,
          [documentId, status, cleanNote, String(actor?.id || ""), ctx.nowDate()],
        )
      ).rows[0];
      await ctx.audit(client, { actor, action: `DOCUMENT_${status}`, riderId: doc.rider_id, metadata: { documentId, docType: doc.doc_type, note: cleanNote } });
      if (status === "REJECTED") {
        await ctx.notifyRider(client, doc.rider_id, {
          type: "ACCOUNT_VERIFICATION",
          title: `${DOCUMENT_LABELS[doc.doc_type]} needs to be re-uploaded`,
          body: cleanNote,
        });
      }
      return serializeDocument(updated);
    });
  }

  // ------------------------------------------------------- Super Admin status

  const STATUS_ACTIONS = Object.freeze({
    approve: { from: [RIDER_STATUS.PENDING_VERIFICATION, RIDER_STATUS.REJECTED], reasonRequired: false },
    reject: { from: [RIDER_STATUS.PENDING_VERIFICATION], reasonRequired: true },
    suspend: { from: [RIDER_STATUS.APPROVED, RIDER_STATUS.ACTIVE], reasonRequired: true },
    reactivate: { from: [RIDER_STATUS.SUSPENDED, RIDER_STATUS.DEACTIVATED], reasonRequired: false },
    deactivate: {
      from: [RIDER_STATUS.PENDING_VERIFICATION, RIDER_STATUS.APPROVED, RIDER_STATUS.REJECTED, RIDER_STATUS.ACTIVE, RIDER_STATUS.SUSPENDED],
      reasonRequired: true,
    },
  });

  async function setRiderStatus(riderId, actionInput, { reason = "" } = {}, actor) {
    const action = String(actionInput ?? "").toLowerCase();
    const rule = STATUS_ACTIONS[action];
    if (!rule) throw srError(422, "INVALID_ACTION", "Unknown rider action.");
    const cleanReason = cleanText(reason, 500);
    if (rule.reasonRequired && !cleanReason) throw srError(422, "REASON_REQUIRED", "A reason is required for this action.");

    return ctx.runInTx(async (client, effects) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      if (!rule.from.includes(rider.status)) {
        throw srError(409, "INVALID_RIDER_STATUS", `Cannot ${action} a rider who is ${rider.status.replace(/_/g, " ").toLowerCase()}.`);
      }

      const fields = { status_reason: cleanReason };
      let nextStatus = rider.status;
      if (action === "approve") {
        const docs = (
          await client.query(
            `SELECT doc_type, review_status FROM rider_documents WHERE rider_id = $1 AND review_status IN ('PENDING','APPROVED')`,
            [riderId],
          )
        ).rows;
        const missing = requiredDocumentTypes(rider.vehicle_type).filter((type) => !docs.some((doc) => doc.doc_type === type));
        if (missing.length) {
          throw srError(409, "DOCUMENTS_INCOMPLETE", `Missing documents: ${missing.map((type) => DOCUMENT_LABELS[type]).join(", ")}.`, { missing });
        }
        await client.query(
          `UPDATE rider_documents SET review_status = 'APPROVED', reviewed_by = $2, reviewed_at = $3
           WHERE rider_id = $1 AND review_status = 'PENDING'`,
          [riderId, String(actor?.id || ""), ctx.nowDate()],
        );
        nextStatus = RIDER_STATUS.APPROVED;
        fields.approved_at = ctx.nowDate();
        fields.approved_by = String(actor?.id || "");
      } else if (action === "reject") {
        nextStatus = RIDER_STATUS.REJECTED;
      } else if (action === "reactivate") {
        if (!rider.approved_at) throw srError(409, "RIDER_NEVER_APPROVED", "This rider was never approved. Review their application instead.");
        nextStatus = RIDER_STATUS.ACTIVE;
      } else {
        // suspend / deactivate: the rider must not be holding a customer's parcel.
        const jobs = (
          await client.query("SELECT * FROM delivery_jobs WHERE rider_id = $1 AND status = ANY($2::text[]) FOR UPDATE", [
            riderId,
            [...ASSIGNED_PRE_PICKUP_STATUSES, ...PARCEL_IN_RIDER_CUSTODY_STATUSES],
          ])
        ).rows;
        if (jobs.some((job) => PARCEL_IN_RIDER_CUSTODY_STATUSES.has(job.status))) {
          throw srError(409, "RIDER_HAS_PARCEL", "This rider is carrying a parcel. Resolve or force-return the delivery first.");
        }
        for (const job of jobs) {
          const released = await ctx.transition(client, job, "WAITING_FOR_RIDER", {
            actor,
            note: `Rider ${action === "suspend" ? "suspended" : "deactivated"} by Super Admin`,
            fields: { rider_id: null, accepted_at: null, dispatch_mode: "AUTO" },
          });
          await ctx.audit(client, { actor, action: "RIDER_RELEASED", deliveryId: job.id, riderId, metadata: { reason: `ADMIN_${action.toUpperCase()}` } });
          ctx.queueSellerNotice(effects, released, {
            type: "switch-rider-reassigning",
            title: "Finding a new rider",
            message: `Delivery ${released.delivery_code}: the assigned rider is no longer available. Switch is finding a new rider.`,
          });
          effects.push(() => ctx.dispatch?.dispatchJob(job.id));
        }
        await ctx.withdrawRiderOffers(client, riderId, effects, {
          actor,
          note: action === "suspend" ? "Rider suspended by Super Admin" : "Rider deactivated by Super Admin",
        });
        nextStatus = action === "suspend" ? RIDER_STATUS.SUSPENDED : RIDER_STATUS.DEACTIVATED;
        fields.availability_status = AVAILABILITY.OFFLINE;
        fields.current_delivery_id = null;
        fields.last_offline_at = ctx.nowDate();
      }

      const updated = await ctx.updateRider(client, riderId, { ...fields, status: nextStatus });
      await ctx.audit(client, { actor, action: `RIDER_${action.toUpperCase()}`, riderId, metadata: { from: rider.status, to: nextStatus, reason: cleanReason } });

      const messages = {
        approve: ["Account approved", "You're verified. Go online to start receiving delivery jobs."],
        reject: ["Application not approved", cleanReason],
        suspend: ["Account suspended", `You cannot go online while suspended. Reason: ${cleanReason}`],
        reactivate: ["Account reactivated", "Your rider account is active again. You can go online."],
        deactivate: ["Account deactivated", cleanReason],
      };
      const [title, body] = messages[action];
      await ctx.notifyRider(client, riderId, {
        type: action === "suspend" || action === "deactivate" ? "ACCOUNT_SUSPENSION" : "ACCOUNT_VERIFICATION",
        title,
        body,
      });
      return serializeRiderForAdmin(updated);
    });
  }

  async function listRidersForAdmin({ view = "all", search = "", limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    const push = (value) => {
      values.push(value);
      return `$${values.length}`;
    };
    const views = {
      pending: "r.status = 'PENDING_VERIFICATION'",
      active: "r.status IN ('APPROVED','ACTIVE')",
      online: "r.status IN ('APPROVED','ACTIVE') AND r.availability_status <> 'OFFLINE'",
      suspended: "r.status = 'SUSPENDED'",
      rejected: "r.status = 'REJECTED'",
      deactivated: "r.status = 'DEACTIVATED'",
    };
    if (views[view]) conditions.push(views[view]);
    const term = cleanText(search, 60);
    if (term) {
      const like = push(`%${term.toLowerCase()}%`);
      conditions.push(
        `(lower(r.first_name || ' ' || r.last_name) LIKE ${like} OR lower(r.rider_code) LIKE ${like} OR r.mobile_number LIKE ${like} OR lower(r.plate_number) LIKE ${like})`,
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);
    const [rows, total, counts] = await Promise.all([
      db.query(
        `SELECT r.*,
           (SELECT COUNT(*)::int FROM delivery_jobs j WHERE j.rider_id = r.id AND j.status = 'DELIVERED') AS delivered_count
         FROM riders r ${where}
         ORDER BY r.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        values,
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM riders r ${where}`, values),
      db.query(`SELECT status, availability_status, COUNT(*)::int AS count FROM riders GROUP BY status, availability_status`),
    ]);
    const summary = { all: 0, pending: 0, active: 0, online: 0, suspended: 0, rejected: 0, deactivated: 0 };
    for (const row of counts.rows) {
      summary.all += row.count;
      if (row.status === "PENDING_VERIFICATION") summary.pending += row.count;
      if (OPERATIONAL_RIDER_STATUSES.has(row.status)) {
        summary.active += row.count;
        if (row.availability_status !== "OFFLINE") summary.online += row.count;
      }
      if (row.status === "SUSPENDED") summary.suspended += row.count;
      if (row.status === "REJECTED") summary.rejected += row.count;
      if (row.status === "DEACTIVATED") summary.deactivated += row.count;
    }
    return {
      riders: rows.rows.map((row) => serializeRiderForAdmin(row, { deliveredCount: row.delivered_count })),
      total: total.rows[0].count,
      summary,
    };
  }

  // ------------------------------------------------------ availability/location

  async function goOnline(riderId, location = null) {
    const settings = await ctx.getSettings();
    return ctx.runInTx(async (client) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      if (!OPERATIONAL_RIDER_STATUSES.has(rider.status)) {
        const messages = {
          PENDING_VERIFICATION: "Your account is still being verified.",
          REJECTED: "Your application was not approved. Re-upload your documents.",
          SUSPENDED: "Your account is suspended. Contact Switch support.",
          DEACTIVATED: "Your account is deactivated.",
        };
        throw srError(403, "RIDER_NOT_OPERATIONAL", messages[rider.status] || "You cannot go online.", { riderStatus: rider.status });
      }
      if (!settings.enabled) {
        throw srError(503, "SWITCH_RIDER_DISABLED", "Switch Rider deliveries are paused right now. Try again later.");
      }
      const fields = {};
      if (rider.availability_status === AVAILABILITY.OFFLINE) {
        fields.availability_status = rider.current_delivery_id ? AVAILABILITY.ON_DELIVERY : AVAILABILITY.ONLINE;
        fields.last_online_at = ctx.nowDate();
      }
      if (rider.status === RIDER_STATUS.APPROVED) fields.status = RIDER_STATUS.ACTIVE;
      const coords = location ? normalizeCoordinates(location.lat, location.lng) : null;
      if (coords) {
        fields.last_latitude = coords.lat;
        fields.last_longitude = coords.lng;
        fields.last_location_accuracy = Math.max(0, toFiniteNumber(location.accuracy) ?? 0);
        fields.last_location_at = ctx.nowDate();
      }
      const updated = Object.keys(fields).length ? await ctx.updateRider(client, riderId, fields) : rider;
      if (fields.availability_status) {
        await ctx.audit(client, { actor: { type: "rider", id: riderId }, action: "WENT_ONLINE", riderId });
      }
      return serializeRiderSelf(updated);
    });
  }

  async function goOffline(riderId) {
    return ctx.runInTx(async (client, effects) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      if ((await ctx.countActiveJobs(client, riderId)) > 0) {
        throw srError(409, "ACTIVE_DELIVERY", "Finish or hand back your current delivery before going offline.");
      }
      await ctx.withdrawRiderOffers(client, riderId, effects, {
        actor: { type: "rider", id: riderId },
        note: "Rider went offline",
      });
      if (rider.availability_status === AVAILABILITY.OFFLINE) return serializeRiderSelf(rider);
      const updated = await ctx.updateRider(client, riderId, {
        availability_status: AVAILABILITY.OFFLINE,
        current_delivery_id: null,
        last_offline_at: ctx.nowDate(),
      });
      await ctx.audit(client, { actor: { type: "rider", id: riderId }, action: "WENT_OFFLINE", riderId });
      return serializeRiderSelf(updated);
    });
  }

  async function recordLocation(riderId, input = {}) {
    const settings = await ctx.getSettings();
    const coords = normalizeCoordinates(input.lat ?? input.latitude, input.lng ?? input.longitude);
    if (!coords) throw srError(422, "INVALID_LOCATION", "Location coordinates are invalid.");
    const accuracy = toFiniteNumber(input.accuracy) ?? 0;
    if (accuracy < 0 || accuracy > 100000) throw srError(422, "INVALID_LOCATION", "Location accuracy is invalid.");
    const nowMs = ctx.now();
    const recordedMs = input.recordedAt ? new Date(input.recordedAt).getTime() : nowMs;
    if (!Number.isFinite(recordedMs) || recordedMs > nowMs + 2 * 60 * 1000 || recordedMs < nowMs - 10 * 60 * 1000) {
      throw srError(422, "STALE_LOCATION", "Location timestamp is too old or in the future.");
    }

    return ctx.runInTx(async (client) => {
      const rider = await ctx.lockRider(client, riderId);
      if (!rider) throw srError(404, "RIDER_NOT_FOUND", "Rider not found.");
      if (rider.availability_status === AVAILABILITY.OFFLINE) {
        throw srError(409, "RIDER_OFFLINE", "Location is only shared while you are online.");
      }
      if (rider.last_location_at) {
        const lastMs = new Date(rider.last_location_at).getTime();
        const elapsedSeconds = (recordedMs - lastMs) / 1000;
        if (elapsedSeconds < settings.locationMinIntervalSeconds) {
          throw srError(429, "LOCATION_RATE_LIMITED", "Location updates are too frequent.", {
            retryAfterSeconds: Math.max(1, Math.ceil(settings.locationMinIntervalSeconds - Math.max(0, elapsedSeconds))),
          });
        }
        if (rider.last_latitude !== null && elapsedSeconds > 0) {
          const km = haversineKm({ lat: rider.last_latitude, lng: rider.last_longitude }, coords);
          const speedKph = km / (elapsedSeconds / 3600);
          if (km > 1 && speedKph > MAX_PLAUSIBLE_SPEED_KPH) {
            await ctx.audit(client, {
              actor: { type: "rider", id: riderId },
              action: "IMPLAUSIBLE_LOCATION_REJECTED",
              riderId,
              metadata: { km: Math.round(km * 100) / 100, speedKph: Math.round(speedKph) },
            });
            return { accepted: false, code: "IMPLAUSIBLE_LOCATION" };
          }
        }
      }
      const recordedAt = new Date(recordedMs);
      await client.query(
        `INSERT INTO rider_locations (rider_id, delivery_id, latitude, longitude, accuracy_m, recorded_at, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [riderId, rider.current_delivery_id, coords.lat, coords.lng, accuracy, recordedAt, ctx.nowDate()],
      );
      await ctx.updateRider(client, riderId, {
        last_latitude: coords.lat,
        last_longitude: coords.lng,
        last_location_accuracy: accuracy,
        last_location_at: recordedAt,
      });
      return { accepted: true, nextUpdateInSeconds: settings.locationMinIntervalSeconds };
    });
  }

  return {
    registerRider,
    authenticateRider,
    authenticateSocialRider,
    getRiderSelf,
    updateRiderProfile,
    changeRiderPassword,
    listDocuments,
    uploadDocument,
    readDocumentFile,
    reviewDocument,
    setRiderStatus,
    listRidersForAdmin,
    goOnline,
    goOffline,
    recordLocation,
    requiredDocumentTypes,
  };
}

module.exports = {
  createRiderAccounts,
  normalizeMobile,
  normalizeCountryCode,
  validatePasswordStrength,
  requiredDocumentTypes,
  DOCUMENT_LABELS,
};

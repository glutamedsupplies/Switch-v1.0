"use strict";

const crypto = require("crypto");
const path = require("path");
const { createObjectStorage } = require("../objectStorage");

const ALLOWED_IMAGE_TYPES = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
});
const MAX_PRIVATE_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Private storage for rider KYC documents and proof-of-delivery photos.
 *
 * Files never live under backend/public, so there is no public URL. They are
 * streamed only through authorized API endpoints. For cloud storage configure
 * PRIVATE_STORAGE_DRIVER=s3 with a *separate, non-public* bucket.
 */
function createPrivateFileStore({ env = process.env, baseDir, logger = console } = {}) {
  const privateEnv = {
    STORAGE_DRIVER: env.PRIVATE_STORAGE_DRIVER || "local",
    STORAGE_S3_ENDPOINT: env.PRIVATE_STORAGE_S3_ENDPOINT || "",
    STORAGE_S3_BUCKET: env.PRIVATE_STORAGE_S3_BUCKET || "",
    STORAGE_S3_REGION: env.PRIVATE_STORAGE_S3_REGION || "",
    STORAGE_S3_ACCESS_KEY_ID: env.PRIVATE_STORAGE_S3_ACCESS_KEY_ID || "",
    STORAGE_S3_SECRET_ACCESS_KEY: env.PRIVATE_STORAGE_S3_SECRET_ACCESS_KEY || "",
    STORAGE_S3_FORCE_PATH_STYLE: env.PRIVATE_STORAGE_S3_FORCE_PATH_STYLE || "",
    STORAGE_KEY_PREFIX: env.PRIVATE_STORAGE_KEY_PREFIX ?? "switch-rider-private/",
    // Private objects are proxied, never redirected, so a public base URL is not used.
    STORAGE_PUBLIC_BASE_URL: env.PRIVATE_STORAGE_S3_ENDPOINT ? "https://private.invalid" : "",
  };
  const storage = createObjectStorage({
    env: privateEnv,
    uploadsDir: baseDir || path.join(__dirname, "..", "..", "data", "private_uploads"),
    logger,
  });

  function detectImageType(buffer, declaredType) {
    const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return "image/png";
    }
    if (bytes.length >= 12 && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") {
      return "image/webp";
    }
    if (bytes.length >= 12 && bytes.subarray(4, 8).toString() === "ftyp") {
      const brand = bytes.subarray(8, 12).toString();
      if (["heic", "heix", "mif1", "msf1"].includes(brand)) return "image/heic";
    }
    void declaredType;
    return "";
  }

  async function saveImage(buffer, { category, declaredType = "" } = {}) {
    const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    const fail = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });
    if (!body.length) throw fail(400, "EMPTY_FILE", "The uploaded file is empty.");
    if (body.length > MAX_PRIVATE_FILE_BYTES) throw fail(413, "FILE_TOO_LARGE", "Photos must be 8 MB or smaller.");
    const contentType = detectImageType(body, declaredType);
    if (!contentType) throw fail(415, "UNSUPPORTED_IMAGE", "Only JPEG, PNG, WebP, or HEIC photos are accepted.");
    const safeCategory = String(category || "file").replace(/[^a-z0-9]/gi, "").slice(0, 24) || "file";
    const key = `${safeCategory}-${crypto.randomBytes(18).toString("hex")}${ALLOWED_IMAGE_TYPES[contentType]}`;
    await storage.saveUpload(key, body, { contentType, cacheControl: "private, no-store" });
    return { storageKey: key, contentType, byteSize: body.length };
  }

  async function read(storageKey) {
    return storage.readUpload(String(storageKey || ""));
  }

  return {
    driver: storage.driver,
    describe: () => `private ${storage.describe()}`,
    saveImage,
    read,
    remove: (storageKey) => storage.deleteUpload(String(storageKey || "")),
  };
}

module.exports = {
  createPrivateFileStore,
  MAX_PRIVATE_FILE_BYTES,
};

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");

/**
 * Upload storage behind the stable `/uploads/<file>` URLs saved in the database.
 *
 * - `local` (default): files live in public/uploads, served by the Node server.
 * - `s3`: files live in any S3-compatible bucket (Cloudflare R2, AWS S3, Supabase,
 *   DigitalOcean Spaces, MinIO). `/uploads/<file>` requests that are not on local
 *   disk are redirected to STORAGE_PUBLIC_BASE_URL, so saved URLs keep working.
 */

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const EMPTY_PAYLOAD_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeKeyPath(key) {
  return String(key).split("/").map(encodeRfc3986).join("/");
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * AWS Signature Version 4 for a single S3 request. Every header passed in is signed;
 * callers must include `host`, `x-amz-date`, and `x-amz-content-sha256`.
 */
function signS3Request({ method, canonicalUri, canonicalQuery = "", headers, payloadHash, region, accessKeyId, secretAccessKey }) {
  const normalizedHeaders = Object.entries(headers)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, " ")])
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  const signedHeaders = normalizedHeaders.map(([name]) => name).join(";");
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    normalizedHeaders.map(([name, value]) => `${name}:${value}\n`).join(""),
    signedHeaders,
    payloadHash,
  ].join("\n");
  const amzDate = normalizedHeaders.find(([name]) => name === "x-amz-date")?.[1] || "";
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    signature,
    canonicalRequest,
  };
}

function readS3Config(env) {
  const endpoint = String(env.STORAGE_S3_ENDPOINT || "").trim().replace(/\/+$/, "");
  const bucket = String(env.STORAGE_S3_BUCKET || "").trim();
  const region = String(env.STORAGE_S3_REGION || "").trim() || (endpoint ? "auto" : "us-east-1");
  const forcePathStyleRaw = String(env.STORAGE_S3_FORCE_PATH_STYLE || "").trim().toLowerCase();
  const forcePathStyle = forcePathStyleRaw ? ["1", "true", "yes"].includes(forcePathStyleRaw) : Boolean(endpoint);
  const prefixRaw = String(env.STORAGE_KEY_PREFIX ?? "uploads/").trim().replace(/^\/+/, "");
  const keyPrefix = prefixRaw && !prefixRaw.endsWith("/") ? `${prefixRaw}/` : prefixRaw;
  const config = {
    endpoint,
    bucket,
    region,
    forcePathStyle,
    keyPrefix,
    accessKeyId: String(env.STORAGE_S3_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(env.STORAGE_S3_SECRET_ACCESS_KEY || "").trim(),
    publicBaseUrl: String(env.STORAGE_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, ""),
  };
  const missing = ["bucket", "accessKeyId", "secretAccessKey"].filter((field) => !config[field]);
  if (!config.publicBaseUrl && endpoint) missing.push("publicBaseUrl");
  return { config, missing };
}

function isSafeUploadFileName(fileName) {
  const name = String(fileName || "");
  return Boolean(name) && name === path.basename(name) && !name.startsWith(".") && !/[\\/]/.test(name);
}

function createObjectStorage({ env = process.env, uploadsDir, fetchImpl = globalThis.fetch, now = () => new Date(), logger = console } = {}) {
  const requestedDriver = String(env.STORAGE_DRIVER || "local").trim().toLowerCase();
  let s3 = null;
  let configWarning = "";
  if (requestedDriver === "s3") {
    const { config, missing } = readS3Config(env);
    if (missing.length) {
      configWarning = `STORAGE_DRIVER=s3 is missing ${missing
        .map((field) => ({
          bucket: "STORAGE_S3_BUCKET",
          accessKeyId: "STORAGE_S3_ACCESS_KEY_ID",
          secretAccessKey: "STORAGE_S3_SECRET_ACCESS_KEY",
          publicBaseUrl: "STORAGE_PUBLIC_BASE_URL",
        })[field])
        .join(", ")}; falling back to local uploads.`;
      logger?.warn?.(configWarning);
    } else if (typeof fetchImpl !== "function") {
      configWarning = "STORAGE_DRIVER=s3 needs fetch (Node 18+); falling back to local uploads.";
      logger?.warn?.(configWarning);
    } else {
      s3 = config;
    }
  }

  const localPath = (fileName) => path.join(uploadsDir, fileName);
  const objectKey = (fileName) => `${s3?.keyPrefix || ""}${fileName}`;

  function objectUrl(key) {
    if (s3.forcePathStyle) {
      const base = s3.endpoint || `https://s3.${s3.region}.amazonaws.com`;
      const url = new URL(`${base}/${encodeRfc3986(s3.bucket)}/${encodeKeyPath(key)}`);
      return { url, canonicalUri: url.pathname };
    }
    const base = s3.endpoint
      ? s3.endpoint.replace(/^(https?:\/\/)/i, `$1${s3.bucket}.`)
      : `https://${s3.bucket}.s3.${s3.region}.amazonaws.com`;
    const url = new URL(`${base}/${encodeKeyPath(key)}`);
    return { url, canonicalUri: url.pathname };
  }

  async function s3Request(method, key, { body = null, headers = {} } = {}) {
    const { url, canonicalUri } = objectUrl(key);
    const payloadHash = body ? sha256Hex(body) : EMPTY_PAYLOAD_SHA256;
    const signedHeaders = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": toAmzDate(now()),
      ...headers,
    };
    const { authorization } = signS3Request({
      method,
      canonicalUri,
      headers: signedHeaders,
      payloadHash,
      region: s3.region,
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    });
    const { host: _host, ...sendHeaders } = signedHeaders;
    return fetchImpl(url, {
      method,
      headers: { ...sendHeaders, authorization },
      body: body || undefined,
    });
  }

  async function failWith(response, action, key) {
    const detail = await response.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(detail)?.[1] || `HTTP ${response.status}`;
    const error = new Error(`Cloud storage ${action} failed for ${key}: ${code}`);
    error.statusCode = 502;
    throw error;
  }

  return {
    driver: s3 ? "s3" : "local",
    isRemote: Boolean(s3),
    configWarning,

    describe() {
      return s3
        ? `cloud bucket "${s3.bucket}"${s3.endpoint ? ` at ${new URL(s3.endpoint).host}` : ` (${s3.region})`}, public URL ${s3.publicBaseUrl || "(bucket URL)"}`
        : `local disk (${uploadsDir})`;
    },

    /** Public URL buyers should load for an upload. Local mode keeps `/uploads/<file>`. */
    publicUrl(fileName) {
      if (!s3) return `/uploads/${fileName}`;
      const key = encodeKeyPath(objectKey(fileName));
      return s3.publicBaseUrl ? `${s3.publicBaseUrl}/${key}` : objectUrl(objectKey(fileName)).url.toString();
    },

    /** Stores the file and returns the URL to save in the database. */
    async saveUpload(fileName, buffer, { contentType = "application/octet-stream", cacheControl = IMMUTABLE_CACHE_CONTROL } = {}) {
      if (!isSafeUploadFileName(fileName)) throw new Error("Invalid upload file name.");
      const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      if (!s3) {
        await fsPromises.mkdir(uploadsDir, { recursive: true });
        await fsPromises.writeFile(localPath(fileName), body);
        return `/uploads/${fileName}`;
      }
      const key = objectKey(fileName);
      const response = await s3Request("PUT", key, {
        body,
        headers: { "content-type": contentType, "cache-control": cacheControl },
      });
      if (!response.ok) await failWith(response, "upload", key);
      return `/uploads/${fileName}`;
    },

    /** Reads an upload from local disk first, then the bucket. Returns null when missing. */
    async readUpload(fileName) {
      if (!isSafeUploadFileName(fileName)) return null;
      try {
        return await fsPromises.readFile(localPath(fileName));
      } catch (_) {
        // Not on this server's disk; try the bucket.
      }
      if (!s3) return null;
      const key = objectKey(fileName);
      const response = await s3Request("GET", key);
      if (response.status === 404) return null;
      if (!response.ok) await failWith(response, "download", key);
      return Buffer.from(await response.arrayBuffer());
    },

    async existsInBucket(fileName) {
      if (!s3 || !isSafeUploadFileName(fileName)) return false;
      const key = objectKey(fileName);
      const response = await s3Request("HEAD", key);
      if (response.status === 404) return false;
      if (!response.ok) await failWith(response, "check", key);
      return true;
    },

    async deleteUpload(fileName) {
      if (!isSafeUploadFileName(fileName)) return;
      await fsPromises.unlink(localPath(fileName)).catch(() => {});
      if (!s3) return;
      const key = objectKey(fileName);
      const response = await s3Request("DELETE", key);
      if (!response.ok && response.status !== 404) await failWith(response, "delete", key);
    },

    hasLocalUpload(fileName) {
      return isSafeUploadFileName(fileName) && fs.existsSync(localPath(fileName));
    },
  };
}

module.exports = {
  IMMUTABLE_CACHE_CONTROL,
  createObjectStorage,
  isSafeUploadFileName,
  signS3Request,
};

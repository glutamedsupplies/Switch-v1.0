"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createObjectStorage, isSafeUploadFileName, signS3Request } = require("../services/objectStorage");

const silentLogger = { warn() {} };

test("SigV4 matches the AWS S3 GET object example", () => {
  const { signature } = signS3Request({
    method: "GET",
    canonicalUri: "/test.txt",
    headers: {
      host: "examplebucket.s3.amazonaws.com",
      range: "bytes=0-9",
      "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "x-amz-date": "20130524T000000Z",
    },
    payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  });
  assert.equal(signature, "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
});

test("local driver saves, reads, and deletes under public/uploads", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "switch-uploads-"));
  const storage = createObjectStorage({ env: {}, uploadsDir: dir, logger: silentLogger });
  assert.equal(storage.driver, "local");
  const url = await storage.saveUpload("photo-1.webp", Buffer.from("img"), { contentType: "image/webp" });
  assert.equal(url, "/uploads/photo-1.webp");
  assert.equal((await storage.readUpload("photo-1.webp")).toString(), "img");
  await storage.deleteUpload("photo-1.webp");
  assert.equal(await storage.readUpload("photo-1.webp"), null);
  await assert.rejects(storage.saveUpload("../escape.webp", Buffer.from("x")));
});

test("s3 driver without required settings falls back to local", () => {
  const storage = createObjectStorage({
    env: { STORAGE_DRIVER: "s3", STORAGE_S3_BUCKET: "switch-media" },
    uploadsDir: os.tmpdir(),
    logger: silentLogger,
  });
  assert.equal(storage.driver, "local");
  assert.match(storage.configWarning, /STORAGE_S3_ACCESS_KEY_ID/);
});

test("s3 driver PUTs to an R2-style endpoint and keeps the /uploads URL", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(null, { status: 200 });
  };
  const storage = createObjectStorage({
    env: {
      STORAGE_DRIVER: "s3",
      STORAGE_S3_ENDPOINT: "https://acct123.r2.cloudflarestorage.com",
      STORAGE_S3_BUCKET: "switch-media",
      STORAGE_S3_ACCESS_KEY_ID: "key",
      STORAGE_S3_SECRET_ACCESS_KEY: "secret",
      STORAGE_PUBLIC_BASE_URL: "https://cdn.switch.test/",
    },
    uploadsDir: os.tmpdir(),
    fetchImpl,
    now: () => new Date("2026-09-29T08:00:00.000Z"),
    logger: silentLogger,
  });
  assert.equal(storage.driver, "s3");
  const url = await storage.saveUpload("shoe-123.webp", Buffer.from("webp"), { contentType: "image/webp" });
  assert.equal(url, "/uploads/shoe-123.webp");
  assert.equal(calls[0].url, "https://acct123.r2.cloudflarestorage.com/switch-media/uploads/shoe-123.webp");
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.headers["content-type"], "image/webp");
  assert.equal(calls[0].init.headers["x-amz-date"], "20260929T080000Z");
  assert.match(calls[0].init.headers.authorization, /^AWS4-HMAC-SHA256 Credential=key\/20260929\/auto\/s3\/aws4_request, SignedHeaders=cache-control;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.equal(storage.publicUrl("shoe-123.webp"), "https://cdn.switch.test/uploads/shoe-123.webp");
});

test("AWS S3 without endpoint uses virtual-hosted URLs", async () => {
  const calls = [];
  const storage = createObjectStorage({
    env: {
      STORAGE_DRIVER: "s3",
      STORAGE_S3_BUCKET: "switch-media",
      STORAGE_S3_REGION: "ap-southeast-1",
      STORAGE_S3_ACCESS_KEY_ID: "key",
      STORAGE_S3_SECRET_ACCESS_KEY: "secret",
    },
    uploadsDir: os.tmpdir(),
    fetchImpl: async (url) => {
      calls.push(String(url));
      return new Response(null, { status: 404 });
    },
    logger: silentLogger,
  });
  assert.equal(await storage.existsInBucket("missing.webp"), false);
  assert.equal(calls[0], "https://switch-media.s3.ap-southeast-1.amazonaws.com/uploads/missing.webp");
  assert.equal(storage.publicUrl("a b.webp"), "https://switch-media.s3.ap-southeast-1.amazonaws.com/uploads/a%20b.webp");
});

test("upload file names cannot contain paths", () => {
  assert.equal(isSafeUploadFileName("ok-1.webp"), true);
  assert.equal(isSafeUploadFileName("../x.webp"), false);
  assert.equal(isSafeUploadFileName("a/b.webp"), false);
  assert.equal(isSafeUploadFileName(".env"), false);
});

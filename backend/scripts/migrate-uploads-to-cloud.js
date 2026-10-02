#!/usr/bin/env node
"use strict";

/**
 * Copies photos, videos, and 3D files from public/uploads to the cloud bucket.
 * Database URLs stay `/uploads/<file>`; the server redirects missing local files
 * to STORAGE_PUBLIC_BASE_URL, so nothing in the database needs to change.
 *
 * Usage:
 *   node scripts/migrate-uploads-to-cloud.js            (dry run, nothing uploaded)
 *   node scripts/migrate-uploads-to-cloud.js --apply    (upload missing files)
 *
 * Local files are never deleted. Documents (PDF/DOC/DOCX) are skipped because they
 * need a private bucket with signed URLs.
 */

const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { createObjectStorage } = require("../services/objectStorage");

const ROOT_DIR = path.join(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT_DIR, "public", "uploads");
const CONCURRENCY = 4;

const MEDIA_CONTENT_TYPES = {
  ".avif": "image/avif",
  ".bin": "application/octet-stream",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".m4v": "video/x-m4v",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;
    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) continue;
    let value = trimmedLine.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  loadEnvFile(path.join(ROOT_DIR, ".env"));
  loadEnvFile(path.join(path.dirname(ROOT_DIR), ".env"));
  const apply = process.argv.includes("--apply");

  const storage = createObjectStorage({ uploadsDir: UPLOADS_DIR });
  if (!storage.isRemote) {
    console.error(storage.configWarning || "Set STORAGE_DRIVER=s3 and the STORAGE_S3_* settings in backend/.env first.");
    process.exitCode = 1;
    return;
  }
  console.log(`Target: ${storage.describe()}`);

  const entries = await fsPromises.readdir(UPLOADS_DIR, { withFileTypes: true });
  const media = [];
  let skippedCount = 0;
  for (const entry of entries) {
    const extension = path.extname(entry.name).toLowerCase();
    if (!entry.isFile() || !MEDIA_CONTENT_TYPES[extension]) {
      if (entry.isFile()) skippedCount += 1;
      continue;
    }
    const { size } = await fsPromises.stat(path.join(UPLOADS_DIR, entry.name));
    media.push({ name: entry.name, size, contentType: MEDIA_CONTENT_TYPES[extension] });
  }
  const totalBytes = media.reduce((sum, file) => sum + file.size, 0);
  console.log(`Found ${media.length} media files (${formatBytes(totalBytes)}); skipping ${skippedCount} documents/other files.`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to upload.");
    return;
  }

  let uploaded = 0;
  let alreadyThere = 0;
  const failed = [];
  let cursor = 0;
  async function worker() {
    while (cursor < media.length) {
      const file = media[cursor];
      cursor += 1;
      try {
        if (await storage.existsInBucket(file.name)) {
          alreadyThere += 1;
          continue;
        }
        const buffer = await fsPromises.readFile(path.join(UPLOADS_DIR, file.name));
        await storage.saveUpload(file.name, buffer, { contentType: file.contentType });
        uploaded += 1;
        if (uploaded % 25 === 0) console.log(`  uploaded ${uploaded}...`);
      } catch (error) {
        failed.push(`${file.name}: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`Uploaded ${uploaded}, already in bucket ${alreadyThere}, failed ${failed.length}.`);
  for (const line of failed) console.log(`  FAILED ${line}`);
  if (failed.length) process.exitCode = 1;
  else console.log("Done. Local files were kept; remove them only after checking the site loads images from the bucket.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

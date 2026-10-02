"use strict";

// Downloads the official logo for every PayMongo checkout method and renders
// them as round badges in public/assets/payment-methods/<method>.png: the brand
// colour fills the circle, the mark sits in the middle, and the corners are
// transparent so the logo stays round wherever it is shown. A portrait photo
// version goes to public/assets/payment-methods/photo/<method>.png.
// Usage: node scripts/fetch-payment-method-logos.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const PAYMONGO_LOGOS = "https://checkout.paymongo.com/logos/";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "assets", "payment-methods");
const PLATFORM_OUTPUT_DIR = path.join(__dirname, "..", "public", "assets", "payment-platforms");
const PHOTO_OUTPUT_DIR = path.join(OUTPUT_DIR, "photo");
const PHOTO_WIDTH = 400;
const PHOTO_HEIGHT = 512;
const PHOTO_MARK_WIDTH = 290;
const PHOTO_MARK_HEIGHT = 230;
const CANVAS_SIZE = 256;
// The mark's diagonal must stay inside the circle with breathing room.
const MARK_DIAGONAL = 184;
const MARK_MAX_SIDE = 172;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

// "tile" logos ship on a solid brand square whose colour is sampled and
// extended to the whole circle; "wordmark" logos sit on white.
const SOURCES = {
  gcash: { urls: [`${PAYMONGO_LOGOS}gcash.png`], kind: "tile" },
  paymaya: { urls: [`${PAYMONGO_LOGOS}maya.svg`], kind: "tile" },
  grab_pay: { urls: [`${PAYMONGO_LOGOS}grab_pay.svg`], kind: "tile" },
  shopee_pay: { urls: [`${PAYMONGO_LOGOS}shopee_pay.png`], kind: "tile" },
  qrph: { urls: [`${PAYMONGO_LOGOS}qrph.svg`], kind: "wordmark" },
  card: { urls: [`${PAYMONGO_LOGOS}visa.svg`, `${PAYMONGO_LOGOS}mastercard.svg`], kind: "wordmark" },
  billease: { urls: [`${PAYMONGO_LOGOS}billease.svg`], kind: "wordmark" },
  atome: { urls: ["https://www.atome.ph/assets/common/icon-square.png"], kind: "tile" },
  dob: { urls: [`${PAYMONGO_LOGOS}bpi.svg`], kind: "tile" },
  // PayMongo ships the UnionBank mark in white; it is drawn on the brand orange.
  dob_ubp: { urls: [`${PAYMONGO_LOGOS}ubp.svg`], kind: "mark", background: "#F58220", scale: 0.8 },
  brankas_bdo: { urls: [`${PAYMONGO_LOGOS}bdo.svg`], kind: "tile" },
  brankas_landbank: { urls: [`${PAYMONGO_LOGOS}landbank.svg`], kind: "tile" },
  brankas_metrobank: { urls: [`${PAYMONGO_LOGOS}metrobank.svg`], kind: "tile" },
  brankas_rcbc: { urls: ["https://www.rcbc.com/uploads/media/RCBC-Logo-(1x1).png"], kind: "tile" },
};

// Payment platforms (the gateway itself) shown on the Super Admin platform cards.
const PLATFORM_SOURCES = {
  paymongo: { urls: ["https://www.paymongo.com/apple-icon.png"], kind: "tile" },
};

async function download(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  const type = response.headers.get("content-type") || "";
  if (!response.ok || /text\/html/i.test(type)) {
    throw new Error(`${url} returned ${response.status} ${type}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function rasterize(buffer, size = 640) {
  return sharp(buffer, { density: 384 })
    .ensureAlpha()
    .resize(size, size, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
}

async function trim(buffer, options = {}) {
  try {
    return await sharp(buffer).trim({ threshold: 24, ...options }).png().toBuffer();
  } catch {
    return buffer;
  }
}

async function samplePixel(buffer, xRatio, yRatio) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const x = Math.min(info.width - 1, Math.max(0, Math.round((info.width - 1) * xRatio)));
  const y = Math.min(info.height - 1, Math.max(0, Math.round((info.height - 1) * yRatio)));
  const offset = (y * info.width + x) * info.channels;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2], alpha: data[offset + 3] / 255 };
}

async function combineSideBySide(buffers) {
  const gap = 40;
  const logos = await Promise.all(
    buffers.map(async (buffer) => trim(await sharp(await rasterize(buffer)).resize({ height: 200 }).png().toBuffer())),
  );
  const metas = await Promise.all(logos.map((logo) => sharp(logo).metadata()));
  const width = metas.reduce((sum, meta) => sum + meta.width, 0) + gap * (logos.length - 1);
  const height = Math.max(...metas.map((meta) => meta.height));
  let left = 0;
  const layers = logos.map((logo, index) => {
    const layer = { input: logo, left, top: Math.round((height - metas[index].height) / 2) };
    left += metas[index].width + gap;
    return layer;
  });
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

async function extractMark(buffers, source) {
  if (buffers.length > 1) {
    return { mark: await combineSideBySide(buffers), background: WHITE };
  }
  const raster = await rasterize(buffers[0]);
  if (source.kind === "mark") {
    return { mark: await trim(raster), background: source.background };
  }
  if (source.kind === "wordmark") {
    return { mark: await trim(raster), background: WHITE };
  }
  // Sampled just inside the corner to skip rounded corners and anti-aliased edges.
  const sampled = await samplePixel(raster, 0.08, 0.08);
  if (sampled.alpha < 0.9) {
    throw new Error("tile background could not be sampled");
  }
  const background = { ...sampled, alpha: 1 };
  const flattened = await sharp(raster).flatten({ background }).png().toBuffer({ resolveWithObject: true });
  const inset = Math.round(Math.min(flattened.info.width, flattened.info.height) * 0.03);
  const inner = await sharp(flattened.data)
    .extract({
      left: inset,
      top: inset,
      width: flattened.info.width - inset * 2,
      height: flattened.info.height - inset * 2,
    })
    .png()
    .toBuffer();
  const mark = await trim(inner, { background, threshold: 40 });
  return { mark, background };
}

async function renderBadge(mark, background, scale = 1) {
  const meta = await sharp(mark).metadata();
  const diagonal = Math.hypot(meta.width, meta.height);
  const factor = Math.min(MARK_DIAGONAL / diagonal, MARK_MAX_SIDE / Math.max(meta.width, meta.height)) * scale;
  const resized = await sharp(mark)
    .resize(Math.max(1, Math.round(meta.width * factor)), Math.max(1, Math.round(meta.height * factor)))
    .png()
    .toBuffer();
  const radius = CANVAS_SIZE / 2;
  const circleMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">`
      + `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`,
  );
  return sharp({
    create: { width: CANVAS_SIZE, height: CANVAS_SIZE, channels: 4, background },
  })
    .composite([
      { input: resized, gravity: "center" },
      { input: circleMask, blend: "dest-in" },
    ])
    .png()
    .toBuffer();
}

// Portrait "photo" version used by the Super Admin photo fan: the brand colour
// fills the whole card and the mark sits in the middle.
async function renderPhoto(mark, background, scale = 1) {
  const meta = await sharp(mark).metadata();
  const factor = Math.min(PHOTO_MARK_WIDTH / meta.width, PHOTO_MARK_HEIGHT / meta.height) * scale;
  const resized = await sharp(mark)
    .resize(Math.max(1, Math.round(meta.width * factor)), Math.max(1, Math.round(meta.height * factor)))
    .png()
    .toBuffer();
  return sharp({
    create: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 4, background },
  })
    .composite([{ input: resized, gravity: "center" }])
    .flatten({ background })
    .png()
    .toBuffer();
}

async function renderAll(sources, outputDir, failures, { photoDir = "" } = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  if (photoDir) fs.mkdirSync(photoDir, { recursive: true });
  for (const [key, source] of Object.entries(sources)) {
    try {
      const buffers = await Promise.all(source.urls.map(download));
      const { mark, background } = await extractMark(buffers, source);
      const target = path.join(outputDir, `${key}.png`);
      fs.writeFileSync(target, await renderBadge(mark, background, source.scale || 1));
      console.log(`saved ${key} -> ${path.relative(process.cwd(), target)}`);
      if (photoDir) {
        const photoTarget = path.join(photoDir, `${key}.png`);
        fs.writeFileSync(photoTarget, await renderPhoto(mark, background, source.scale || 1));
        console.log(`saved ${key} photo -> ${path.relative(process.cwd(), photoTarget)}`);
      }
    } catch (error) {
      failures.push(key);
      console.error(`failed ${key}: ${error.message}`);
    }
  }
}

async function main() {
  const failures = [];
  await renderAll(SOURCES, OUTPUT_DIR, failures, { photoDir: PHOTO_OUTPUT_DIR });
  await renderAll(PLATFORM_SOURCES, PLATFORM_OUTPUT_DIR, failures);
  if (failures.length) {
    process.exitCode = 1;
  }
}

main();

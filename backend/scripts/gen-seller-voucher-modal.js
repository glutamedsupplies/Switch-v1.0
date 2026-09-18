"use strict";

const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const lines = fs.readFileSync(path.join(publicDir, "super_admin.html"), "utf8").split(/\r?\n/);
let chunk = lines.slice(3601, 3824).join("\n");
const replacements = [
  ["voucher-modal", "seller-voucher-modal"],
  ["data-voucher-modal", "data-seller-voucher-modal"],
  ["voucher-title", "seller-voucher-title"],
  ["voucher-code", "seller-voucher-code"],
  ["voucher-discount", "seller-voucher-discount"],
  ["voucher-free-shipping", "seller-voucher-free-shipping"],
  ["voucher-min-spend", "seller-voucher-min-spend"],
  ["voucher-passive", "seller-voucher-passive"],
  ["voucher-date", "seller-voucher-date"],
  ["voucher-platform", "seller-voucher-platform"],
  ["data-voucher-date", "data-seller-voucher-date"],
];
for (const [from, to] of replacements) {
  chunk = chunk.split(from).join(to);
}
chunk = chunk.replace(
  "Pick a platform, set the offer, and preview it before publishing. The voucher can only be used on that platform.",
  "Set the offer and preview it before publishing. Buyers can use this at checkout on your listings only.",
);
chunk = chunk.replace(
  "Set the platform, title, code, and discount against the total purchase.",
  "Set the title, code, and discount against the total purchase for your store.",
);
// Seller vouchers are store-scoped — no platform picker.
chunk = chunk.replace(
  /\s*<label class="category-add-field sa-voucher-modal__platform-field">[\s\S]*?<\/label>\s*/i,
  "\n",
);
chunk = chunk.replace(
  "Every platform is listed here so you can see how many vouchers you have overall.",
  "Store vouchers for buyers checking out from your listings.",
);
chunk = chunk.replace("<strong>All vouchers</strong>", "<strong>Your vouchers</strong>");
chunk = chunk.replace(
  "Platform rules stay the same (including All platforms).",
  "When on, the voucher unlocks automatically at Place Order once the buyer reaches the minimum spend.",
);

const mainPath = path.join(publicDir, "main.html");
const mainHtml = fs.readFileSync(mainPath, "utf8");
const marker = '    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>';
if (!mainHtml.includes(marker)) {
  throw new Error("Insertion marker not found in main.html");
}
if (mainHtml.includes('id="seller-voucher-modal-overlay"')) {
  console.log("Seller voucher modal already present.");
  process.exit(0);
}
fs.writeFileSync(mainPath, mainHtml.replace(marker, `${chunk}\n\n${marker}`));
console.log("Inserted seller voucher modal into main.html");

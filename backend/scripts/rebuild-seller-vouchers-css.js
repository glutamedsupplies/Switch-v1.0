"use strict";

const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "super_admin.css");
const outPath = path.join(publicDir, "seller_vouchers.css");

const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);

function findLine(needle, from = 0) {
  for (let i = from; i < lines.length; i += 1) {
    if (lines[i].includes(needle)) return i + 1;
  }
  throw new Error(`Not found in super_admin.css: ${needle}`);
}

function findBlockEnd(start1Based) {
  let depth = 0;
  let started = false;
  for (let i = start1Based - 1; i < lines.length; i += 1) {
    const open = (lines[i].match(/\{/g) || []).length;
    const close = (lines[i].match(/\}/g) || []).length;
    if (open || close) started = true;
    depth += open - close;
    if (started && depth === 0) return i + 1;
  }
  throw new Error(`Unclosed block near line ${start1Based}`);
}

const panelStart = findLine(".super-admin-panel {");
const headingStart = findLine(".super-admin-companies-heading {");
const headingEnd = findBlockEnd(findLine(".super-admin-companies-heading .feedback-note:empty"));
const overlayComment = findLine(
  "/* Base overlay styles live here because super_admin.html does not load styles.css. */",
);
const overlayEnd = findBlockEnd(
  findLine("body.super-admin-page .validation-modal-overlay.is-open .validation-modal"),
);
const storeModalStart = findLine(".super-admin-store-type-modal-overlay.validation-modal-overlay");
const storeModalEnd = findBlockEnd(findLine(".super-admin-store-type-modal__field-grid--double"));
const helperStart = findLine("body.super-admin-page .super-admin-store-type-modal__helper");
const statusActive1 = findLine(
  "body.super-admin-page .super-admin-store-type-modal__status-options button.is-active",
  helperStart,
);
const statusActive2 = findLine(
  "body.super-admin-page .super-admin-store-type-modal__status-options button.is-active",
  statusActive1,
);
let statusEndLine = statusActive2;
for (let i = statusActive2; i < statusActive2 + 10; i += 1) {
  if (lines[i - 1].includes("status-toggle::after")) {
    statusEndLine = i;
  }
}
const statusEnd = findBlockEnd(statusEndLine);
const panelCardStart = findLine("body.super-admin-page .super-admin-panel {", 10000);
const panelCardEnd = findBlockEnd(panelCardStart);
const descStart = findLine("body.super-admin-page .super-admin-store-types-heading__description");
const descEnd = findBlockEnd(descStart);
const voucherStart = findLine(".sa-vouchers-heading {");
const mobile640 = findLine("@media (max-width: 640px)", voucherStart);
// Close at the end of the 640px media query (not the nested button rule).
const voucherEnd = findBlockEnd(mobile640);

const extractRanges = [
  [panelStart, findBlockEnd(panelStart)],
  [headingStart, headingEnd],
  [overlayComment, overlayEnd],
  [storeModalStart, storeModalEnd],
  [helperStart, statusEnd],
  [panelCardStart, panelCardEnd],
  [descStart, descEnd],
  [voucherStart, voucherEnd],
];

const chunks = extractRanges.map(([start, end]) => {
  if (!(start > 0 && end >= start)) {
    throw new Error(`Invalid range ${start}-${end}`);
  }
  return lines.slice(start - 1, end).join("\n");
});

let css = `/* Seller Admin vouchers — layout mirrored from super_admin.css */\n\n${chunks.join("\n\n")}\n`;

css = css.replace(/body\.super-admin-page/g, "body.main-shell-host");
css = css.replace(/#voucher-modal-overlay/g, "#seller-voucher-modal-overlay");
css = css.replace(/#voucher-modal(?!-)/g, "#seller-voucher-modal");

css += `
/* Seller shell layout */
body.main-shell-host .main-vouchers-view.main-section-view {
  padding: 0;
  gap: 0;
}

body.main-shell-host .main-vouchers-view .super-admin-vouchers-panel {
  width: 100%;
}

/* Neutralize main.css .validation-modal defaults so create voucher matches Super Admin */
body.main-shell-host #seller-voucher-modal-overlay.validation-modal-overlay {
  z-index: 2000;
  padding: 32px;
  background: rgba(15, 23, 42, 0.46);
}

body.main-shell-host
  #seller-voucher-modal.validation-modal.super-admin-store-type-modal.sa-voucher-modal {
  box-sizing: border-box;
  display: grid;
  width: min(720px, calc(100vw - 64px)) !important;
  max-width: 720px !important;
  height: min(680px, calc(100vh - 64px));
  max-height: calc(100vh - 64px);
  margin: 0;
  padding: 0 !important;
  border: 1px solid #dfe4ea !important;
  border-radius: 7px !important;
  background: #ffffff !important;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.28) !important;
  overflow: hidden;
}

body.main-shell-host .super-admin-vouchers-panel .partner-data-add-button,
body.main-shell-host .sa-voucher-modal .category-add-button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 88px;
  min-height: 40px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--accent-button-bg, var(--accent));
  border-radius: 8px;
  background: var(--accent-button-bg, var(--accent));
  color: var(--accent-contrast, #ffffff);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

body.main-shell-host .super-admin-vouchers-panel .partner-data-add-button svg,
body.main-shell-host .sa-voucher-modal .category-add-button svg {
  width: 18px;
  height: 18px;
}

body.main-shell-host .sa-voucher-modal .ghost-button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #475569;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

body.main-shell-host .sa-voucher-modal .category-add-field {
  min-width: 0;
  display: grid;
  gap: 6px;
}

body.main-shell-host .sa-voucher-modal .category-add-field > span {
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}

@media (max-width: 860px) {
  body.main-shell-host
    #seller-voucher-modal.validation-modal.super-admin-store-type-modal.sa-voucher-modal {
    width: calc(100vw - 28px) !important;
    height: calc(100vh - 28px);
    max-height: calc(100vh - 28px);
  }
}

@media (max-width: 640px) {
  body.main-shell-host
    #seller-voucher-modal.validation-modal.super-admin-store-type-modal.sa-voucher-modal {
    width: calc(100vw - 20px) !important;
    height: calc(100vh - 20px);
    max-height: calc(100vh - 20px);
  }
}
`;

fs.writeFileSync(outPath, css);
console.log(`Wrote ${outPath} (${css.length} bytes)`);
console.log("Ranges:", extractRanges.map(([a, b]) => `${a}-${b}`).join(", "));

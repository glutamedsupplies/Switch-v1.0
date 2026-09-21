import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(() => {
  sessionStorage.setItem(
    "gms-admin-session",
    JSON.stringify({
      adminId: "admin-ace-harware-1787828559816",
      role: "admin",
      sessionToken: "smoke-test-token",
    }),
  );
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:8080/main.html#dashboard", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const sheets = await page.evaluate(() =>
  [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
);
console.log("Stylesheet order:");
sheets.forEach((href, i) => {
  if (/seller_feedback|restored-product-listing|main\.css/.test(href)) {
    console.log(`${i + 1}. ${href}`);
  }
});

await page.evaluate(() => window.gmsOpenSellerFeedbackModal());
await page.waitForTimeout(1000);

const report = await page.evaluate(() => {
  const overlay = document.querySelector(".seller-feedback-modal-overlay.is-open");
  const modal = overlay?.querySelector(".seller-feedback-modal");
  const modalBox = modal?.getBoundingClientRect();
  const rect = (sel) => {
    const el = overlay?.querySelector(sel);
    if (!(el instanceof Element) || !modalBox) return null;
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      inView: box.bottom > modalBox.top + 2 && box.top < modalBox.bottom - 2 && box.height > 0,
      display: style.display,
    };
  };
  return {
    header: rect(".seller-feedback-modal__header"),
    intro: rect(".seller-feedback-modal__intro"),
    footer: rect(".seller-feedback-modal__footer"),
    modalDisplay: modal ? getComputedStyle(modal).display : null,
  };
});
console.log(JSON.stringify(report, null, 2));
await browser.close();

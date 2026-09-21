const fs = require("fs");
const html = fs.readFileSync("backend/public/switch_site_footer.inc.html", "utf8");

const js = `(() => {
  const FOOTER_HTML = ${JSON.stringify(html)};

  function mountSwitchSiteFooter() {
    if (document.querySelector(".md-site-footer")) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = FOOTER_HTML.trim();
    const footer = wrap.firstElementChild;
    if (!footer) return;
    document.body.appendChild(footer);
    document.body.classList.add("has-switch-site-footer");
  }

  function bindFooterLinks() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-md-footer-link]");
      if (!link) return;
      const key = String(link.getAttribute("data-md-footer-link") || "").trim();
      if (!key) return;

      if (key === "help-centre") {
        event.preventDefault();
        window.location.href = "/help_centre.html";
        return;
      }
      if (key === "terms-and-policies") {
        event.preventDefault();
        window.location.href = "/terms_conditions.html";
        return;
      }
      if (key === "privacy-notice") {
        event.preventDefault();
        window.location.href = "/privacy_policy.html";
        return;
      }
    });
  }

  function boot() {
    mountSwitchSiteFooter();
    bindFooterLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`;

fs.writeFileSync("backend/public/switch_site_footer.js", js);
console.log("wrote switch_site_footer.js", js.length);

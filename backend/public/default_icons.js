/**
 * Shared default action icons for Switch admin UIs.
 * Prefer these for new flash-deal / delete affordances so the set stays consistent.
 *
 * Usage:
 *   SwitchDefaultIcons.zap.svg
 *   SwitchDefaultIcons.trash.svg
 *   SwitchDefaultIcons.trash.paths  // for createIconSvg(...)
 *   SwitchDefaultIcons.svg("trash", { size: 24, className: "..." })
 */
(function (global) {
  "use strict";

  const ZAP_PATHS =
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>';

  const TRASH_PATHS =
    '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';

  function escapeAttr(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function buildSvg(paths, options = {}) {
    const size = Number(options.size) > 0 ? Number(options.size) : 24;
    const className = String(options.className ?? "").trim();
    const ariaHidden = options.ariaHidden === false ? null : 'aria-hidden="true"';
    const classAttr = className ? ` class="${escapeAttr(className)}"` : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${classAttr} ${ariaHidden || ""} focusable="false">` +
      paths +
      "</svg>"
    );
  }

  const zap = Object.freeze({
    name: "zap",
    lucide: "Zap",
    paths: ZAP_PATHS,
    svg: buildSvg(ZAP_PATHS, { size: 24, className: "lucide lucide-zap-icon lucide-zap" }),
  });

  const trash = Object.freeze({
    name: "trash",
    lucide: "Trash",
    paths: TRASH_PATHS,
    svg: buildSvg(TRASH_PATHS, {
      size: 24,
      className: "lucide lucide-trash preview-icon",
    }),
    /** Larger markup used by validation / theme delete affordances. */
    svgLarge: buildSvg(TRASH_PATHS, {
      size: 256,
      className: "lucide lucide-trash",
    }),
  });

  const catalog = Object.freeze({
    zap,
    flashDeal: zap,
    trash,
    delete: trash,
  });

  function svg(name, options = {}) {
    const entry = catalog[name] || catalog[String(name || "").trim()];
    if (!entry) {
      return "";
    }
    const className =
      options.className != null
        ? options.className
        : entry.name === "trash"
          ? "lucide lucide-trash"
          : "lucide lucide-zap-icon lucide-zap";
    return buildSvg(entry.paths, {
      size: options.size,
      className,
      ariaHidden: options.ariaHidden,
    });
  }

  const api = Object.freeze({
    zap,
    flashDeal: zap,
    trash,
    delete: trash,
    svg,
    paths: Object.freeze({
      zap: ZAP_PATHS,
      flashDeal: ZAP_PATHS,
      trash: TRASH_PATHS,
      delete: TRASH_PATHS,
    }),
  });

  global.SwitchDefaultIcons = api;
})(typeof window !== "undefined" ? window : globalThis);

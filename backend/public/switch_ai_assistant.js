/**
 * Switch AI assistant (web). Include with:
 *   <script src="/switch_ai_assistant.js" data-role="buyer|seller" defer></script>
 * The floating button renders immediately; the panel, stylesheet-dependent DOM
 * and session history load only when it is first opened.
 */
(function () {
  "use strict";

  if (window.SwitchAiAssistant) return;

  const script = document.currentScript;
  const ROLE = String(script?.dataset.role || "buyer").toLowerCase() === "seller" ? "seller" : "buyer";
  const API = "/api/assistant";
  const NAMES = { buyer: "Switch Shopping AI", seller: "Switch Seller AI" };
  const PLACEHOLDERS = {
    buyer: "Ask for products, your cart, or an order…",
    seller: "Ask about sales, stock, promos, or messages…",
  };
  const SUBTITLES = {
    buyer: "Live prices & stock from Switch",
    seller: "Live data from your store",
  };

  const state = {
    root: null,
    fab: null,
    panel: null,
    log: null,
    input: null,
    send: null,
    suggest: null,
    built: false,
    loaded: false,
    busy: false,
    enabled: true,
    lastFocus: null,
  };

  // ---------------------------------------------------------------- session

  function readJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function storedSession() {
    if (ROLE === "seller") {
      return readJson(window.sessionStorage, "gms-admin-session")
        || readJson(window.sessionStorage, "gms-employee-session")
        || readJson(window.localStorage, "gms-admin-session")
        || readJson(window.localStorage, "gms-employee-session");
    }
    try {
      if (window.localStorage.getItem("gms-buyer-guest") === "1") return null;
    } catch (_) {}
    return readJson(window.localStorage, "gms-buyer-session") || readJson(window.sessionStorage, "gms-buyer-session");
  }

  function isSignedIn() {
    const session = storedSession();
    return Boolean(session && (session.accountId || session.id || session.email || session.adminId || session.employeeId));
  }

  function sessionToken() {
    return String(storedSession()?.sessionToken || "").trim();
  }

  function pageContext() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (ROLE === "buyer") {
      const productId = params.get("productId") || "";
      if (productId) return { page: "product", productId };
      if (/switch_cart/.test(path)) return { page: "cart" };
      if (/checkout/.test(path)) return { page: "checkout" };
      if (/orders?/.test(path)) return { page: "orders" };
      return { page: "shop" };
    }
    const active = document.querySelector("[data-main-nav-key][aria-current='page'], [data-main-nav-key].is-active, [data-main-nav-key][aria-expanded='true']");
    const key = String(active?.getAttribute("data-main-nav-key") || "").toLowerCase();
    if (/order/.test(key)) return { page: "orders" };
    if (/chat|message|inbox/.test(key)) return { page: "chat" };
    if (/product|inventory|stock|listing/.test(key)) return { page: "products" };
    return { page: "dashboard" };
  }

  async function api(method, path, body) {
    const headers = { Accept: "application/json" };
    const token = sessionToken();
    if (token) headers["X-Switch-Session"] = token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(API + path, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || `Request failed (${response.status}).`);
      error.status = response.status;
      error.code = data.code || "";
      throw error;
    }
    return data;
  }

  // -------------------------------------------------------------------- DOM

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = String(value);
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false || child === "") continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function svg(path) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "2");
    node.setAttribute("stroke-linecap", "round");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("aria-hidden", "true");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    node.append(p);
    return node;
  }

  function peso(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    const cents = Math.abs(amount % 1) > 0.001;
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
  }

  function isExpired(expiresAt) {
    const at = Date.parse(expiresAt || "");
    return Number.isFinite(at) && at <= Date.now();
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.origin);
      return url.protocol === "https:" || (url.protocol === "http:" && url.origin === window.location.origin) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function thumb(imageUrl, name) {
    const box = el("div", { class: "sai-thumb", "aria-hidden": "true" });
    const src = safeHttpUrl(imageUrl);
    if (src) {
      const img = el("img", { alt: "", loading: "lazy", decoding: "async" });
      img.src = src;
      img.addEventListener("error", () => {
        img.remove();
        box.textContent = String(name || "?").trim().charAt(0).toUpperCase();
      });
      box.append(img);
    } else {
      box.textContent = String(name || "?").trim().charAt(0).toUpperCase();
    }
    return box;
  }

  function rows(list) {
    const dl = el("dl", { class: "sai-rows" });
    for (const row of list || []) {
      if (!row || row.value === undefined || row.value === null || row.value === "") continue;
      dl.append(el("div", { class: `sai-row${row.emphasis ? " is-emphasis" : ""}` }, el("dt", { text: row.label }), el("dd", { text: row.value })));
    }
    return dl;
  }

  function block(className, title, meta, ...children) {
    return el(
      "section",
      { class: `sai-block ${className || ""}` },
      title || meta ? el("div", { class: "sai-block__head" }, el("h3", { class: "sai-block__title", text: title || "" }), meta ? el("span", { class: "sai-block__meta", text: meta }) : null) : null,
      ...children,
    );
  }

  // ---------------------------------------------------------------- actions

  function actionBar(actions, card, flush) {
    const list = (Array.isArray(actions) ? actions : []).filter((action) => action && action.label);
    if (!list.length) return null;
    return el("div", { class: `sai-actions${flush ? " sai-actions--flush" : ""}` }, list.map((action) => actionButton(action, card)));
  }

  function actionButton(action, card) {
    const style = ["primary", "danger", "ghost"].includes(action.style) ? action.style : "secondary";
    const expired = (action.kind === "confirm" || action.kind === "cancel") && isExpired(action.expiresAt);
    const button = el("button", {
      type: "button",
      class: `sai-btn sai-btn--${style}${action.kind === "call" || action.kind === "open_url" || action.kind === "navigate" ? " sai-btn--keep" : ""}`,
      text: expired ? `${action.label} (expired)` : action.label,
      disabled: expired || undefined,
    });
    button.addEventListener("click", () => handleAction(action, card(), button));
    return button;
  }

  function markDone(cardNode, note) {
    if (!cardNode || cardNode.classList.contains("is-done")) return;
    cardNode.classList.add("is-done");
    if (note) cardNode.append(el("p", { class: "sai-done-tag", text: note }));
  }

  function handleAction(action, cardNode, button) {
    if (state.busy) return;
    switch (action.kind) {
      case "tool":
        return runTool(action.tool, action.args || {});
      case "prompt": {
        const text = String(action.text || action.label || "");
        if (/[\s:]$/.test(text)) {
          state.input.value = text;
          state.input.focus();
          autosize();
          return;
        }
        return sendMessage(text);
      }
      case "confirm":
        if (Array.isArray(action.inputs) && action.inputs.length) return openInputs(action, cardNode, button);
        return confirmToken(action.token, {}, cardNode);
      case "cancel":
        return confirmToken(action.token, { cancel: true }, cardNode);
      case "open_url": {
        const url = safeHttpUrl(action.url);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      case "navigate":
        return navigate(action);
      case "call": {
        const phone = String(action.phone || "").replace(/[^\d+]/g, "");
        if (phone) window.location.href = `tel:${phone}`;
        return;
      }
      default:
        return;
    }
  }

  function openInputs(action, cardNode, button) {
    const existing = cardNode?.querySelector("[data-sai-inputs]");
    if (existing) {
      existing.querySelector("input")?.focus();
      return;
    }
    const fields = action.inputs.map((input) => {
      const id = `sai-in-${Math.random().toString(36).slice(2, 8)}`;
      const field = el("input", {
        id,
        name: input.name,
        type: input.type === "pin" ? "password" : "text",
        inputmode: input.type === "pin" ? "numeric" : null,
        autocomplete: "one-time-code",
        maxlength: input.type === "pin" ? "8" : "200",
        required: input.required ? true : null,
      });
      return { input, node: el("div", { class: "sai-field" }, el("label", { for: id, text: input.label || input.name }), field), field };
    });
    const submit = el("button", { type: "submit", class: "sai-btn sai-btn--primary", text: action.label });
    const form = el("form", { class: "sai-block__body", "data-sai-inputs": true }, fields.map((f) => f.node), el("div", { class: "sai-actions sai-actions--flush" }, submit));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const inputs = {};
      for (const { input, field } of fields) {
        const value = field.value.trim();
        if (input.required && !value) {
          field.focus();
          return;
        }
        inputs[input.name] = value;
      }
      for (const { field } of fields) field.value = "";
      confirmToken(action.token, { inputs }, cardNode);
    });
    (button?.closest(".sai-actions") || cardNode).after(form);
    fields[0]?.field.focus();
  }

  function navigate(action) {
    const target = String(action.target || "");
    if (target === "product" && action.productId) {
      const id = String(action.productId);
      const onPage = document.querySelector(`[data-ss-product="${CSS.escape(id)}"]`);
      if (onPage) {
        onPage.click();
        if (window.matchMedia("(max-width: 720px)").matches) close();
        return;
      }
      window.location.href = `/switch_shop.html?platform=shop&productId=${encodeURIComponent(id)}`;
      return;
    }
    if (target === "orders" && ROLE === "seller") {
      const nav = document.querySelector('[data-main-nav-key="orders"]');
      if (nav) {
        nav.click();
        return;
      }
    }
    const routes = {
      cart: "/switch_cart.html",
      addresses: "/switch_account.html?tab=address",
      profile: "/switch_account.html?tab=profile",
      orders: ROLE === "seller" ? "/main.html" : "/main_dart.html",
    };
    if (routes[target]) window.location.href = routes[target];
  }

  // ----------------------------------------------------------------- blocks

  function productMini(product, index) {
    const cardRef = { node: null };
    const node = el(
      "article",
      { class: "sai-mini" },
      thumb(product.imageUrl, product.name),
      el(
        "div",
        { class: "sai-mini__body" },
        el("span", { class: "sai-mini__n", text: `#${index + 1}${product.deal ? " · Flash deal" : ""}` }),
        el("p", { class: "sai-product__name", text: product.name }),
        el("p", { class: "sai-product__seller", text: [product.seller, product.rating ? `★ ${product.rating}` : ""].filter(Boolean).join(" · ") }),
        priceLine(product),
        el("div", { class: "sai-pills" }, stockPill(product)),
      ),
      actionBar(product.actions, () => cardRef.node),
    );
    cardRef.node = node;
    return node;
  }

  function priceLine(product) {
    return el(
      "div",
      { class: "sai-price" },
      el("span", { class: "sai-price__now", text: `${product.priceFrom ? "from " : ""}${peso(product.price)}` }),
      Number(product.originalPrice) > Number(product.price) ? el("span", { class: "sai-price__was", text: peso(product.originalPrice) }) : null,
      Number(product.discountPercent) > 0 ? el("span", { class: "sai-price__off", text: `−${product.discountPercent}%` }) : null,
    );
  }

  function stockPill(product) {
    if (!product.stockLabel) return null;
    const tone = Number(product.stock) <= 0 ? "bad" : Number(product.stock) <= 5 ? "warn" : "good";
    return el("span", { class: `sai-pill sai-pill--${tone}`, text: product.stockLabel });
  }

  const renderers = {
    product_carousel(b) {
      const products = Array.isArray(b.products) ? b.products : [];
      return block("", b.title ? capitalize(b.title) : "Results", b.total ? `${b.total} found` : "", el("div", { class: "sai-carousel" }, products.map(productMini)));
    },

    product_card(b, card) {
      const p = b.product || {};
      const variants = (p.variants || []).map((v) => el("span", { class: `sai-pill${Number(v.stock) <= 0 ? " sai-pill--bad" : ""}`, text: `${v.name}${Number(v.stock) <= 0 ? " · sold out" : ""}` }));
      return block(
        "",
        "",
        "",
        el(
          "div",
          { class: "sai-product" },
          thumb(p.imageUrl, p.name),
          el("div", {}, el("p", { class: "sai-product__name", text: p.name }), el("p", { class: "sai-product__seller", text: [p.seller, p.rating ? `★ ${p.rating}` : "", p.sold ? `${p.sold} sold` : ""].filter(Boolean).join(" · ") }), priceLine(p), el("div", { class: "sai-pills" }, stockPill(p), variants)),
          p.description ? el("p", { class: "sai-product__desc", text: p.description }) : null,
        ),
        actionBar(p.actions, card),
      );
    },

    comparison(b) {
      const products = b.products || [];
      const table = el(
        "table",
        { class: "sai-table" },
        el("thead", {}, el("tr", {}, el("th", { text: "" }), products.map((p) => el("th", { scope: "col", text: p.name })))),
        el("tbody", {}, (b.rows || []).map((row) => el("tr", {}, el("th", { scope: "row", text: row.label }), (row.values || []).map((v) => el("td", { text: v }))))),
      );
      return block("", "Comparison", "", el("div", { class: "sai-table-wrap" }, table), el("div", { class: "sai-carousel" }, products.map(productMini)));
    },

    cart_summary(b, card) {
      const items = el(
        "ul",
        { class: "sai-list" },
        (b.items || []).map((item) =>
          el(
            "li",
            {},
            el("div", { class: "sai-list__top" }, el("span", { text: `${item.name}${item.variantName ? ` (${item.variantName})` : ""}` }), el("span", { text: peso(item.lineTotal) })),
            el("p", { class: "sai-list__sub", text: [`${item.quantity} × ${peso(item.unitPrice)}`, item.seller].filter(Boolean).join(" · ") }),
            item.issue ? el("div", { class: "sai-pills" }, el("span", { class: "sai-pill sai-pill--warn", text: item.issue })) : null,
            actionBar(item.actions, card, true),
          ),
        ),
      );
      return block("", "Your cart", `${b.itemCount || 0} item${b.itemCount === 1 ? "" : "s"}`, items, el("div", { class: "sai-block__body" }, rows([{ label: "Subtotal", value: peso(b.subtotal), emphasis: true }])), actionBar(b.actions, card));
    },

    checkout_summary(b, card) {
      const t = b.totals || {};
      const lines = [
        ...(b.items || []).map((item) => ({ label: `${item.name}${item.variantName ? ` (${item.variantName})` : ""} × ${item.quantity}`, value: peso(item.lineTotal) })),
        { label: "Subtotal", value: peso(t.subtotal) },
        t.merchandiseDiscount ? { label: `Voucher${b.voucher?.code ? ` ${b.voucher.code}` : ""}`, value: `−${peso(t.merchandiseDiscount)}` } : null,
        { label: `Shipping${b.delivery?.name ? ` (${b.delivery.name})` : ""}`, value: t.shippingFee ? peso(t.shippingFee) : "Free" },
        t.shippingDiscount ? { label: "Shipping discount", value: `−${peso(t.shippingDiscount)}` } : null,
        { label: "Deliver to", value: b.address?.text || "Not set" },
        { label: "Payment", value: b.payment ? `${b.payment.name} · ${b.payment.modeLabel}` : "Not chosen" },
        b.payment?.mode === "cod" ? { label: "Pay now (deposit)", value: peso(t.dueNow) } : null,
        { label: "Total", value: peso(t.total), emphasis: true },
      ].filter(Boolean);
      const pills = [
        ...(b.missing || []).map((m) => el("span", { class: "sai-pill sai-pill--warn", text: `Needs ${m}` })),
        ...(b.warnings || []).map((w) => el("span", { class: "sai-pill sai-pill--warn", text: w })),
        b.ready ? el("span", { class: "sai-pill sai-pill--good", text: "Ready to place" }) : null,
      ];
      return block("sai-receipt", "Checkout review", b.seller?.name || "", el("div", { class: "sai-block__body" }, rows(lines), el("div", { class: "sai-pills" }, pills)), actionBar(b.actions, card));
    },

    payment_options(b, card) {
      const list = el(
        "ul",
        { class: "sai-list" },
        (b.options || []).map((option) =>
          el("li", {}, el("div", { class: "sai-list__top" }, el("span", { text: option.label }), option.selected ? el("span", { class: "sai-pill sai-pill--accent", text: "Selected" }) : null), actionBar(option.actions, card, true)),
        ),
      );
      return block("", "Payment method", "Secure payment page", list, (b.notes || []).length ? el("div", { class: "sai-block__body" }, (b.notes || []).map((n) => el("p", { class: "sai-note", text: n }))) : null);
    },

    order_status(b, card) {
      const list = el(
        "ul",
        { class: "sai-list" },
        (b.orders || []).map((order) => {
          const timeline = (order.tracking?.timeline || []).map((step) => ({ label: step.label, value: step.done ? "✓" : "…" }));
          return el(
            "li",
            {},
            el("div", { class: "sai-list__top" }, el("span", { text: `#${order.reference}` }), el("span", { class: `sai-pill ${order.stage === "cancelled" ? "sai-pill--bad" : "sai-pill--accent"}`, text: order.stageLabel })),
            el("p", { class: "sai-list__sub", text: (order.items || []).map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity}`).join(", ") }),
            el("p", { class: "sai-list__sub", text: [order.placedAt, peso(order.total), order.paymentOption, order.delivery].filter(Boolean).join(" · ") }),
            order.amountDue > 0 ? el("div", { class: "sai-pills" }, el("span", { class: "sai-pill sai-pill--warn", text: `${peso(order.amountDue)} to pay` })) : null,
            order.tracking?.statusLabel ? el("p", { class: "sai-list__sub", text: `Delivery: ${order.tracking.statusLabel}${order.tracking.riderName ? ` · Rider ${order.tracking.riderName}` : ""}` }) : null,
            order.tracking?.exceptionMessage ? el("div", { class: "sai-pills" }, el("span", { class: "sai-pill sai-pill--bad", text: order.tracking.exceptionMessage })) : null,
            timeline.length ? el("div", { style: "margin-top:8px" }, rows(timeline)) : null,
            actionBar(order.actions, card, true),
          );
        }),
      );
      return block("", "Orders", "", list);
    },

    confirmation(b, card) {
      const actions = Array.isArray(b.actions) && b.actions.length
        ? b.actions
        : b.token
          ? [
              { label: b.confirmLabel || "Confirm", kind: "confirm", token: b.token, expiresAt: b.expiresAt, style: "primary", inputs: b.inputs },
              { label: b.cancelLabel || "Cancel", kind: "cancel", token: b.token, expiresAt: b.expiresAt, style: "ghost" },
            ]
          : [];
      return block(
        "sai-receipt",
        b.title || "Please confirm",
        b.risk === "high" ? "Needs your tap" : "",
        el("div", { class: "sai-block__body" }, rows(b.lines), b.warning ? el("p", { class: "sai-receipt__warn", text: b.warning }) : null, (b.tips || []).map((tip) => el("p", { class: "sai-note", text: tip }))),
        actionBar(actions, card),
        el("div", { class: "sai-receipt__tear", "aria-hidden": "true" }),
      );
    },

    payment_handoff(b, card) {
      return block(
        "sai-receipt",
        "Complete payment",
        b.provider ? `via ${b.provider === "paymongo" ? "PayMongo" : capitalize(b.provider)}` : "",
        el("div", { class: "sai-block__body" }, b.amount ? rows([{ label: "Amount", value: peso(b.amount), emphasis: true }]) : null, el("p", { class: "sai-note", text: "You'll finish on the secure payment page. Switch never asks for card numbers, CVV or OTPs in chat." })),
        actionBar(b.actions, card),
      );
    },

    notice(b, card) {
      const tone = ["warning", "error", "success"].includes(b.tone) ? b.tone : "info";
      return el("div", { class: `sai-notice sai-notice--${tone}`, role: tone === "error" ? "alert" : null }, el("div", { class: "sai-notice__body" }, b.text, actionBar(b.actions, card, true)));
    },

    choice_list(b, card) {
      const options = (b.options || []).map((option) => {
        const action = option.kind ? option : option.action;
        if (!action) return null;
        const button = el("button", { type: "button", class: "sai-option" }, el("span", {}, el("span", { class: "sai-option__label", text: option.label || action.label }), option.description ? el("span", { class: "sai-option__desc", text: option.description }) : null));
        button.addEventListener("click", () => handleAction(action, card(), button));
        return button;
      });
      return block("", b.title || "", "", el("div", {}, options), actionBar(b.actions, card));
    },

    seller_metric(b) {
      const metrics = (b.metrics || []).map((m) => {
        const delta = m.delta !== null && m.delta !== undefined && Number.isFinite(Number(m.delta)) ? Number(m.delta) : null;
        return el(
          "div",
          { class: "sai-metric" },
          el("div", { class: "sai-metric__label", text: m.label }),
          el("div", { class: "sai-metric__value", text: m.value }),
          delta !== null ? el("div", { class: `sai-metric__delta ${delta >= 0 ? "is-up" : "is-down"}`, text: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%${b.comparedTo ? ` vs ${b.comparedTo}` : ""}` }) : m.previous ? el("div", { class: "sai-metric__delta", text: `was ${m.previous}` }) : null,
        );
      });
      return block("", b.title || "Metrics", b.period || "", el("div", { class: "sai-metrics" }, metrics), b.footnote ? el("div", { class: "sai-block__body" }, el("p", { class: "sai-note", text: b.footnote })) : null);
    },

    inventory_table(b, card) {
      const hasActions = (b.rows || []).some((row) => (row.actions || []).length);
      const table = el(
        "table",
        { class: "sai-table" },
        el("thead", {}, el("tr", {}, (b.columns || []).map((c) => el("th", { scope: "col", text: c })), hasActions ? el("th", { text: "" }) : null)),
        el("tbody", {}, (b.rows || []).map((row) => el("tr", {}, (row.cells || []).map((c) => el("td", { text: c })), hasActions ? el("td", {}, actionBar(row.actions, card, true)) : null))),
      );
      return block("", b.title || "Table", b.rows?.length ? `${b.rows.length} row${b.rows.length === 1 ? "" : "s"}` : "", el("div", { class: "sai-table-wrap" }, table), actionBar(b.actions, card));
    },

    promotion_draft(b, card) {
      return draftBlock(b, card, b.kind === "voucher" ? "Voucher draft" : b.kind === "flash_deal" ? "Flash Deal draft" : b.kind === "reply" ? "Reply draft" : "Draft");
    },

    listing_draft(b, card) {
      return draftBlock(b, card, "Listing draft");
    },

    earnings_summary(b) {
      const sections = [];
      if ((b.items || []).length) sections.push(rows(b.items));
      if ((b.earnings || []).length) sections.push(el("p", { class: "sai-block__meta", text: "Earnings" }), rows(b.earnings));
      if ((b.cash || []).length) sections.push(el("p", { class: "sai-block__meta", style: "margin-top:10px", text: "COD cash (not your pay)" }), rows(b.cash));
      return block("", "Earnings", b.period || "", el("div", { class: "sai-block__body" }, sections, b.footnote ? el("p", { class: "sai-note", text: b.footnote }) : null));
    },

    conversation_list(b, card) {
      const list = el(
        "ul",
        { class: "sai-list" },
        (b.threads || []).map((thread) =>
          el(
            "li",
            {},
            el("div", { class: "sai-list__top" }, el("span", { text: `${thread.n}. ${thread.customer}` }), thread.needsReply ? el("span", { class: "sai-pill sai-pill--warn", text: "Needs reply" }) : thread.unread ? el("span", { class: "sai-pill sai-pill--accent", text: `${thread.unread} new` }) : null),
            thread.product ? el("p", { class: "sai-list__sub", text: thread.product }) : null,
            thread.lastMessage ? el("p", { class: "sai-list__sub", text: `“${thread.lastMessage}”` }) : null,
            actionBar(thread.actions, card, true),
          ),
        ),
      );
      return block("", "Customer messages", "", list);
    },

    delivery_card(b, card) {
      const lines = [
        { label: "Status", value: b.statusLabel },
        { label: "Pickup", value: [b.pickup?.name, b.pickup?.address || b.pickup?.area].filter(Boolean).join(" · ") },
        { label: "Drop-off", value: [b.dropoff?.name, b.dropoff?.address || b.dropoff?.area].filter(Boolean).join(" · ") },
        b.payment?.method === "COD" ? { label: "Collect (COD)", value: `${peso(b.payment.codAmount)}${b.payment.codCollected ? " ✓" : ""}` } : null,
        b.earning ? { label: "Your earning", value: peso(b.earning) } : null,
      ].filter(Boolean);
      return block("", b.code || "Delivery", b.distanceKm ? `${b.distanceKm} km` : "", el("div", { class: "sai-block__body" }, rows(lines), b.nextStep ? el("p", { class: "sai-note", text: b.nextStep }) : null), actionBar(b.actions, card));
    },
  };

  function draftBlock(b, card, title) {
    const missing = (b.missing || []).map((m) => el("span", { class: "sai-pill sai-pill--warn", text: `Needs ${m}` }));
    return block(
      "",
      title,
      b.status ? capitalize(b.status) : "",
      el("div", { class: "sai-block__body" }, rows(b.fields), b.text ? el("p", { class: "sai-list__sub", text: b.text }) : null, missing.length ? el("div", { class: "sai-pills" }, missing) : null, b.note ? el("p", { class: "sai-note", text: b.note }) : null),
      actionBar(b.actions, card),
    );
  }

  function capitalize(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function renderBlock(b) {
    const render = renderers[b?.type];
    if (!render) return null;
    const ref = { node: null };
    try {
      ref.node = render(b, () => ref.node);
    } catch (error) {
      console.warn("[switch-ai] could not render block", b?.type, error);
      return null;
    }
    return ref.node;
  }

  // --------------------------------------------------------------- messages

  function addMessage(author, text, blocks) {
    const msg = el("div", { class: `sai-msg sai-msg--${author === "user" ? "user" : "assistant"}` });
    if (text) msg.append(el("div", { class: "sai-bubble", text }));
    for (const b of blocks || []) {
      const node = renderBlock(b);
      if (node) msg.append(node);
    }
    state.log.append(msg);
    state.log.scrollTop = state.log.scrollHeight;
    return msg;
  }

  function showTyping() {
    const node = el("div", { class: "sai-msg", "aria-label": "Assistant is typing" }, el("div", { class: "sai-bubble sai-typing" }, el("span"), el("span"), el("span")));
    state.log.append(node);
    state.log.scrollTop = state.log.scrollHeight;
    return node;
  }

  function setSuggestions(list) {
    state.suggest.replaceChildren(
      ...(Array.isArray(list) ? list : []).slice(0, 6).map((text) => {
        const chip = el("button", { type: "button", class: "sai-chip", text });
        chip.addEventListener("click", () => sendMessage(text));
        return chip;
      }),
    );
  }

  function setBusy(busy) {
    state.busy = busy;
    state.root.classList.toggle("is-busy", busy);
    state.fab.classList.toggle("is-thinking", busy);
    state.send.disabled = busy || !state.enabled;
  }

  function applyResponse(data) {
    addMessage("assistant", data.message, data.blocks);
    if (data.suggestions) setSuggestions(data.suggestions);
    if (data.clientEffects) {
      window.dispatchEvent(new CustomEvent("switch-ai-client-effects", { detail: data.clientEffects }));
    }
  }

  async function request(fn) {
    if (state.busy) return;
    setBusy(true);
    const typing = showTyping();
    try {
      applyResponse(await fn());
    } catch (error) {
      if (error.status === 401) {
        addMessage("assistant", "", [{ type: "notice", tone: "warning", text: ROLE === "seller" ? "Your session ended. Please sign in to your seller account again." : "Please sign in to use the Switch assistant." }]);
      } else if (error.status === 403 && error.code === "AI_ASSISTANT_DISABLED") {
        state.enabled = false;
        addMessage("assistant", "", [{ type: "notice", tone: "warning", text: error.message }]);
      } else {
        addMessage("assistant", "", [{ type: "notice", tone: "error", text: error.message || "Something went wrong. Please try again." }]);
      }
    } finally {
      typing.remove();
      setBusy(false);
    }
  }

  function sendMessage(text) {
    const message = String(text || "").trim().slice(0, 1000);
    if (!message || state.busy || !state.enabled) return;
    addMessage("user", message);
    state.input.value = "";
    autosize();
    return request(() => api("POST", "/chat", { message, context: pageContext() }));
  }

  function runTool(tool, args) {
    if (!tool) return;
    return request(() => api("POST", "/actions", { tool, args, context: pageContext() }));
  }

  function confirmToken(token, { inputs, cancel } = {}, cardNode) {
    if (!token) return;
    markDone(cardNode, cancel ? "Cancelled" : "Sent");
    cardNode?.querySelector("[data-sai-inputs]")?.remove();
    return request(() => api("POST", "/confirm", { token, inputs: inputs || undefined, cancel: cancel === true }));
  }

  function autosize() {
    const input = state.input;
    input.style.height = "auto";
    if (input.value) input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  // ------------------------------------------------------------------ shell

  function buildPanel() {
    if (state.built) return;
    state.built = true;
    const closeBtn = el("button", { type: "button", class: "sai-icon-btn", "aria-label": "Close assistant" }, svg("M6 6l12 12M18 6L6 18"));
    closeBtn.addEventListener("click", close);
    const resetBtn = el("button", { type: "button", class: "sai-icon-btn", "aria-label": "Start a new chat", title: "New chat" }, svg("M3 12a9 9 0 1 0 3-6.7M3 4v5h5"));
    resetBtn.addEventListener("click", resetChat);

    state.log = el("div", { class: "sai-log", role: "log", "aria-live": "polite" });
    state.suggest = el("div", { class: "sai-suggest" });
    state.input = el("textarea", { class: "sai-input", rows: "1", maxlength: "1000", placeholder: PLACEHOLDERS[ROLE], "aria-label": "Message the assistant" });
    state.send = el("button", { type: "submit", class: "sai-send", "aria-label": "Send" }, svg("M5 12h14M13 6l6 6-6 6"));
    const form = el("form", { class: "sai-compose" }, state.input, state.send);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(state.input.value);
    });
    state.input.addEventListener("input", autosize);
    state.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        sendMessage(state.input.value);
      }
    });

    state.panel = el(
      "aside",
      { class: "sai-panel", role: "dialog", "aria-modal": "false", "aria-labelledby": "sai-title" },
      el("div", { class: "sai-handle", "aria-hidden": "true" }),
      el("header", { class: "sai-head" }, el("span", { class: "sai-orb", "aria-hidden": "true" }), el("div", { class: "sai-head__text" }, el("h2", { class: "sai-title", id: "sai-title", text: NAMES[ROLE] }), el("p", { class: "sai-sub", text: SUBTITLES[ROLE] })), resetBtn, closeBtn),
      state.log,
      state.suggest,
      form,
      el("p", { class: "sai-foot", text: "Never share card numbers, CVV, OTPs or passwords here." }),
    );
    const scrim = el("div", { class: "sai-scrim", "aria-hidden": "true" });
    scrim.addEventListener("click", close);
    state.root.append(scrim, state.panel);
    state.panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  async function loadSession() {
    if (state.loaded) return;
    state.loaded = true;
    const context = pageContext();
    const query = new URLSearchParams({ page: context.page || "", productId: context.productId || "" });
    try {
      const data = await api("GET", `/session?${query}`);
      if (data.assistant?.role && data.assistant.role !== ROLE) {
        state.enabled = false;
        state.log.append(el("div", { class: "sai-empty" }, el("strong", { text: "Different account" }), ROLE === "seller" ? "You're signed in as a shopper in this browser. Sign in to your seller account to use Switch Seller AI." : "You're signed in to a seller account in this browser. Sign in as a shopper to use Switch Shopping AI."));
        setBusy(false);
        return;
      }
      state.enabled = data.enabled !== false;
      const history = Array.isArray(data.messages) ? data.messages : [];
      if (!state.enabled) {
        state.log.append(el("div", { class: "sai-empty" }, el("strong", { text: "Assistant unavailable" }), data.reason || "The assistant is turned off right now."));
      } else if (!history.length) {
        addMessage("assistant", data.greeting || `Hi! I'm ${NAMES[ROLE]}.`);
      } else {
        for (const entry of history) addMessage(entry.author, entry.text, entry.blocks);
      }
      setSuggestions(data.suggestions);
    } catch (error) {
      state.loaded = false;
      const text = error.status === 401 ? "Please sign in to use the assistant." : error.message;
      state.log.append(el("div", { class: "sai-empty" }, el("strong", { text: "Couldn't start the assistant" }), text));
    }
    setBusy(false);
  }

  async function resetChat() {
    if (state.busy) return;
    try {
      await api("DELETE", "/session");
    } catch (_) {}
    state.log.replaceChildren();
    state.loaded = false;
    state.enabled = true;
    loadSession();
  }

  function open() {
    buildPanel();
    state.lastFocus = document.activeElement;
    state.root.classList.add("is-open");
    state.fab.setAttribute("aria-expanded", "true");
    loadSession();
    window.setTimeout(() => state.input?.focus({ preventScroll: true }), 260);
  }

  function close() {
    if (!state.root.classList.contains("is-open")) return;
    state.root.classList.remove("is-open");
    state.fab.setAttribute("aria-expanded", "false");
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus({ preventScroll: true });
    else state.fab.focus({ preventScroll: true });
  }

  function toggle() {
    if (state.root.classList.contains("is-open")) close();
    else open();
  }

  function syncVisibility() {
    const visible = isSignedIn();
    state.root.hidden = !visible;
    if (!visible) {
      close();
      state.loaded = false;
      state.log?.replaceChildren();
    }
  }

  function mount() {
    state.root = el("div", { class: "sai-root" });
    state.fab = el("button", { type: "button", class: "sai-fab", "aria-label": `Open ${NAMES[ROLE]}`, "aria-expanded": "false", title: NAMES[ROLE] }, el("span", { class: "sai-fab__glyph", "aria-hidden": "true" }), el("span", { class: "sai-fab__label", text: "Ask Switch AI" }));
    state.fab.addEventListener("click", toggle);
    state.root.append(state.fab);
    document.body.append(state.root);
    syncVisibility();
    window.addEventListener("gms-buyer-session-updated", syncVisibility);
    window.addEventListener("storage", (event) => {
      if (!event.key || /gms-(buyer|admin|employee)-session|gms-buyer-guest/.test(event.key)) syncVisibility();
    });
  }

  window.SwitchAiAssistant = { open, close, toggle, send: (text) => (open(), sendMessage(text)) };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();

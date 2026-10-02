"use strict";

const {
  RISK,
  money,
  peso,
  cleanText,
  toInt,
  toolError,
  ok,
  toolAction,
  promptAction,
  notice,
  callApi,
  dayBounds,
  formatDateTime,
  percentChange,
} = require("./common");
const { productStock, productVariants, productCategories, productImage } = require("./catalog");

const TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";
const LOW_STOCK_THRESHOLD = 5;
const MAX_FLASH_HOURS = 72;
const SALE_EXCLUDED_STAGES = new Set(["cancelled", "toPay"]);
const ORDER_STATUS_STAGES = Object.freeze({
  pending: ["awaitingWaybill", "toPrepare"],
  to_pay: ["toPay"],
  processing: ["toPrepare"],
  ready_for_pickup: ["toShip"],
  shipped: ["toReceive"],
  completed: ["toReview", "completed"],
  cancelled: ["cancelled"],
  returned: ["returnRequest"],
});
const STAGE_LABELS = Object.freeze({
  toPay: "Awaiting payment",
  awaitingWaybill: "Awaiting waybill",
  toPrepare: "To prepare",
  toShip: "Ready for pickup",
  toReceive: "Shipped",
  toReview: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  returnRequest: "Return requested",
});
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function manilaDateParts(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdayIndex };
}

function addDays(dateText, days) {
  const base = new Date(`${dateText}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function resolveDay(day, nowMs) {
  const today = manilaDateParts(nowMs);
  if (!day) return null;
  if (day.date && /^\d{4}-\d{2}-\d{2}$/.test(day.date)) return day.date;
  if (Number.isInteger(day.relative)) return addDays(today.date, day.relative);
  if (Number.isInteger(day.weekday)) {
    let delta = (day.weekday - today.weekday + 7) % 7;
    if (delta === 0) delta = 7;
    return addDays(today.date, delta);
  }
  return null;
}

function manilaIso(dateText, time) {
  const hh = String(time.hour).padStart(2, "0");
  const mm = String(time.minute || 0).padStart(2, "0");
  return new Date(`${dateText}T${hh}:${mm}:00${MANILA_OFFSET}`).toISOString();
}

function periodWindow(period, nowMs) {
  const today = dayBounds(0, nowMs, TIME_ZONE);
  switch (period) {
    case "yesterday": {
      const bounds = dayBounds(-1, nowMs, TIME_ZONE);
      return { ...bounds, label: "Yesterday" };
    }
    case "week":
      return { start: dayBounds(-6, nowMs, TIME_ZONE).start, end: today.end, label: "Last 7 days" };
    case "month": {
      const { date } = manilaDateParts(nowMs);
      const start = new Date(`${date.slice(0, 8)}01T00:00:00${MANILA_OFFSET}`).getTime();
      return { start, end: today.end, label: "This month" };
    }
    default:
      return { ...today, label: "Today" };
  }
}

function previousWindow(window, compareTo, nowMs) {
  if (compareTo === "yesterday") return { ...dayBounds(-1, nowMs, TIME_ZONE), label: "Yesterday" };
  const span = window.end - window.start;
  return { start: window.start - span, end: window.start, label: compareTo === "previous_week" ? "Previous 7 days" : "Previous period" };
}

function lineRevenue(entry) {
  return money((Number(entry?.unitPrice) || 0) * Math.max(1, toInt(entry?.quantity, 1)));
}

function groupKey(entry) {
  return String(entry?.orderGroupId || `${entry?.adminId || ""}|${entry?.createdAtEpochMs || ""}`);
}

function summarizeSales(entries, window) {
  const inWindow = entries.filter((entry) => {
    const at = toInt(entry.createdAtEpochMs, 0);
    return at >= window.start && at < window.end;
  });
  const counted = inWindow.filter((entry) => !SALE_EXCLUDED_STAGES.has(String(entry.stage || "")));
  const groups = new Set(counted.map(groupKey));
  const sales = money(counted.reduce((sum, entry) => sum + lineRevenue(entry), 0));
  const items = counted.reduce((sum, entry) => sum + Math.max(1, toInt(entry.quantity, 1)), 0);
  const unpaidGroups = new Set(inWindow.filter((entry) => entry.stage === "toPay").map(groupKey));
  const cancelledGroups = new Set(inWindow.filter((entry) => entry.stage === "cancelled").map(groupKey));
  return {
    label: window.label,
    sales,
    orders: groups.size,
    items,
    averageOrderValue: groups.size ? money(sales / groups.size) : 0,
    unpaidOrders: unpaidGroups.size,
    cancelledOrders: cancelledGroups.size,
  };
}

function unitsSoldSince(entries, sinceMs) {
  const byProduct = new Map();
  for (const entry of entries) {
    if (SALE_EXCLUDED_STAGES.has(String(entry.stage || ""))) continue;
    if (toInt(entry.createdAtEpochMs, 0) < sinceMs) continue;
    const id = String(entry.productId || "");
    if (!id) continue;
    const current = byProduct.get(id) || { units: 0, revenue: 0, name: cleanText(entry.productName, 120) };
    current.units += Math.max(1, toInt(entry.quantity, 1));
    current.revenue = money(current.revenue + lineRevenue(entry));
    byProduct.set(id, current);
  }
  return byProduct;
}

function sellingPrice(product) {
  const original = Number(product?.originalPrice) || 0;
  const sale = Number(product?.salesPrice);
  return Number.isFinite(sale) && sale > 0 && sale < original ? money(sale) : money(original);
}

function approvalLabel(product) {
  const status = String(product?.approvalStatus || "").toLowerCase();
  if (status === "approved") return product?.isActive === false ? "Hidden" : "Live";
  if (status === "pending") return "In review";
  if (status === "rejected") return "Rejected";
  if (status === "revision" || status === "needs_revision") return "Needs revision";
  return cleanText(product?.approvalStatus, 30) || "Draft";
}

function describeTime(time) {
  const hour12 = ((time.hour + 11) % 12) + 1;
  return `${hour12}${time.minute ? `:${String(time.minute).padStart(2, "0")}` : ""}${time.hour < 12 ? "AM" : "PM"}`;
}

function generateVoucherCode(value, isPercent) {
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${isPercent ? "SAVE" : "LESS"}${Math.round(value)}${suffix}`.slice(0, 16);
}

function createSellerTools(deps) {
  const { readOrders, now = () => Date.now() } = deps;

  // --------------------------------------------------------------- helpers

  async function loadOrders(ctx) {
    const adminId = ctx.session.adminId;
    const entries = await readOrders({ adminId });
    return (Array.isArray(entries) ? entries : []).filter(
      (entry) => String(entry?.adminId ?? "").trim().toLowerCase() === adminId.toLowerCase(),
    );
  }

  async function loadProducts(ctx) {
    const body = await callApi(ctx, "GET", "/api/products");
    const adminId = ctx.session.adminId.toLowerCase();
    return (Array.isArray(body.products) ? body.products : []).filter(
      (product) => product && product.id && String(product.adminId ?? "").trim().toLowerCase() === adminId,
    );
  }

  function assertCanAct(ctx) {
    if (!ctx.flags.aiSellerActions) {
      throw toolError("Seller actions through the assistant are turned off right now. You can still do this from the dashboard.", {
        status: 403,
        code: "AI_SELLER_ACTIONS_DISABLED",
      });
    }
  }

  function rememberProducts(ctx, products) {
    ctx.state.shownSellerProducts = products.slice(0, 15).map((product) => ({ id: String(product.id), name: cleanText(product.name, 120) }));
  }

  async function resolveOwnProduct(ctx, args = {}, products = null) {
    const list = products || (await loadProducts(ctx));
    const productId = cleanText(args.productId, 120);
    if (productId) {
      const product = list.find((entry) => String(entry.id) === productId);
      if (!product) throw toolError("That product isn't in your store.", { status: 404, code: "AI_PRODUCT_NOT_FOUND" });
      return product;
    }
    const ordinal = toInt(args.ordinal, 0);
    if (ordinal) {
      const shown = Array.isArray(ctx.state.shownSellerProducts) ? ctx.state.shownSellerProducts : [];
      const ref = ordinal === -1 ? shown[shown.length - 1] : shown[ordinal - 1];
      const product = ref ? list.find((entry) => String(entry.id) === ref.id) : null;
      if (!product) throw toolError(shown.length ? `Pick a number from 1 to ${shown.length}.` : "Which product? Tell me its name.", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
      return product;
    }
    const ref = cleanText(args.productRef || args.productName, 80).toLowerCase();
    if (!ref) {
      throw toolError("Which product? Tell me its name (for example, \"Product A\").", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
    }
    const names = [ref, ...(ref.length < 3 ? [`product ${ref}`] : [])];
    const exact = list.filter((product) => names.includes(String(product.name || "").trim().toLowerCase()));
    if (exact.length === 1) return exact[0];
    const partial = list.filter((product) => names.some((name) => String(product.name || "").toLowerCase().includes(name)));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) {
      rememberProducts(ctx, partial);
      throw toolError(
        `I found ${partial.length} products matching "${ref}": ${partial.slice(0, 5).map((product, index) => `${index + 1}. ${cleanText(product.name, 60)}`).join(", ")}. Which one?`,
        { status: 422, code: "AI_NEEDS_CLARIFICATION" },
      );
    }
    throw toolError(`I couldn't find a product named "${ref}" in your store.`, { status: 404, code: "AI_PRODUCT_NOT_FOUND" });
  }

  function orderGroups(entries) {
    const groups = new Map();
    for (const entry of entries) {
      const key = groupKey(entry);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    return [...groups.values()]
      .map((list) => ({
        orderGroupId: String(list[0].orderGroupId || list[0].createdAtEpochMs || ""),
        createdAtEpochMs: toInt(list[0].createdAtEpochMs, 0),
        stage: String(list[0].stage || ""),
        buyer: cleanText(list[0].clientName, 60),
        items: list.map((entry) => `${cleanText(entry.productName, 60)}${entry.variantName ? ` (${cleanText(entry.variantName, 30)})` : ""} × ${Math.max(1, toInt(entry.quantity, 1))}`),
        revenue: money(list.reduce((sum, entry) => sum + lineRevenue(entry), 0)),
        payment: cleanText(list[0].paymentOptionLabel, 30),
        delivery: cleanText(list[0].deliveryPartnerName, 40),
        cancelRequestStatus: String(list[0].cancelRequestStatus || ""),
      }))
      .sort((a, b) => b.createdAtEpochMs - a.createdAtEpochMs);
  }

  function metricBlock(title, summary, previous) {
    const delta = (key) => (previous ? percentChange(summary[key], previous[key]) : undefined);
    return {
      type: "seller_metric",
      title,
      period: summary.label,
      comparedTo: previous ? previous.label : null,
      metrics: [
        { label: "Sales", value: peso(summary.sales), raw: summary.sales, delta: delta("sales"), previous: previous ? peso(previous.sales) : null },
        { label: "Orders", value: String(summary.orders), raw: summary.orders, delta: delta("orders"), previous: previous ? String(previous.orders) : null },
        { label: "Items sold", value: String(summary.items), raw: summary.items, delta: delta("items"), previous: previous ? String(previous.items) : null },
        { label: "Avg. order value", value: peso(summary.averageOrderValue), raw: summary.averageOrderValue, delta: delta("averageOrderValue") },
      ],
      footnote: "Sales = paid or COD-confirmed orders placed in the period (excludes cancelled and unpaid orders), merchandise value before fees.",
    };
  }

  function inventoryRows(products, sold7, sold30) {
    return products.map((product) => {
      const stock = productStock(product);
      const units7 = sold7.get(String(product.id))?.units || 0;
      const units30 = sold30.get(String(product.id))?.units || 0;
      const dailyRate = units30 / 30;
      return {
        productId: String(product.id),
        name: cleanText(product.name, 100),
        imageUrl: productImage(product),
        stock,
        sold7: units7,
        sold30: units30,
        daysOfCover: dailyRate > 0 ? Math.floor(stock / dailyRate) : null,
        price: sellingPrice(product),
        status: approvalLabel(product),
        hasVariants: productVariants(product).length > 0,
      };
    });
  }

  function inventoryTable(title, rows, { showCover = true } = {}) {
    return {
      type: "inventory_table",
      title,
      columns: ["Product", "Stock", "Sold (7d)", "Sold (30d)", ...(showCover ? ["Days of stock"] : []), "Status"],
      rows: rows.map((row, index) => ({
        n: index + 1,
        productId: row.productId,
        cells: [row.name, String(row.stock), String(row.sold7), String(row.sold30), ...(showCover ? [row.daysOfCover === null ? "—" : String(row.daysOfCover)] : []), row.status],
        actions: [promptAction("Update stock", `Update stock of "${row.name}" to `)],
      })),
    };
  }

  function draftBlock(draft) {
    const fields = [];
    const missing = [];
    if (draft.type === "flash_deal") {
      fields.push({ label: "Product", value: draft.productName || "—" });
      if (draft.regularPrice) fields.push({ label: "Regular price", value: peso(draft.regularPrice) });
      fields.push({ label: "Flash price", value: draft.flashPrice ? `${peso(draft.flashPrice)}${draft.discountPercent ? ` (${draft.discountPercent}% off)` : ""}` : "—" });
      fields.push({ label: "Schedule", value: draft.startsAt ? `${formatDateTime(Date.parse(draft.startsAt))} – ${formatDateTime(Date.parse(draft.endsAt))}` : "—" });
      fields.push({ label: "Deal stock", value: draft.dealStock ? `${draft.dealStock} units` : "—" });
      fields.push({ label: "Per buyer limit", value: String(draft.perBuyerLimit || 1) });
      if (!draft.productId) missing.push("product");
      if (!draft.flashPrice) missing.push("discount");
      if (!draft.startsAt) missing.push(draft.date ? "time" : "day and time");
      if (!draft.dealStock) missing.push("number of units");
    } else if (draft.type === "voucher") {
      fields.push({ label: "Title", value: draft.title });
      fields.push({ label: "Code", value: draft.code });
      fields.push({ label: "Discount", value: draft.freeShipping && !draft.discountValue ? "Free shipping" : draft.discountType === "percent" ? `${draft.discountValue}% off` : `${peso(draft.discountValue)} off` });
      fields.push({ label: "Minimum spend", value: draft.minimumSpend ? peso(draft.minimumSpend) : "None" });
      fields.push({ label: "Uses per buyer", value: String(draft.usesPerAccount || 1) });
      fields.push({ label: "Valid until", value: draft.expiresOn || "—" });
      if (!draft.discountValue && !draft.freeShipping) missing.push("discount");
    } else if (draft.type === "listing") {
      fields.push({ label: "Title", value: draft.title || "—" });
      fields.push({ label: "Category", value: draft.category || "—" });
      fields.push({ label: "Price", value: draft.price ? peso(draft.price) : "—" });
      fields.push({ label: "Stock", value: draft.stock ? String(draft.stock) : "—" });
      fields.push({ label: "Description", value: draft.description || "—" });
      if (!draft.title) missing.push("title");
      if (!draft.category) missing.push("category");
      if (!draft.price) missing.push("price");
      if (!draft.description) missing.push("description");
    }
    const publishTool = { flash_deal: "publish_flash_deal", voucher: "publish_voucher", listing: "publish_listing_draft" }[draft.type];
    const publishLabel = { flash_deal: "Publish Flash Deal", voucher: "Publish voucher", listing: "Submit for review" }[draft.type];
    return {
      block: {
        type: draft.type === "listing" ? "listing_draft" : "promotion_draft",
        kind: draft.type,
        status: "draft",
        fields,
        missing,
        note: draft.type === "listing" ? "Drafts are never published automatically. New listings go to Super Admin review." : "Nothing is published until you confirm.",
        actions: [
          ...(missing.length ? [] : [toolAction(publishLabel, publishTool, {}, "primary")]),
          toolAction("Discard draft", "discard_draft", {}),
        ],
      },
      missing,
    };
  }

  function draftResult(ctx, draft, lead = "") {
    ctx.state.promotionDraft = draft;
    const { block, missing } = draftBlock(draft);
    const questions = {
      product: "Which product is this for?",
      discount: draft.type === "flash_deal" ? "What discount or flash price?" : "How much is the discount?",
      "day and time": "What day and time should it run (e.g. tomorrow 2PM–6PM)?",
      time: "What time should it run (e.g. 2PM–6PM)?",
      "number of units": "How many units should be included in the deal?",
      title: "What's the product title?",
      category: "Which category should it go under?",
      price: "What's the selling price?",
      description: "Please give a short description (e.g. \"description: 100% cotton, unisex fit\").",
    };
    const ask = missing.map((key) => questions[key]).filter(Boolean);
    return ok({
      message: [lead, ask.length ? ask.join(" ") : "Everything's filled in. Review the draft and publish when ready."].filter(Boolean).join(" "),
      blocks: [block],
      data: { draft: { ...draft }, missing },
      events: ["seller_draft_created"],
    });
  }

  // -------------------------------------------------------------- tool list

  const tools = [
    {
      name: "seller_sales_summary",
      risk: RISK.LOW,
      description: "Sales, orders and items sold for today | yesterday | week | month, optionally compared to yesterday | previous_week | previous_month.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "yesterday", "week", "month"] },
          compareTo: { type: "string", enum: ["", "yesterday", "previous_week", "previous_month"] },
        },
      },
      async run(ctx, args = {}) {
        const entries = await loadOrders(ctx);
        const period = ["today", "yesterday", "week", "month"].includes(args.period) ? args.period : "today";
        const window = periodWindow(period, now());
        const summary = summarizeSales(entries, window);
        const previous = args.compareTo ? summarizeSales(entries, previousWindow(window, args.compareTo, now())) : null;
        let message = `${summary.label}: ${peso(summary.sales)} in sales from ${summary.orders} order${summary.orders === 1 ? "" : "s"} (${summary.items} item${summary.items === 1 ? "" : "s"}).`;
        if (previous) {
          const change = percentChange(summary.sales, previous.sales);
          message += ` ${previous.label}: ${peso(previous.sales)}${change === null ? "" : ` — ${change >= 0 ? "up" : "down"} ${Math.abs(change)}%`}.`;
        }
        if (summary.unpaidOrders) message += ` ${summary.unpaidOrders} more order${summary.unpaidOrders === 1 ? " is" : "s are"} awaiting payment.`;
        return ok({
          message,
          blocks: [metricBlock("Sales", summary, previous)],
          data: { current: summary, previous },
          suggestions: ["Top products this month", "Low stock items", "Pending orders"],
        });
      },
    },
    {
      name: "seller_orders",
      risk: RISK.LOW,
      description: "List store orders by status: pending | to_pay | processing | ready_for_pickup | shipped | completed | cancelled | returned | all.",
      parameters: { type: "object", properties: { status: { type: "string" } } },
      async run(ctx, args = {}) {
        const entries = await loadOrders(ctx);
        const status = cleanText(args.status, 30) || "all";
        const stages = ORDER_STATUS_STAGES[status];
        const groups = orderGroups(stages ? entries.filter((entry) => stages.includes(String(entry.stage || ""))) : entries);
        const cancelRequests = orderGroups(entries).filter((group) => group.cancelRequestStatus === "pending").length;
        const top = groups.slice(0, 10);
        const label = status === "all" ? "" : `${status.replace(/_/g, " ")} `;
        return ok({
          message: groups.length
            ? `You have ${groups.length} ${label}order${groups.length === 1 ? "" : "s"}${groups.length > top.length ? ` (showing the latest ${top.length})` : ""}.${cancelRequests ? ` ${cancelRequests} cancellation request${cancelRequests === 1 ? " needs" : "s need"} your decision.` : ""}`
            : `You have no ${label}orders.`,
          blocks: top.length
            ? [
                {
                  type: "inventory_table",
                  title: `${label ? label[0].toUpperCase() + label.slice(1) : ""}Orders`.trim(),
                  columns: ["Order", "Buyer", "Items", "Amount", "Status", "Placed"],
                  rows: top.map((group, index) => ({
                    n: index + 1,
                    cells: [
                      `#${group.orderGroupId.slice(-8).toUpperCase()}`,
                      group.buyer || "—",
                      group.items.join(", "),
                      peso(group.revenue),
                      `${STAGE_LABELS[group.stage] || group.stage}${group.cancelRequestStatus === "pending" ? " · cancel requested" : ""}`,
                      formatDateTime(group.createdAtEpochMs),
                    ],
                  })),
                  actions: [{ label: "Open orders", kind: "navigate", target: "orders", style: "secondary" }],
                },
              ]
            : [],
          data: { total: groups.length, orders: top.map((group) => ({ ref: group.orderGroupId.slice(-8), status: STAGE_LABELS[group.stage] || group.stage, amount: group.revenue, items: group.items.length })) },
        });
      },
    },
    {
      name: "seller_products",
      risk: RISK.LOW,
      description: "List the store's products (optionally filtered by name) with price, stock and review status.",
      parameters: { type: "object", properties: { query: { type: "string" } } },
      async run(ctx, args = {}) {
        const products = await loadProducts(ctx);
        const query = cleanText(args.query, 80).toLowerCase();
        const filtered = query ? products.filter((product) => String(product.name || "").toLowerCase().includes(query)) : products;
        const top = filtered.slice(0, 15);
        rememberProducts(ctx, top);
        return ok({
          message: filtered.length ? `You have ${filtered.length} product${filtered.length === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}.` : "No products found.",
          blocks: top.length
            ? [
                {
                  type: "inventory_table",
                  title: "Products",
                  columns: ["Product", "Price", "Stock", "Status"],
                  rows: top.map((product, index) => ({
                    n: index + 1,
                    productId: String(product.id),
                    cells: [cleanText(product.name, 80), peso(sellingPrice(product)), String(productStock(product)), approvalLabel(product)],
                  })),
                },
              ]
            : [],
          data: { total: filtered.length, products: top.map((product, index) => ({ n: index + 1, id: String(product.id), name: product.name, price: sellingPrice(product), stock: productStock(product), status: approvalLabel(product) })) },
        });
      },
    },
    {
      name: "seller_inventory",
      risk: RISK.LOW,
      description: "Inventory overview with units sold. view: all | slow_moving | fast_moving.",
      parameters: { type: "object", properties: { view: { type: "string", enum: ["all", "slow_moving", "fast_moving"] } } },
      async run(ctx, args = {}) {
        const [products, entries] = await Promise.all([loadProducts(ctx), loadOrders(ctx)]);
        const sold7 = unitsSoldSince(entries, now() - 7 * 86400000);
        const sold30 = unitsSoldSince(entries, now() - 30 * 86400000);
        let rows = inventoryRows(products.filter((product) => String(product.approvalStatus || "").toLowerCase() === "approved"), sold7, sold30);
        const view = args.view || "all";
        let title = "Inventory";
        let message;
        if (view === "slow_moving") {
          rows = rows.filter((row) => row.stock > 0 && row.sold30 === 0).sort((a, b) => b.stock - a.stock);
          title = "Slow-moving (no sales in 30 days)";
          message = rows.length
            ? `${rows.length} product${rows.length === 1 ? " has" : "s have"} stock but no sales in the last 30 days.`
            : "Every in-stock product had at least one sale in the last 30 days.";
        } else if (view === "fast_moving") {
          rows = rows.filter((row) => row.sold7 > 0).sort((a, b) => b.sold7 - a.sold7);
          title = "Fast-moving (last 7 days)";
          message = rows.length ? `Your fastest mover this week is ${rows[0].name} (${rows[0].sold7} sold).` : "No units sold in the last 7 days.";
        } else {
          rows.sort((a, b) => a.stock - b.stock);
          const out = rows.filter((row) => row.stock <= 0).length;
          const low = rows.filter((row) => row.stock > 0 && row.stock <= LOW_STOCK_THRESHOLD).length;
          message = `${rows.length} live product${rows.length === 1 ? "" : "s"}: ${out} out of stock, ${low} low on stock (≤${LOW_STOCK_THRESHOLD}).`;
        }
        const top = rows.slice(0, 15);
        ctx.state.shownSellerProducts = top.map((row) => ({ id: row.productId, name: row.name }));
        return ok({
          message,
          blocks: top.length ? [inventoryTable(title, top)] : [],
          data: { view, rows: top.map((row, index) => ({ n: index + 1, name: row.name, stock: row.stock, sold7: row.sold7, sold30: row.sold30, daysOfCover: row.daysOfCover })) },
        });
      },
    },
    {
      name: "seller_low_stock",
      risk: RISK.LOW,
      description: "Products that are out of stock or at/below the low-stock threshold, with restock suggestions from real sales.",
      parameters: { type: "object", properties: { includeOutOfStock: { type: "boolean" } } },
      async run(ctx) {
        const [products, entries] = await Promise.all([loadProducts(ctx), loadOrders(ctx)]);
        const sold7 = unitsSoldSince(entries, now() - 7 * 86400000);
        const sold30 = unitsSoldSince(entries, now() - 30 * 86400000);
        const rows = inventoryRows(products.filter((product) => String(product.approvalStatus || "").toLowerCase() === "approved"), sold7, sold30)
          .filter((row) => row.stock <= LOW_STOCK_THRESHOLD)
          .sort((a, b) => a.stock - b.stock || b.sold7 - a.sold7);
        const top = rows.slice(0, 15);
        ctx.state.shownSellerProducts = top.map((row) => ({ id: row.productId, name: row.name }));
        if (!rows.length) return ok({ message: `No live products are at or below ${LOW_STOCK_THRESHOLD} units. 👍`, data: { lowStock: 0 } });
        const urgent = rows.filter((row) => row.sold7 > 0);
        const suggestions = urgent.slice(0, 3).map((row) => {
          const weekly = row.sold7;
          const suggested = Math.max(weekly * 2 - row.stock, LOW_STOCK_THRESHOLD);
          return `${row.name}: ${row.stock} left, ${weekly} sold in 7 days — consider restocking about ${suggested} units (≈2 weeks of sales).`;
        });
        return ok({
          message: `${rows.length} product${rows.length === 1 ? " is" : "s are"} low or out of stock.${suggestions.length ? `\nSuggestion (based on the last 7 days of sales):\n• ${suggestions.join("\n• ")}` : ""}`,
          blocks: [inventoryTable("Low stock", top)],
          data: {
            lowStock: rows.length,
            rows: top.map((row) => ({ name: row.name, stock: row.stock, sold7: row.sold7 })),
            suggestions,
          },
        });
      },
    },
    {
      name: "seller_top_products",
      risk: RISK.LOW,
      description: "Best-selling products by units and revenue for today | week | month.",
      parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "yesterday", "week", "month"] } } },
      async run(ctx, args = {}) {
        const entries = await loadOrders(ctx);
        const window = periodWindow(args.period || "month", now());
        const inWindow = entries.filter((entry) => toInt(entry.createdAtEpochMs, 0) >= window.start && toInt(entry.createdAtEpochMs, 0) < window.end);
        const byProduct = unitsSoldSince(inWindow, window.start);
        const ranked = [...byProduct.entries()].map(([productId, value]) => ({ productId, ...value })).sort((a, b) => b.units - a.units || b.revenue - a.revenue);
        const top = ranked.slice(0, 10);
        ctx.state.shownSellerProducts = top.map((row) => ({ id: row.productId, name: row.name }));
        if (!top.length) return ok({ message: `No sales ${window.label.toLowerCase()} yet.`, data: { top: [] } });
        return ok({
          message: `Your best seller (${window.label.toLowerCase()}) is ${top[0].name}: ${top[0].units} sold, ${peso(top[0].revenue)}.`,
          blocks: [
            {
              type: "inventory_table",
              title: `Top products · ${window.label}`,
              columns: ["#", "Product", "Units", "Revenue"],
              rows: top.map((row, index) => ({ n: index + 1, productId: row.productId, cells: [String(index + 1), row.name, String(row.units), peso(row.revenue)] })),
            },
          ],
          data: { period: window.label, top: top.map((row) => ({ name: row.name, units: row.units, revenue: row.revenue })) },
        });
      },
    },
    {
      name: "seller_product_analytics",
      risk: RISK.LOW,
      description: "Store analytics funnel (views, add-to-carts, checkouts, orders) and top viewed products, if tracked.",
      parameters: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 90 } } },
      async run(ctx, args = {}) {
        const days = Math.max(1, Math.min(90, toInt(args.days, 30) || 30));
        const body = await callApi(ctx, "GET", "/api/analytics/summary", { query: { days: String(days) } });
        const summary = body.summary || {};
        const totals = summary.totals || {};
        const funnel = summary.funnel || {};
        const views = Number(totals.views ?? funnel.views ?? 0) || 0;
        const carts = Number(totals.addToCarts ?? funnel.addToCarts ?? 0) || 0;
        const orders = Number(totals.orders ?? funnel.orders ?? 0) || 0;
        if (!views && !carts && !orders) {
          return ok({ message: `There's no tracked analytics data for the last ${days} day${days === 1 ? "" : "s"} yet.`, data: { tracked: false } });
        }
        const topProducts = (Array.isArray(summary.topProducts) ? summary.topProducts : []).slice(0, 8);
        const conversion = views ? Math.round((orders / views) * 1000) / 10 : null;
        return ok({
          message: `Last ${days} days: ${views} product views, ${carts} add-to-carts, ${orders} orders${conversion !== null ? ` (${conversion}% view-to-order)` : ""}.`,
          blocks: [
            {
              type: "seller_metric",
              title: "Store analytics",
              period: `Last ${days} days`,
              metrics: [
                { label: "Views", value: String(views) },
                { label: "Add to cart", value: String(carts) },
                { label: "Orders", value: String(orders) },
                ...(conversion !== null ? [{ label: "View → order", value: `${conversion}%` }] : []),
              ],
            },
            ...(topProducts.length
              ? [
                  {
                    type: "inventory_table",
                    title: "Top products by views",
                    columns: ["Product", "Views", "Add to cart", "Orders"],
                    rows: topProducts.map((row, index) => ({
                      n: index + 1,
                      productId: String(row.productId || ""),
                      cells: [cleanText(row.productName || row.name || row.productId, 80), String(row.views || 0), String(row.addToCarts || 0), String(row.orders || 0)],
                    })),
                  },
                ]
              : []),
          ],
          data: { days, views, addToCarts: carts, orders, conversion, topProducts: topProducts.map((row) => ({ id: row.productId, name: row.productName || row.name, views: row.views, addToCarts: row.addToCarts, orders: row.orders })) },
        });
      },
    },
    {
      name: "seller_insights",
      risk: RISK.LOW,
      description: "Explain sales changes with real metrics, then separate suggestions.",
      parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "yesterday", "week", "month"] } } },
      async run(ctx, args = {}) {
        const [entries, products] = await Promise.all([loadOrders(ctx), loadProducts(ctx)]);
        const period = ["today", "yesterday", "week", "month"].includes(args.period) ? args.period : "week";
        const window = periodWindow(period, now());
        const current = summarizeSales(entries, window);
        const previousW = previousWindow(window, period === "today" ? "yesterday" : "previous_period", now());
        const previous = summarizeSales(entries, previousW);
        const facts = [];
        const suggestions = [];
        const change = percentChange(current.sales, previous.sales);
        facts.push(`Sales ${current.label.toLowerCase()}: ${peso(current.sales)} vs ${peso(previous.sales)} (${previous.label.toLowerCase()})${change === null ? "" : `, ${change >= 0 ? "+" : ""}${change}%`}.`);
        facts.push(`Orders: ${current.orders} vs ${previous.orders}. Avg. order value: ${peso(current.averageOrderValue)} vs ${peso(previous.averageOrderValue)}.`);
        if (current.cancelledOrders) facts.push(`${current.cancelledOrders} order${current.cancelledOrders === 1 ? " was" : "s were"} cancelled in this period.`);
        const approved = products.filter((product) => String(product.approvalStatus || "").toLowerCase() === "approved");
        const soldRecently = unitsSoldSince(entries, now() - 30 * 86400000);
        const outOfStockSellers = approved.filter((product) => productStock(product) <= 0 && (soldRecently.get(String(product.id))?.units || 0) > 0);
        if (outOfStockSellers.length) {
          facts.push(`${outOfStockSellers.length} product${outOfStockSellers.length === 1 ? " that sold recently is" : "s that sold recently are"} now out of stock: ${outOfStockSellers.slice(0, 3).map((product) => cleanText(product.name, 50)).join(", ")}.`);
          suggestions.push("Restock the out-of-stock best sellers first — they had demand in the last 30 days.");
        }
        try {
          const analytics = await callApi(ctx, "GET", "/api/analytics/summary", { query: { days: period === "month" ? "30" : "7" } });
          const totals = analytics.summary?.totals || {};
          if (Number(totals.views) > 0) {
            const conversion = Math.round(((Number(totals.orders) || 0) / Number(totals.views)) * 1000) / 10;
            facts.push(`Tracked views: ${totals.views}, add-to-carts: ${totals.addToCarts || 0}, conversion ${conversion}%.`);
            if (conversion < 1 && Number(totals.views) >= 50) suggestions.push("Views are healthy but conversion is low — review prices, photos, and descriptions of your most-viewed products.");
          }
        } catch {
          // Analytics is optional; the insight still uses order data.
        }
        const slow = approved.filter((product) => productStock(product) > 0 && !soldRecently.get(String(product.id)));
        if (slow.length) suggestions.push(`${slow.length} in-stock product${slow.length === 1 ? " has" : "s have"} no sales in 30 days — a voucher or Flash Deal could help move them.`);
        if (change !== null && change < 0 && !suggestions.length) suggestions.push("Consider a limited-time voucher to bring back repeat buyers.");
        return ok({
          message: `Here's what the data shows:\n• ${facts.join("\n• ")}${suggestions.length ? `\n\nSuggestions (not guarantees):\n• ${suggestions.join("\n• ")}` : ""}`,
          blocks: [metricBlock("Sales insight", current, previous)],
          data: { facts, suggestions },
        });
      },
    },
    {
      name: "seller_earnings",
      risk: RISK.LOW,
      description: "Merchandise earnings from delivered orders vs orders still in progress (before platform fees).",
      parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "yesterday", "week", "month"] } } },
      async run(ctx, args = {}) {
        const entries = await loadOrders(ctx);
        const window = periodWindow(args.period || "month", now());
        const inWindow = entries.filter((entry) => toInt(entry.createdAtEpochMs, 0) >= window.start && toInt(entry.createdAtEpochMs, 0) < window.end);
        const delivered = inWindow.filter((entry) => ["toReview", "completed"].includes(String(entry.stage || "")));
        const inProgress = inWindow.filter((entry) => ["awaitingWaybill", "toPrepare", "toShip", "toReceive"].includes(String(entry.stage || "")));
        const earned = money(delivered.reduce((sum, entry) => sum + lineRevenue(entry), 0));
        const pending = money(inProgress.reduce((sum, entry) => sum + lineRevenue(entry), 0));
        return ok({
          message: `${window.label}: ${peso(earned)} from delivered orders, plus ${peso(pending)} in orders still in progress. These are merchandise amounts before any platform fees or payouts.`,
          blocks: [
            {
              type: "earnings_summary",
              period: window.label,
              items: [
                { label: "Delivered orders", value: peso(earned) },
                { label: "In progress", value: peso(pending) },
              ],
              footnote: "Merchandise value only. Fees and payout schedules are shown in your payouts page.",
            },
          ],
          data: { earned, pending, period: window.label },
        });
      },
    },
    {
      name: "seller_shipping_summary",
      risk: RISK.LOW,
      description: "Counts of orders awaiting waybill, to prepare, ready for pickup and in transit.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const entries = await loadOrders(ctx);
        const groups = orderGroups(entries);
        const count = (stage) => groups.filter((group) => group.stage === stage).length;
        const metrics = [
          { label: "Awaiting waybill", value: String(count("awaitingWaybill")) },
          { label: "To prepare", value: String(count("toPrepare")) },
          { label: "Ready for pickup", value: String(count("toShip")) },
          { label: "In transit", value: String(count("toReceive")) },
        ];
        return ok({
          message: metrics.map((metric) => `${metric.label}: ${metric.value}`).join(" · "),
          blocks: [{ type: "seller_metric", title: "Shipping", metrics }],
          data: Object.fromEntries(metrics.map((metric) => [metric.label, Number(metric.value)])),
        });
      },
    },
    {
      name: "seller_customer_questions",
      risk: RISK.LOW,
      description: "Summarize recent customer chat threads, newest first, with unread counts.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const body = await callApi(ctx, "GET", "/api/chat-support");
        const threads = (Array.isArray(body.threads) ? body.threads : []).slice(0, 8).map((thread) => {
          const messages = Array.isArray(thread.messages) ? thread.messages : [];
          const lastCustomer = [...messages].reverse().find((message) => !message.isFromSupport);
          const readAt = Date.parse(thread.supportReadAt || "") || 0;
          const unread = messages.filter((message) => !message.isFromSupport && (Date.parse(message.timestamp || "") || 0) > readAt).length;
          const lastIsCustomer = messages.length ? !messages[messages.length - 1].isFromSupport : false;
          return {
            threadId: String(thread.threadId || ""),
            customer: cleanText(thread.customerName || thread.customerLabel, 60) || "Customer",
            product: cleanText(thread.productName, 60),
            lastMessage: cleanText(lastCustomer?.text, 160),
            unread,
            needsReply: lastIsCustomer,
            updatedAt: thread.updatedAt || "",
          };
        });
        ctx.state.shownThreads = threads.map((thread) => ({ threadId: thread.threadId, customer: thread.customer, lastMessage: thread.lastMessage }));
        if (!threads.length) return ok({ message: "No customer messages yet.", data: { threads: 0 } });
        const waiting = threads.filter((thread) => thread.needsReply).length;
        return ok({
          message: `${waiting} conversation${waiting === 1 ? " is" : "s are"} waiting for your reply.`,
          blocks: [
            {
              type: "conversation_list",
              threads: threads.map((thread, index) => ({
                ...thread,
                n: index + 1,
                actions: [promptAction("Draft reply", `Draft a reply to message ${index + 1}`)],
              })),
            },
          ],
          data: { threads: threads.map((thread, index) => ({ n: index + 1, customer: thread.customer, product: thread.product, lastMessage: thread.lastMessage, needsReply: thread.needsReply })) },
        });
      },
    },
    {
      name: "seller_reply_draft",
      risk: RISK.LOW,
      description: "Draft (not send) a reply to a customer thread. Provide the reply text in 'message'.",
      parameters: { type: "object", properties: { ordinal: { type: "integer" }, threadId: { type: "string" }, message: { type: "string" } } },
      async run(ctx, args = {}) {
        const shown = Array.isArray(ctx.state.shownThreads) ? ctx.state.shownThreads : [];
        let thread = args.threadId ? shown.find((entry) => entry.threadId === cleanText(args.threadId, 200)) : null;
        if (!thread && toInt(args.ordinal, 0)) thread = shown[toInt(args.ordinal, 0) - 1] || null;
        if (!thread && shown.length === 1) thread = shown[0];
        if (!thread) throw toolError(shown.length ? `Which conversation (1–${shown.length})?` : "Let me show your messages first — say \"show customer messages\".", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        const text = cleanText(args.message, 1000);
        if (!text) {
          ctx.state.replyDraft = { threadId: thread.threadId, customer: thread.customer, text: "" };
          return ok({ message: `What would you like to say to ${thread.customer}? Their last message: "${thread.lastMessage}"`, data: { needsText: true } });
        }
        ctx.state.replyDraft = { threadId: thread.threadId, customer: thread.customer, text };
        return ok({
          message: "Here's the draft. It won't be sent until you confirm.",
          blocks: [
            {
              type: "promotion_draft",
              kind: "reply",
              status: "draft",
              fields: [
                { label: "To", value: thread.customer },
                { label: "Their message", value: thread.lastMessage || "—" },
                { label: "Reply", value: text },
              ],
              missing: [],
              actions: [toolAction("Send reply", "send_reply", {}, "primary"), toolAction("Discard draft", "discard_draft", {})],
            },
          ],
          data: { draft: text },
          events: ["seller_draft_created"],
        });
      },
    },
    {
      name: "send_reply",
      risk: RISK.HIGH,
      description: "Send the drafted customer reply (requires confirmation).",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        assertCanAct(ctx);
        const draft = ctx.state.replyDraft;
        if (!draft?.threadId || !draft.text) throw toolError("There's no reply draft yet.", { status: 409, code: "AI_NO_DRAFT" });
        const { token, expiresAt } = ctx.confirm({ tool: "send_reply", args: { threadId: draft.threadId, text: draft.text }, summary: `Reply to ${draft.customer}` });
        return ok({
          message: `Send this reply to ${draft.customer}?`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: `Reply to ${draft.customer}`,
              lines: [{ label: "Message", value: draft.text }],
              confirmLabel: "Send reply",
              cancelLabel: "Cancel",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        await callApi(ctx, "POST", `/api/chat-support/${encodeURIComponent(args.threadId)}/reply`, { body: { text: args.text } });
        ctx.state.replyDraft = null;
        return ok({ message: "Reply sent.", blocks: [notice("Reply sent to the customer.", "success")], data: { sent: true }, entity: { type: "chat_thread", id: args.threadId } });
      },
    },
    {
      name: "create_listing_draft",
      risk: RISK.LOW,
      description: "Start a product listing draft. Never publishes. Include any known title, category, price, stock, description.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, category: { type: "string" }, price: { type: "number" }, stock: { type: "integer" }, description: { type: "string" } },
      },
      async run(ctx, args = {}) {
        const title = cleanText(args.title, 120);
        const draft = {
          type: "listing",
          title,
          category: cleanText(args.category, 80),
          price: Number(args.price) > 0 ? money(args.price) : 0,
          stock: toInt(args.stock, 0) > 0 ? toInt(args.stock, 0) : 0,
          description: cleanText(args.description, 2000),
        };
        let lead = title ? `Started a listing draft for "${title}".` : "Started a new listing draft.";
        if (!draft.category) {
          try {
            const products = await loadProducts(ctx);
            const categories = [...new Set(products.flatMap((product) => productCategories(product)))].slice(0, 8);
            if (categories.length) lead += ` Your existing categories: ${categories.join(", ")}.`;
          } catch {
            // Category hints are optional.
          }
        }
        return draftResult(ctx, draft, lead);
      },
    },
    {
      name: "update_listing_draft",
      risk: RISK.LOW,
      description: "Fill in or change fields of the current listing draft.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, category: { type: "string" }, price: { type: "number" }, stock: { type: "integer" }, description: { type: "string" } },
      },
      async run(ctx, args = {}) {
        const draft = ctx.state.promotionDraft;
        if (!draft || draft.type !== "listing") throw toolError("There's no listing draft yet. Say \"create a listing for …\" to start.", { status: 409, code: "AI_NO_DRAFT" });
        const next = { ...draft };
        if (args.title) next.title = cleanText(args.title, 120);
        if (args.category) next.category = cleanText(args.category, 80);
        if (Number(args.price) > 0) next.price = money(args.price);
        if (toInt(args.stock, 0) > 0) next.stock = toInt(args.stock, 0);
        if (args.description) next.description = cleanText(args.description, 2000);
        return draftResult(ctx, next, "Draft updated.");
      },
    },
    {
      name: "publish_listing_draft",
      risk: RISK.HIGH,
      description: "Submit the listing draft for Super Admin review (requires confirmation).",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        assertCanAct(ctx);
        const draft = ctx.state.promotionDraft;
        if (!draft || draft.type !== "listing") throw toolError("There's no listing draft to submit.", { status: 409, code: "AI_NO_DRAFT" });
        const { missing } = draftBlock(draft);
        if (missing.length) return draftResult(ctx, draft, "The draft isn't complete yet.");
        const payload = { title: draft.title, category: draft.category, price: draft.price, stock: draft.stock || 0, description: draft.description };
        const { token, expiresAt } = ctx.confirm({ tool: "publish_listing_draft", args: payload, summary: `Submit "${draft.title}" for review` });
        return ok({
          message: `Submit "${draft.title}" for review? It goes live only after Super Admin approval.`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: "Submit listing for review",
              lines: [
                { label: "Title", value: draft.title },
                { label: "Category", value: draft.category },
                { label: "Price", value: peso(draft.price) },
                { label: "Stock", value: String(draft.stock || 0) },
              ],
              warning: "You can add photos from Products after submitting.",
              confirmLabel: "Submit for review",
              cancelLabel: "Keep editing",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        const body = await callApi(ctx, "POST", "/api/products", {
          body: {
            name: args.title,
            category: args.category,
            categories: [args.category],
            description: args.description,
            originalPrice: args.price,
            stock: args.stock,
            isActive: true,
          },
        });
        ctx.state.promotionDraft = null;
        const product = body.product || {};
        return ok({
          message: cleanText(body.message, 200) || `"${args.title}" was submitted for review.`,
          blocks: [notice(`"${args.title}" submitted — status: ${approvalLabel(product)}.`, "success")],
          data: { submitted: true, status: approvalLabel(product) },
          entity: { type: "product", id: String(product.id || "") },
          events: ["seller_inventory_action"],
        });
      },
    },
    {
      name: "update_product_stock",
      risk: RISK.HIGH,
      description: "Set a product's stock to an exact number (requires confirmation).",
      parameters: {
        type: "object",
        properties: { productId: { type: "string" }, productRef: { type: "string" }, ordinal: { type: "integer" }, stock: { type: "integer", minimum: 0 } },
        required: ["stock"],
      },
      async prepare(ctx, args = {}) {
        assertCanAct(ctx);
        const stock = toInt(args.stock, -1);
        if (stock < 0 || stock > 1000000) throw toolError("What should the new stock be?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        const product = await resolveOwnProduct(ctx, args);
        if (String(product.approvalStatus || "").toLowerCase() !== "approved") {
          throw toolError(`${cleanText(product.name, 60)} must be approved before its stock can be updated.`, { status: 409, code: "PRODUCT_NOT_APPROVED_FOR_INVENTORY" });
        }
        const current = productStock(product);
        const { token, expiresAt } = ctx.confirm({ tool: "update_product_stock", args: { productId: String(product.id), stock, previous: current }, summary: `Update stock of ${product.name}` });
        return ok({
          message: `Update stock of ${cleanText(product.name, 60)} from ${current} to ${stock}?`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: "Update stock",
              lines: [
                { label: "Product", value: cleanText(product.name, 80) },
                { label: "Current stock", value: String(current) },
                { label: "New stock", value: String(stock), emphasis: true },
              ],
              warning: productVariants(product).length ? "This sets the product-level stock. Option-level stock is managed in the product editor." : "",
              confirmLabel: "Update stock",
              cancelLabel: "Cancel",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        const product = await resolveOwnProduct(ctx, { productId: args.productId });
        const current = productStock(product);
        const body = await callApi(ctx, "PUT", `/api/products/${encodeURIComponent(args.productId)}`, {
          body: {
            ...product,
            stock: args.stock,
            __activityContext: "inventory",
            __activityTarget: args.stock > current ? "add" : "deduct",
            __activityInventoryChangeCount: 1,
          },
        });
        const saved = body.product || {};
        const finalStock = saved.id ? productStock(saved) : args.stock;
        return ok({
          message: `Stock of ${cleanText(product.name, 60)} updated from ${current} to ${finalStock}.`,
          blocks: [notice(`Stock updated: ${current} → ${finalStock}.`, "success")],
          data: { updated: true, stock: finalStock },
          entity: { type: "product", id: args.productId },
          events: ["seller_inventory_action"],
        });
      },
    },
    {
      name: "update_product_price",
      risk: RISK.HIGH,
      description: "Change a product's selling price (requires confirmation; may require re-review).",
      parameters: {
        type: "object",
        properties: { productId: { type: "string" }, productRef: { type: "string" }, ordinal: { type: "integer" }, price: { type: "number", exclusiveMinimum: 0 } },
        required: ["price"],
      },
      async prepare(ctx, args = {}) {
        assertCanAct(ctx);
        const price = money(args.price);
        if (!(price > 0)) throw toolError("What should the new price be?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        const product = await resolveOwnProduct(ctx, args);
        if (productVariants(product).some((variant) => Number(variant.raw?.originalPrice) > 0 || Number(variant.raw?.salesPrice) > 0)) {
          throw toolError(`${cleanText(product.name, 60)} has option-level prices. Please edit them in the product editor.`, { status: 409, code: "AI_VARIANT_PRICES" });
        }
        const current = sellingPrice(product);
        const original = money(product.originalPrice);
        const patch = price < original ? { originalPrice: original, salesPrice: price } : { originalPrice: price, salesPrice: null };
        const { token, expiresAt } = ctx.confirm({ tool: "update_product_price", args: { productId: String(product.id), patch, previous: current, price }, summary: `Change price of ${product.name}` });
        return ok({
          message: `Change the price of ${cleanText(product.name, 60)} from ${peso(current)} to ${peso(price)}?`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: "Change price",
              lines: [
                { label: "Product", value: cleanText(product.name, 80) },
                { label: "Current price", value: peso(current) },
                { label: "New price", value: peso(price), emphasis: true },
                ...(price < original ? [{ label: "Shown as", value: `${peso(price)} (was ${peso(original)})` }] : []),
              ],
              warning: "Price edits follow your store's normal product edit rules and may need review before going live.",
              confirmLabel: "Change price",
              cancelLabel: "Cancel",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        const product = await resolveOwnProduct(ctx, { productId: args.productId });
        const current = sellingPrice(product);
        const body = await callApi(ctx, "PUT", `/api/products/${encodeURIComponent(args.productId)}`, {
          body: { ...product, ...args.patch },
        });
        const saved = body.product || {};
        const status = saved.id ? approvalLabel(saved) : "Live";
        return ok({
          message: `Price of ${cleanText(product.name, 60)} updated from ${peso(current)} to ${peso(args.price)}.${status !== "Live" ? ` Status: ${status}.` : ""}`,
          blocks: [notice(`Price updated: ${peso(current)} → ${peso(args.price)}${status !== "Live" ? ` · ${status}` : ""}.`, "success")],
          data: { updated: true, status },
          entity: { type: "product", id: args.productId },
          events: ["seller_inventory_action"],
        });
      },
    },
    {
      name: "seller_flash_deal_draft",
      risk: RISK.LOW,
      description:
        "Create or update a Flash Deal draft. startTime/endTime are {hour, minute} (24h); day is {relative:0|1} | {weekday:0-6} | {date:'YYYY-MM-DD'}. Never publishes.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          productRef: { type: "string" },
          ordinal: { type: "integer" },
          discountPercent: { type: "number" },
          flashPrice: { type: "number" },
          startTime: { type: "object", properties: { hour: { type: "integer" }, minute: { type: "integer" } } },
          endTime: { type: "object", properties: { hour: { type: "integer" }, minute: { type: "integer" } } },
          day: { type: "object", properties: { relative: { type: "integer" }, weekday: { type: "integer" }, date: { type: "string" } } },
          dealStock: { type: "integer" },
          perBuyerLimit: { type: "integer" },
          update: { type: "boolean" },
        },
      },
      async run(ctx, args = {}) {
        const existing = ctx.state.promotionDraft?.type === "flash_deal" ? ctx.state.promotionDraft : null;
        const draft = args.update && existing ? { ...existing } : { type: "flash_deal", perBuyerLimit: 1 };
        const wantsProduct = args.productId || args.productRef || toInt(args.ordinal, 0);
        if (wantsProduct || !draft.productId) {
          if (wantsProduct) {
            const product = await resolveOwnProduct(ctx, args);
            if (String(product.approvalStatus || "").toLowerCase() !== "approved") {
              throw toolError(`${cleanText(product.name, 60)} must be live before it can have a Flash Deal.`, { status: 409, code: "AI_PRODUCT_NOT_LIVE" });
            }
            draft.productId = String(product.id);
            draft.productName = cleanText(product.name, 100);
            draft.regularPrice = sellingPrice(product);
            draft.productStock = productStock(product);
          }
        }
        if (Number(args.discountPercent) > 0) {
          draft.discountPercent = Math.min(95, Number(args.discountPercent));
          draft.flashPrice = 0;
        }
        if (Number(args.flashPrice) > 0) {
          draft.flashPrice = money(args.flashPrice);
          draft.discountPercent = draft.regularPrice ? Math.round((1 - draft.flashPrice / draft.regularPrice) * 100) : 0;
        }
        if (draft.discountPercent && draft.regularPrice && !(Number(args.flashPrice) > 0)) {
          draft.flashPrice = money(Math.floor(draft.regularPrice * (1 - draft.discountPercent / 100)));
        }
        if (args.day) draft.date = resolveDay(args.day, now()) || draft.date;
        if (args.startTime && args.endTime) {
          draft.startTime = { hour: toInt(args.startTime.hour, 0), minute: toInt(args.startTime.minute, 0) };
          draft.endTime = { hour: toInt(args.endTime.hour, 0), minute: toInt(args.endTime.minute, 0) };
        }
        if (toInt(args.dealStock, 0) > 0) draft.dealStock = toInt(args.dealStock, 0);
        if (toInt(args.perBuyerLimit, 0) > 0) draft.perBuyerLimit = toInt(args.perBuyerLimit, 0);

        const problems = [];
        if (draft.flashPrice && draft.regularPrice && draft.flashPrice >= draft.regularPrice) {
          problems.push(`The flash price must be lower than the regular price (${peso(draft.regularPrice)}).`);
          draft.flashPrice = 0;
        }
        if (draft.dealStock && draft.productStock !== undefined && draft.dealStock > draft.productStock) {
          problems.push(`You only have ${draft.productStock} in stock, so the deal can include at most ${draft.productStock} units.`);
          draft.dealStock = 0;
        }
        if (draft.date && draft.startTime && draft.endTime) {
          const startsAt = manilaIso(draft.date, draft.startTime);
          let endsMs = Date.parse(manilaIso(draft.date, draft.endTime));
          if (endsMs <= Date.parse(startsAt)) endsMs += 86400000;
          if (Date.parse(startsAt) < now()) {
            problems.push("That start time has already passed. Pick a later time.");
            draft.startsAt = "";
            draft.endsAt = "";
          } else if ((endsMs - Date.parse(startsAt)) / 3600000 > MAX_FLASH_HOURS) {
            problems.push(`Flash Deals can run for at most ${MAX_FLASH_HOURS} hours.`);
            draft.startsAt = "";
            draft.endsAt = "";
          } else {
            draft.startsAt = startsAt;
            draft.endsAt = new Date(endsMs).toISOString();
          }
        }
        const weekday = draft.date ? WEEKDAY_NAMES[new Date(`${draft.date}T12:00:00${MANILA_OFFSET}`).getUTCDay()] || "" : "";
        const when = draft.date
          ? `${weekday} ${draft.date}${draft.startTime ? ` ${describeTime(draft.startTime)}–${describeTime(draft.endTime)}` : ""}`
          : "";
        const lead = [existing && args.update ? "Draft updated." : `Flash Deal draft${draft.productName ? ` for ${draft.productName}` : ""}.`, when ? `Scheduled: ${when.trim()}.` : "", ...problems]
          .filter(Boolean)
          .join(" ");
        return draftResult(ctx, draft, lead);
      },
    },
    {
      name: "publish_flash_deal",
      risk: RISK.HIGH,
      description: "Publish the current Flash Deal draft (requires confirmation).",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        assertCanAct(ctx);
        const draft = ctx.state.promotionDraft;
        if (!draft || draft.type !== "flash_deal") throw toolError("There's no Flash Deal draft to publish.", { status: 409, code: "AI_NO_DRAFT" });
        const { missing } = draftBlock(draft);
        if (missing.length) return draftResult(ctx, draft, "The draft isn't complete yet.");
        if (Date.parse(draft.startsAt) < now()) return draftResult(ctx, { ...draft, startsAt: "", endsAt: "" }, "The start time has passed. Pick a new time.");
        const payload = {
          productId: draft.productId,
          flashPrice: String(draft.flashPrice),
          dealStockLimit: String(draft.dealStock),
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          perBuyerLimit: String(draft.perBuyerLimit || 1),
          notes: "Created with Switch Seller AI",
        };
        const { token, expiresAt } = ctx.confirm({ tool: "publish_flash_deal", args: { payload, productName: draft.productName }, summary: `Publish Flash Deal for ${draft.productName}` });
        const { block } = draftBlock(draft);
        return ok({
          message: `Publish this Flash Deal for ${draft.productName}?`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: "Publish Flash Deal",
              lines: block.fields,
              warning: "Flash Deals may need Super Admin approval before they go live.",
              confirmLabel: "Publish Flash Deal",
              cancelLabel: "Keep as draft",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        const body = await callApi(ctx, "POST", "/api/admin/flash-deals", { body: args.payload });
        ctx.state.promotionDraft = null;
        const deal = body.deal || {};
        const status = cleanText(deal.displayStatus || deal.approvalStatus || deal.status, 30);
        return ok({
          message: `${cleanText(body.message, 200) || "Flash Deal created."}${status ? ` Status: ${status}.` : ""}`,
          blocks: [notice(`Flash Deal for ${args.productName} created${status ? ` (${status})` : ""}.`, "success")],
          data: { published: true, status },
          entity: { type: "flash_deal", id: String(deal.id || "") },
          events: ["seller_promotion_created"],
        });
      },
    },
    {
      name: "seller_voucher_draft",
      risk: RISK.LOW,
      description: "Create or update a store voucher draft (percent or fixed amount, optional minimum spend, code, free shipping, expiry). Never publishes.",
      parameters: {
        type: "object",
        properties: {
          discountPercent: { type: "number" },
          discountAmount: { type: "number" },
          minimumSpend: { type: "number" },
          code: { type: "string" },
          freeShipping: { type: "boolean" },
          usesPerAccount: { type: "integer" },
          validDays: { type: "integer", description: "How many days the voucher stays valid" },
          update: { type: "boolean" },
        },
      },
      async run(ctx, args = {}) {
        const existing = ctx.state.promotionDraft?.type === "voucher" ? ctx.state.promotionDraft : null;
        const draft = args.update && existing ? { ...existing } : { type: "voucher", usesPerAccount: 1, minimumSpend: 0, freeShipping: false };
        if (Number(args.discountPercent) > 0) {
          draft.discountType = "percent";
          draft.discountValue = Math.min(100, Math.round(Number(args.discountPercent)));
        } else if (Number(args.discountAmount) > 0) {
          draft.discountType = "fixed";
          draft.discountValue = Math.round(Number(args.discountAmount));
        }
        if (Number(args.minimumSpend) >= 0 && args.minimumSpend !== undefined && args.minimumSpend !== null) draft.minimumSpend = Math.round(Number(args.minimumSpend));
        if (args.freeShipping) draft.freeShipping = true;
        if (toInt(args.usesPerAccount, 0) > 0) draft.usesPerAccount = Math.min(99, toInt(args.usesPerAccount, 1));
        const code = String(args.code || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
        if (code) draft.code = code;
        if (!draft.code) draft.code = generateVoucherCode(draft.discountValue || 0, draft.discountType === "percent");
        const days = toInt(args.validDays, 0) > 0 ? Math.min(365, toInt(args.validDays, 0)) : draft.validDays || 7;
        draft.validDays = days;
        const expiry = new Date(now() + days * 86400000);
        draft.expiresOn = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(expiry);
        draft.title =
          draft.discountValue
            ? `${draft.discountType === "percent" ? `${draft.discountValue}%` : peso(draft.discountValue)} off${draft.minimumSpend ? ` orders ${peso(draft.minimumSpend)}+` : ""}`
            : draft.freeShipping
              ? "Free shipping"
              : "Store voucher";
        return draftResult(ctx, draft, `${existing && args.update ? "Voucher draft updated." : "Voucher draft ready."} It's valid for ${days} day${days === 1 ? "" : "s"} (until ${draft.expiresOn}) — tell me if you want a different period or code.`);
      },
    },
    {
      name: "publish_voucher",
      risk: RISK.HIGH,
      description: "Publish the current store voucher draft (requires confirmation).",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        assertCanAct(ctx);
        const draft = ctx.state.promotionDraft;
        if (!draft || draft.type !== "voucher") throw toolError("There's no voucher draft to publish.", { status: 409, code: "AI_NO_DRAFT" });
        const { missing, block } = draftBlock(draft);
        if (missing.length) return draftResult(ctx, draft, "The draft isn't complete yet.");
        const discountValue = draft.discountValue ? String(draft.discountValue) : "";
        const payload = {
          title: draft.title,
          subtitle: draft.discountValue
            ? `${draft.discountType === "fixed" ? `₱${discountValue} off total purchase` : `${discountValue}% of total purchase`}${draft.freeShipping ? " · Free shipping" : ""}`
            : "Free shipping on total purchase",
          code: draft.code,
          minimumSpend: String(draft.minimumSpend || 0),
          usesPerAccount: draft.usesPerAccount || 1,
          date: draft.expiresOn,
          note: "A deal\nfor you!",
          kind: draft.freeShipping && !draft.discountValue ? "shipping" : draft.discountType === "fixed" ? "gift" : "percent",
          action: "useNow",
          discountType: draft.discountType || "percent",
          discountValue,
          freeShipping: Boolean(draft.freeShipping),
          platformId: "all",
          passive: false,
          repeatWeekly: false,
          repeatDays: [],
          repeatStartTime: "",
          repeatEndTime: "",
          status: "active",
        };
        const { token, expiresAt } = ctx.confirm({ tool: "publish_voucher", args: { payload }, summary: `Publish voucher ${draft.code}` });
        return ok({
          message: `Publish voucher ${draft.code}? Buyers will be able to use it right away.`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: "Publish voucher",
              lines: block.fields,
              confirmLabel: "Publish voucher",
              cancelLabel: "Keep as draft",
            },
          ],
          data: { awaitingConfirmation: true },
        });
      },
      async execute(ctx, args) {
        assertCanAct(ctx);
        const body = await callApi(ctx, "POST", "/api/admin/vouchers", { body: args.payload });
        ctx.state.promotionDraft = null;
        return ok({
          message: cleanText(body.message, 200) || `Voucher ${args.payload.code} created.`,
          blocks: [notice(`Voucher ${args.payload.code} is now ${body.voucher?.status || "active"}.`, "success")],
          data: { published: true, code: args.payload.code },
          entity: { type: "voucher", id: String(body.voucher?.id || "") },
          events: ["seller_promotion_created"],
        });
      },
    },
    {
      name: "discard_draft",
      risk: RISK.LOW,
      description: "Discard the current draft (listing, Flash Deal, voucher or reply).",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const had = Boolean(ctx.state.promotionDraft || ctx.state.replyDraft);
        ctx.state.promotionDraft = null;
        ctx.state.replyDraft = null;
        return ok({ message: had ? "Draft discarded. Nothing was published." : "There was no draft to discard.", data: { discarded: had } });
      },
    },
  ];

  return tools;
}

module.exports = {
  createSellerTools,
  summarizeSales,
  periodWindow,
  resolveDay,
  manilaIso,
  LOW_STOCK_THRESHOLD,
};

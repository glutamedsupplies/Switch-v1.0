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
  formatDateTime,
} = require("./common");
const {
  productStock,
  productVariants,
  variantAvailability,
  productImage,
  productSellerName,
  productCategories,
  productSearchText,
} = require("./catalog");
const { COLOR_SYNONYMS, PRODUCT_NOUN_SYNONYMS, normalizeText, findSize } = require("../nlu");

const FLAT_SHIPPING_FEE = 59;
const FREE_SHIPPING_ITEM_COUNT = 3;
const MINIMUM_COD_DEPOSIT = 500;
const MAX_RESULTS = 6;
const CANCELLABLE_STAGES = new Set(["toPay", "awaitingWaybill", "toPrepare"]);
const STAGE_LABELS = Object.freeze({
  toPay: "To pay",
  awaitingWaybill: "Awaiting waybill",
  toPrepare: "Seller is preparing",
  toShip: "Ready to ship",
  toReceive: "On the way",
  toReview: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  returnRequest: "Return requested",
});
const ACTIVE_STAGES = new Set(["toPay", "awaitingWaybill", "toPrepare", "toShip", "toReceive"]);

const GENDER_WORDS = Object.freeze({
  men: /(^|[^a-z])(men|men's|mens|male|boys?|for him|lalaki|panlalaki)([^a-z]|$)/,
  women: /(^|[^a-z])(women|women's|womens|ladies|lady|female|girls?|for her|babae|pambabae)([^a-z]|$)/,
  kids: /(^|[^a-z])(kids?|children|child|toddler|baby|pambata)([^a-z]|$)/,
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(text, word) {
  if (!word) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(word.toLowerCase())}`).test(text);
}

function expandQueryTokens(query) {
  const words = normalizeText(query)
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9'-]/g, ""))
    .filter((word) => word.length >= 2);
  const groups = [];
  const seen = new Set();
  for (const word of words) {
    let alternatives = null;
    for (const [key, synonyms] of Object.entries(PRODUCT_NOUN_SYNONYMS)) {
      if (key === word || synonyms.includes(word)) {
        alternatives = [key, ...synonyms];
        break;
      }
    }
    if (!alternatives) {
      alternatives = [word];
      if (word.length > 3 && word.endsWith("s")) alternatives.push(word.slice(0, -1));
    }
    const key = alternatives[0];
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(alternatives);
  }
  return groups;
}

function genderOf(text) {
  if (/(^|[^a-z])unisex([^a-z]|$)/.test(text)) return "unisex";
  const hits = Object.entries(GENDER_WORDS).filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
  return hits.length === 1 ? hits[0] : hits.length ? "mixed" : "";
}

function sizeToken(word) {
  const value = String(word || "").toLowerCase();
  return (value.length > 2 ? findSize(value) : "").toLowerCase() || value;
}

function variantWords(name) {
  return normalizeText(name).split(/[\s/,()-]+/).filter(Boolean).map(sizeToken);
}

function stageLabel(stage) {
  return STAGE_LABELS[stage] || cleanText(stage, 40) || "Unknown";
}

function shortRef(value) {
  const text = String(value || "").trim();
  return text.length > 10 ? text.slice(-8).toUpperCase() : text.toUpperCase();
}

function isEnabledPartner(partner) {
  if (!partner || !String(partner.id ?? "").trim()) return false;
  const truthy = (value, fallback) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (["true", "active", "enabled"].includes(v)) return true;
      if (["false", "inactive", "disabled"].includes(v)) return false;
    }
    return fallback;
  };
  if (truthy(partner.disabled, false)) return false;
  if ("enabled" in partner) return truthy(partner.enabled, true);
  if ("isEnabled" in partner) return truthy(partner.isEnabled, true);
  if ("isActive" in partner) return truthy(partner.isActive, true);
  const status = String(partner.status ?? "").trim().toLowerCase();
  return !["inactive", "disabled", "archived", "deleted"].includes(status) && !partner.archivedAt;
}

function requiredCodDeposit(total) {
  const amount = Math.max(0, money(total));
  return money(Math.min(amount, Math.max(amount * 0.1, MINIMUM_COD_DEPOSIT)));
}

function formatAddress(entry) {
  if (!entry) return "";
  const parts = [entry.unit, entry.street, entry.city, entry.province, entry.postal]
    .map((part) => cleanText(part, 160))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : cleanText(entry.search, 300);
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function createBuyerTools(deps) {
  const {
    store,
    catalog,
    vouchersApi,
    voucherRules,
    readOrders,
    getBuyerProfile,
    getSwitchRiderBuyerTracking,
    isSwitchRiderPartnerName = (name) => /^switch rider$/i.test(String(name || "").trim()),
  } = deps;

  // --------------------------------------------------------------- helpers

  function toCard(product, dealContext, { detail = false } = {}) {
    const variants = productVariants(product);
    const tracked = variants.some((variant) => variant.stock > 0);
    const variantViews = variants.map((variant) => {
      const pricing = catalog.priceFor(product, variant.id, dealContext);
      return {
        id: variant.id,
        name: variant.name,
        price: pricing.price,
        originalPrice: pricing.originalPrice,
        stock: tracked ? Math.min(productStock(product), variant.stock) : productStock(product),
      };
    });
    const base = catalog.priceFor(product, "", dealContext);
    const inStockVariants = variantViews.filter((variant) => variant.stock > 0);
    const priced = inStockVariants.length ? inStockVariants : variantViews;
    const minVariant = priced.length
      ? priced.reduce((min, variant) => (variant.price < min.price ? variant : min), priced[0])
      : null;
    const price = minVariant ? minVariant.price : base.price;
    const originalPrice = minVariant ? minVariant.originalPrice : base.originalPrice;
    const stock = variants.length
      ? (tracked ? variantViews.reduce((sum, variant) => sum + variant.stock, 0) : productStock(product))
      : productStock(product);
    const card = {
      id: String(product.id),
      name: cleanText(product.name, 160),
      imageUrl: productImage(product),
      price,
      priceFrom: priced.length > 1 && priced.some((variant) => variant.price !== price),
      originalPrice: originalPrice > price ? originalPrice : null,
      discountPercent: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
      rating: Number(product.rating) > 0 ? Math.round(Number(product.rating) * 10) / 10 : null,
      sold: Math.max(0, toInt(product.sold, 0)),
      stock: Math.min(stock, productStock(product)),
      stockLabel: stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock",
      seller: productSellerName(product),
      sellerAdminId: String(product.adminId || ""),
      category: productCategories(product)[0] || "",
      hasVariants: variants.length > 0,
      deal: base.deal ? { type: base.deal.type, endsAt: base.deal.endsAt, freeShipping: base.deal.freeShipping } : null,
    };
    if (detail) {
      card.description = cleanText(product.description, 600);
      card.variants = variantViews;
      card.categories = productCategories(product);
    }
    return card;
  }

  function cardActions(card) {
    return [
      { label: "View", kind: "navigate", target: "product", productId: card.id },
      toolAction("Add to cart", "add_to_cart", { productId: card.id, quantity: 1 }, "primary"),
    ];
  }

  function compactCard(card, index) {
    return {
      n: index + 1,
      id: card.id,
      name: card.name,
      price: card.price,
      originalPrice: card.originalPrice,
      rating: card.rating,
      sold: card.sold,
      stock: card.stock,
      seller: card.seller,
      hasVariants: card.hasVariants,
      deal: Boolean(card.deal),
    };
  }

  function resolveProductRef(ctx, loaded, args = {}) {
    const state = ctx.state;
    const productId = cleanText(args.productId, 120);
    if (productId) {
      const product = loaded.byId.get(productId);
      if (!product) throw toolError("That product is no longer available.", { status: 404, code: "AI_PRODUCT_UNAVAILABLE" });
      return product;
    }
    const shown = Array.isArray(state.shownProducts) ? state.shownProducts : [];
    const ordinal = toInt(args.ordinal, 0);
    if (ordinal) {
      if (!shown.length) throw toolError("I haven't shown any products yet. What are you looking for?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
      const index = ordinal === -1 ? shown.length - 1 : ordinal - 1;
      const ref = shown[index];
      if (!ref) {
        throw toolError(`I only showed ${shown.length} product${shown.length === 1 ? "" : "s"}. Which one do you mean (1–${shown.length})?`, {
          status: 422,
          code: "AI_NEEDS_CLARIFICATION",
        });
      }
      const product = loaded.byId.get(String(ref.id));
      if (!product) throw toolError(`${ref.name || "That product"} is no longer available.`, { status: 404, code: "AI_PRODUCT_UNAVAILABLE" });
      return product;
    }
    const name = normalizeText(args.productName || "");
    if (name) {
      const fromShown = shown.filter((ref) => normalizeText(ref.name).includes(name));
      if (fromShown.length === 1) {
        const product = loaded.byId.get(String(fromShown[0].id));
        if (product) return product;
      }
      if (fromShown.length > 1) {
        throw toolError(`More than one product matches "${args.productName}". Which number do you mean?`, { status: 422, code: "AI_NEEDS_CLARIFICATION" });
      }
    }
    if (state.selectedProductId && loaded.byId.get(String(state.selectedProductId))) {
      return loaded.byId.get(String(state.selectedProductId));
    }
    throw toolError(
      shown.length ? `Which product do you mean? Say a number from 1 to ${shown.length}.` : "Which product do you mean? Search for it first.",
      { status: 422, code: "AI_NEEDS_CLARIFICATION" },
    );
  }

  function resolveVariant(product, { variantId = "", variantChoice = "" } = {}) {
    const variants = productVariants(product);
    if (!variants.length) return { variant: null };
    const inStock = variants.filter((variant) => variantAvailability(product, variant.id) > 0);
    const wantedId = cleanText(variantId, 120);
    if (wantedId) {
      const variant = variants.find((entry) => entry.id === wantedId);
      if (!variant) throw toolError("That option is not available for this product.", { status: 404, code: "AI_VARIANT_UNAVAILABLE" });
      return { variant };
    }
    const choice = normalizeText(variantChoice).replace(/\b(size|sz|yung|ung|po|color|kulay)\b/g, " ").replace(/\s+/g, " ").trim();
    if (!choice) return { needsChoice: true, options: inStock, reason: "" };
    const exact = variants.filter((variant) => normalizeText(variant.name) === choice);
    if (exact.length === 1) return { variant: exact[0] };
    const tokens = choice.split(" ").filter(Boolean).map(sizeToken);
    const matches = variants.filter((variant) => {
      const words = variantWords(variant.name);
      return tokens.every((token) => words.includes(token));
    });
    if (matches.length === 1) return { variant: matches[0] };
    if (matches.length > 1) return { needsChoice: true, options: matches.filter((variant) => inStock.includes(variant)), reason: "" };
    return { needsChoice: true, options: inStock, reason: `"${cleanText(variantChoice, 40)}" isn't available for this product.` };
  }

  function variantChoiceBlock(product, options, quantity) {
    return {
      type: "choice_list",
      title: `Choose an option for ${cleanText(product.name, 80)}`,
      options: options.map((variant) => ({
        label: variant.name,
        description: `${variantAvailability(product, variant.id)} in stock`,
        action: toolAction(variant.name, "add_to_cart", { productId: String(product.id), variantId: variant.id, quantity }),
      })),
    };
  }

  // ------------------------------------------------------------- cart view

  async function buildCartView(ctx, { fresh = false } = {}) {
    const items = await store.getCart(ctx.session.accountId);
    const loaded = await catalog.load(ctx, { fresh });
    const lines = items.map((item, index) => {
      const product = loaded.byId.get(String(item.productId));
      if (!product) {
        return { index: index + 1, productId: item.productId, variantId: item.variantId, name: "Unavailable product", quantity: item.quantity, available: false, issue: "No longer available" };
      }
      const variants = productVariants(product);
      const variant = item.variantId ? variants.find((entry) => entry.id === item.variantId) : null;
      const pricing = catalog.priceFor(product, item.variantId, loaded.dealContext);
      const stock = variantAvailability(product, item.variantId);
      let issue = "";
      if (variants.length && !variant) issue = item.variantId ? "Option no longer available" : "Choose an option";
      else if (stock <= 0) issue = "Out of stock";
      else if (stock < item.quantity) issue = `Only ${stock} left`;
      return {
        index: index + 1,
        productId: String(product.id),
        variantId: item.variantId,
        variantName: variant?.name || "",
        name: cleanText(product.name, 160),
        imageUrl: productImage(product),
        seller: productSellerName(product),
        sellerAdminId: String(product.adminId || ""),
        quantity: item.quantity,
        unitPrice: pricing.price,
        originalPrice: pricing.originalPrice > pricing.price ? pricing.originalPrice : null,
        lineTotal: money(pricing.price * item.quantity),
        stock,
        deal: pricing.deal,
        available: !issue,
        issue,
        product,
      };
    });
    const available = lines.filter((line) => line.available);
    return {
      lines,
      subtotal: money(available.reduce((sum, line) => sum + line.lineTotal, 0)),
      itemCount: available.reduce((sum, line) => sum + line.quantity, 0),
      loaded,
    };
  }

  function cartBlock(view) {
    return {
      type: "cart_summary",
      items: view.lines.map((line) => ({
        index: line.index,
        productId: line.productId,
        variantId: line.variantId,
        name: line.name,
        variantName: line.variantName || "",
        imageUrl: line.imageUrl || "",
        seller: line.seller || "",
        quantity: line.quantity,
        unitPrice: line.unitPrice ?? null,
        originalPrice: line.originalPrice ?? null,
        lineTotal: line.lineTotal ?? null,
        available: line.available,
        issue: line.issue || "",
        actions: [
          toolAction("Remove", "remove_from_cart", { productId: line.productId, variantId: line.variantId }),
        ],
      })),
      subtotal: view.subtotal,
      itemCount: view.itemCount,
      actions: view.lines.some((line) => line.available)
        ? [toolAction("Checkout", "create_checkout_preview", {}, "primary"), promptAction("Keep shopping", "Show me more products")]
        : [promptAction("Find products", "Show me best sellers")],
    };
  }

  function rememberCart(ctx, view) {
    ctx.state.lastCartShown = view.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, name: line.name }));
  }

  function resolveCartLine(ctx, items, args) {
    const productId = cleanText(args.productId, 120);
    if (productId) {
      const variantId = cleanText(args.variantId, 120);
      const index = items.findIndex((item) => item.productId === productId && (variantId ? item.variantId === variantId : true));
      if (index < 0) throw toolError("That item is not in your cart.", { status: 404, code: "AI_CART_ITEM_NOT_FOUND" });
      return index;
    }
    const cartIndex = toInt(args.cartIndex, 0);
    if (cartIndex) {
      const shown = Array.isArray(ctx.state.lastCartShown) ? ctx.state.lastCartShown : [];
      const ref = cartIndex === -1 ? shown[shown.length - 1] : shown[cartIndex - 1];
      if (ref) {
        const index = items.findIndex((item) => item.productId === ref.productId && item.variantId === ref.variantId);
        if (index >= 0) return index;
      }
      const direct = cartIndex === -1 ? items.length - 1 : cartIndex - 1;
      if (items[direct]) return direct;
      throw toolError(`Your cart has ${items.length} item${items.length === 1 ? "" : "s"}. Which one do you mean?`, { status: 422, code: "AI_NEEDS_CLARIFICATION" });
    }
    if (items.length === 1) return 0;
    throw toolError("Which cart item do you mean? Say its number, e.g. \"remove item 2\".", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
  }

  // --------------------------------------------------------------- checkout

  async function loadPartners(ctx, kind) {
    const body = await callApi(ctx, "GET", `/api/${kind}-partners`, { query: { productOptions: "1" } });
    const seen = new Set();
    return (Array.isArray(body.partners) ? body.partners : []).filter((partner) => {
      const key = String(partner?.id ?? "").trim().toLowerCase();
      if (!isEnabledPartner(partner) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function loadAddresses(ctx) {
    const body = await callApi(ctx, "GET", "/api/account/delivery-addresses");
    const book = body.book || {};
    const entries = (Array.isArray(book.entries) ? book.entries : []).filter((entry) => entry && entry.id);
    return { entries, selectedId: String(book.selectedId || "") };
  }

  async function quoteSwitchRider(ctx, sellerAdminId, address) {
    const lat = Number(address?.lat);
    const lng = Number(address?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    try {
      const body = await callApi(ctx, "POST", "/api/switch-rider/quote", {
        body: { sellerAdminId, lat, lng, packageCount: 1 },
      });
      return body?.quote?.available ? body.quote : null;
    } catch {
      return null;
    }
  }

  async function countBuyerOrders(accountId) {
    try {
      const orders = await readOrders({ accountId });
      return (Array.isArray(orders) ? orders : []).filter((entry) => String(entry?.accountId ?? "").trim() === accountId).length;
    } catch {
      return 0;
    }
  }

  async function evaluateVoucherPreview(ctx, { code, lines, shippingFee, hasFlashDeal }) {
    if (!vouchersApi?.readVouchers || !voucherRules?.evaluateVoucher) return { voucher: null };
    const vouchers = await vouchersApi.readVouchers({ persistPurge: false });
    const accountId = ctx.session.accountId;
    const context = {
      lines,
      shippingFee,
      hasFlashDeal,
      hasSellerVoucher: false,
      hasPlatformVoucher: false,
      hasFreeShippingVoucher: false,
      hasRewards: false,
      customer: { orderCount: await countBuyerOrders(accountId), id: accountId },
      accountId,
      now: new Date(ctx.now()),
    };
    if (code) {
      const wanted = normalizeCode(code);
      const voucher = vouchers.find((entry) => normalizeCode(entry?.code) === wanted);
      if (!voucher) return { voucher: null, error: `Voucher ${wanted} was not found.` };
      const result = voucherRules.evaluateVoucher(voucher, context);
      if (!result.ok) return { voucher: null, error: result.reasons?.[0] || `Voucher ${wanted} can't be used for this order.` };
      return { voucher, result, auto: false };
    }
    const autoCandidates = vouchers.filter(
      (entry) =>
        !entry?.sellerAdminId &&
        voucherRules.normalizeRedemptionMethod(entry?.redemptionMethod, entry) === voucherRules.REDEMPTION_METHODS.AUTO_APPLY,
    );
    const picked = voucherRules.pickVoucher(autoCandidates, { ...context, preferAutoApply: true });
    return picked ? { voucher: picked.voucher, result: picked.result, auto: true } : { voucher: null };
  }

  /**
   * Builds the full checkout from backend data only. `selections` holds the
   * buyer's choices (ids); every amount is recomputed here.
   */
  async function buildCheckout(ctx, selections = {}) {
    const view = await buildCartView(ctx, { fresh: true });
    const availableLines = view.lines.filter((line) => line.available);
    if (!view.lines.length) throw toolError("Your cart is empty. Tell me what you'd like to buy.", { status: 409, code: "AI_CART_EMPTY" });
    if (!availableLines.length) {
      throw toolError("None of the items in your cart can be checked out right now (out of stock or unavailable).", { status: 409, code: "AI_CART_UNAVAILABLE" });
    }
    const sellers = [...new Set(availableLines.map((line) => line.sellerAdminId))];
    const sellerAdminId = sellers.includes(selections.sellerAdminId) ? selections.sellerAdminId : sellers[0];
    const lines = availableLines.filter((line) => line.sellerAdminId === sellerAdminId);
    const skipped = view.lines.filter((line) => !line.available);
    const otherSellerCount = sellers.length - 1;

    const [addressBook, deliveryPartners, paymentPartners, profile] = await Promise.all([
      loadAddresses(ctx),
      loadPartners(ctx, "delivery"),
      loadPartners(ctx, "payment"),
      typeof getBuyerProfile === "function" ? getBuyerProfile(ctx.session.accountId).catch(() => null) : null,
    ]);

    const address =
      addressBook.entries.find((entry) => String(entry.id) === String(selections.addressId || "")) ||
      addressBook.entries.find((entry) => String(entry.id) === addressBook.selectedId) ||
      addressBook.entries[0] ||
      null;

    const switchRiderQuote = address ? await quoteSwitchRider(ctx, sellerAdminId, address) : null;
    const deliveryOptions = [
      ...(switchRiderQuote
        ? [{ id: "switch-rider", name: "Switch Rider", imageUrl: "", fee: money(switchRiderQuote.deliveryFee), estimate: cleanText(switchRiderQuote.estimateLabel, 120), switchRider: true }]
        : []),
      ...deliveryPartners
        .filter((partner) => !isSwitchRiderPartnerName(partner.branch) && String(partner.id).toLowerCase() !== "switch-rider")
        .map((partner) => ({ id: String(partner.id), name: cleanText(partner.branch, 80) || "Delivery partner", imageUrl: String(partner.imageUrl || ""), switchRider: false })),
    ];
    const delivery =
      deliveryOptions.find((option) => option.id === String(selections.deliveryPartnerId || "")) || deliveryOptions[0] || null;

    const paymentPartner = paymentPartners.find((partner) => String(partner.id) === String(selections.paymentPartnerId || "")) || null;
    const paymentMode = selections.paymentMode === "cod" || selections.paymentMode === "full" ? selections.paymentMode : "";

    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = money(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const flashFreeShipping = lines.some((line) => line.deal?.freeShipping);
    let shippingFee = 0;
    if (!flashFreeShipping && delivery) {
      shippingFee = delivery.switchRider ? money(delivery.fee) : itemCount >= FREE_SHIPPING_ITEM_COUNT ? 0 : FLAT_SHIPPING_FEE;
    }
    const voucherLines = lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      sellerAdminId: line.sellerAdminId,
      sellerId: line.sellerAdminId,
      category: productCategories(line.product)[0] || "",
      categoryId: productCategories(line.product)[0] || "",
      categories: productCategories(line.product),
      unitPrice: line.unitPrice,
      price: line.unitPrice,
      quantity: line.quantity,
    }));
    const voucherEval = await evaluateVoucherPreview(ctx, {
      code: selections.voucherCode,
      lines: voucherLines,
      shippingFee,
      hasFlashDeal: lines.some((line) => line.deal),
    });
    let voucherError = voucherEval.error || "";
    let applied = voucherEval.voucher ? voucherEval : null;
    if (voucherError) {
      const fallback = await evaluateVoucherPreview(ctx, { code: "", lines: voucherLines, shippingFee, hasFlashDeal: lines.some((line) => line.deal) });
      applied = fallback.voucher ? fallback : null;
    }
    const merchandiseDiscount = applied ? money(applied.result.merchandiseDiscount) : 0;
    const shippingDiscount = applied ? money(Math.min(shippingFee, applied.result.shippingDiscount)) : 0;
    const total = money(Math.max(0, subtotal - merchandiseDiscount + shippingFee - shippingDiscount));
    const dueNow = paymentMode === "cod" ? requiredCodDeposit(total) : total;

    const missing = [];
    if (!address) missing.push("address");
    if (!delivery) missing.push("delivery");
    if (!paymentPartner || !paymentMode) missing.push("payment");
    const contactName = cleanText(profile?.name, 120);
    const contactPhone = cleanText(profile?.phone, 20).replace(/[\s-]/g, "");
    if (!contactName || !/^\+?[0-9]{7,15}$/.test(contactPhone)) missing.push("contact");

    const warnings = [];
    if (skipped.length) warnings.push(`${skipped.length} cart item${skipped.length === 1 ? " is" : "s are"} unavailable and won't be included.`);
    if (otherSellerCount > 0) warnings.push(`Items from ${otherSellerCount} other shop${otherSellerCount === 1 ? "" : "s"} stay in your cart for a separate checkout.`);
    if (voucherError) warnings.push(voucherError);
    if (paymentMode === "cod" && !ctx.isEnabled("cashOnDelivery")) warnings.push("Cash on delivery is currently disabled.");
    if (paymentMode === "full" && !ctx.isEnabled("onlinePayments")) warnings.push("Online payments are currently disabled.");

    return {
      sellerAdminId,
      sellerName: lines[0]?.seller || "",
      lines,
      skipped,
      otherSellerCount,
      addresses: addressBook.entries,
      address,
      deliveryOptions,
      delivery,
      switchRiderQuote: delivery?.switchRider ? switchRiderQuote : null,
      paymentPartners,
      paymentPartner,
      paymentMode,
      voucher: applied
        ? {
            id: String(applied.voucher.id || ""),
            code: String(applied.voucher.code || ""),
            title: cleanText(applied.voucher.title, 120),
            auto: Boolean(applied.auto),
          }
        : null,
      voucherError,
      itemCount,
      totals: {
        subtotal,
        merchandiseDiscount,
        shippingFee,
        shippingDiscount,
        total,
        dueNow,
        payOnDelivery: paymentMode === "cod" ? money(total - dueNow) : 0,
      },
      contact: { name: contactName, phone: contactPhone },
      missing,
      warnings,
      ready: missing.length === 0,
    };
  }

  function selectionsFromState(state) {
    const checkout = state.checkout || {};
    return {
      sellerAdminId: cleanText(checkout.sellerAdminId, 120),
      addressId: cleanText(checkout.addressId, 120),
      deliveryPartnerId: cleanText(checkout.deliveryPartnerId, 120),
      paymentPartnerId: cleanText(checkout.paymentPartnerId, 120),
      paymentMode: checkout.paymentMode === "cod" || checkout.paymentMode === "full" ? checkout.paymentMode : "",
      voucherCode: normalizeCode(checkout.voucherCode),
    };
  }

  function rememberCheckout(ctx, checkout) {
    ctx.state.checkout = {
      ...(ctx.state.checkout || {}),
      sellerAdminId: checkout.sellerAdminId,
      addressId: checkout.address ? String(checkout.address.id) : "",
      deliveryPartnerId: checkout.delivery ? checkout.delivery.id : "",
      paymentPartnerId: checkout.paymentPartner ? String(checkout.paymentPartner.id) : "",
      paymentMode: checkout.paymentMode,
      voucherCode: checkout.voucherError ? "" : normalizeCode(ctx.state.checkout?.voucherCode),
    };
  }

  const MISSING_LABELS = {
    address: "a delivery address",
    delivery: "a shipping option",
    payment: "a payment method",
    contact: "your name and mobile number in your profile",
  };

  function checkoutBlock(checkout) {
    return {
      type: "checkout_summary",
      seller: { adminId: checkout.sellerAdminId, name: checkout.sellerName },
      items: checkout.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        name: line.name,
        variantName: line.variantName,
        imageUrl: line.imageUrl,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        deal: Boolean(line.deal),
      })),
      address: checkout.address
        ? { id: String(checkout.address.id), label: cleanText(checkout.address.label, 60), text: formatAddress(checkout.address) }
        : null,
      delivery: checkout.delivery
        ? { id: checkout.delivery.id, name: checkout.delivery.name, estimate: checkout.delivery.estimate || "" }
        : null,
      payment:
        checkout.paymentPartner && checkout.paymentMode
          ? {
              partnerId: String(checkout.paymentPartner.id),
              name: cleanText(checkout.paymentPartner.branch, 80),
              mode: checkout.paymentMode,
              modeLabel: checkout.paymentMode === "cod" ? "Cash on delivery (deposit now)" : "Full payment",
            }
          : null,
      voucher: checkout.voucher,
      totals: checkout.totals,
      warnings: checkout.warnings,
      missing: checkout.missing.map((key) => MISSING_LABELS[key] || key),
      ready: checkout.ready,
      actions: [
        toolAction("Change Address", "get_addresses", {}),
        toolAction("Shipping", "get_shipping_options", {}),
        toolAction("Voucher", "get_vouchers", {}),
        toolAction("Choose Payment", "get_payment_options", {}),
        ...(checkout.missing.includes("contact") ? [{ label: "Update profile", kind: "navigate", target: "profile", style: "secondary" }] : []),
        ...(checkout.missing.includes("address") ? [{ label: "Add address", kind: "navigate", target: "addresses", style: "secondary" }] : []),
        ...(checkout.ready ? [toolAction(`Place Order ${peso(checkout.totals.total)}`, "place_order", {}, "primary")] : []),
      ],
    };
  }

  function checkoutMessage(checkout) {
    if (checkout.ready) {
      return `Here's your order review. Total is ${peso(checkout.totals.total)}${
        checkout.paymentMode === "cod" ? ` (${peso(checkout.totals.dueNow)} deposit now, ${peso(checkout.totals.payOnDelivery)} on delivery)` : ""
      }. Tap Place Order when you're ready.`;
    }
    const need = checkout.missing.map((key) => MISSING_LABELS[key] || key);
    return `Almost there. I still need ${need.join(", ").replace(/, ([^,]*)$/, " and $1")} before you can place the order.`;
  }

  function checkoutData(checkout) {
    return {
      seller: checkout.sellerName,
      items: checkout.lines.map((line) => ({ name: line.name, variant: line.variantName, qty: line.quantity, unitPrice: line.unitPrice })),
      totals: checkout.totals,
      address: checkout.address ? formatAddress(checkout.address) : null,
      delivery: checkout.delivery?.name || null,
      payment: checkout.paymentPartner ? `${checkout.paymentPartner.branch} (${checkout.paymentMode || "mode not chosen"})` : null,
      voucher: checkout.voucher?.code || null,
      missing: checkout.missing,
      warnings: checkout.warnings,
    };
  }

  function assertCheckoutAllowed(ctx) {
    if (!ctx.flags.aiCheckout) {
      throw toolError("Checkout through the assistant is turned off right now. You can still check out from your cart.", {
        status: 403,
        code: "AI_CHECKOUT_DISABLED",
      });
    }
    if (!ctx.isEnabled("buyerCheckout")) {
      throw toolError("Checkout is currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
    }
  }

  async function previewResult(ctx, extraMessage = "") {
    assertCheckoutAllowed(ctx);
    const checkout = await buildCheckout(ctx, selectionsFromState(ctx.state));
    rememberCheckout(ctx, checkout);
    return ok({
      message: [extraMessage, checkoutMessage(checkout)].filter(Boolean).join(" "),
      blocks: [checkoutBlock(checkout)],
      data: checkoutData(checkout),
      events: ["ai_checkout_start"],
    });
  }

  // ----------------------------------------------------------------- orders

  async function loadOrderGroups(ctx) {
    const accountId = ctx.session.accountId;
    const entries = (await readOrders({ accountId })).filter((entry) => String(entry?.accountId ?? "").trim() === accountId);
    const groups = new Map();
    for (const entry of entries) {
      const key = String(entry.orderGroupId || `${entry.adminId || ""}|${entry.createdAtEpochMs || ""}`);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    return [...groups.entries()]
      .map(([key, list]) => {
        const primary = list[0];
        return {
          key,
          orderGroupId: String(primary.orderGroupId || ""),
          createdAtEpochMs: toInt(primary.createdAtEpochMs, 0),
          stage: String(primary.stage || ""),
          entries: list,
          total: money(Math.max(...list.map((entry) => Number(entry.grandTotalAmount) || 0))),
          amountDue: money(Math.max(...list.map((entry) => Number(entry.amountToPayAmount) || 0))),
          paymentOption: String(primary.paymentOptionLabel || ""),
          paymentStatus: String(primary.paymentStatus || ""),
          deliveryPartnerName: String(primary.deliveryPartnerName || ""),
          cancelRequestStatus: String(primary.cancelRequestStatus || ""),
          adminId: String(primary.adminId || ""),
        };
      })
      .sort((a, b) => b.createdAtEpochMs - a.createdAtEpochMs);
  }

  function orderView(group) {
    return {
      orderGroupId: group.orderGroupId || String(group.createdAtEpochMs),
      reference: shortRef(group.orderGroupId || group.createdAtEpochMs),
      stage: group.stage,
      stageLabel: stageLabel(group.stage),
      placedAt: formatDateTime(group.createdAtEpochMs),
      total: group.total,
      amountDue: group.stage === "toPay" ? group.amountDue : 0,
      paymentOption: group.paymentOption,
      delivery: group.deliveryPartnerName,
      cancelRequestStatus: group.cancelRequestStatus,
      items: group.entries.map((entry) => ({
        name: cleanText(entry.productName, 120),
        variantName: cleanText(entry.variantName, 60),
        quantity: toInt(entry.quantity, 1),
        imageUrl: String(entry.productImageUrl || ""),
      })),
    };
  }

  function orderActions(group) {
    const actions = [toolAction("Track", "track_order", { orderRef: group.orderGroupId || String(group.createdAtEpochMs) })];
    if (group.stage === "toPay" && group.amountDue > 0) {
      actions.unshift(toolAction(`Pay ${peso(group.amountDue)}`, "start_payment", { orderGroupId: group.orderGroupId || String(group.createdAtEpochMs) }, "primary"));
    }
    if (CANCELLABLE_STAGES.has(group.stage) && group.cancelRequestStatus !== "pending") {
      actions.push(toolAction("Cancel order", "cancel_order", { orderRef: group.orderGroupId || String(group.createdAtEpochMs) }, "danger"));
    }
    return actions;
  }

  function findOrderGroup(groups, orderRef) {
    const ref = String(orderRef || "").trim().toLowerCase().replace(/^#/, "");
    if (!ref) return null;
    return (
      groups.find((group) => group.orderGroupId.toLowerCase() === ref || String(group.createdAtEpochMs) === ref) ||
      groups.find((group) => group.orderGroupId.toLowerCase().endsWith(ref) || shortRef(group.orderGroupId).toLowerCase() === ref) ||
      groups.find((group) => group.entries.some((entry) => String(entry.id || "").toLowerCase().includes(ref))) ||
      null
    );
  }

  async function startPaymentFor(ctx, orderGroupId) {
    if (!ctx.isEnabled("onlinePayments")) {
      throw toolError("Online payments are currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
    }
    const body = await callApi(ctx, "POST", "/api/orders/checkout-session", { body: { orderGroupId } });
    if (body.alreadyPaid) {
      return ok({
        message: "This order is already paid.",
        blocks: [notice("This order is already paid.", "success")],
        data: { alreadyPaid: true },
      });
    }
    if (!body.checkoutUrl) throw toolError("The payment provider did not return a checkout page. Please try again.", { status: 502, code: "AI_PAYMENT_NO_URL" });
    return ok({
      message: "Your secure payment page is ready. Complete the payment there — I'll never ask for card numbers, OTPs or passwords in chat.",
      blocks: [
        {
          type: "payment_handoff",
          orderGroupId,
          provider: cleanText(body.provider, 40),
          checkoutUrl: String(body.checkoutUrl),
          amount: money(body.amount ?? 0) || null,
          actions: [
            { label: "Open secure payment", kind: "open_url", url: String(body.checkoutUrl), style: "primary" },
            toolAction("I've paid — check status", "check_payment_status", { orderGroupId }),
          ],
        },
      ],
      data: { paymentPageReady: true },
      events: ["ai_payment_started"],
    });
  }

  // -------------------------------------------------------------- tool list

  const tools = [
    {
      name: "search_products",
      risk: RISK.LOW,
      description:
        "Search the live Switch catalog. Use extracted filters; never invent products. Sort: relevance | price_asc | price_desc | rating | best_selling.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product keywords, e.g. 'shoes'" },
          filters: {
            type: "object",
            properties: {
              color: { type: "string" },
              size: { type: "string" },
              gender: { type: "string", enum: ["men", "women", "kids", "unisex"] },
              brand: { type: "string" },
              category: { type: "string" },
              priceMin: { type: "number" },
              priceMax: { type: "number" },
              targetPrice: { type: "number" },
              minRating: { type: "number" },
            },
          },
          sort: { type: "string", enum: ["relevance", "price_asc", "price_desc", "rating", "best_selling", "nearest"] },
          onlyDeals: { type: "boolean" },
        },
      },
      async run(ctx, args = {}) {
        const loaded = await catalog.load(ctx);
        const query = cleanText(args.query, 120);
        const filters = args.filters && typeof args.filters === "object" ? { ...args.filters } : {};
        if (filters.targetPrice && !filters.priceMin && !filters.priceMax) {
          filters.priceMin = Math.round(Number(filters.targetPrice) * 0.7);
          filters.priceMax = Math.round(Number(filters.targetPrice) * 1.15);
        }
        const sort = cleanText(args.sort, 20) || "relevance";
        const groups = expandQueryTokens(query);
        const colorWords = filters.color ? COLOR_SYNONYMS[String(filters.color).toLowerCase()] || [String(filters.color).toLowerCase()] : null;
        const size = filters.size ? String(filters.size).toLowerCase() : "";

        const candidates = [];
        for (const product of loaded.products) {
          const card = toCard(product, loaded.dealContext);
          if (card.stock <= 0) continue;
          const haystack = productSearchText(product);
          const name = String(product.name || "").toLowerCase();
          const categoryText = productCategories(product).join(" ").toLowerCase();
          const variantText = productVariants(product).map((variant) => variant.name.toLowerCase()).join(" ");
          let score = 0;
          let matchedGroups = 0;
          for (const alternatives of groups) {
            let best = 0;
            for (const alt of alternatives) {
              if (hasWord(name, alt)) best = Math.max(best, 6);
              else if (hasWord(categoryText, alt)) best = Math.max(best, 4);
              else if (hasWord(variantText, alt)) best = Math.max(best, 2);
              else if (hasWord(haystack, alt)) best = Math.max(best, 1);
            }
            if (best) matchedGroups += 1;
            score += best;
          }
          const gender = genderOf(`${name} ${categoryText} ${String(product.description || "").toLowerCase()}`);
          const colorMatch = colorWords ? colorWords.some((word) => hasWord(haystack, word)) : true;
          const colorInName = colorWords ? colorWords.some((word) => hasWord(name, word)) : false;
          const variants = productVariants(product);
          const sizeMatch = size
            ? variants.length
              ? variants.some((variant) => variantAvailability(product, variant.id) > 0 && variantWords(variant.name).includes(sizeToken(size)))
              : hasWord(haystack, `size ${size}`)
            : true;
          const genderConflict =
            filters.gender && filters.gender !== "unisex" && gender && gender !== "unisex" && gender !== "mixed" && gender !== filters.gender;
          const brandMatch = filters.brand ? hasWord(haystack, String(filters.brand).toLowerCase()) : true;
          const categoryMatch = filters.category ? hasWord(categoryText, String(filters.category).toLowerCase()) || hasWord(name, String(filters.category).toLowerCase()) : true;
          const priceOk =
            (!filters.priceMin || card.price >= Number(filters.priceMin)) && (!filters.priceMax || card.price <= Number(filters.priceMax));
          const ratingOk = !filters.minRating || (card.rating || 0) >= Number(filters.minRating);
          const dealOk = !args.onlyDeals || Boolean(card.deal);
          if (filters.gender && gender === filters.gender) score += 2;
          if (colorInName) score += 3;
          else if (colorWords && colorMatch) score += 1;
          score += Math.min(3, Math.log10(card.sold + 1));
          score += (card.rating || 0) * 0.3;
          if (filters.targetPrice) score -= (Math.abs(card.price - Number(filters.targetPrice)) / Number(filters.targetPrice)) * 3;
          candidates.push({
            product,
            card,
            score,
            queryMatch: groups.length ? matchedGroups === groups.length : true,
            queryPartial: groups.length ? matchedGroups > 0 : true,
            attributesOk: colorMatch && sizeMatch && !genderConflict && brandMatch && categoryMatch,
            priceOk,
            ratingOk,
            dealOk,
          });
        }

        const tiers = [
          { note: "", test: (c) => c.queryMatch && c.attributesOk && c.priceOk && c.ratingOk && c.dealOk },
          { note: "closest", test: (c) => c.queryMatch && c.priceOk && c.dealOk },
          { note: "outside_budget", test: (c) => c.queryMatch && c.dealOk },
          { note: "partial", test: (c) => c.queryPartial && c.dealOk && groups.length > 1 },
        ];
        let tier = tiers[0];
        let results = [];
        for (const candidateTier of tiers) {
          results = candidates.filter(candidateTier.test);
          tier = candidateTier;
          if (results.length) break;
        }

        const sorters = {
          price_asc: (a, b) => a.card.price - b.card.price || b.score - a.score,
          price_desc: (a, b) => b.card.price - a.card.price || b.score - a.score,
          rating: (a, b) => (b.card.rating || 0) - (a.card.rating || 0) || b.card.sold - a.card.sold,
          best_selling: (a, b) => b.card.sold - a.card.sold || b.score - a.score,
          relevance: (a, b) => b.score - a.score || b.card.sold - a.card.sold,
        };
        results.sort(sorters[sort] || sorters.relevance);
        const total = results.length;
        const top = results.slice(0, MAX_RESULTS).map((entry) => entry.card);

        ctx.state.lastSearch = { query, filters: args.filters || {}, sort, onlyDeals: Boolean(args.onlyDeals) };
        ctx.state.shownProducts = top.map((card) => ({ id: card.id, name: card.name }));
        ctx.state.selectedProductId = top.length === 1 ? top[0].id : "";
        ctx.state.pendingVariant = null;

        const label = [filters.color, query || "products"].filter(Boolean).join(" ");
        const budget = filters.targetPrice
          ? ` around ${peso(filters.targetPrice)}`
          : filters.priceMax && filters.priceMin
            ? ` between ${peso(filters.priceMin)} and ${peso(filters.priceMax)}`
            : filters.priceMax
              ? ` under ${peso(filters.priceMax)}`
              : filters.priceMin
                ? ` above ${peso(filters.priceMin)}`
                : "";
        if (!top.length) {
          return ok({
            message: `I couldn't find any ${label}${budget} in stock right now. Try a different keyword or a wider budget.`,
            data: { total: 0 },
            suggestions: ["Show best sellers", "Show today's deals"],
            events: ["product_search"],
          });
        }
        const noteText = {
          closest: `I couldn't find an exact match for ${label}${budget}, so here are the closest options.`,
          outside_budget: `Nothing matched your budget${budget}, but these ${query || "items"} are available:`,
          partial: `I couldn't find an exact match for "${query}". These are related:`,
        }[tier.note];
        const sortText = { price_asc: " from lowest price", price_desc: " from highest price", rating: " by rating", best_selling: " by best selling" }[sort] || "";
        const message =
          noteText ||
          `I found ${total} ${label}${budget}${total > MAX_RESULTS ? `. Here are the top ${top.length}` : ""}${sortText}.${
            sort === "nearest" ? " (Distance sorting isn't available, so these are sorted by relevance.)" : ""
          }`;
        return ok({
          message,
          blocks: [
            {
              type: "product_carousel",
              title: label,
              total,
              products: top.map((card) => ({ ...card, actions: cardActions(card) })),
            },
          ],
          data: { total, shown: top.map(compactCard), matchQuality: tier.note || "exact" },
          suggestions: ["Cheapest first", "Best rated", "Compare the first two"],
          events: ["product_search"],
        });
      },
    },
    {
      name: "get_product",
      risk: RISK.LOW,
      description: "Get real details (price, stock, options) of one product by id or by its number in the last results.",
      parameters: {
        type: "object",
        properties: { productId: { type: "string" }, ordinal: { type: "integer", description: "1-based position in last results; -1 = last" } },
      },
      async run(ctx, args = {}) {
        const loaded = await catalog.load(ctx);
        const product = resolveProductRef(ctx, loaded, args);
        const card = toCard(product, loaded.dealContext, { detail: true });
        ctx.state.selectedProductId = card.id;
        const inStock = (card.variants || []).filter((variant) => variant.stock > 0);
        const options = card.hasVariants
          ? inStock.length
            ? ` Available options: ${inStock.map((variant) => variant.name).join(", ")}.`
            : " All options are currently out of stock."
          : "";
        return ok({
          message: `${card.name} is ${card.priceFrom ? "from " : ""}${peso(card.price)}${card.originalPrice ? ` (was ${peso(card.originalPrice)})` : ""}${
            card.rating ? `, rated ${card.rating}/5` : ""
          }${card.sold ? `, ${card.sold} sold` : ""}. ${card.stockLabel}.${options}`,
          blocks: [{ type: "product_card", product: { ...card, actions: cardActions(card) } }],
          data: { product: { ...compactCard(card, 0), variants: (card.variants || []).map((variant) => ({ id: variant.id, name: variant.name, price: variant.price, stock: variant.stock })), description: card.description } },
        });
      },
    },
    {
      name: "compare_products",
      risk: RISK.LOW,
      description: "Compare 2–4 products using real catalog fields only.",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          ordinals: { type: "array", items: { type: "integer" } },
        },
      },
      async run(ctx, args = {}) {
        const loaded = await catalog.load(ctx);
        let products = [];
        if (Array.isArray(args.productIds) && args.productIds.length) {
          products = args.productIds.slice(0, 4).map((id) => resolveProductRef(ctx, loaded, { productId: id }));
        } else if (Array.isArray(args.ordinals) && args.ordinals.length >= 2) {
          products = args.ordinals.slice(0, 4).map((ordinal) => resolveProductRef(ctx, loaded, { ordinal }));
        } else {
          const shown = Array.isArray(ctx.state.shownProducts) ? ctx.state.shownProducts : [];
          if (shown.length < 2) throw toolError("Show me at least two products first, then tell me which ones to compare.", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
          if (shown.length > 2) throw toolError(`Which ones should I compare? e.g. "compare 1 and 3" (1–${shown.length}).`, { status: 422, code: "AI_NEEDS_CLARIFICATION" });
          products = shown.map((ref) => resolveProductRef(ctx, loaded, { productId: ref.id }));
        }
        const cards = products.map((product) => toCard(product, loaded.dealContext, { detail: true }));
        const cheapest = cards.reduce((min, card) => (card.price < min.price ? card : min), cards[0]);
        const rated = cards.filter((card) => card.rating);
        const bestRated = rated.length ? rated.reduce((max, card) => (card.rating > max.rating ? card : max), rated[0]) : null;
        const bestSeller = cards.reduce((max, card) => (card.sold > max.sold ? card : max), cards[0]);
        const facts = [`${cheapest.name} is the cheapest at ${peso(cheapest.price)}.`];
        if (bestRated && rated.length > 1) facts.push(`${bestRated.name} has the highest rating (${bestRated.rating}/5).`);
        if (bestSeller.sold > 0) facts.push(`${bestSeller.name} has sold the most (${bestSeller.sold}).`);
        return ok({
          message: facts.join(" "),
          blocks: [
            {
              type: "comparison",
              products: cards.map((card) => ({ ...card, actions: cardActions(card) })),
              rows: [
                { label: "Price", values: cards.map((card) => peso(card.price)) },
                { label: "Rating", values: cards.map((card) => (card.rating ? `${card.rating}/5` : "No ratings yet")) },
                { label: "Sold", values: cards.map((card) => String(card.sold)) },
                { label: "Stock", values: cards.map((card) => card.stockLabel) },
                { label: "Options", values: cards.map((card) => ((card.variants || []).length ? (card.variants || []).map((variant) => variant.name).join(", ") : "—")) },
                { label: "Seller", values: cards.map((card) => card.seller || "—") },
              ],
            },
          ],
          data: { compared: cards.map(compactCard) },
        });
      },
    },
    {
      name: "get_deals",
      risk: RISK.LOW,
      description: "List products with a live Flash Deal right now.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const loaded = await catalog.load(ctx);
        const cards = loaded.products
          .map((product) => toCard(product, loaded.dealContext))
          .filter((card) => card.deal && card.stock > 0)
          .sort((a, b) => b.discountPercent - a.discountPercent)
          .slice(0, MAX_RESULTS);
        ctx.state.shownProducts = cards.map((card) => ({ id: card.id, name: card.name }));
        if (!cards.length) return ok({ message: "There are no live Flash Deals right now.", data: { total: 0 } });
        return ok({
          message: `Here ${cards.length === 1 ? "is the live deal" : `are ${cards.length} live deals`} right now.`,
          blocks: [{ type: "product_carousel", title: "Flash Deals", products: cards.map((card) => ({ ...card, actions: cardActions(card) })) }],
          data: { shown: cards.map(compactCard) },
        });
      },
    },
    {
      name: "get_cart",
      risk: RISK.LOW,
      description: "Show the buyer's cart with current backend prices.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const view = await buildCartView(ctx, { fresh: true });
        rememberCart(ctx, view);
        if (!view.lines.length) return ok({ message: "Your cart is empty.", blocks: [cartBlock(view)], data: { items: 0 } });
        const issues = view.lines.filter((line) => !line.available).length;
        return ok({
          message: `You have ${view.itemCount} item${view.itemCount === 1 ? "" : "s"} in your cart. Subtotal: ${peso(view.subtotal)}.${
            issues ? ` ${issues} item${issues === 1 ? " needs" : "s need"} attention.` : ""
          }`,
          blocks: [cartBlock(view)],
          data: {
            items: view.lines.map((line) => ({ n: line.index, name: line.name, variant: line.variantName, qty: line.quantity, unitPrice: line.unitPrice, issue: line.issue })),
            subtotal: view.subtotal,
          },
        });
      },
    },
    {
      name: "add_to_cart",
      risk: RISK.MEDIUM,
      description: "Add a real product (and option/size) to the cart. Ask for the option when the product has variants.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          ordinal: { type: "integer" },
          variantId: { type: "string" },
          variantChoice: { type: "string", description: "Option the buyer said, e.g. '42' or 'Medium'" },
          quantity: { type: "integer", minimum: 1, maximum: 99 },
        },
      },
      async run(ctx, args = {}) {
        const loaded = await catalog.load(ctx, { fresh: true });
        const product = resolveProductRef(ctx, loaded, args);
        const quantity = Math.max(1, Math.min(99, toInt(args.quantity, 1) || 1));
        const resolved = resolveVariant(product, args);
        if (resolved.needsChoice) {
          if (!resolved.options.length) throw toolError(`${cleanText(product.name, 80)} is out of stock in all options.`, { status: 409, code: "AI_OUT_OF_STOCK" });
          ctx.state.pendingVariant = { productId: String(product.id), quantity };
          ctx.state.selectedProductId = String(product.id);
          return ok({
            message: `${resolved.reason ? `${resolved.reason} ` : ""}Which option would you like for ${cleanText(product.name, 80)}? Available: ${resolved.options.map((variant) => variant.name).join(", ")}.`,
            blocks: [variantChoiceBlock(product, resolved.options, quantity)],
            data: { needsVariant: true, options: resolved.options.map((variant) => variant.name) },
          });
        }
        const variantId = resolved.variant?.id || "";
        const available = variantAvailability(product, variantId);
        if (available <= 0) throw toolError(`${cleanText(product.name, 80)}${resolved.variant ? ` (${resolved.variant.name})` : ""} is out of stock.`, { status: 409, code: "AI_OUT_OF_STOCK" });
        const items = await store.getCart(ctx.session.accountId);
        const existing = items.find((item) => item.productId === String(product.id) && item.variantId === variantId);
        const nextQuantity = (existing?.quantity || 0) + quantity;
        if (nextQuantity > available) {
          throw toolError(`Only ${available} left${existing ? ` and you already have ${existing.quantity} in your cart` : ""}.`, { status: 409, code: "AI_STOCK_LIMIT" });
        }
        const nextItems = existing
          ? items.map((item) => (item === existing ? { ...item, quantity: nextQuantity } : item))
          : [...items, { productId: String(product.id), variantId, quantity, addedAt: new Date(ctx.now()).toISOString() }];
        await store.saveCart(ctx.session.accountId, nextItems);
        ctx.state.pendingVariant = null;
        ctx.state.selectedProductId = String(product.id);
        const view = await buildCartView(ctx);
        rememberCart(ctx, view);
        return ok({
          message: `Added ${cleanText(product.name, 80)}${resolved.variant ? ` (${resolved.variant.name})` : ""}${quantity > 1 ? ` × ${quantity}` : ""} to your cart.`,
          blocks: [cartBlock(view)],
          data: { added: { name: product.name, variant: resolved.variant?.name || "", quantity, unitPrice: catalog.priceFor(product, variantId, loaded.dealContext).price }, subtotal: view.subtotal },
          entity: { type: "product", id: String(product.id) },
          clientEffects: { cart: [{ op: "add", productId: String(product.id), variantId, quantity, adminId: String(product.adminId || "") }] },
          events: ["ai_add_to_cart"],
        });
      },
    },
    {
      name: "remove_from_cart",
      risk: RISK.MEDIUM,
      description: "Remove an item from the cart by its number in the last cart view or by product id.",
      parameters: { type: "object", properties: { cartIndex: { type: "integer" }, productId: { type: "string" }, variantId: { type: "string" } } },
      async run(ctx, args = {}) {
        const items = await store.getCart(ctx.session.accountId);
        if (!items.length) throw toolError("Your cart is already empty.", { status: 409, code: "AI_CART_EMPTY" });
        const index = resolveCartLine(ctx, items, args);
        const removed = items[index];
        await store.saveCart(ctx.session.accountId, items.filter((_, i) => i !== index));
        const view = await buildCartView(ctx);
        rememberCart(ctx, view);
        const loaded = view.loaded;
        const name = cleanText(loaded.byId.get(removed.productId)?.name, 80) || "the item";
        return ok({
          message: `Removed ${name} from your cart.`,
          blocks: [cartBlock(view)],
          data: { removed: name, subtotal: view.subtotal },
          clientEffects: { cart: [{ op: "remove", productId: removed.productId, variantId: removed.variantId }] },
        });
      },
    },
    {
      name: "update_cart_quantity",
      risk: RISK.MEDIUM,
      description: "Change the quantity of a cart item (0 removes it).",
      parameters: {
        type: "object",
        properties: { cartIndex: { type: "integer" }, productId: { type: "string" }, variantId: { type: "string" }, quantity: { type: "integer", minimum: 0, maximum: 99 } },
        required: ["quantity"],
      },
      async run(ctx, args = {}) {
        const items = await store.getCart(ctx.session.accountId);
        if (!items.length) throw toolError("Your cart is empty.", { status: 409, code: "AI_CART_EMPTY" });
        const index = resolveCartLine(ctx, items, args);
        const quantity = Math.max(0, Math.min(99, toInt(args.quantity, -1)));
        if (!(quantity >= 0)) throw toolError("How many would you like?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        const target = items[index];
        if (quantity > 0) {
          const loaded = await catalog.load(ctx, { fresh: true });
          const product = loaded.byId.get(target.productId);
          if (!product) throw toolError("That product is no longer available.", { status: 404, code: "AI_PRODUCT_UNAVAILABLE" });
          const available = variantAvailability(product, target.variantId);
          if (quantity > available) throw toolError(`Only ${available} left for that item.`, { status: 409, code: "AI_STOCK_LIMIT" });
        }
        const nextItems = quantity === 0 ? items.filter((_, i) => i !== index) : items.map((item, i) => (i === index ? { ...item, quantity } : item));
        await store.saveCart(ctx.session.accountId, nextItems);
        const view = await buildCartView(ctx);
        rememberCart(ctx, view);
        return ok({
          message: quantity === 0 ? "Removed the item from your cart." : `Updated the quantity to ${quantity}.`,
          blocks: [cartBlock(view)],
          data: { subtotal: view.subtotal },
          clientEffects: { cart: [{ op: quantity === 0 ? "remove" : "set", productId: target.productId, variantId: target.variantId, quantity }] },
        });
      },
    },
    {
      name: "get_addresses",
      risk: RISK.LOW,
      description: "List the buyer's saved delivery addresses so they can pick one for checkout.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const book = await loadAddresses(ctx);
        if (!book.entries.length) {
          return ok({
            message: "You don't have a saved delivery address yet. Add one in your account, then come back to check out.",
            blocks: [{ type: "choice_list", title: "Delivery address", options: [], actions: [{ label: "Add address", kind: "navigate", target: "addresses", style: "primary" }] }],
            data: { addresses: 0 },
          });
        }
        const current = ctx.state.checkout?.addressId || book.selectedId;
        return ok({
          message: "Where should we deliver?",
          blocks: [
            {
              type: "choice_list",
              title: "Delivery address",
              options: book.entries.map((entry) => ({
                label: cleanText(entry.label, 40) || "Address",
                description: formatAddress(entry),
                selected: String(entry.id) === String(current),
                action: toolAction("Deliver here", "select_address", { addressId: String(entry.id) }),
              })),
            },
          ],
          data: { addresses: book.entries.map((entry, index) => ({ n: index + 1, id: String(entry.id), label: entry.label, text: formatAddress(entry) })) },
        });
      },
    },
    {
      name: "select_address",
      risk: RISK.LOW,
      description: "Use one of the buyer's saved addresses for this checkout.",
      parameters: { type: "object", properties: { addressId: { type: "string" } }, required: ["addressId"] },
      async run(ctx, args = {}) {
        const book = await loadAddresses(ctx);
        const entry = book.entries.find((item) => String(item.id) === cleanText(args.addressId, 120));
        if (!entry) throw toolError("That address was not found in your address book.", { status: 404, code: "AI_ADDRESS_NOT_FOUND" });
        ctx.state.checkout = { ...(ctx.state.checkout || {}), addressId: String(entry.id) };
        return previewResult(ctx, `Delivering to ${cleanText(entry.label, 40) || formatAddress(entry)}.`);
      },
    },
    {
      name: "get_shipping_options",
      risk: RISK.LOW,
      description: "List delivery options and fees for the current checkout.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        assertCheckoutAllowed(ctx);
        const checkout = await buildCheckout(ctx, selectionsFromState(ctx.state));
        rememberCheckout(ctx, checkout);
        if (!checkout.deliveryOptions.length) return ok({ message: "No delivery options are available right now.", data: { options: 0 } });
        const itemCount = checkout.itemCount;
        const flatFee = checkout.lines.some((line) => line.deal?.freeShipping) || itemCount >= FREE_SHIPPING_ITEM_COUNT ? 0 : FLAT_SHIPPING_FEE;
        return ok({
          message: "Choose how you'd like it delivered.",
          blocks: [
            {
              type: "choice_list",
              title: "Shipping",
              options: checkout.deliveryOptions.map((option) => ({
                label: option.name,
                description: [option.switchRider ? peso(option.fee) : flatFee ? peso(flatFee) : "Free shipping", option.estimate].filter(Boolean).join(" · "),
                selected: checkout.delivery?.id === option.id,
                action: toolAction("Use this", "select_shipping", { deliveryPartnerId: option.id }),
              })),
            },
          ],
          data: { options: checkout.deliveryOptions.map((option) => ({ id: option.id, name: option.name, fee: option.switchRider ? option.fee : flatFee })) },
        });
      },
    },
    {
      name: "select_shipping",
      risk: RISK.LOW,
      description: "Choose a delivery option for this checkout.",
      parameters: { type: "object", properties: { deliveryPartnerId: { type: "string" } }, required: ["deliveryPartnerId"] },
      async run(ctx, args = {}) {
        ctx.state.checkout = { ...(ctx.state.checkout || {}), deliveryPartnerId: cleanText(args.deliveryPartnerId, 120) };
        const result = await previewResult(ctx);
        if (ctx.state.checkout.deliveryPartnerId !== cleanText(args.deliveryPartnerId, 120)) {
          result.message = `That delivery option isn't available for this order. ${result.message}`;
        }
        return result;
      },
    },
    {
      name: "get_vouchers",
      risk: RISK.LOW,
      description: "List vouchers the buyer can use.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const body = await callApi(ctx, "GET", "/api/vouchers");
        const vouchers = (Array.isArray(body.vouchers) ? body.vouchers : []).filter((voucher) => voucher && voucher.code).slice(0, 8);
        if (!vouchers.length) return ok({ message: "There are no vouchers available right now. If you have a code, tell me and I'll check it.", data: { vouchers: 0 } });
        const describe = (voucher) => {
          const value = Number(voucher.discountValue) || 0;
          const off = voucher.freeShipping ? "Free shipping" : voucher.discountType === "percent" ? `${value}% off` : value ? `${peso(value)} off` : cleanText(voucher.title, 60);
          const min = Number(voucher.minimumSpend) > 0 ? ` · min. spend ${peso(voucher.minimumSpend)}` : "";
          return `${off}${min}`;
        };
        return ok({
          message: "These vouchers are available. The discount is confirmed against your actual cart at checkout.",
          blocks: [
            {
              type: "choice_list",
              title: "Vouchers",
              options: vouchers.map((voucher) => ({
                label: String(voucher.code),
                description: describe(voucher),
                action: toolAction("Apply", "apply_voucher", { code: String(voucher.code) }),
              })),
              actions: ctx.state.checkout?.voucherCode ? [toolAction("Remove voucher", "remove_voucher", {})] : [],
            },
          ],
          data: { vouchers: vouchers.map((voucher) => ({ code: voucher.code, summary: describe(voucher) })) },
        });
      },
    },
    {
      name: "apply_voucher",
      risk: RISK.MEDIUM,
      description: "Apply a voucher code to the current checkout. The backend decides eligibility and discount.",
      parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
      async run(ctx, args = {}) {
        const code = normalizeCode(args.code);
        if (!code) throw toolError("Which voucher code should I apply?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        assertCheckoutAllowed(ctx);
        ctx.state.checkout = { ...(ctx.state.checkout || {}), voucherCode: code };
        const checkout = await buildCheckout(ctx, selectionsFromState(ctx.state));
        if (checkout.voucherError) {
          ctx.state.checkout.voucherCode = "";
          rememberCheckout(ctx, checkout);
          throw toolError(checkout.voucherError, { status: 409, code: "AI_VOUCHER_REJECTED" });
        }
        rememberCheckout(ctx, checkout);
        ctx.state.checkout.voucherCode = code;
        const saved = checkout.totals.merchandiseDiscount + checkout.totals.shippingDiscount;
        return ok({
          message: `Voucher ${code} applied — you save ${peso(saved)}. ${checkoutMessage(checkout)}`,
          blocks: [checkoutBlock(checkout)],
          data: checkoutData(checkout),
        });
      },
    },
    {
      name: "remove_voucher",
      risk: RISK.MEDIUM,
      description: "Remove the voucher code from the current checkout.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        ctx.state.checkout = { ...(ctx.state.checkout || {}), voucherCode: "" };
        return previewResult(ctx, "Voucher removed.");
      },
    },
    {
      name: "get_payment_options",
      risk: RISK.LOW,
      description: "List payment methods (existing secure payment partners) and payment modes.",
      parameters: { type: "object", properties: {} },
      async run(ctx) {
        const partners = await loadPartners(ctx, "payment");
        const onlineOk = ctx.isEnabled("onlinePayments");
        const codOk = ctx.isEnabled("cashOnDelivery");
        if (!partners.length || (!onlineOk && !codOk)) {
          return ok({ message: "No payment methods are available right now.", data: { options: 0 } });
        }
        const current = ctx.state.checkout || {};
        return ok({
          message: "How would you like to pay? Payments go through the secure payment page — never share card numbers, CVV or OTP in chat.",
          blocks: [
            {
              type: "payment_options",
              options: partners.map((partner) => ({
                id: String(partner.id),
                label: cleanText(partner.branch, 60) || "Payment partner",
                imageUrl: String(partner.imageUrl || ""),
                selected: String(partner.id) === String(current.paymentPartnerId || ""),
                actions: [
                  ...(onlineOk ? [toolAction("Pay in full", "select_payment_method", { paymentPartnerId: String(partner.id), mode: "full" }, "primary")] : []),
                  ...(codOk ? [toolAction("COD (pay deposit)", "select_payment_method", { paymentPartnerId: String(partner.id), mode: "cod" })] : []),
                ],
              })),
              notes: codOk ? [`Cash on delivery needs a deposit of 10% (at least ${peso(MINIMUM_COD_DEPOSIT)}, or the full total if lower) paid online first.`] : [],
            },
          ],
          data: { partners: partners.map((partner) => ({ id: String(partner.id), name: partner.branch })), fullPayment: onlineOk, cod: codOk },
        });
      },
    },
    {
      name: "select_payment_method",
      risk: RISK.LOW,
      description: "Choose a payment partner and mode ('full' or 'cod') for this checkout. 'choice' may be a name like 'gcash' or 'cod'.",
      parameters: {
        type: "object",
        properties: {
          paymentPartnerId: { type: "string" },
          mode: { type: "string", enum: ["full", "cod"] },
          choice: { type: "string" },
        },
      },
      async run(ctx, args = {}) {
        const partners = await loadPartners(ctx, "payment");
        const choice = normalizeText(args.choice || "");
        let mode = args.mode === "cod" || args.mode === "full" ? args.mode : "";
        if (!mode && /\b(cod|cash on delivery)\b/.test(choice)) mode = "cod";
        let partner = partners.find((entry) => String(entry.id) === cleanText(args.paymentPartnerId, 120)) || null;
        if (!partner && choice && !/^(cod|cash on delivery)$/.test(choice)) {
          const key = choice.replace(/[^a-z]/g, "").replace("paymaya", "maya").replace("gcash", "gcash");
          partner =
            partners.find((entry) => String(entry.branch || "").toLowerCase().replace(/[^a-z]/g, "").includes(key)) ||
            partners.find((entry) => String(entry.paymongoMethod || "").toLowerCase().replace(/[^a-z]/g, "").includes(key)) ||
            null;
          if (!partner) {
            throw toolError(`${cleanText(args.choice, 30)} isn't one of the available payment methods: ${partners.map((entry) => entry.branch).join(", ")}.`, {
              status: 404,
              code: "AI_PAYMENT_METHOD_UNAVAILABLE",
            });
          }
        }
        if (!partner && ctx.state.checkout?.paymentPartnerId) {
          partner = partners.find((entry) => String(entry.id) === String(ctx.state.checkout.paymentPartnerId)) || null;
        }
        if (!partner && partners.length === 1) partner = partners[0];
        if (mode === "cod" && !ctx.isEnabled("cashOnDelivery")) throw toolError("Cash on delivery is currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
        if (mode !== "cod" && !ctx.isEnabled("onlinePayments")) throw toolError("Online payments are currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
        ctx.state.checkout = {
          ...(ctx.state.checkout || {}),
          paymentMode: mode || "full",
          paymentPartnerId: partner ? String(partner.id) : "",
        };
        if (!partner) {
          const options = await tools.find((tool) => tool.name === "get_payment_options").run(ctx);
          options.message = mode === "cod" ? "Which method should the COD deposit be paid with?" : options.message;
          return options;
        }
        return previewResult(ctx, `Payment: ${cleanText(partner.branch, 40)}${mode === "cod" ? " (COD deposit)" : ""}.`);
      },
    },
    {
      name: "create_checkout_preview",
      risk: RISK.LOW,
      description: "Build the order review (items, address, shipping, voucher, payment, totals) from backend data. Does not place the order.",
      parameters: { type: "object", properties: { sellerAdminId: { type: "string" } } },
      async run(ctx, args = {}) {
        if (args.sellerAdminId) ctx.state.checkout = { ...(ctx.state.checkout || {}), sellerAdminId: cleanText(args.sellerAdminId, 120) };
        return previewResult(ctx);
      },
    },
    {
      name: "place_order",
      risk: RISK.HIGH,
      description: "Place the reviewed order. Requires the buyer to tap the confirmation; the backend recalculates everything.",
      parameters: { type: "object", properties: {} },
      async prepare(ctx) {
        assertCheckoutAllowed(ctx);
        const checkout = await buildCheckout(ctx, selectionsFromState(ctx.state));
        rememberCheckout(ctx, checkout);
        if (!checkout.ready) {
          return ok({ message: checkoutMessage(checkout), blocks: [checkoutBlock(checkout)], data: checkoutData(checkout) });
        }
        return confirmationFor(ctx, checkout);
      },
      async execute(ctx, args) {
        assertCheckoutAllowed(ctx);
        const selections = args.selections || {};
        const checkout = await buildCheckout(ctx, selections);
        if (!checkout.ready) {
          rememberCheckout(ctx, checkout);
          return ok({ message: `I couldn't place the order. ${checkoutMessage(checkout)}`, blocks: [checkoutBlock(checkout)], data: checkoutData(checkout) });
        }
        const expected = args.expected || {};
        const changes = describeChanges(expected, checkout);
        if (changes.length) {
          rememberCheckout(ctx, checkout);
          const confirmation = await confirmationFor(ctx, checkout);
          confirmation.message = `Heads up: ${changes.join(" ")} Please confirm again.`;
          confirmation.data = { ...(confirmation.data || {}), priceChanged: true };
          return confirmation;
        }
        return placeOrder(ctx, checkout);
      },
    },
    {
      name: "start_payment",
      risk: RISK.MEDIUM,
      description: "Open the existing secure payment page for one of the buyer's unpaid orders.",
      parameters: { type: "object", properties: { orderGroupId: { type: "string" } }, required: ["orderGroupId"] },
      async run(ctx, args = {}) {
        const groups = await loadOrderGroups(ctx);
        const group = findOrderGroup(groups, args.orderGroupId);
        if (!group) throw toolError("I couldn't find that order.", { status: 404, code: "AI_ORDER_NOT_FOUND" });
        if (group.stage !== "toPay") {
          return ok({ message: `This order doesn't need a payment right now (status: ${stageLabel(group.stage)}).`, data: { stage: group.stage } });
        }
        return startPaymentFor(ctx, group.orderGroupId || String(group.createdAtEpochMs));
      },
    },
    {
      name: "check_payment_status",
      risk: RISK.LOW,
      description: "Check whether an order's payment has been confirmed by the payment provider.",
      parameters: { type: "object", properties: { orderGroupId: { type: "string" } }, required: ["orderGroupId"] },
      async run(ctx, args = {}) {
        const groupKey = cleanText(args.orderGroupId, 160);
        if (!groupKey) throw toolError("Which order should I check?", { status: 422, code: "AI_NEEDS_CLARIFICATION" });
        const body = await callApi(ctx, "GET", `/api/orders/${encodeURIComponent(groupKey)}/payment-status`);
        if (body.paid) {
          return ok({
            message: "Payment confirmed. Your order is now with the seller.",
            blocks: [notice("Payment confirmed.", "success")],
            data: { paid: true, stage: body.stage },
          });
        }
        return ok({
          message: "I don't see a confirmed payment yet. If you just paid, it can take a moment — check again shortly.",
          blocks: [
            {
              type: "notice",
              tone: "warning",
              text: `Payment status: ${cleanText(body.paymentStatus, 40) || "pending"}`,
              actions: [toolAction("Check again", "check_payment_status", { orderGroupId: groupKey }), toolAction("Open payment page", "start_payment", { orderGroupId: groupKey })],
            },
          ],
          data: { paid: false, status: body.paymentStatus || "pending" },
        });
      },
    },
    {
      name: "get_orders",
      risk: RISK.LOW,
      description: "List the buyer's recent orders. status: 'active' for ongoing orders, 'to_pay' for unpaid ones.",
      parameters: { type: "object", properties: { status: { type: "string", enum: ["all", "active", "to_pay", "delivered", "cancelled"] } } },
      async run(ctx, args = {}) {
        const groups = await loadOrderGroups(ctx);
        const status = cleanText(args.status, 20) || "all";
        const filtered = groups.filter((group) => {
          if (status === "active") return ACTIVE_STAGES.has(group.stage);
          if (status === "to_pay") return group.stage === "toPay";
          if (status === "delivered") return group.stage === "toReview" || group.stage === "completed";
          if (status === "cancelled") return group.stage === "cancelled";
          return true;
        });
        const top = filtered.slice(0, 5);
        if (!top.length) {
          return ok({ message: status === "all" ? "You don't have any orders yet." : "You don't have any orders with that status.", data: { orders: 0 } });
        }
        return ok({
          message: `You have ${filtered.length} ${status === "active" ? "active " : status === "to_pay" ? "unpaid " : ""}order${filtered.length === 1 ? "" : "s"}${filtered.length > top.length ? `. Here are the latest ${top.length}` : ""}.`,
          blocks: [{ type: "order_status", orders: top.map((group) => ({ ...orderView(group), actions: orderActions(group) })) }],
          data: { orders: top.map((group) => ({ ref: shortRef(group.orderGroupId || group.createdAtEpochMs), status: stageLabel(group.stage), total: group.total, items: group.entries.length })) },
        });
      },
    },
    {
      name: "track_order",
      risk: RISK.LOW,
      description: "Track one order by reference, or the most recent active order.",
      parameters: { type: "object", properties: { orderRef: { type: "string" } } },
      async run(ctx, args = {}) {
        const groups = await loadOrderGroups(ctx);
        let group = args.orderRef ? findOrderGroup(groups, args.orderRef) : null;
        if (args.orderRef && !group) throw toolError(`I couldn't find order ${cleanText(args.orderRef, 30)} on your account.`, { status: 404, code: "AI_ORDER_NOT_FOUND" });
        if (!group) {
          const active = groups.filter((entry) => ACTIVE_STAGES.has(entry.stage));
          if (active.length > 1) {
            return ok({
              message: `You have ${active.length} active orders. Which one should I track?`,
              blocks: [{ type: "order_status", orders: active.slice(0, 5).map((entry) => ({ ...orderView(entry), actions: orderActions(entry) })) }],
              data: { orders: active.slice(0, 5).map((entry) => ({ ref: shortRef(entry.orderGroupId || entry.createdAtEpochMs), status: stageLabel(entry.stage) })) },
            });
          }
          group = active[0] || groups[0];
        }
        if (!group) return ok({ message: "You don't have any orders yet.", data: { orders: 0 } });
        const view = orderView(group);
        let tracking = null;
        if (typeof getSwitchRiderBuyerTracking === "function" && isSwitchRiderPartnerName(group.deliveryPartnerName)) {
          try {
            const raw = await getSwitchRiderBuyerTracking(ctx.session.accountId, group.orderGroupId || String(group.createdAtEpochMs));
            if (raw) {
              tracking = {
                statusLabel: cleanText(raw.statusLabel, 60),
                exceptionMessage: cleanText(raw.exceptionMessage, 200),
                riderName: cleanText(raw.rider?.displayName || raw.rider?.name, 60),
                riderPhone: cleanText(raw.riderPhone, 20),
                timeline: (Array.isArray(raw.timeline) ? raw.timeline : []).slice(-6).map((step) => ({ label: cleanText(step.label || step.status, 60), at: step.at || step.time || "", done: step.done !== false })),
              };
            }
          } catch {
            tracking = null;
          }
        }
        const detail = tracking?.statusLabel ? ` Delivery: ${tracking.statusLabel}.` : "";
        return ok({
          message: `Order #${view.reference} is: ${view.stageLabel}.${detail}${tracking?.exceptionMessage ? ` ${tracking.exceptionMessage}` : ""}`,
          blocks: [
            {
              type: "order_status",
              orders: [{ ...view, tracking, actions: [...orderActions(group), ...(tracking?.riderPhone ? [{ label: "Call rider", kind: "call", phone: tracking.riderPhone }] : [])] }],
            },
          ],
          data: { ref: view.reference, status: view.stageLabel, delivery: tracking?.statusLabel || null, total: view.total },
        });
      },
    },
    {
      name: "cancel_order",
      risk: RISK.HIGH,
      description: "Request cancellation of an order that hasn't shipped. Requires confirmation; the seller reviews the request.",
      parameters: { type: "object", properties: { orderRef: { type: "string" }, reason: { type: "string" } } },
      async prepare(ctx, args = {}) {
        if (!ctx.isEnabled("refundCenter")) throw toolError("Order cancellation is currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
        const groups = await loadOrderGroups(ctx);
        let group = args.orderRef ? findOrderGroup(groups, args.orderRef) : null;
        if (!group) {
          const cancellable = groups.filter((entry) => CANCELLABLE_STAGES.has(entry.stage) && entry.cancelRequestStatus !== "pending");
          if (args.orderRef) throw toolError(`I couldn't find order ${cleanText(args.orderRef, 30)} on your account.`, { status: 404, code: "AI_ORDER_NOT_FOUND" });
          if (cancellable.length !== 1) {
            if (!cancellable.length) return ok({ message: "You don't have any orders that can still be cancelled.", data: { cancellable: 0 } });
            return ok({
              message: "Which order would you like to cancel?",
              blocks: [{ type: "order_status", orders: cancellable.slice(0, 5).map((entry) => ({ ...orderView(entry), actions: orderActions(entry) })) }],
              data: { cancellable: cancellable.length },
            });
          }
          group = cancellable[0];
        }
        if (group.cancelRequestStatus === "pending") return ok({ message: "A cancellation request for this order is already waiting for the seller.", data: { pending: true } });
        if (!CANCELLABLE_STAGES.has(group.stage)) {
          const reason =
            group.stage === "toShip" || group.stage === "toReceive"
              ? "It has already been handed to delivery, so it can't be cancelled. You can request a return after it arrives."
              : `Its status is ${stageLabel(group.stage)}.`;
          throw toolError(`Order #${shortRef(group.orderGroupId || group.createdAtEpochMs)} can't be cancelled. ${reason}`, { status: 409, code: "AI_ORDER_NOT_CANCELLABLE" });
        }
        const reason = cleanText(args.reason, 200) || "Cancelled by buyer via Switch Shopping AI";
        const view = orderView(group);
        const paid = String(group.paymentStatus).toLowerCase() === "paid";
        const summary = `Cancel order #${view.reference}`;
        const { token, expiresAt } = ctx.confirm({
          tool: "cancel_order",
          args: { orderGroupKey: group.orderGroupId || String(group.createdAtEpochMs), reason },
          summary,
        });
        return ok({
          message: `Do you want to cancel order #${view.reference}? The seller will review the request.${paid ? " Refunds follow the store's refund process." : ""}`,
          blocks: [
            {
              type: "confirmation",
              token,
              expiresAt,
              risk: "high",
              title: summary,
              lines: [
                { label: "Items", value: view.items.map((item) => `${item.name} × ${item.quantity}`).join(", ") },
                { label: "Total", value: peso(view.total) },
                { label: "Status", value: view.stageLabel },
                { label: "Reason", value: reason },
              ],
              warning: paid ? "This order is already paid. Any refund is handled by the seller/refund center after approval." : "",
              confirmLabel: "Request cancellation",
              cancelLabel: "Keep order",
            },
          ],
          data: { awaitingConfirmation: true, order: view.reference },
        });
      },
      async execute(ctx, args) {
        if (!ctx.isEnabled("refundCenter")) throw toolError("Order cancellation is currently disabled by Super Admin.", { status: 403, code: "PLATFORM_SETTING_DISABLED" });
        const accountId = ctx.session.accountId;
        const entries = (await readOrders({ accountId })).filter(
          (entry) =>
            String(entry?.accountId ?? "").trim() === accountId &&
            (String(entry.orderGroupId || "") === args.orderGroupKey || String(entry.createdAtEpochMs || "") === args.orderGroupKey),
        );
        if (!entries.length) throw toolError("That order was not found.", { status: 404, code: "AI_ORDER_NOT_FOUND" });
        const stage = String(entries[0].stage || "");
        if (!CANCELLABLE_STAGES.has(stage)) {
          throw toolError(`This order can no longer be cancelled (status: ${stageLabel(stage)}).`, { status: 409, code: "AI_ORDER_NOT_CANCELLABLE" });
        }
        const submittedAt = ctx.now();
        await callApi(ctx, "POST", "/api/orders", {
          body: {
            orders: entries.map((entry) => ({
              ...entry,
              cancelRequestStatus: "pending",
              cancelRequestReason: args.reason,
              cancelRequestSubmittedAtEpochMs: submittedAt,
              cancelRequestResolvedAtEpochMs: 0,
            })),
          },
        });
        return ok({
          message: `Cancellation requested for order #${shortRef(args.orderGroupKey)}. The seller will review it, and you'll be notified of the decision.`,
          blocks: [notice("Cancellation request sent to the seller.", "success")],
          data: { cancelRequested: true },
          entity: { type: "order", id: args.orderGroupKey },
        });
      },
    },
  ];

  // ------------------------------------------------------- order placement

  function expectedSnapshot(checkout) {
    return {
      total: checkout.totals.total,
      shippingFee: checkout.totals.shippingFee,
      lines: checkout.lines.map((line) => ({ productId: line.productId, variantId: line.variantId, quantity: line.quantity, unitPrice: line.unitPrice, name: line.name })),
    };
  }

  function describeChanges(expected, checkout) {
    const changes = [];
    const current = new Map(checkout.lines.map((line) => [`${line.productId}::${line.variantId}`, line]));
    const before = Array.isArray(expected.lines) ? expected.lines : [];
    for (const line of before) {
      const now = current.get(`${line.productId}::${line.variantId}`);
      if (!now) changes.push(`${line.name || "An item"} is no longer available.`);
      else if (Math.abs(now.unitPrice - Number(line.unitPrice)) > 0.009) {
        changes.push(`The price of ${now.name} changed from ${peso(line.unitPrice)} to ${peso(now.unitPrice)}.`);
      } else if (now.quantity !== Number(line.quantity)) changes.push(`The quantity of ${now.name} changed.`);
    }
    if (checkout.lines.length !== before.length && !changes.length) changes.push("Your cart changed.");
    if (Math.abs(Number(expected.total) - checkout.totals.total) > 0.009) {
      changes.push(`Your total is now ${peso(checkout.totals.total)} (was ${peso(expected.total)}).`);
    }
    return changes;
  }

  function confirmationFor(ctx, checkout) {
    const selections = {
      sellerAdminId: checkout.sellerAdminId,
      addressId: String(checkout.address.id),
      deliveryPartnerId: checkout.delivery.id,
      paymentPartnerId: String(checkout.paymentPartner.id),
      paymentMode: checkout.paymentMode,
      voucherCode: checkout.voucher && !checkout.voucher.auto ? checkout.voucher.code : "",
    };
    const summary = `Place order ${peso(checkout.totals.total)}`;
    const { token, expiresAt } = ctx.confirm({
      tool: "place_order",
      args: { selections, expected: expectedSnapshot(checkout) },
      summary,
    });
    const lines = [
      ...checkout.lines.map((line) => ({ label: `${line.name}${line.variantName ? ` (${line.variantName})` : ""} × ${line.quantity}`, value: peso(line.lineTotal) })),
      { label: "Subtotal", value: peso(checkout.totals.subtotal) },
      ...(checkout.totals.merchandiseDiscount ? [{ label: `Voucher${checkout.voucher ? ` ${checkout.voucher.code}` : ""}`, value: `−${peso(checkout.totals.merchandiseDiscount)}` }] : []),
      { label: `Shipping (${checkout.delivery.name})`, value: checkout.totals.shippingFee ? peso(checkout.totals.shippingFee) : "Free" },
      ...(checkout.totals.shippingDiscount ? [{ label: "Shipping discount", value: `−${peso(checkout.totals.shippingDiscount)}` }] : []),
      { label: "Deliver to", value: formatAddress(checkout.address) },
      { label: "Payment", value: `${cleanText(checkout.paymentPartner.branch, 40)} · ${checkout.paymentMode === "cod" ? `COD (deposit ${peso(checkout.totals.dueNow)} now)` : "Full payment"}` },
      { label: "Total", value: peso(checkout.totals.total), emphasis: true },
    ];
    return ok({
      message: `Please confirm your order of ${peso(checkout.totals.total)}. I'll only place it after you tap the button.`,
      blocks: [
        {
          type: "confirmation",
          token,
          expiresAt,
          risk: "high",
          title: "Confirm your order",
          lines,
          warning: checkout.warnings.join(" "),
          confirmLabel: `Place Order ${peso(checkout.totals.total)}`,
          cancelLabel: "Cancel",
        },
      ],
      data: { awaitingConfirmation: true, total: checkout.totals.total },
    });
  }

  async function reserveFlashLines(ctx, lines) {
    const reservations = [];
    try {
      for (const line of lines) {
        if (!line.deal?.id) continue;
        const body = await callApi(ctx, "POST", `/api/flash-deals/${encodeURIComponent(line.deal.id)}/reserve`, {
          body: { quantity: line.quantity, variantId: line.variantId },
        });
        const reservation = body.reservation || {};
        if (!reservation.id) throw toolError("The Flash Deal could not be reserved. Please review your order again.", { status: 409, code: "AI_FLASH_RESERVE_FAILED" });
        reservations.push({ key: `${line.productId}::${line.variantId}`, id: String(reservation.id), dealId: line.deal.id });
      }
      return reservations;
    } catch (error) {
      await releaseReservations(ctx, reservations);
      throw error;
    }
  }

  async function releaseReservations(ctx, reservations) {
    for (const reservation of reservations) {
      try {
        await ctx.dispatch({ method: "POST", path: `/api/flash-deals/reservations/${encodeURIComponent(reservation.id)}/release`, body: {} });
      } catch {
        // Holds expire on their own; release is best-effort.
      }
    }
  }

  async function placeOrder(ctx, checkout) {
    const accountId = ctx.session.accountId;
    let switchRiderQuoteToken = "";
    if (checkout.delivery.switchRider) {
      const fresh = await quoteSwitchRider(ctx, checkout.sellerAdminId, checkout.address);
      if (!fresh) throw toolError("Switch Rider isn't available for this address right now. Choose another shipping option.", { status: 409, code: "SWITCH_RIDER_UNAVAILABLE" });
      if (Math.abs(money(fresh.deliveryFee) - checkout.totals.shippingFee) > 0.009 && checkout.totals.shippingFee > 0) {
        const refreshed = await buildCheckout(ctx, selectionsFromState(ctx.state));
        rememberCheckout(ctx, refreshed);
        const result = confirmationFor(ctx, refreshed);
        result.message = `The Switch Rider delivery fee is now ${peso(fresh.deliveryFee)}. Please confirm again.`;
        return result;
      }
      switchRiderQuoteToken = String(fresh.quoteToken || "");
    }

    const reservations = await reserveFlashLines(ctx, checkout.lines);
    const reservationByKey = new Map(reservations.map((reservation) => [reservation.key, reservation]));
    const createdAtEpochMs = ctx.now();
    const isCod = checkout.paymentMode === "cod";
    const total = checkout.totals.total;
    const addressText = formatAddress(checkout.address);
    const lat = Number(checkout.address.lat);
    const lng = Number(checkout.address.lng);
    const voucher = checkout.voucher;
    const entries = checkout.lines.map((line, index) => {
      const variant = productVariants(line.product).find((entry) => entry.id === line.variantId);
      const addOns = (Array.isArray(variant?.raw?.addOns) ? variant.raw.addOns : [])
        .map((addOn) => ({ id: cleanText(addOn?.id, 80), name: cleanText(addOn?.name, 80), quantity: Math.max(1, toInt(addOn?.quantity, 1)) }))
        .filter((addOn) => addOn.id && addOn.name);
      const reservation = reservationByKey.get(`${line.productId}::${line.variantId}`);
      return {
        id: `${createdAtEpochMs}_${index}_${line.sellerAdminId}::${line.productId}::${line.variantId}`,
        adminId: line.sellerAdminId,
        accountId,
        productId: line.productId,
        productName: line.name,
        productImageUrl: line.imageUrl,
        variantId: line.variantId,
        variantName: line.variantName,
        addOns,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        flashDealId: reservation ? reservation.dealId : "",
        flashReservationId: reservation ? reservation.id : "",
        stage: isCod ? "toPrepare" : "toPay",
        createdAtEpochMs,
        grandTotalAmount: total,
        amountToPayAmount: isCod ? 0 : total,
        remainingBalanceAmount: isCod ? total : 0,
        shippingFeeAmount: index === 0 ? checkout.totals.shippingFee : 0,
        voucherId: voucher ? voucher.id : "",
        voucherCode: voucher ? voucher.code : "",
        voucherDiscountAmount: index === 0 ? checkout.totals.merchandiseDiscount : 0,
        paymentOptionLabel: isCod ? "COD" : "Full Payment",
        productRating: Number(line.product.rating) || 0,
        paymentPartnerName: cleanText(checkout.paymentPartner.branch, 80) || "Payment Partner",
        paymentPartnerImageUrl: String(checkout.paymentPartner.imageUrl || ""),
        deliveryPartnerName: checkout.delivery.name,
        deliveryPartnerImageUrl: checkout.delivery.imageUrl || "",
        clientName: checkout.contact.name,
        clientContactNumber: checkout.contact.phone,
        clientAddress: addressText,
        clientLatitude: Number.isFinite(lat) ? lat : null,
        clientLongitude: Number.isFinite(lng) ? lng : null,
        ...(switchRiderQuoteToken ? { switchRiderQuoteToken } : {}),
      };
    });

    let body;
    try {
      body = await callApi(ctx, "POST", "/api/orders", { body: { orders: entries } });
    } catch (error) {
      await releaseReservations(ctx, reservations);
      throw error;
    }

    const saved = (Array.isArray(body.orders) ? body.orders : []).filter((entry) => toInt(entry?.createdAtEpochMs, 0) === createdAtEpochMs && String(entry?.accountId ?? "") === accountId);
    const orderGroupId = String(saved[0]?.orderGroupId || createdAtEpochMs);
    const savedStage = String(saved[0]?.stage || entries[0].stage);
    const amountDue = money(Math.max(0, ...saved.map((entry) => Number(entry?.amountToPayAmount) || 0)));

    const purchased = new Set(checkout.lines.map((line) => `${line.productId}::${line.variantId}`));
    const cart = await store.getCart(accountId);
    await store.saveCart(accountId, cart.filter((item) => !purchased.has(`${item.productId}::${item.variantId}`)));
    ctx.state.checkout = { addressId: ctx.state.checkout?.addressId || "", deliveryPartnerId: "", paymentPartnerId: "", paymentMode: "", voucherCode: "" };
    ctx.state.lastOrder = { orderGroupId, createdAtEpochMs };
    catalog.invalidate();

    const reference = shortRef(orderGroupId);
    const clientEffects = {
      cart: checkout.lines.map((line) => ({ op: "remove", productId: line.productId, variantId: line.variantId })),
      ordersChanged: true,
    };
    const placedBlock = {
      type: "order_status",
      orders: [
        {
          orderGroupId,
          reference,
          stage: savedStage,
          stageLabel: stageLabel(savedStage),
          total,
          amountDue: savedStage === "toPay" ? amountDue : 0,
          items: checkout.lines.map((line) => ({ name: line.name, variantName: line.variantName, quantity: line.quantity, imageUrl: line.imageUrl })),
          actions: [toolAction("Track", "track_order", { orderRef: orderGroupId })],
        },
      ],
    };

    if (savedStage === "toPay" && amountDue > 0) {
      try {
        const payment = await startPaymentFor(ctx, orderGroupId);
        return {
          ...payment,
          message: `Order #${reference} is placed and waiting for payment of ${peso(amountDue)}. ${payment.message}`,
          blocks: [placedBlock, ...payment.blocks],
          data: { orderPlaced: true, reference, total, amountDue, stage: savedStage },
          entity: { type: "order", id: orderGroupId },
          clientEffects,
          events: ["ai_order_placed", "ai_payment_started"],
        };
      } catch (error) {
        return ok({
          message: `Order #${reference} is placed and waiting for payment of ${peso(amountDue)}, but the payment page couldn't be opened: ${error.message}`,
          blocks: [
            placedBlock,
            { type: "notice", tone: "warning", text: "Payment not started yet.", actions: [toolAction("Try payment again", "start_payment", { orderGroupId }, "primary")] },
          ],
          data: { orderPlaced: true, reference, total, amountDue, paymentStarted: false },
          entity: { type: "order", id: orderGroupId },
          clientEffects,
          events: ["ai_order_placed"],
        });
      }
    }
    return ok({
      message: `Order #${reference} is placed. Total ${peso(total)}.`,
      blocks: [placedBlock],
      data: { orderPlaced: true, reference, total, stage: savedStage },
      entity: { type: "order", id: orderGroupId },
      clientEffects,
      events: ["ai_order_placed"],
    });
  }

  return tools;
}

module.exports = {
  createBuyerTools,
  requiredCodDeposit,
  expandQueryTokens,
  FLAT_SHIPPING_FEE,
  MINIMUM_COD_DEPOSIT,
};

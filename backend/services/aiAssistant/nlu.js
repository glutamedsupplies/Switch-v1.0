"use strict";

/**
 * Deterministic English/Taglish intent parser. It is used when no language
 * model is configured (and as a safety net when the model fails). It only
 * turns text into structured tool requests; every value it extracts is
 * re-validated by the backend tools.
 */

const COLOR_SYNONYMS = Object.freeze({
  white: ["white", "puti", "puting", "off-white"],
  black: ["black", "itim", "itim na"],
  red: ["red", "pula", "pulang"],
  blue: ["blue", "asul", "bughaw", "navy"],
  green: ["green", "berde", "luntian"],
  yellow: ["yellow", "dilaw"],
  pink: ["pink", "rosas"],
  gray: ["gray", "grey", "abo", "kulay abo"],
  brown: ["brown", "kayumanggi", "tsokolate"],
  orange: ["orange", "kahel"],
  purple: ["purple", "violet", "lila", "ube"],
  beige: ["beige", "cream", "nude", "khaki"],
  gold: ["gold", "ginto"],
  silver: ["silver", "pilak"],
});

const PRODUCT_NOUN_SYNONYMS = Object.freeze({
  shoes: ["shoes", "shoe", "sapatos", "sneakers", "sneaker", "rubber shoes", "kicks"],
  shirt: ["shirt", "shirts", "t-shirt", "tshirt", "tee", "tees", "polo", "blouse", "top", "tops"],
  clothes: ["damit", "clothes", "clothing", "apparel"],
  pants: ["pants", "pantalon", "jeans", "trousers", "slacks", "shorts", "short"],
  bag: ["bag", "bags", "bag pack", "backpack", "handbag", "tote", "wallet", "pitaka"],
  slippers: ["slippers", "tsinelas", "sandals", "sandal", "flip flops"],
  watch: ["watch", "relo", "smartwatch"],
  hat: ["hat", "cap", "sumbrero", "sombrero"],
  socks: ["socks", "medyas"],
  dress: ["dress", "bestida", "gown", "skirt", "palda"],
  jacket: ["jacket", "hoodie", "sweater", "coat"],
  glasses: ["glasses", "salamin", "sunglasses", "shades", "eyeglasses"],
  phone: ["phone", "cellphone", "cp", "smartphone", "selpon"],
  charger: ["charger", "cable", "powerbank", "power bank"],
  earphones: ["earphones", "earbuds", "headphones", "headset"],
});

const GENDER_PATTERNS = [
  { value: "men", pattern: /\b(pang[\s-]?lalaki|panlalaki|lalaki|men'?s?|male|mens|boys?|for him)\b/ },
  { value: "women", pattern: /\b(pang[\s-]?babae|pambabae|babae|women'?s?|womens|ladies|lady|female|girls?|for her)\b/ },
  { value: "kids", pattern: /\b(pambata|pang[\s-]?bata|bata|kids?|children|child|toddler|baby)\b/ },
  { value: "unisex", pattern: /\bunisex\b/ },
];

const SIZE_WORDS = Object.freeze({
  "extra small": "XS",
  xs: "XS",
  small: "S",
  medium: "M",
  large: "L",
  "extra large": "XL",
  xl: "XL",
  xxl: "XXL",
  "2xl": "XXL",
  "3xl": "3XL",
});

const ORDINAL_WORDS = [
  { index: 1, pattern: /\b(first|1st|una|unang|pang[\s-]?una|numero uno|number one)\b/ },
  { index: 2, pattern: /\b(second|2nd|pangalawa|ikalawa|pang[\s-]?dalawa|number two)\b/ },
  { index: 3, pattern: /\b(third|3rd|pangatlo|ikatlo|pang[\s-]?tatlo|number three)\b/ },
  { index: 4, pattern: /\b(fourth|4th|pang[\s-]?apat|ikaapat)\b/ },
  { index: 5, pattern: /\b(fifth|5th|panglima|pang[\s-]?lima|ikalima)\b/ },
  { index: 6, pattern: /\b(sixth|6th|pang[\s-]?anim|ikaanim)\b/ },
  { index: -1, pattern: /\b(last one|last|huli|panghuli|pinakahuli)\b/ },
];

const TAGALOG_NUMBERS = Object.freeze({
  isa: 1, isang: 1, dalawa: 2, dalawang: 2, tatlo: 3, tatlong: 3, apat: 4, "apat na": 4,
  lima: 5, limang: 5, anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
});

const STOPWORDS = new Set(
  (
    "hanapan hanapin hanap mo ako akong ko ng nang na ang mga sa si ni kay po naman nga lang din rin ba pa " +
    "find search show look looking me i my want need gusto kailangan please pls pakihanap paki can you could " +
    "for the a an of to and or with some any may meron mayroon available stock order bili bilhin buy bumili purchase " +
    "around about under below above over between less more than budget max min up yung iyong iyon ito itong yan " +
    "ung un price presyo peso pesos php worth cost costs mga approx approximately nasa hanggang wala pang " +
    "pang panlalaki pambabae pambata lalaki babae bata men mens women womens kids ladies male female unisex size sizes " +
    "cheap cheapest pinakamura mura pinakamurang best rated top selling popular new also too now today pwede puwede " +
    "hi hello uy sige okay ok thanks salamat anong ano what which where is are products product items item something " +
    "stuff things bagay natin tayo kami"
  ).split(/\s+/),
);

function normalizeText(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/(\d),(\d{3})\b/g, "$1$2")
    .replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, n) => String(Math.round(Number(n) * 1000)))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;]+$/g, "")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findColor(text) {
  for (const [color, words] of Object.entries(COLOR_SYNONYMS)) {
    for (const word of words) {
      if (new RegExp(`\\b${escapeRegex(word)}\\b`).test(text)) return color;
    }
  }
  return "";
}

function findGender(text) {
  for (const { value, pattern } of GENDER_PATTERNS) {
    if (pattern.test(text)) return value;
  }
  return "";
}

function findSize(text) {
  const numeric = text.match(/\b(?:size|sz|sukat|laki)\s*[:#]?\s*(\d{1,2}(?:\.\d)?)\b/);
  if (numeric) return numeric[1];
  const lettered = text.match(/\b(?:size|sz|sukat)\s*[:#]?\s*(xxs|xs|s|m|l|xl|xxl|2xl|3xl)\b/);
  if (lettered) return lettered[1].toUpperCase().replace("2XL", "XXL");
  for (const [word, size] of Object.entries(SIZE_WORDS)) {
    if (word.length > 2 && new RegExp(`\\b${escapeRegex(word)}\\b`).test(text)) return size;
  }
  return "";
}

function stripSizeTokens(text) {
  return text.replace(/\b(?:size|sz|sukat|laki)\s*[:#]?\s*[a-z0-9.]{1,4}\b/g, " ");
}

function parseAmount(raw) {
  const value = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Extracts a budget: { priceMin, priceMax, targetPrice } (only keys that were stated). */
function findPrice(input) {
  const text = stripSizeTokens(input).replace(/₱|\bphp\b|\bp(?=\d)/g, " ₱");
  const money = "₱?\\s*(\\d+(?:\\.\\d+)?)";
  const range = text.match(new RegExp(`(?:between|from|mula)?\\s*${money}\\s*(?:-|to|hanggang|and|at)\\s*${money}`));
  if (range && /₱|between|from|mula|budget|price|presyo|pesos?/.test(text + " ")) {
    const a = parseAmount(range[1]);
    const b = parseAmount(range[2]);
    if (a && b) return { priceMin: Math.min(a, b), priceMax: Math.max(a, b) };
  }
  const max = text.match(new RegExp(`(?:under|below|less than|cheaper than|mas mura sa|hanggang|wala pang|max(?:imum)?|not more than|at most|budget(?: ko)?(?: is)?|within|up to|di lalagpas sa|<)\\s*${money}`));
  if (max) return { priceMax: parseAmount(max[1]) };
  const min = text.match(new RegExp(`(?:above|over|more than|at least|higit sa|lagpas sa|mahigit|>)\\s*${money}`));
  if (min) return { priceMin: parseAmount(min[1]) };
  const around = text.match(new RegExp(`(?:around|about|mga|nasa|approx(?:imately)?|roughly|~|siguro|near)\\s*${money}`));
  if (around) return { targetPrice: parseAmount(around[1]) };
  const currency = text.match(/₱\s*(\d+(?:\.\d+)?)/) || text.match(/(\d+(?:\.\d+)?)\s*(?:pesos?|php)\b/);
  if (currency) return { targetPrice: parseAmount(currency[1]) };
  return {};
}

function budgetToRange(price) {
  if (!price) return {};
  if (price.targetPrice) {
    const target = price.targetPrice;
    return {
      priceMin: Math.max(0, Math.round(target * 0.7)),
      priceMax: Math.round(target * 1.15),
      targetPrice: target,
    };
  }
  const out = {};
  if (price.priceMin) out.priceMin = price.priceMin;
  if (price.priceMax) out.priceMax = price.priceMax;
  return out;
}

function findSort(text) {
  if (/\b(pinakamura|pinakamurang|cheapest|lowest price|lowest|mura lang|pinaka mura|least expensive)\b/.test(text)) return "price_asc";
  if (/\b(pinakamahal|most expensive|highest price|premium)\b/.test(text)) return "price_desc";
  if (/\b(best rated|highest rat\w*|top rated|pinakamataas na rating|magandang review|best reviews?)\b/.test(text)) return "rating";
  if (/\b(best[\s-]?sell\w*|pinakamabenta|mabenta|popular|sikat|trending|most sold)\b/.test(text)) return "best_selling";
  if (/\b(nearest|pinakamalapit|malapit)\b/.test(text)) return "nearest";
  return "";
}

function findOrdinal(text) {
  const numbered = text.match(/\b(?:number|no\.?|num|#|item|option|yung)\s*(\d{1,2})\b/);
  if (numbered) return Number(numbered[1]);
  for (const { index, pattern } of ORDINAL_WORDS) {
    if (pattern.test(text)) return index;
  }
  const bare = text.match(/^\s*(\d{1,2})\s*[.)]?\s*$/);
  if (bare) return Number(bare[1]);
  return 0;
}

function findOrdinals(text) {
  const found = [];
  for (const match of text.matchAll(/\b(?:number|no\.?|#|item)?\s*(\d{1,2})\b/g)) {
    const value = Number(match[1]);
    if (value >= 1 && value <= 20 && !found.includes(value)) found.push(value);
  }
  for (const { index, pattern } of ORDINAL_WORDS) {
    if (index > 0 && pattern.test(text) && !found.includes(index)) found.push(index);
  }
  return found;
}

function findQuantity(text) {
  const explicit = text.match(/\b(?:qty|quantity|x)\s*[:#]?\s*(\d{1,3})\b/) || text.match(/\b(\d{1,3})\s*(?:pcs|pieces|piraso|pares|pairs?|units?|items?|x)\b/);
  if (explicit) return Math.max(1, Number(explicit[1]));
  for (const [word, value] of Object.entries(TAGALOG_NUMBERS)) {
    if (new RegExp(`\\b${escapeRegex(word)}\\s+(?:na\\s+)?(?:pcs|piraso|pares|pairs?|units?|items?|order)\\b`).test(text)) return value;
  }
  return 0;
}

function findProductNouns(text) {
  const nouns = [];
  for (const [canonical, words] of Object.entries(PRODUCT_NOUN_SYNONYMS)) {
    if (words.some((word) => new RegExp(`\\b${escapeRegex(word)}\\b`).test(text))) nouns.push(canonical);
  }
  return nouns;
}

function translateNouns(text) {
  let out = ` ${text} `;
  for (const [canonical, words] of Object.entries(PRODUCT_NOUN_SYNONYMS)) {
    for (const word of words) {
      if (/^[a-z]+$/.test(word) && word !== canonical && ["sapatos", "damit", "pantalon", "tsinelas", "relo", "sumbrero", "medyas", "salamin", "pitaka", "bestida", "palda", "selpon"].includes(word)) {
        out = out.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, "g"), canonical);
      }
    }
  }
  return out.trim();
}

/** Keyword query with filters/prices/stopwords removed, e.g. "plain shirt". */
function extractQuery(text) {
  let working = translateNouns(stripSizeTokens(text))
    .replace(/₱\s*\d+(?:\.\d+)?/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:pesos?|php)?\b/g, " ");
  for (const words of Object.values(COLOR_SYNONYMS)) {
    for (const word of words) working = working.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, "g"), " ");
  }
  for (const { pattern } of GENDER_PATTERNS) working = working.replace(new RegExp(pattern.source, "g"), " ");
  const tokens = working
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));
  return tokens.join(" ").trim();
}

function extractFilters(text) {
  const filters = {};
  const color = findColor(text);
  const gender = findGender(text);
  const size = findSize(text);
  if (color) filters.color = color;
  if (gender) filters.gender = gender;
  if (size) filters.size = size;
  Object.assign(filters, budgetToRange(findPrice(text)));
  return filters;
}

// ------------------------------------------------------------------ buyer

/** Conversational refinement: new values replace old ones; a new budget replaces the whole old budget. */
function mergeFilters(previous = {}, next = {}) {
  const merged = { ...(previous || {}) };
  if (["priceMin", "priceMax", "targetPrice"].some((key) => next[key] !== undefined)) {
    delete merged.priceMin;
    delete merged.priceMax;
    delete merged.targetPrice;
  }
  return { ...merged, ...next };
}

const BUYER_PATTERNS = {
  greeting: /^(hi|hello|hey|uy|kumusta|kamusta|good (morning|afternoon|evening)|help|tulong|ano kaya mo|what can you do)\b[\s!.?]*$/,
  addToCart: /\b(add|idagdag|dagdag|ilagay|lagay|isama|put)\b.*|\b(sa cart|to cart|in cart|to my cart)\b/,
  removeFromCart: /\b(remove|tanggal\w*|alisin|alis|delete|burahin)\b/,
  updateQty: /\b(change|gawin(?:g| mong| mo)?|palitan|update|set)\b.*\b(qty|quantity|dami|bilang)\b|\b(qty|quantity)\b.*\b(to|sa|gawin)\b\s*\d+/,
  viewCart: /\b(cart|basket|bag ko)\b/,
  checkout: /\b(checkout|check out|check-out|place (?:my )?order|order na|i-?order na|bayaran|pay now|proceed|tuloy na|i-checkout)\b/,
  placeOrder: /\b(place (?:the |my )?order|confirm (?:the |my )?order|i-?place(?: na)?|order na|i-?order na|bilhin na|buy now|go ahead)\b/,
  affirmative: /^(yes|yup|yep|oo|opo|sige|go|ok|okay|confirm|proceed|tuloy|g)\b[\s!.po]*$/,
  negative: /^(no|nope|hindi|huwag|wag|cancel|ayoko)\b[\s!.po]*$/,
  voucher: /\b(voucher|vouchers|promo code|discount code|coupon)\b/,
  deals: /\b(deals?|sale|flash|promo|promos|discounts?|naka-?sale|bagsak presyo)\b/,
  payment: /\b(gcash|g-cash|maya|paymaya|card|credit card|debit card|cod|cash on delivery|bank|grabpay|shopeepay|qrph|full payment)\b/,
  orders: /\b(order|orders|delivery|deliveries|parcel|package|padala|shipment)\b/,
  track: /\b(track|tracking|nasaan|nasan|saan na|where|status|kailan|when|dumating|darating|arrive)\b/,
  cancel: /\b(cancel|kanselahin|i-?cancel|ayoko na|huwag na)\b/,
  pending: /\b(pending|to pay|unpaid|hindi pa bayad|active|ongoing)\b/,
  compare: /\b(compare|ikumpara|ihambing|pagkumparahin|vs\.?|versus|difference|pinagkaiba)\b/,
  details: /\b(details?|detalye|info|more about|tell me about|describe|specs?)\b/,
  address: /\b(address|addresses|tirahan|ihatid sa)\b/,
  shipping: /\b(shipping|delivery option|courier|rider|switch rider)\b/,
  reset: /\b(reset|start over|clear chat|bago ulit|umpisa ulit|new search)\b/,
};

function parseBuyerMessage(rawText, state = {}) {
  const text = normalizeText(rawText);
  if (!text) return { clarify: "What are you looking for?" };
  const shown = Array.isArray(state.shownProducts) ? state.shownProducts : [];
  const ordinal = findOrdinal(text);
  const quantity = findQuantity(text);
  const nouns = findProductNouns(text);
  const filters = extractFilters(text);
  const sort = findSort(text);
  const hasFilters = Object.keys(filters).length > 0;

  if (BUYER_PATTERNS.reset.test(text)) return { tool: "reset_context", args: {} };
  if (BUYER_PATTERNS.greeting.test(text)) return { tool: "help", args: {} };

  // Placing an order only ever prepares the confirmation card; the tap executes it.
  if (state.checkout?.sellerAdminId && (BUYER_PATTERNS.placeOrder.test(text) || BUYER_PATTERNS.affirmative.test(text))) {
    return { tool: "place_order", args: {} };
  }
  if (BUYER_PATTERNS.affirmative.test(text) || BUYER_PATTERNS.negative.test(text)) {
    return { clarify: "Okay! What would you like to do next? You can search for a product, check your cart, or track an order." };
  }

  const wordCount = text.split(" ").length;
  if (state.pendingVariant?.productId && !nouns.length && (filters.size || wordCount <= 3)) {
    const variantAnswer = text.replace(/\b(size|yung|ung|po|na lang|nalang|sige|please|pls|add|mo|lang)\b/g, " ").replace(/\s+/g, " ").trim();
    if (variantAnswer && !BUYER_PATTERNS.checkout.test(text) && !BUYER_PATTERNS.viewCart.test(text) && !BUYER_PATTERNS.cancel.test(text)) {
      return {
        tool: "add_to_cart",
        args: {
          productId: state.pendingVariant.productId,
          variantChoice: variantAnswer,
          quantity: quantity || state.pendingVariant.quantity || 1,
        },
      };
    }
  }

  if (BUYER_PATTERNS.orders.test(text) && BUYER_PATTERNS.cancel.test(text)) {
    const ref = text.match(/\b(?:order|#)\s*#?\s*([a-z0-9_-]{3,})\b/);
    return { tool: "cancel_order", args: { orderRef: ref && !/^(ko|na|mo)$/.test(ref[1]) ? ref[1] : "" } };
  }

  if (BUYER_PATTERNS.payment.test(text) && (state.checkout || BUYER_PATTERNS.checkout.test(text) || /\b(pay|bayad|payment)\b/.test(text))) {
    return { tool: "select_payment_method", args: { choice: text.match(BUYER_PATTERNS.payment)[1] } };
  }
  if (/\b(payment options?|paano magbayad|how (?:can|do) i pay|payment methods?)\b/.test(text)) {
    return { tool: "get_payment_options", args: {} };
  }

  if (BUYER_PATTERNS.voucher.test(text)) {
    const codeMatch = String(rawText).match(/\b([A-Z0-9][A-Z0-9_-]{2,})\b/);
    const code = codeMatch && !/^(VOUCHER|PROMO|CODE|COD)$/i.test(codeMatch[1]) ? codeMatch[1] : "";
    if (code && /\b(apply|use|gamitin|ilagay|i-apply|add)\b/.test(text)) return { tool: "apply_voucher", args: { code } };
    if (code && /[0-9]/.test(code)) return { tool: "apply_voucher", args: { code } };
    return { tool: "get_vouchers", args: {} };
  }

  if (BUYER_PATTERNS.removeFromCart.test(text) && (BUYER_PATTERNS.viewCart.test(text) || ordinal || state.lastCartShown)) {
    return { tool: "remove_from_cart", args: { cartIndex: ordinal || 0 } };
  }

  if (BUYER_PATTERNS.updateQty.test(text)) {
    const target = text.match(/\b(?:to|sa|gawin(?:g| mong| mo)?)\s*(\d{1,3})\b/);
    if (target) return { tool: "update_cart_quantity", args: { cartIndex: ordinal || 0, quantity: Number(target[1]) } };
  }

  if (BUYER_PATTERNS.addToCart.test(text) && /\b(add|idagdag|dagdag|ilagay|lagay|isama|put|cart)\b/.test(text)) {
    if (ordinal) return { tool: "add_to_cart", args: { ordinal, quantity: quantity || 1, variantChoice: filters.size || "" } };
    if (state.selectedProductId && !nouns.length) {
      return { tool: "add_to_cart", args: { productId: state.selectedProductId, quantity: quantity || 1, variantChoice: filters.size || "" } };
    }
    if (shown.length === 1) return { tool: "add_to_cart", args: { ordinal: 1, quantity: quantity || 1, variantChoice: filters.size || "" } };
    if (!nouns.length) return { clarify: shown.length ? `Which one should I add? Say a number from 1 to ${shown.length}.` : "Which product should I add? Search for it first." };
  }

  if (BUYER_PATTERNS.checkout.test(text)) return { tool: "create_checkout_preview", args: {} };

  if (BUYER_PATTERNS.viewCart.test(text) && !nouns.includes("bag")) return { tool: "get_cart", args: {} };

  if (BUYER_PATTERNS.orders.test(text) && (BUYER_PATTERNS.track.test(text) || BUYER_PATTERNS.pending.test(text) || /\b(orders ko|my orders|order ko|mga order)\b/.test(text))) {
    const ref = text.match(/\b(?:order|#)\s*#?\s*([a-z]*\d[a-z0-9_-]*)\b/);
    if (ref) return { tool: "track_order", args: { orderRef: ref[1] } };
    if (BUYER_PATTERNS.pending.test(text)) return { tool: "get_orders", args: { status: "active" } };
    if (BUYER_PATTERNS.track.test(text)) return { tool: "track_order", args: { orderRef: "" } };
    return { tool: "get_orders", args: {} };
  }

  if (BUYER_PATTERNS.compare.test(text)) {
    const picks = findOrdinals(text).filter((index) => index <= Math.max(shown.length, 1));
    return { tool: "compare_products", args: { ordinals: picks.length >= 2 ? picks : [] } };
  }

  if (BUYER_PATTERNS.address.test(text) && !nouns.length) return { tool: "get_addresses", args: {} };
  if (BUYER_PATTERNS.shipping.test(text) && !nouns.length && state.checkout) return { tool: "get_shipping_options", args: {} };

  if (BUYER_PATTERNS.deals.test(text) && !nouns.length && !hasFilters) return { tool: "get_deals", args: {} };

  if (ordinal && !nouns.length && shown.length) {
    return { tool: "get_product", args: { ordinal } };
  }

  const query = extractQuery(text);
  const lastSearch = state.lastSearch || null;
  const wantsBuy = /\b(order|bili|bilhin|buy|bumili|purchase)\b/.test(text);

  if (!nouns.length && !query && (hasFilters || sort) && lastSearch) {
    return {
      tool: "search_products",
      args: { ...lastSearch, filters: mergeFilters(lastSearch.filters, filters), sort: sort || lastSearch.sort || "relevance", refine: true },
    };
  }

  if (!nouns.length && !query && !hasFilters && !sort && /\b(find|search|hanap\w*|looking for|show me)\b/.test(text)) {
    return { clarify: "Sure! What product are you looking for? You can include the color, size, and budget, e.g. \"white shoes around ₱1,300\"." };
  }

  if (!nouns.length && sort && !query && !lastSearch) {
    return { tool: "search_products", args: { query: "", filters, sort } };
  }

  if (nouns.length || query) {
    const deals = BUYER_PATTERNS.deals.test(text);
    return {
      tool: "search_products",
      args: { query: query || nouns.join(" "), filters, sort: sort || "relevance", onlyDeals: deals, intent: wantsBuy ? "buy" : "browse" },
    };
  }

  if (BUYER_PATTERNS.details.test(text) && state.selectedProductId) return { tool: "get_product", args: { productId: state.selectedProductId } };

  return { clarify: "I didn't quite get that. You can say something like \"white shoes around ₱1,300\", \"what's in my cart?\", or \"track my order\"." };
}

// ----------------------------------------------------------------- seller

function findPeriod(text) {
  if (/\b(yesterday|kahapon)\b/.test(text)) return "yesterday";
  if (/\b(this week|week|linggo(?:ng ito)?|weekly|7 days|last 7)\b/.test(text)) return "week";
  if (/\b(this month|month|buwan(?:an)?|monthly|30 days|last 30)\b/.test(text)) return "month";
  return "today";
}

function parseTimeToken(token, fallbackMeridiem = "") {
  const match = String(token || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|n\.?u\.?|n\.?h\.?)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || fallbackMeridiem || "").replace(/\./g, "");
  if (hour > 23 || minute > 59) return null;
  if (meridiem === "pm" || meridiem === "nh") { if (hour < 12) hour += 12; }
  else if ((meridiem === "am" || meridiem === "nu") && hour === 12) hour = 0;
  else if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
  return { hour, minute };
}

function findTimeRange(text) {
  const match = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|hanggang|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
  if (!match) return null;
  const endMeridiem = (match[2].match(/(am|pm)/) || [])[1] || "";
  const start = parseTimeToken(match[1].replace(/\s+/g, ""), /(am|pm)/.test(match[1]) ? "" : endMeridiem);
  const end = parseTimeToken(match[2].replace(/\s+/g, ""));
  if (!start || !end) return null;
  return { start, end };
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAYS_FIL = ["linggo", "lunes", "martes", "miyerkules", "huwebes", "biyernes", "sabado"];

function findDay(text) {
  if (/\b(tomorrow|bukas)\b/.test(text)) return { relative: 1 };
  if (/\b(today|ngayon|mamaya|tonight)\b/.test(text)) return { relative: 0 };
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return { date: iso[1] };
  for (let index = 0; index < 7; index += 1) {
    if (new RegExp(`\\b(${WEEKDAYS[index]}|${WEEKDAYS_FIL[index]})\\b`).test(text) && !/\blinggo(ng ito)?\b.*\b(sales|benta)\b/.test(text)) {
      return { weekday: index };
    }
  }
  return null;
}

function findPercent(text) {
  const match = text.match(/(\d{1,2}(?:\.\d+)?)\s*(?:%|percent|porsyento)/);
  return match ? Number(match[1]) : 0;
}

function findPesoAmount(text) {
  const match = text.match(/(?:₱|php|p)\s*(\d+(?:\.\d+)?)/) || text.match(/(\d+(?:\.\d+)?)\s*(?:pesos?|php)\b/);
  return match ? Number(match[1]) : 0;
}

const PRODUCT_REF_STOP = /\s+(?:tomorrow|bukas|today|ngayon|mamaya|tonight|this|next|on|from|at|starting|until|mula|(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?|\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d+\s*%|\d+\s*(?:percent|off))\b.*$/;

function trimProductRef(value) {
  return String(value || "").replace(PRODUCT_REF_STOP, "").trim();
}

function findProductRef(rawText, text) {
  const quoted = String(rawText).match(/["“']([^"”']{2,80})["”']/);
  if (quoted) return quoted[1].trim();
  const named = text.match(/\b(?:product|item|listing)\s+([a-z0-9][a-z0-9 \-]{0,40}?)(?=\s+(?:ng|to|sa|at|stock|price|presyo|flash|tomorrow|bukas|\d)|$)/);
  if (named && !/^(ko|mo|na|ng)$/.test(named[1].trim())) return trimProductRef(named[1]);
  const of = text.match(/\b(?:ng|of|for)\s+([a-z0-9][a-z0-9 \-]{2,40}?)\s+(?:to|sa|gawin|into)\b/);
  if (of) return trimProductRef(of[1]);
  const forTail = text.match(/\b(?:ng|of|for|sa)\s+([a-z0-9][a-z0-9 \-]{2,60})$/);
  if (forTail) return trimProductRef(forTail[1]);
  return "";
}

function parseSellerMessage(rawText, state = {}) {
  const text = normalizeText(rawText);
  if (!text) return { clarify: "What would you like to check?" };
  const ordinal = findOrdinal(text);
  const productRef = findProductRef(rawText, text);
  const draft = state.promotionDraft || null;

  if (/^(hi|hello|hey|help|tulong|what can you do)\b[\s!.?]*$/.test(text)) return { tool: "help", args: {} };
  if (/\b(reset|start over|clear chat)\b/.test(text)) return { tool: "reset_context", args: {} };

  if (draft || state.replyDraft) {
    if (/\b(discard|cancel|scrap|delete|huwag na|wag na|ayoko na)\b.*\b(draft|it|ito|yan)?\b/.test(text) && !/\b(order|voucher code)\b/.test(text) && text.split(" ").length <= 5) {
      return { tool: "discard_draft", args: {} };
    }
    if (/^(publish|submit|post|send|go|confirm|i-?publish|i-?submit|ituloy|sige|ok(?:ay)?|yes|oo)\b.{0,30}$/.test(text)) {
      if (state.replyDraft?.text && !draft) return { tool: "send_reply", args: {} };
      const publishTool = { listing: "publish_listing_draft", flash_deal: "publish_flash_deal", voucher: "publish_voucher" }[draft?.type];
      if (publishTool) return { tool: publishTool, args: {} };
    }
  }

  if (state.replyDraft?.threadId && !state.replyDraft.text && !draft) {
    return { tool: "seller_reply_draft", args: { threadId: state.replyDraft.threadId, message: String(rawText).trim() } };
  }

  const startsOtherDraft = (type) =>
    ({
      voucher: /\bflash[\s-]?deal\b|\b(listing|product)\b.*\b(create|new|gawa|draft)\b|\b(create|new|gawa|draft)\b.*\b(listing|product)\b/,
      flash_deal: /\bvoucher\b|\b(listing|product)\b.*\b(create|new|gawa|draft)\b|\b(create|new|gawa|draft)\b.*\b(listing|product)\b/,
      listing: /\bvoucher\b|\bflash[\s-]?deal\b/,
    })[type]?.test(text);

  if (draft && draft.type === "voucher" && !startsOtherDraft("voucher")) {
    const minSpend = text.match(/\b(?:min(?:imum)?(?: spend)?|minimum na|at least|above|over)\s*₱?\s*(\d+)/);
    const code = String(rawText).match(/\bcode\s*[:=]?\s*([A-Z0-9_-]{3,})\b/i);
    const days = text.match(/\b(\d{1,3})\s*(?:days?|araw)\b/);
    const weeks = text.match(/\b(\d{1,2})\s*(?:weeks?|linggo)\b/);
    const uses = text.match(/\b(\d{1,2})\s*(?:uses?|times?|beses)\b/);
    const percent = findPercent(text);
    const amount = percent ? 0 : findPesoAmount(text);
    if (minSpend || code || days || weeks || uses || percent || (amount && !minSpend) || /\bfree ship/.test(text)) {
      return {
        tool: "seller_voucher_draft",
        args: {
          update: true,
          ...(minSpend ? { minimumSpend: Number(minSpend[1]) } : {}),
          ...(code ? { code: code[1].toUpperCase() } : {}),
          ...(days ? { validDays: Number(days[1]) } : weeks ? { validDays: Number(weeks[1]) * 7 } : {}),
          ...(uses ? { usesPerAccount: Number(uses[1]) } : {}),
          ...(percent ? { discountPercent: percent } : {}),
          ...(amount && !minSpend ? { discountAmount: amount } : {}),
          ...(/\bfree ship/.test(text) ? { freeShipping: true } : {}),
        },
      };
    }
  }

  if (draft && draft.type === "flash_deal" && !startsOtherDraft("flash_deal")) {
    const range = findTimeRange(text);
    const day = findDay(text);
    const percent = findPercent(text);
    const stockAnswer = text.match(/^\s*(\d{1,5})\s*(?:units?|pcs|piraso|stocks?)?\s*$/) || text.match(/\b(\d{1,5})\s*(?:units?|pcs|piraso|stocks?)\b/);
    const perBuyer = text.match(/\b(?:per buyer|each buyer|bawat buyer|limit)\s*(?:of|ay)?\s*(\d{1,3})\b/);
    if (range || day || percent || stockAnswer || perBuyer) {
      return {
        tool: "seller_flash_deal_draft",
        args: {
          update: true,
          ...(range ? { startTime: range.start, endTime: range.end } : {}),
          ...(day ? { day } : {}),
          ...(percent ? { discountPercent: percent } : {}),
          ...(stockAnswer && !range ? { dealStock: Number(stockAnswer[1]) } : {}),
          ...(perBuyer ? { perBuyerLimit: Number(perBuyer[1]) } : {}),
        },
      };
    }
  }

  if (draft && draft.type === "listing" && !startsOtherDraft("listing")) {
    const description = String(rawText).match(/^\s*(?:description|desc|details?|paglalarawan)\s*[:\-]?\s*(.{3,})$/i);
    if (description) return { tool: "update_listing_draft", args: { description: description[1].trim() } };
    const title = String(rawText).match(/^\s*(?:title|name|pangalan)\s*[:\-]\s*(.{2,})$/i);
    if (title) return { tool: "update_listing_draft", args: { title: title[1].trim() } };
    const price = findPesoAmount(text) || Number((text.match(/\b(?:price|presyo)\s*(?:is|ay|:)?\s*(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const stock = Number((text.match(/\b(\d{1,5})\s*(?:stocks?|pcs|piraso|units?)\b/) || text.match(/\bstocks?\s*(?:is|ay|:)?\s*(\d{1,5})\b/) || [])[1] || 0);
    const category = (String(rawText).match(/\bcategory\s*(?:is|ay|:)?\s*([A-Za-z0-9 &'-]{2,40})\s*$/i) || [])[1];
    if (price || stock || category) {
      return { tool: "update_listing_draft", args: { ...(price ? { price } : {}), ...(stock ? { stock } : {}), ...(category ? { category: category.trim() } : {}) } };
    }
  }

  if (/\bflash[\s-]?deal\b/.test(text)) {
    const range = findTimeRange(text);
    const day = findDay(text);
    return {
      tool: "seller_flash_deal_draft",
      args: {
        productRef: ordinal ? "" : productRef,
        ordinal,
        discountPercent: findPercent(text),
        flashPrice: findPesoAmount(text),
        ...(range ? { startTime: range.start, endTime: range.end } : {}),
        ...(day ? { day } : {}),
      },
    };
  }

  if (/\bvoucher\b/.test(text) && /\b(create|gawa|gawan|make|new|bago|draft|set up)\b/.test(text)) {
    const minSpend = text.match(/\b(?:min(?:imum)?(?: spend)?|minimum na|at least)\s*₱?\s*(\d+)/);
    const code = String(rawText).match(/\bcode\s*[:=]?\s*([A-Z0-9_-]{3,})\b/i);
    return {
      tool: "seller_voucher_draft",
      args: {
        discountPercent: findPercent(text),
        discountAmount: findPercent(text) ? 0 : findPesoAmount(text),
        minimumSpend: minSpend ? Number(minSpend[1]) : 0,
        code: code ? code[1].toUpperCase() : "",
        freeShipping: /\bfree ship/.test(text),
      },
    };
  }

  if (/\b(create|gawa|gawan|add|bago|new|draft)\b.*\b(listing|product)\b|\b(listing|product)\b.*\b(para sa|for)\b/.test(text) && !/\bflash|voucher\b/.test(text)) {
    const title = String(rawText)
      .replace(/^.*?\b(listing|product)\b\s*(?:for|para sa|ng|of)?\s*/i, "")
      .replace(/[.?!]+$/, "")
      .trim();
    return { tool: "create_listing_draft", args: { title } };
  }

  const stockSet = text.match(/\bstocks?\b.*?\b(?:to|into|sa|gawin(?:g| mong| mo)?|=)\s*(\d{1,6})\b/) || text.match(/\b(?:gawin(?:g| mong| mo)?|set|change|palitan)\s*(?:ng\s*)?(\d{1,6})\s*(?:ang\s*)?stocks?\b/);
  if (stockSet) {
    return { tool: "update_product_stock", args: { productRef, ordinal, stock: Number(stockSet[1]) } };
  }

  const priceSet = text.match(/\b(?:price|presyo)\b.*?\b(?:to|into|sa|gawin(?:g| mong| mo)?|=)\s*₱?\s*(\d+(?:\.\d+)?)\b/);
  if (priceSet) {
    return { tool: "update_product_price", args: { productRef, ordinal, price: Number(priceSet[1]) } };
  }

  if (/\b(repl(?:y|ies)|replyan|sagutin|sagot|respond)\b/.test(text)) {
    const draftText = String(rawText).replace(/^.*?\b(?:na|that|saying|sabihin(?:\s+mo)?\s+na)\b\s*/i, "").trim();
    return { tool: "seller_reply_draft", args: { ordinal, message: draftText !== String(rawText).trim() ? draftText : "" } };
  }

  if (/\b(messages?|chats?|inquir\w*|tanong|questions?|customer service)\b/.test(text)) return { tool: "seller_customer_questions", args: {} };

  if (/\b(why|bakit)\b/.test(text) && /\b(sales|benta|orders?)\b/.test(text)) {
    return { tool: "seller_insights", args: { period: findPeriod(text) } };
  }

  if (/\b(low[\s-]?(?:on |in )?stocks?|running low|restock|i-?restock|paubos|mauubos|kulang.*stock|konti na lang|out of stock|ubos na|walang stock|zero stock)\b/.test(text)) {
    return { tool: "seller_low_stock", args: { includeOutOfStock: true } };
  }

  if (/\b(hindi gumagalaw|di gumagalaw|slow[\s-]?moving|dead[\s-]?stock|walang benta|not selling|matumal)\b/.test(text)) {
    return { tool: "seller_inventory", args: { view: "slow_moving" } };
  }

  if (/\b(fast[\s-]?moving|mabilis mabenta)\b/.test(text)) return { tool: "seller_inventory", args: { view: "fast_moving" } };

  if (/\b(pinakamabenta|best[\s-]?sell\w*|top[\s-]?(?:sell\w*|products?)|mabenta|most sold)\b/.test(text)) {
    return { tool: "seller_top_products", args: { period: /\b(today|ngayon|week|month|buwan|linggo)\b/.test(text) ? findPeriod(text) : "month" } };
  }

  if (/\b(views?|viewed|conversion|analytics|traffic|cart[\s-]?adds?|funnel|visits?)\b/.test(text)) {
    return { tool: "seller_product_analytics", args: { days: findPeriod(text) === "week" ? 7 : findPeriod(text) === "today" ? 1 : 30 } };
  }

  if (/\b(earnings?|payout|kinita|income|net)\b/.test(text) && !/\b(sales|benta)\b/.test(text)) return { tool: "seller_earnings", args: { period: findPeriod(text) } };

  if (/\b(sales|benta|revenue|kita|nabenta|sold)\b/.test(text)) {
    const compare = /\b(compare|vs\.?|versus|kumpara|ikumpara)\b/.test(text);
    const weekly = /\b(week|linggo)\b/.test(text);
    const monthly = /\b(month|buwan)\b/.test(text);
    return {
      tool: "seller_sales_summary",
      args: compare
        ? { period: weekly ? "week" : monthly ? "month" : "today", compareTo: weekly ? "previous_week" : monthly ? "previous_month" : "yesterday" }
        : { period: findPeriod(text), compareTo: "" },
    };
  }

  if (/\b(shipping|ship|courier|waybill|pickup|rider)\b/.test(text)) return { tool: "seller_shipping_summary", args: {} };

  if (/\b(orders?)\b/.test(text)) {
    let status = "all";
    if (/\b(pending|bago|new|to pay|unpaid)\b/.test(text)) status = "pending";
    else if (/\b(processing|preparing|to prepare|ihahanda)\b/.test(text)) status = "processing";
    else if (/\b(ready|to ship|for pickup|ready for pickup)\b/.test(text)) status = "ready_for_pickup";
    else if (/\b(cancel\w*|kinansela)\b/.test(text)) status = "cancelled";
    else if (/\b(return\w*|refund\w*|ibinalik)\b/.test(text)) status = "returned";
    else if (/\b(shipped|to receive|in transit|on the way)\b/.test(text)) status = "shipped";
    else if (/\b(completed|delivered|done|tapos)\b/.test(text)) status = "completed";
    return { tool: "seller_orders", args: { status } };
  }

  if (/\b(inventory|stocks?|imbentaryo)\b/.test(text)) return { tool: "seller_inventory", args: { view: "all" } };
  if (/\b(products?|listings?|items?)\b/.test(text)) return { tool: "seller_products", args: { query: productRef } };

  return { clarify: "I can help with sales, orders, low stock, top products, vouchers, and Flash Deals. What would you like to check?" };
}

// ------------------------------------------------------------------ rider

function parseRiderMessage(rawText, state = {}) {
  const text = normalizeText(rawText);
  if (!text) return { clarify: "How can I help with your delivery?" };

  if (/^(hi|hello|hey|help|tulong|what can you do)\b[\s!.?]*$/.test(text)) return { tool: "help", args: {} };

  const amountChange = text.match(/\b(?:make it|gawin(?:g| mong| mo)?|change(?: it)? to|palitan(?: ng)?|set(?: it)? to|ibaba sa|bawasan(?: sa)?)\s*₱?\s*(\d+)/);
  if (amountChange) return { tool: "get_cod_amount", args: { requestedChange: Number(amountChange[1]) } };
  if (/\b(cod|kokolektahin|kolektahin|collect|singilin|sisingilin|babayaran|cash)\b/.test(text)) {
    return { tool: "get_cod_amount", args: {} };
  }

  if (/\b(earnings?|kita|kinita|sweldo|income|magkano.*kita)\b/.test(text)) return { tool: "get_rider_earnings", args: {} };
  if (/\b(history|nakaraan|past deliveries|previous deliveries|natapos)\b/.test(text)) return { tool: "get_delivery_history", args: {} };

  if (/\b(problema|problem|issue|hindi sumasagot|di sumasagot|unreachable|ayaw sumagot|walang sumasagot|can'?t reach|wrong address|maling address|mali.*address|sira|damaged|aksidente|accident|emergency|delikado|unsafe|not ready|hindi pa ready)\b/.test(text)) {
    let category = "OTHER";
    if (/\b(hindi sumasagot|di sumasagot|unreachable|ayaw sumagot|walang sumasagot|can'?t reach|customer)\b/.test(text)) category = "CUSTOMER_UNREACHABLE";
    if (/\b(wrong address|maling address|mali.*address|wrong location)\b/.test(text)) category = "WRONG_LOCATION";
    if (/\b(sira|damaged|damage)\b/.test(text)) category = "PACKAGE_DAMAGED";
    if (/\b(aksidente|accident|emergency)\b/.test(text)) category = "ACCIDENT_EMERGENCY";
    if (/\b(delikado|unsafe|safety)\b/.test(text)) category = "SAFETY_CONCERN";
    if (/\b(not ready|hindi pa ready|seller)\b/.test(text) && category === "OTHER") category = "SELLER_NOT_READY";
    return { tool: "report_delivery_issue", args: { category, description: String(rawText).slice(0, 500), prepareOnly: true } };
  }

  if (/\b(decline|tanggihan|ayoko|ayaw ko|reject|skip)\b/.test(text)) return { tool: "decline_delivery", args: {} };
  if (/\b(accept|tanggapin|tanggap|kunin ko|i'?ll take it|sige kunin)\b/.test(text)) return { tool: "accept_delivery", args: {} };
  if (/\b(go online|mag-?online|online na|start shift)\b/.test(text)) return { tool: "set_availability", args: { online: true } };
  if (/\b(go offline|mag-?offline|offline na|end shift|pahinga)\b/.test(text)) return { tool: "set_availability", args: { online: false } };

  if (/\b(delivered|naihatid|nai-?deliver|na-?deliver|natanggap na|received na|tapos na (?:ang )?delivery|delivery complete)\b/.test(text)) {
    return { tool: "confirm_delivery", args: {} };
  }
  if (/\b(picked up|nakuha ko na|na-?pick ?up|pickup done|nakuha na|got the package)\b/.test(text)) return { tool: "confirm_pickup", args: {} };
  if (/\b(arrived|nandito na|andito na|narito na|dumating na|nasa pickup na|nasa customer na|mark arrived|i'?m here|i am here)\b/.test(text)) {
    return { tool: "mark_arrived", args: {} };
  }
  if (/\b(papunta na|on the way|heading|otw|start (?:pickup|delivery)|aalis na)\b/.test(text)) return { tool: "advance_delivery", args: {} };

  if (/\b(offer|bagong delivery|available delivery|new job|new delivery|may job|may offer|may booking)\b/.test(text)) {
    return { tool: "get_available_delivery_offer", args: {} };
  }
  if (/\b(pick ?up|kukunin|saan.*kuha|seller address|pickup address|saan ang seller)\b/.test(text)) return { tool: "get_pickup_details", args: {} };
  if (/\b(drop[\s-]?off|customer address|saan.*hatid|ihahatid|buyer address|saan ang customer|address ng customer)\b/.test(text)) {
    return { tool: "get_dropoff_details", args: {} };
  }
  if (/\b(status)\b/.test(text)) return { tool: "get_delivery_status", args: {} };
  if (/\b(delivery|deliveries|job|next|susunod|gagawin|next step|what now|current|ano na)\b/.test(text)) {
    return { tool: "get_current_delivery", args: {} };
  }

  return { clarify: "I can help with your current delivery, pickup, drop-off, COD, earnings, or reporting an issue. What do you need?" };
}

module.exports = {
  normalizeText,
  findColor,
  findGender,
  findSize,
  findPrice,
  budgetToRange,
  findSort,
  findOrdinal,
  findOrdinals,
  findQuantity,
  findProductNouns,
  extractQuery,
  extractFilters,
  findTimeRange,
  findDay,
  findPercent,
  mergeFilters,
  parseBuyerMessage,
  parseSellerMessage,
  parseRiderMessage,
  PRODUCT_NOUN_SYNONYMS,
  COLOR_SYNONYMS,
};

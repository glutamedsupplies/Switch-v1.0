(function () {
  const preparingOrderListEl = document.querySelector("[data-preparing-order-list]");
  const preparingCountPillEl = document.querySelector("[data-preparing-count-pill]");
  const shippingOrderListEl = document.querySelector("[data-shipping-order-list]");
  const shippingCountPillEl = document.querySelector("[data-shipping-count-pill]");
  const preparingPaginationEl = document.querySelector("[data-packing-preparing-pagination]");
  const shippingPaginationEl = document.querySelector("[data-packing-shipping-pagination]");
  const orderCountEl = document.querySelector("[data-packing-order-count]");
  const itemCountEl = document.querySelector("[data-packing-item-count]");
  const deductionTotalEl = document.querySelector("[data-packing-deduction-total]");
  const balanceTotalEl = document.querySelector("[data-packing-balance-total]");
  const packingBarcodePanel = document.querySelector("[data-packing-barcode-panel]");
  const packingBarcodeToggle = document.querySelector("[data-packing-barcode-toggle]");
  const packingBarcodeClose = document.querySelector("[data-packing-barcode-close]");
  const packingBarcodeList = document.querySelector("[data-packing-barcode-list]");
  const packingBarcodeFab = document.querySelector("[data-packing-barcode-fab]");
  const packingBarcodeSearchInput = document.querySelector("[data-packing-barcode-search]");
  const packingWorkspaceSearchInput = document.getElementById("packing-workspace-search");
  const packingInProgressCountEl = document.querySelector("[data-packing-in-progress-count]");
  const packingReadyShipCountEl = document.querySelector("[data-packing-ready-ship-count]");
  const packingShippedTodayCountEl = document.querySelector("[data-packing-shipped-today-count]");
  const packingProgressPillEl = document.querySelector("[data-packing-progress-pill]");
  const packingCompletePillEl = document.querySelector("[data-packing-complete-pill]");
  const packingTransitPillEl = document.querySelector("[data-packing-transit-pill]");
  const packingShippedPillEl = document.querySelector("[data-packing-shipped-pill]");
  const packingFeedListEl = document.querySelector("[data-packing-feed-list]");
  const packingFeedFilterEl = document.querySelector("[data-packing-feed-filter]");
  const packingFeedUpdatedEl = document.querySelector("[data-packing-feed-updated]");
  const packingSelectionCopyEl = document.querySelector("[data-packing-selection-copy]");

  if (!preparingOrderListEl || !shippingOrderListEl) {
    return;
  }
  const isPackingAdminWorkspace = document.body.classList.contains("packing-admin-page");

  function readSessionStorageJson(key) {
    try {
      const rawSession = window.sessionStorage.getItem(key);
      return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
      return null;
    }
  }

  function getFirstAdminScopeValue(source, keys) {
    for (const key of keys) {
      const value = String(source?.[key] ?? "").trim();
      if (value) {
        return value;
      }
    }

    return "";
  }

  function resolveAdminTenantIdFromSession(session, fallback = "") {
    if (!session || typeof session !== "object") {
      return fallback;
    }

    return getFirstAdminScopeValue(session, [
      "adminId",
      "ownerAdminId",
      "tenantId",
      "workspaceId",
      "storeAdminId",
      "id",
      "accountCode",
    ]) || fallback;
  }

  function getActivePackingAdminTenantId() {
    const adminSession = readSessionStorageJson("gms-admin-session");
    const adminId = resolveAdminTenantIdFromSession(
      adminSession,
      adminSession && typeof adminSession === "object" ? "admin" : "",
    );
    if (adminId) {
      return adminId;
    }

    const employeeSession = readSessionStorageJson("gms-employee-session");
    const employeeAdminId = resolveAdminTenantIdFromSession(employeeSession, "");
    if (employeeAdminId) {
      return employeeAdminId;
    }

    try {
      return String(window.localStorage?.getItem("gms-admin-id") || "").trim();
    } catch (error) {
      return "";
    }
  }

  function withPackingAdminTenantHeaders(headers = {}) {
    const adminId = getActivePackingAdminTenantId();
    if (!adminId) {
      return headers;
    }

    return {
      ...headers,
      "X-GMS-Admin-ID": adminId,
    };
  }

  function getThemedProductPhotoIconMarkup() {
    return `
      <svg class="insight-order-item__photo-icon" viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
        <path fill="currentColor" stroke="none" d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm86-157h429q9 0 13-8t-1-16L590-457q-5-6-12-6t-12 6L446-302l-81-111q-5-6-12-6t-12 6l-86 112q-6 8-2 16t13 8Zm109.5-307.5Q390-599 390-620t-14.5-35.5Q361-670 340-670t-35.5 14.5Q290-641 290-620t14.5 35.5Q319-570 340-570t35.5-14.5Z"></path>
      </svg>
    `;
  }

  const state = {
    preparingGroups: [],
    shippingGroups: [],
    inTransitGroups: [],
    shippedGroups: [],
    cancelledGroups: [],
    allEntries: [],
    isLoading: false,
    activePackRequestId: "",
    activeShipRequestId: "",
    groupScannedQuantities: {},
    selectedScanGroupId: "",
    selectedScanProductId: "",
    selectedScanKey: "",
    packingBarcodeProducts: [],
    packingBarcodeSearchTerm: "",
    workspaceSearchTerm: "",
    prepareFilter: "to-pack",
    shippingFilter: "ready",
    preparingPage: 1,
    shippingPage: 1,
    feedFilter: "all",
    expandedAddOnDropdowns: {},
  };

  const productsById = new Map();
  const barcodeToProductId = new Map();
  const barcodeHiddenInput = document.querySelector("[data-hidden-barcode-input]");
  let packingBarcodePanelCloseTimer = 0;
  let packingBarcodeSearchTimer = 0;
  let packingRealtimeRefreshTimer = 0;
  let packingRealtimeRefreshInFlight = false;
  let packingRealtimeProductsPending = false;
  let packingRealtimeOrdersPending = false;
  const PACKING_BOX_ANIMATION_URL = "/animations/packing-box.json";
  const PACKING_BOX_JSON_START_OFFSET_MS = 900;
  const PACKING_BOX_JSON_END_OFFSET_MS = 3000;
  const PACKING_BOX_JSON_FALLBACK_REMAINING_MS = 3400;
  const PACKING_BOX_OVERLAY_EXIT_MS = 220;
  const PACKING_CARD_FLIGHT_MS = 820;
  const PACKING_LIST_PAGE_SIZE = 8;
  const PACKING_LOTTIE_PLAYER_URL = "/vendor/lottie.min.js";
  const SCAN_COMPLETE_CHECK_ANIMATION_URL = "/animations/scan-complete-check.json";
  let packingBoxAnimationDataPromise = null;
  let packingBoxJsonDurationPromise = null;
  let packingLottiePlayerPromise = null;

  const PACKING_ORDER_COURIER_ICON_MARKUP = `
    <svg viewBox="0 0 640 640" fill="none" aria-hidden="true">
      <path
        d="M96 144C87.2 144 80 151.2 80 160L80 448C80 456.8 87.2 464 96 464L99.3 464C109.7 427.1 143.7 400 184 400C224.3 400 258.2 427.1 268.7 464L371.3 464C376.2 446.6 386.4 431.3 400 420.1L400 160C400 151.2 392.8 144 384 144L96 144zM99.3 512L96 512C60.7 512 32 483.3 32 448L32 160C32 124.7 60.7 96 96 96L384 96C419.3 96 448 124.7 448 160L448 192L503.4 192C520.4 192 536.7 198.7 548.7 210.7L589.3 251.3C601.3 263.3 608 279.6 608 296.6L608 448C608 483.3 579.3 512 544 512L540.7 512C530.3 548.9 496.3 576 456 576C415.7 576 381.8 548.9 371.3 512L268.7 512C258.3 548.9 224.3 576 184 576C143.7 576 109.8 548.9 99.3 512zM448 320L560 320L560 296.6C560 292.4 558.3 288.3 555.3 285.3L514.7 244.7C511.7 241.7 507.6 240 503.4 240L448 240L448 320zM448 368L448 400.4C450.6 400.2 453.3 400 456 400C496.3 400 530.2 427.1 540.7 464L544 464C552.8 464 560 456.8 560 448L560 368L448 368zM184 528C206.1 528 224 510.1 224 488C224 465.9 206.1 448 184 448C161.9 448 144 465.9 144 488C144 510.1 161.9 528 184 528zM456 528C478.1 528 496 510.1 496 488C496 465.9 478.1 448 456 448C433.9 448 416 465.9 416 488C416 510.1 433.9 528 456 528z"
        fill="currentColor"
      ></path>
    </svg>
  `;

  const PACKING_ORDER_CLOCK_ICON_MARKUP = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 7V12L14.5 13.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
  `;

  const PACKING_ORDER_AMOUNT_ICON_MARKUP = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 5C13 6.10457 10.5376 7 7.5 7C4.46243 7 2 6.10457 2 5M13 5C13 3.89543 10.5376 3 7.5 3C4.46243 3 2 3.89543 2 5M13 5V6.5M2 5V17C2 18.1046 4.46243 19 7.5 19M7.5 11C7.33145 11 7.16468 10.9972 7 10.9918C4.19675 10.9 2 10.0433 2 9M7.5 15C4.46243 15 2 14.1046 2 13M22 11.5C22 12.6046 19.5376 13.5 16.5 13.5C13.4624 13.5 11 12.6046 11 11.5M22 11.5C22 10.3954 19.5376 9.5 16.5 9.5C13.4624 9.5 11 10.3954 11 11.5M22 11.5V19C22 20.1046 19.5376 21 16.5 21C13.4624 21 11 20.1046 11 19V11.5M22 15.25C22 16.3546 19.5376 17.25 16.5 17.25C13.4624 17.25 11 16.3546 11 15.25"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
  `;

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function removePackingLottieBackgroundLayers(animationData) {
    if (!animationData || typeof animationData !== "object") {
      return animationData;
    }

    const stripSolidBackgroundLayers = (layers) => (Array.isArray(layers)
      ? layers.filter((layer) => {
        const layerName = String(layer?.nm || "").toLowerCase();
        return !(Number(layer?.ty) === 1 && /solid|background|white/.test(layerName));
      })
      : layers);

    animationData.layers = stripSolidBackgroundLayers(animationData.layers);
    (animationData.assets || []).forEach((asset) => {
      if (asset?.layers) {
        asset.layers = stripSolidBackgroundLayers(asset.layers);
      }
    });

    return animationData;
  }

  function getPackingBoxAnimationData() {
    if (!packingBoxAnimationDataPromise) {
      packingBoxAnimationDataPromise = fetch(PACKING_BOX_ANIMATION_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then(removePackingLottieBackgroundLayers)
        .catch(() => null);
    }

    return packingBoxAnimationDataPromise;
  }

  function clonePackingLottieData(animationData) {
    if (!animationData) {
      return null;
    }

    if (typeof structuredClone === "function") {
      return structuredClone(animationData);
    }

    return JSON.parse(JSON.stringify(animationData));
  }

  function getPackingThemeAccentColor() {
    const styles = window.getComputedStyle(document.documentElement);
    const accentRgb = String(styles.getPropertyValue("--accent-rgb") || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    if (accentRgb.length >= 3) {
      return accentRgb.slice(0, 3).map((value) => Math.min(1, Math.max(0, value / 255)));
    }

    const accent = String(styles.getPropertyValue("--accent") || "").trim();
    const hexMatch = accent.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const rawHex = hexMatch[1].length === 3
        ? hexMatch[1].split("").map((char) => `${char}${char}`).join("")
        : hexMatch[1];
      return [0, 2, 4].map((index) => parseInt(rawHex.slice(index, index + 2), 16) / 255);
    }

    const rgbMatch = accent.match(/rgba?\(([^)]+)\)/i);
    if (rgbMatch) {
      const values = rgbMatch[1]
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      if (values.length >= 3) {
        return values.slice(0, 3).map((value) => Math.min(1, Math.max(0, value / 255)));
      }
    }

    return [37 / 255, 99 / 255, 235 / 255];
  }

  function isNearWhiteLottieColor(colorValue) {
    return Array.isArray(colorValue)
      && colorValue.length >= 3
      && colorValue[0] > 0.92
      && colorValue[1] > 0.92
      && colorValue[2] > 0.92;
  }

  function applyPackingThemeColorValue(colorValue, accentColor) {
    if (!Array.isArray(colorValue) || colorValue.length < 3 || isNearWhiteLottieColor(colorValue)) {
      return colorValue;
    }

    return [
      accentColor[0],
      accentColor[1],
      accentColor[2],
      colorValue.length > 3 ? colorValue[3] : 1,
    ];
  }

  function applyPackingThemeColorProperty(colorProperty, accentColor) {
    if (!colorProperty || !Object.prototype.hasOwnProperty.call(colorProperty, "k")) {
      return;
    }

    if (Array.isArray(colorProperty.k) && typeof colorProperty.k[0] === "number") {
      colorProperty.k = applyPackingThemeColorValue(colorProperty.k, accentColor);
      return;
    }

    if (Array.isArray(colorProperty.k)) {
      colorProperty.k.forEach((keyframe) => {
        if (Array.isArray(keyframe?.s)) {
          keyframe.s = applyPackingThemeColorValue(keyframe.s, accentColor);
        }
        if (Array.isArray(keyframe?.e)) {
          keyframe.e = applyPackingThemeColorValue(keyframe.e, accentColor);
        }
      });
    }
  }

  function applyPackingThemeToLottieItems(items, accentColor) {
    (items || []).forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      if ((item.ty === "st" || item.ty === "fl") && item.c) {
        applyPackingThemeColorProperty(item.c, accentColor);
      }

      if (Array.isArray(item.it)) {
        applyPackingThemeToLottieItems(item.it, accentColor);
      }
    });
  }

  function getThemedPackingBoxAnimationData(animationData) {
    const themedData = clonePackingLottieData(animationData);
    if (!themedData) {
      return themedData;
    }

    const accentColor = getPackingThemeAccentColor();
    const themeLayers = (layers) => {
      (layers || []).forEach((layer) => {
        applyPackingThemeToLottieItems(layer.shapes, accentColor);
      });
    };

    themeLayers(themedData.layers);
    (themedData.assets || []).forEach((asset) => {
      themeLayers(asset.layers);
    });

    return themedData;
  }

  function getPackingBoxRemainingDurationMs(animationData) {
    const frameRate = Number(animationData?.fr) || 30;
    const inPoint = Number(animationData?.ip) || 0;
    const outPoint = Number(animationData?.op) || 0;
    const durationMs = outPoint > inPoint
      ? ((outPoint - inPoint) / frameRate) * 1000
      : PACKING_BOX_JSON_FALLBACK_REMAINING_MS + PACKING_BOX_JSON_START_OFFSET_MS;
    return Math.max(900, durationMs - PACKING_BOX_JSON_START_OFFSET_MS);
  }

  function getPackingBoxStageDurationMs() {
    return Math.max(
      900,
      PACKING_BOX_JSON_END_OFFSET_MS - PACKING_BOX_JSON_START_OFFSET_MS,
    );
  }

  function getPackingBoxJsonRemainingDurationMs() {
    if (!packingBoxJsonDurationPromise) {
      packingBoxJsonDurationPromise = getPackingBoxAnimationData()
        .then(getPackingBoxRemainingDurationMs)
        .catch(() => PACKING_BOX_JSON_FALLBACK_REMAINING_MS);
    }

    return packingBoxJsonDurationPromise;
  }

  function getLottieValue(prop, frame, fallback) {
    if (!prop) {
      return fallback;
    }

    const value = Object.prototype.hasOwnProperty.call(prop, "k") ? prop.k : prop;
    if (Array.isArray(value) && value.length && value[0] && typeof value[0] === "object" && "t" in value[0]) {
      return getLottieKeyframeValue(value, frame, fallback);
    }
    return value ?? fallback;
  }

  function getLottieKeyframeValue(keyframes, frame, fallback) {
    const usableKeyframes = keyframes.filter((keyframe) => keyframe && Number.isFinite(Number(keyframe.t)));
    if (!usableKeyframes.length) {
      return fallback;
    }

    if (frame <= Number(usableKeyframes[0].t)) {
      return getLottieKeyframeSideValue(usableKeyframes[0], "s", fallback);
    }

    for (let index = 0; index < usableKeyframes.length - 1; index += 1) {
      const current = usableKeyframes[index];
      const next = usableKeyframes[index + 1];
      const currentFrame = Number(current.t);
      const nextFrame = Number(next.t);
      if (frame <= nextFrame) {
        const fromValue = getLottieKeyframeSideValue(current, "s", fallback);
        const toValue = getLottieKeyframeSideValue(
          current,
          "e",
          getLottieKeyframeSideValue(next, "s", fromValue),
        );
        const span = Math.max(1, nextFrame - currentFrame);
        const progress = Math.min(1, Math.max(0, (frame - currentFrame) / span));
        return interpolateLottieValue(fromValue, toValue, progress);
      }
    }

    const lastKeyframe = usableKeyframes[usableKeyframes.length - 1];
    return getLottieKeyframeSideValue(
      lastKeyframe,
      "e",
      getLottieKeyframeSideValue(lastKeyframe, "s", fallback),
    );
  }

  function getLottieKeyframeSideValue(keyframe, side, fallback) {
    const value = keyframe?.[side];
    if (Array.isArray(value) && value.length === 1) {
      return value[0];
    }
    return value ?? fallback;
  }

  function interpolateLottieValue(fromValue, toValue, progress) {
    if (typeof fromValue === "number" && typeof toValue === "number") {
      return fromValue + (toValue - fromValue) * progress;
    }

    if (Array.isArray(fromValue) && Array.isArray(toValue) && fromValue.length === toValue.length) {
      return fromValue.map((item, index) => interpolateLottieValue(item, toValue[index], progress));
    }

    if (fromValue && toValue && Array.isArray(fromValue.v) && Array.isArray(toValue.v)) {
      return {
        c: Boolean(fromValue.c),
        v: interpolateLottieValue(fromValue.v, toValue.v, progress),
        i: interpolateLottieValue(fromValue.i, toValue.i, progress),
        o: interpolateLottieValue(fromValue.o, toValue.o, progress),
      };
    }

    return progress < 1 ? fromValue : toValue;
  }

  function getLottiePoint(prop, frame, fallback = [0, 0]) {
    const value = getLottieValue(prop, frame, fallback);
    return [
      Number(value?.[0]) || fallback[0],
      Number(value?.[1]) || fallback[1],
    ];
  }

  function getLottieNumber(prop, frame, fallback = 0) {
    const value = getLottieValue(prop, frame, fallback);
    return Number(Array.isArray(value) ? value[0] : value) || fallback;
  }

  function getLottieTransformMarkup(transform, frame) {
    if (!transform) {
      return "";
    }

    const position = getLottiePoint(transform.p, frame, [0, 0]);
    const anchor = getLottiePoint(transform.a, frame, [0, 0]);
    const scale = getLottieValue(transform.s, frame, [100, 100]);
    const rotation = getLottieNumber(transform.r, frame, 0);
    const scaleX = (Number(scale?.[0]) || 100) / 100;
    const scaleY = (Number(scale?.[1]) || 100) / 100;

    return [
      `translate(${position[0]} ${position[1]})`,
      rotation ? `rotate(${rotation})` : "",
      `scale(${scaleX} ${scaleY})`,
      `translate(${-anchor[0]} ${-anchor[1]})`,
    ].filter(Boolean).join(" ");
  }

  function getLottieColorMarkup(colorValue) {
    const red = Math.round(Math.min(1, Math.max(0, Number(colorValue?.[0]) || 0)) * 255);
    const green = Math.round(Math.min(1, Math.max(0, Number(colorValue?.[1]) || 0)) * 255);
    const blue = Math.round(Math.min(1, Math.max(0, Number(colorValue?.[2]) || 0)) * 255);
    const alpha = Math.min(1, Math.max(0, Number(colorValue?.[3]) || 1));
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function lottiePathToSvgPath(pathValue) {
    if (!pathValue || !Array.isArray(pathValue.v) || !pathValue.v.length) {
      return "";
    }

    const vertices = pathValue.v;
    const inTangents = Array.isArray(pathValue.i) ? pathValue.i : [];
    const outTangents = Array.isArray(pathValue.o) ? pathValue.o : [];
    const segments = [`M ${Number(vertices[0][0]) || 0} ${Number(vertices[0][1]) || 0}`];
    const segmentCount = pathValue.c ? vertices.length : vertices.length - 1;

    for (let index = 0; index < segmentCount; index += 1) {
      const nextIndex = (index + 1) % vertices.length;
      const currentVertex = vertices[index];
      const nextVertex = vertices[nextIndex];
      const outTangent = outTangents[index] || [0, 0];
      const inTangent = inTangents[nextIndex] || [0, 0];
      const controlOne = [
        (Number(currentVertex[0]) || 0) + (Number(outTangent[0]) || 0),
        (Number(currentVertex[1]) || 0) + (Number(outTangent[1]) || 0),
      ];
      const controlTwo = [
        (Number(nextVertex[0]) || 0) + (Number(inTangent[0]) || 0),
        (Number(nextVertex[1]) || 0) + (Number(inTangent[1]) || 0),
      ];

      segments.push(
        `C ${controlOne[0]} ${controlOne[1]} ${controlTwo[0]} ${controlTwo[1]} ${Number(nextVertex[0]) || 0} ${Number(nextVertex[1]) || 0}`,
      );
    }

    if (pathValue.c) {
      segments.push("Z");
    }

    return segments.join(" ");
  }

  function createPackingBoxFallbackMarkup() {
    return "";
  }

  function ensurePackingLottiePlayer() {
    if (window.lottie?.loadAnimation) {
      return Promise.resolve(true);
    }

    if (!packingLottiePlayerPromise) {
      packingLottiePlayerPromise = new Promise((resolve) => {
        const existingScript = document.querySelector(`script[src="${PACKING_LOTTIE_PLAYER_URL}"]`);
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
          existingScript.addEventListener("error", () => resolve(false), { once: true });
          return;
        }

        const script = document.createElement("script");
        const timeoutId = window.setTimeout(() => resolve(false), 8000);
        script.src = PACKING_LOTTIE_PLAYER_URL;
        script.async = true;
        script.onload = () => {
          window.clearTimeout(timeoutId);
          resolve(Boolean(window.lottie?.loadAnimation));
        };
        script.onerror = () => {
          window.clearTimeout(timeoutId);
          resolve(false);
        };
        document.head.appendChild(script);
      });
    }

    return packingLottiePlayerPromise;
  }

  function createPackingBoxLottiePlayerMarkup() {
    return `
      <div class="packing-order-transfer__box packing-order-transfer__box--player">
        <div class="packing-order-transfer__lottie-player" aria-hidden="true"></div>
      </div>
    `;
  }

  function playPackingBoxLottiePlayer(container, animationData, playbackDurationMs) {
    return new Promise((resolve) => {
      const playerEl = container.querySelector(".packing-order-transfer__lottie-player");
      if (!playerEl || !window.lottie?.loadAnimation || !animationData) {
        resolve(null);
        return;
      }

      let animation = null;
      let isSettled = false;
      let playbackWindowTimer = 0;
      const finishNow = () => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        if (animation?.pause) {
          animation.pause();
        }
        window.clearTimeout(playbackWindowTimer);
        window.clearTimeout(timeoutId);
        resolve(animation);
      };
      const timeoutId = window.setTimeout(
        finishNow,
        Math.max(1200, Number(playbackDurationMs) || 0) + 1500,
      );

      try {
        animation = window.lottie.loadAnimation({
          container: playerEl,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: false,
            hideOnTransparent: true,
          },
        });
        animation.addEventListener("DOMLoaded", () => {
          const frameRate = Number(animationData.fr) || 30;
          const inPoint = Number(animationData.ip) || 0;
          const startFrame = inPoint + ((PACKING_BOX_JSON_START_OFFSET_MS / 1000) * frameRate);
          animation.setSpeed?.(1);
          playbackWindowTimer = window.setTimeout(
            finishNow,
            Math.max(900, Number(playbackDurationMs) || 0),
          );
          animation.goToAndPlay(startFrame, true);
        });
        animation.addEventListener("complete", finishNow);
        animation.addEventListener("data_failed", finishNow);
        animation.addEventListener("error", finishNow);
      } catch (error) {
        console.warn("Unable to play packing box Lottie animation:", error);
        finishNow();
      }
    });
  }

  function createPackingBoxLottieMarkup(animationData, remainingMs) {
    if (!animationData || !Array.isArray(animationData.layers)) {
      return createPackingBoxFallbackMarkup();
    }

    const frameRate = Number(animationData.fr) || 30;
    const visualFrame = ((PACKING_BOX_JSON_START_OFFSET_MS / 1000) * frameRate) + (Number(animationData.ip) || 0);
    const startOffsetMs = PACKING_BOX_JSON_START_OFFSET_MS;
    const assetsById = new Map((animationData.assets || []).map((asset) => [asset.id, asset]));
    const paths = [];

    const renderShapeLayer = (
      layer,
      layerFrame,
      transformMarkup,
      absoluteStartMs,
      absoluteEndMs,
      outputPaths = paths,
      forceVisible = false,
    ) => {
      const delayMs = Math.max(0, Math.round(absoluteStartMs - startOffsetMs));
      const startsVisible = absoluteStartMs <= startOffsetMs + 24;
      const durationMs = Math.max(
        240,
        Math.round(Math.min(remainingMs, Math.max(absoluteEndMs, startOffsetMs + 240) - Math.max(absoluteStartMs, startOffsetMs))),
      );

      (layer.shapes || []).forEach((shapeGroup) => {
        if (shapeGroup.ty !== "gr" || !Array.isArray(shapeGroup.it)) {
          return;
        }

        const pathItem = shapeGroup.it.find((item) => item.ty === "sh");
        const strokeItem = shapeGroup.it.find((item) => item.ty === "st" || item.ty === "gs");
        const transformItem = shapeGroup.it.find((item) => item.ty === "tr");
        if (!pathItem || !strokeItem) {
          return;
        }

        const pathData = lottiePathToSvgPath(getLottieValue(pathItem.ks, layerFrame, null));
        if (!pathData) {
          return;
        }

        const strokeWidth = Math.max(1, getLottieNumber(strokeItem.w, layerFrame, 18));
        const strokeColor = getLottieColorMarkup(getLottieValue(strokeItem.c, layerFrame, [0.51, 0.16, 0.82, 1]));
        const groupTransform = getLottieTransformMarkup(transformItem, layerFrame);
        const pathClass = forceVisible || startsVisible
          ? "packing-order-transfer__lottie-path is-visible-at-start"
          : "packing-order-transfer__lottie-path";
        const style = `--lottie-path-delay: ${delayMs}ms; --lottie-path-duration: ${durationMs}ms;`;

        outputPaths.push(`
          <g transform="${escapeHtml(transformMarkup)}">
            <g transform="${escapeHtml(groupTransform)}">
              <path
                class="${pathClass}"
                d="${escapeHtml(pathData)}"
                fill="none"
                stroke="${escapeHtml(strokeColor)}"
                stroke-width="${escapeHtml(String(strokeWidth))}"
                stroke-linecap="round"
                stroke-linejoin="round"
                pathLength="100"
                style="${escapeHtml(style)}"
              ></path>
            </g>
          </g>
        `);
      });
    };

    const renderLayers = (
      layers,
      compFrame,
      parentTransformMarkup,
      absoluteCompStartMs,
      outputPaths = paths,
      forceVisible = false,
    ) => {
      (layers || []).slice().reverse().forEach((layer) => {
        const layerIp = Number(layer.ip) || 0;
        const layerOp = Number(layer.op) || Number(animationData.op) || layerIp + frameRate;
        if (compFrame < layerIp || compFrame > layerOp) {
          return;
        }
        const absoluteStartMs = absoluteCompStartMs + (layerIp / frameRate) * 1000;
        const absoluteEndMs = absoluteCompStartMs + (layerOp / frameRate) * 1000;
        if (absoluteEndMs <= startOffsetMs + 24 || absoluteStartMs >= startOffsetMs + remainingMs) {
          return;
        }

        const layerFrame = Math.max(0, compFrame - layerIp + (Number(layer.st) || 0));
        const layerTransform = getLottieTransformMarkup(layer.ks, layerFrame);
        const transformMarkup = [parentTransformMarkup, layerTransform].filter(Boolean).join(" ");

        if (layer.ty === 0 && layer.refId) {
          const asset = assetsById.get(layer.refId);
          if (asset?.layers) {
            renderLayers(asset.layers, layerFrame, transformMarkup, absoluteStartMs, outputPaths, forceVisible);
          }
          return;
        }

        if (layer.ty === 4) {
          renderShapeLayer(layer, layerFrame, transformMarkup, absoluteStartMs, absoluteEndMs, outputPaths, forceVisible);
        }
      });
    };

    const frameGroups = [];
    const outPoint = Number(animationData.op) || visualFrame + frameRate;
    const sampleCount = 8;
    for (let index = 0; index < sampleCount; index += 1) {
      const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
      const sampleFrame = visualFrame + Math.max(0, outPoint - visualFrame) * progress;
      const snapshotPaths = [];
      renderLayers(animationData.layers, sampleFrame, "", 0, snapshotPaths, true);
      if (snapshotPaths.length) {
        frameGroups.push(`
          <g class="packing-order-transfer__lottie-frame${index === 0 ? " is-active" : ""}" data-lottie-frame="${index}">
            ${snapshotPaths.join("")}
          </g>
        `);
      }
    }

    if (!frameGroups.length) {
      renderLayers(animationData.layers, visualFrame, "", 0);
    }

    if (!frameGroups.length && !paths.length) {
      return createPackingBoxFallbackMarkup();
    }

    return `
      <div class="packing-order-transfer__box packing-order-transfer__box--lottie">
        <svg
          class="packing-order-transfer__lottie"
          viewBox="0 0 ${escapeHtml(String(animationData.w || 600))} ${escapeHtml(String(animationData.h || 600))}"
          aria-hidden="true"
          focusable="false"
        >
          ${frameGroups.length ? frameGroups.join("") : paths.join("")}
        </svg>
      </div>
    `;
  }

  function getRectCenter(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function getPackingOrderCardElement(createdAtEpochMs) {
    const orderKey = CSS.escape(String(createdAtEpochMs));
    return document.querySelector(`[data-packing-order-card="${orderKey}"]`);
  }

  async function animatePackingCardToShipment(sourceCard) {
    if (!(sourceCard instanceof HTMLElement) || !(shippingOrderListEl instanceof HTMLElement)) {
      return;
    }

    const sourceRect = sourceCard.getBoundingClientRect();
    const targetRect = shippingOrderListEl.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width) {
      return;
    }

    const cardClone = sourceCard.cloneNode(true);
    if (!(cardClone instanceof HTMLElement)) {
      return;
    }

    cardClone.querySelector(".packing-order-card-animation-overlay")?.remove();
    cardClone.classList.remove("is-packing-transfer-source", "is-packing-card-flight-source");
    cardClone.classList.add("packing-card-flight-clone");
    cardClone.setAttribute("aria-hidden", "true");
    cardClone.style.left = `${sourceRect.left}px`;
    cardClone.style.top = `${sourceRect.top}px`;
    cardClone.style.width = `${sourceRect.width}px`;
    cardClone.style.height = `${sourceRect.height}px`;
    document.body.appendChild(cardClone);

    sourceCard.classList.add("is-packing-card-flight-source");

    const targetPadding = 10;
    const availableTargetWidth = Math.max(1, targetRect.width - targetPadding * 2);
    const endScale = Math.min(1, availableTargetWidth / sourceRect.width);
    const endX = targetRect.left + targetPadding + Math.max(0, (availableTargetWidth - sourceRect.width * endScale) / 2) - sourceRect.left;
    const endY = targetRect.top + targetPadding - sourceRect.top;
    const arcX = endX * 0.48;
    const arcY = endY - Math.min(110, Math.max(54, Math.abs(endX) * 0.12));

    if (typeof cardClone.animate === "function") {
      const flight = cardClone.animate(
        [
          {
            opacity: 1,
            transform: "translate3d(0, 0, 0) scale(1)",
            offset: 0,
          },
          {
            opacity: 0.98,
            transform: `translate3d(${arcX}px, ${arcY}px, 0) scale(${Math.max(endScale, 0.94)})`,
            offset: 0.54,
          },
          {
            opacity: 0.16,
            transform: `translate3d(${endX}px, ${endY}px, 0) scale(${endScale})`,
            offset: 1,
          },
        ],
        {
          duration: PACKING_CARD_FLIGHT_MS,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      );
      await flight.finished.catch(() => {});
    } else {
      cardClone.style.transition =
        `transform ${PACKING_CARD_FLIGHT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PACKING_CARD_FLIGHT_MS}ms ease`;
      cardClone.style.transform = `translate3d(${endX}px, ${endY}px, 0) scale(${endScale})`;
      cardClone.style.opacity = "0.16";
      await wait(PACKING_CARD_FLIGHT_MS);
    }

    cardClone.remove();
    sourceCard.classList.remove("is-packing-card-flight-source");
  }

  async function runPackingBoxTransferAnimationFromElement(sourceElement) {
    const sourceCard = sourceElement;
    if (!(sourceCard instanceof HTMLElement)) {
      return;
    }

    const sourceRect = sourceCard.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height) {
      return;
    }

    const animationData = await getPackingBoxAnimationData();
    const lottieStageMs = getPackingBoxStageDurationMs();
    const themedAnimationData = getThemedPackingBoxAnimationData(animationData);
    const hasLottiePlayer = await ensurePackingLottiePlayer();
    if (!hasLottiePlayer || !themedAnimationData) {
      console.warn("Packing box animation skipped because the Lottie player is unavailable.");
      return;
    }
    sourceCard.querySelector(".packing-order-card-animation-overlay")?.remove();
    const overlayEl = document.createElement("div");
    overlayEl.className = "packing-order-card-animation-overlay";
    overlayEl.setAttribute("aria-hidden", "true");
    overlayEl.style.setProperty("--packing-box-duration", `${Math.round(lottieStageMs)}ms`);
    const transferEl = document.createElement("div");
    transferEl.className = "packing-order-transfer";
    transferEl.setAttribute("aria-hidden", "true");
    transferEl.dataset.animationSource = PACKING_BOX_ANIMATION_URL;
    transferEl.style.setProperty("--packing-box-duration", `${Math.round(lottieStageMs)}ms`);
    transferEl.innerHTML = createPackingBoxLottiePlayerMarkup();
    if (!transferEl.innerHTML.trim()) {
      return;
    }
    overlayEl.appendChild(transferEl);
    sourceCard.appendChild(overlayEl);

    sourceCard.classList.add("is-packing-transfer-source");
    const lottieAnimation = await playPackingBoxLottiePlayer(
      transferEl,
      themedAnimationData,
      lottieStageMs,
    );
    overlayEl.classList.add("is-leaving");
    await wait(PACKING_BOX_OVERLAY_EXIT_MS);
    sourceCard.classList.remove("is-packing-transfer-source");
    lottieAnimation?.destroy?.();
    overlayEl.remove();
    await animatePackingCardToShipment(sourceCard);
  }

  async function runPackingOrderTransferAnimation(createdAtEpochMs) {
    await runPackingBoxTransferAnimationFromElement(getPackingOrderCardElement(createdAtEpochMs));
  }

  function normalizeBarcodeValue(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeSearchTerm(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function registerProductBarcode(barcode, productId) {
    const rawBarcode = String(barcode || "").trim();
    const normalizedBarcode = normalizeBarcodeValue(rawBarcode);
    if (!rawBarcode || !productId) {
      return;
    }

    barcodeToProductId.set(rawBarcode, productId);
    if (normalizedBarcode) {
      barcodeToProductId.set(normalizedBarcode, productId);
    }
  }

  function resolveProductIdByBarcode(barcodeValue) {
    const rawBarcode = String(barcodeValue || "").trim();
    return barcodeToProductId.get(rawBarcode)
      || barcodeToProductId.get(normalizeBarcodeValue(rawBarcode))
      || "";
  }

  function buildBarcodeImageDataUrl(value, label) {
    const barcodeValue = String(value ?? "").trim();
    if (!barcodeValue) {
      return "";
    }

    const code128Patterns = [
      "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
      "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
      "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
      "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
      "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
      "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
      "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
      "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
      "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
      "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
      "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
      "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
      "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
      "211214", "211232", "2331112",
    ];
    const codes = [104];

    for (const char of barcodeValue) {
      const charCode = char.charCodeAt(0);
      if (charCode < 32 || charCode > 126) {
        return "";
      }
      codes.push(charCode - 32);
    }

    const checksum = codes.reduce((sum, code, index) => {
      return index === 0 ? code : sum + code * index;
    }, 0) % 103;
    codes.push(checksum, 106);

    const moduleWidth = 2;
    const quietZone = 24;
    const productName = String(label || "").trim();
    const topPadding = productName ? 14 : 10;
    const labelHeight = productName ? 24 : 0;
    const labelGap = productName ? 10 : 0;
    const barHeight = 92;
    const gapHeight = 14;
    const textHeight = 22;
    const bottomPadding = 12;
    const totalModules = codes.reduce((sum, code) => {
      const pattern = code128Patterns[code] || "";
      return sum + pattern.split("").reduce((patternSum, digit) => patternSum + Number(digit), 0);
    }, 0);
    const width = Math.max(240, totalModules * moduleWidth + quietZone * 2);
    const height = topPadding + labelHeight + labelGap + barHeight + gapHeight + textHeight + bottomPadding;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#000000";

    function fitText(text, maxWidth) {
      if (context.measureText(text).width <= maxWidth) {
        return text;
      }

      let nextText = text;
      while (nextText.length > 1 && context.measureText(`${nextText}...`).width > maxWidth) {
        nextText = nextText.slice(0, -1);
      }
      return `${nextText}...`;
    }

    if (productName) {
      context.fillStyle = "#111827";
      context.font = "600 15px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(fitText(productName, width - quietZone * 2), width / 2, topPadding);
    }

    const barcodeTop = topPadding + labelHeight + labelGap;
    let x = quietZone;
    for (const code of codes) {
      const pattern = code128Patterns[code] || "";
      for (let index = 0; index < pattern.length; index += 1) {
        const stripeWidth = Number(pattern[index]) * moduleWidth;
        if (index % 2 === 0) {
          context.fillRect(x, barcodeTop, stripeWidth, barHeight);
        }
        x += stripeWidth;
      }
    }

    context.fillStyle = "#000000";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(barcodeValue, width / 2, barcodeTop + barHeight + gapHeight);

    return canvas.toDataURL("image/png");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    const amount = Number(value) || 0;
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatTimestamp(epochMs) {
    const date = new Date(Number(epochMs) || 0);
    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatItemsLabel(itemCount) {
    return `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  }

  function getProductForEntry(entry) {
    return productsById.get(String(entry.productId)) || null;
  }

  function getEntryBarcode(entry) {
    const product = getProductForEntry(entry);
    return String(product?.barcode || "").trim();
  }

  function normalizeImagePosition(value, fallback = 50) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, number));
  }

  function formatObjectPosition(source) {
    return `${normalizeImagePosition(source?.imagePositionX).toFixed(2)}% ${normalizeImagePosition(
      source?.imagePositionY,
    ).toFixed(2)}%`;
  }

  function getNormalizedProductImageUrls(product) {
    const imageUrls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
    const seen = new Set();
    const normalizedUrls = [];

    for (const candidate of imageUrls) {
      const imageUrl = String(candidate ?? "").trim();
      const key = imageUrl.toLowerCase();
      if (!imageUrl || seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalizedUrls.push(imageUrl);
    }

    const fallbackImageUrl = String(product?.mainImageUrl ?? product?.imageUrl ?? "").trim();
    if (fallbackImageUrl && !seen.has(fallbackImageUrl.toLowerCase())) {
      normalizedUrls.push(fallbackImageUrl);
    }

    return normalizedUrls;
  }

  function getResolvedProductMainImageIndex(product, imageUrls = getNormalizedProductImageUrls(product)) {
    if (!imageUrls.length) {
      return 0;
    }

    const requestedIndex = Number(product?.mainImageIndex ?? 0);
    if (
      Number.isInteger(requestedIndex) &&
      requestedIndex >= 0 &&
      requestedIndex < imageUrls.length
    ) {
      return requestedIndex;
    }

    const fallbackImageUrl = String(product?.mainImageUrl ?? product?.imageUrl ?? "").trim();
    const fallbackIndex = fallbackImageUrl ? imageUrls.indexOf(fallbackImageUrl) : -1;
    return fallbackIndex >= 0 ? fallbackIndex : 0;
  }

  function getPrimaryProductImageUrl(product) {
    const imageUrls = getNormalizedProductImageUrls(product);
    if (!imageUrls.length) {
      return String(product?.cardImageUrl ?? "").trim();
    }

    return imageUrls[getResolvedProductMainImageIndex(product, imageUrls)] || imageUrls[0] || "";
  }

  function getProductVariantForEntry(product, entry) {
    if (!product || entry?.isAddOn) {
      return null;
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (!variants.length) {
      return null;
    }

    const variantId = String(entry?.variantId ?? "").trim();
    const variantName = String(entry?.variantName ?? "").trim().toLowerCase();
    return variants.find((variant) => String(variant?.id ?? "").trim() === variantId)
      || variants.find((variant) => String(variant?.name ?? "").trim().toLowerCase() === variantName)
      || null;
  }

  function resolvePackingAssetUrl(value) {
    const rawUrl = String(value || "").trim();
    if (!rawUrl) {
      return "";
    }
    try {
      const resolvedUrl = new URL(rawUrl, window.location.origin);
      if (resolvedUrl.pathname.startsWith("/uploads/") || resolvedUrl.pathname.startsWith("/assets/")) {
        return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
      }
      return resolvedUrl.href;
    } catch (error) {
      return rawUrl;
    }
  }

  function getPackingEntryPhotoPreview(entry) {
    const product = getProductForEntry(entry);
    const title = String(entry?.productName || product?.name || "Product photo").trim();
    const entryMeta = entry?.isAddOn
      ? "Add-on"
      : String(entry?.variantName || "").trim();

    if (product && !entry?.isAddOn) {
      const variant = getProductVariantForEntry(product, entry);
      const variantImageUrl = resolvePackingAssetUrl(variant?.imageUrl ?? variant?.imageSourceUrl);
      if (variantImageUrl) {
        return {
          title,
          meta: String(variant?.name || entryMeta || "Variant").trim(),
          imageUrl: variantImageUrl,
          objectPosition: formatObjectPosition(variant),
        };
      }
    }

    const productImageUrl = product ? resolvePackingAssetUrl(getPrimaryProductImageUrl(product)) : "";
    const fallbackImageUrl = resolvePackingAssetUrl(entry?.productImageUrl);
    const cardImageUrl = resolvePackingAssetUrl(product?.cardImageUrl);
    const imageUrl = productImageUrl || fallbackImageUrl || cardImageUrl;

    return {
      title,
      meta: entryMeta,
      imageUrl,
      objectPosition: product ? formatObjectPosition(product) : "center center",
    };
  }

  function getScannedQuantitiesForGroup(groupId) {
    return state.groupScannedQuantities[String(groupId)] || {};
  }

  function getScannedQuantity(groupId, scanKey) {
    const groupScans = getScannedQuantitiesForGroup(groupId);
    return Math.max(0, Number(groupScans[String(scanKey)] || 0));
  }

  function setScannedQuantity(groupId, scanKey, quantity) {
    const normalizedGroupId = String(groupId);
    const normalizedScanKey = String(scanKey);
    const groupScans = getScannedQuantitiesForGroup(normalizedGroupId);
    state.groupScannedQuantities = {
      ...state.groupScannedQuantities,
      [normalizedGroupId]: {
        ...groupScans,
        [normalizedScanKey]: Math.max(0, Math.trunc(quantity)),
      },
    };
  }

  function normalizeOrderAddOns(addOns) {
    return (Array.isArray(addOns) ? addOns : [])
      .map((addOn) => ({
        id: String(addOn?.id || "").trim(),
        name: String(addOn?.name || "").trim(),
        quantity: Math.max(1, Math.trunc(Number(addOn?.quantity ?? 1) || 1)),
      }))
      .filter((addOn) => addOn.id && addOn.name);
  }

  function getMainScanKey(entry) {
    return `main:${String(entry.id || entry.productId)}:${String(entry.variantId || "")}`;
  }

  function getAddOnScanKey(entry, addOn) {
    return `addon:${String(entry.id || entry.productId)}:${String(entry.variantId || "")}:${String(addOn.id)}`;
  }

  function getOrderEntryKey(entry) {
    return String(entry?.parentOrderEntryId || entry?.id || entry?.productId || "").trim();
  }

  function getAddOnDropdownKey(groupId, entry) {
    return `${String(groupId)}:${getOrderEntryKey(entry)}`;
  }

  function isAddOnDropdownExpanded(groupId, entry) {
    const dropdownKey = getAddOnDropdownKey(groupId, entry);
    return Object.prototype.hasOwnProperty.call(state.expandedAddOnDropdowns, dropdownKey)
      ? Boolean(state.expandedAddOnDropdowns[dropdownKey])
      : true;
  }

  function syncAddOnDropdownDom(dropdownKey, isExpanded) {
    const escapedKey = CSS.escape(String(dropdownKey));
    const dropdown = document.querySelector(`[data-addon-dropdown="${escapedKey}"]`);
    const toggle = document.querySelector(`[data-addon-dropdown-toggle="${escapedKey}"]`);

    dropdown?.classList.toggle("is-open", isExpanded);
    dropdown?.setAttribute("aria-hidden", isExpanded ? "false" : "true");
    if (dropdown) {
      dropdown.inert = !isExpanded;
    }
    toggle?.classList.toggle("is-open", isExpanded);
    toggle?.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  }

  function setAddOnDropdownExpanded(dropdownKey, isExpanded) {
    state.expandedAddOnDropdowns = {
      ...state.expandedAddOnDropdowns,
      [String(dropdownKey)]: Boolean(isExpanded),
    };
    syncAddOnDropdownDom(dropdownKey, Boolean(isExpanded));
  }

  function createMainScanEntry(entry) {
    const addOns = normalizeOrderAddOns(entry.addOns);
    return {
      ...entry,
      addOns,
      addOnCount: addOns.length,
      isAddOn: false,
      parentOrderEntryId: getOrderEntryKey(entry),
      scanKey: getMainScanKey(entry),
    };
  }

  function createAddOnScanEntry(entry, addOn) {
    const parentProductName = String(entry.productName || "").trim();
    const parentVariantName = String(entry.variantName || "").trim();
    return {
      id: entry.id,
      productId: addOn.id,
      productName: addOn.name,
      variantId: entry.variantId,
      variantName: parentVariantName,
      quantity: Math.max(1, Number(entry.quantity) || 1) * addOn.quantity,
      unitPrice: 0,
      isAddOn: true,
      parentOrderEntryId: getOrderEntryKey(entry),
      parentProductId: String(entry.productId || "").trim(),
      parentProductName,
      parentVariantName,
      scanMetaLabel: `Qty ${Math.max(1, Number(entry.quantity) || 1) * addOn.quantity}`,
      scanKey: getAddOnScanKey(entry, addOn),
    };
  }

  function getPackingScanEntries(group) {
    return group.entries.flatMap((entry) => {
      const addOns = normalizeOrderAddOns(entry.addOns);
      return [
        createMainScanEntry(entry),
        ...addOns.map((addOn) => createAddOnScanEntry(entry, addOn)),
      ];
    });
  }

  function getPackingDisplayEntries(group) {
    return group.entries.flatMap((entry) => {
      const addOns = normalizeOrderAddOns(entry.addOns);
      return [
        createMainScanEntry(entry),
        ...addOns.map((addOn) => createAddOnScanEntry(entry, addOn)),
      ];
    });
  }

  function getRequiredBarcodeEntries(group) {
    return getPackingScanEntries(group).filter((entry) => Boolean(getEntryBarcode(entry)));
  }

  function getRequiredEntriesForDisplayEntry(group, displayEntry) {
    if (displayEntry?.isAddOn) {
      return getEntryBarcode(displayEntry) ? [displayEntry] : [];
    }

    const displayEntryKey = getOrderEntryKey(displayEntry);
    return getPackingScanEntries(group).filter((entry) => {
      return getOrderEntryKey(entry) === displayEntryKey && Boolean(getEntryBarcode(entry));
    });
  }

  function isDisplayEntryScanComplete(group, displayEntry) {
    const requiredEntries = getRequiredEntriesForDisplayEntry(group, displayEntry);
    if (!requiredEntries.length) {
      return false;
    }

    const groupId = String(group.createdAtEpochMs);
    return requiredEntries.every((entry) => {
      return getScannedQuantity(groupId, entry.scanKey) >= entry.quantity;
    });
  }

  function isOrderBundleScanComplete(group, displayEntry) {
    const displayEntryKey = getOrderEntryKey(displayEntry);
    const groupId = String(group.createdAtEpochMs);
    const requiredEntries = getPackingScanEntries(group).filter((entry) => {
      return getOrderEntryKey(entry) === displayEntryKey && Boolean(getEntryBarcode(entry));
    });

    return requiredEntries.length > 0 && requiredEntries.every((entry) => {
      return getScannedQuantity(groupId, entry.scanKey) >= entry.quantity;
    });
  }

  function getEntryRequiredQuantity(entry) {
    return Math.max(1, Number(entry?.quantity) || 1);
  }

  function getEntryScanProgress(entry, group) {
    const quantity = getEntryRequiredQuantity(entry);
    const scanned = getScannedQuantity(String(group.createdAtEpochMs), entry.scanKey);
    return {
      quantity,
      scanned: Math.min(scanned, quantity),
      isComplete: scanned >= quantity,
    };
  }

  function getPendingBarcodeEntry(group) {
    const groupId = String(group.createdAtEpochMs);
    return getRequiredBarcodeEntries(group).find((entry) => {
      return getScannedQuantity(groupId, entry.scanKey) < entry.quantity;
    }) || null;
  }

  function isGroupReadyToPack(group) {
    const groupId = String(group.createdAtEpochMs);
    return getRequiredBarcodeEntries(group).every((entry) => {
      return getScannedQuantity(groupId, entry.scanKey) >= entry.quantity;
    });
  }

  function getGroupScannerSummary(group) {
    const requiredEntries = getRequiredBarcodeEntries(group);
    if (!requiredEntries.length) {
      return null;
    }

    const remaining = requiredEntries.reduce((total, entry) => {
      return total + Math.max(0, entry.quantity - getScannedQuantity(String(group.createdAtEpochMs), entry.scanKey));
    }, 0);

    return {
      requiredCount: requiredEntries.length,
      remainingQuantity: remaining,
    };
  }

  async function loadProducts() {
    try {
      const response = await fetch("/api/products", {
        headers: withPackingAdminTenantHeaders({ Accept: "application/json" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load products.");
      }

      productsById.clear();
      barcodeToProductId.clear();
      const products = Array.isArray(data.products) ? data.products : [];
      products.forEach((product) => {
        const id = String(product?.id || "").trim();
        if (!id) {
          return;
        }

        productsById.set(id, product);
        registerProductBarcode(product?.barcode, id);
      });
      state.packingBarcodeProducts = products
        .filter((product) => {
          return Boolean(product?.moveBarcodeToPackingDashboard)
            && Boolean(String(product?.barcode || "").trim());
        })
        .sort((left, right) => {
          return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
            sensitivity: "base",
          });
        });
      renderPackingBarcodeList();
    } catch (error) {
      console.warn("Unable to load products for packing dashboard:", error);
    }
  }

  function setPackingBarcodePanelOpen(isOpen, options = {}) {
    if (!packingBarcodePanel || !packingBarcodeToggle) {
      return;
    }

    const nextIsOpen = Boolean(isOpen);
    if (packingBarcodePanelCloseTimer) {
      window.clearTimeout(packingBarcodePanelCloseTimer);
      packingBarcodePanelCloseTimer = 0;
    }

    packingBarcodeFab?.classList.toggle("is-open", nextIsOpen);
    packingBarcodeToggle.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
    packingBarcodeToggle.setAttribute("aria-label", "Barcodes");

    if (nextIsOpen) {
      renderPackingBarcodeList();
      packingBarcodePanel.hidden = false;
      window.requestAnimationFrame(() => {
        packingBarcodePanel.classList.add("is-open");
      });
      if (!packingModal?.classList.contains("is-open")) {
        packingBarcodePanel.focus({ preventScroll: true });
      }
      return;
    }

    packingBarcodePanel.classList.remove("is-open");
    packingBarcodePanelCloseTimer = window.setTimeout(() => {
      packingBarcodePanel.hidden = true;
      packingBarcodePanelCloseTimer = 0;
      if (options.restoreFocus) {
        packingBarcodeToggle.focus();
      }
    }, 220);
  }

  function renderPackingBarcodeList() {
    if (!packingBarcodeList) {
      return;
    }

    const searchTerm = normalizeSearchTerm(state.packingBarcodeSearchTerm);
    const products = Array.isArray(state.packingBarcodeProducts)
      ? state.packingBarcodeProducts
      : [];
    if (!products.length) {
      packingBarcodeList.innerHTML = '<div class="empty-state">No product barcodes selected yet.</div>';
      return;
    }

    const visibleProducts = searchTerm
      ? products.filter((product) => {
          const productName = String(product?.name || "").toLowerCase();
          const barcodeValue = String(product?.barcode || "").toLowerCase();
          return productName.includes(searchTerm) || barcodeValue.includes(searchTerm);
        })
      : products;

    if (!visibleProducts.length) {
      if (searchTerm && window.GMS_ADMIN_SEARCH_NOT_FOUND) {
        window.GMS_ADMIN_SEARCH_NOT_FOUND.replace(packingBarcodeList, { compact: true });
      } else {
        packingBarcodeList.innerHTML = '<div class="empty-state">No barcodes match your search.</div>';
      }
      return;
    }

    packingBarcodeList.innerHTML = visibleProducts
      .map((product) => {
        const productName = String(product?.name || "Unnamed product").trim();
        const barcodeValue = String(product?.barcode || "").trim();
        const barcodeImageUrl = buildBarcodeImageDataUrl(barcodeValue, productName);
        if (!barcodeValue || !barcodeImageUrl) {
          return "";
        }

        return `
          <article class="packing-barcode-item">
            <img
              class="packing-barcode-image"
              src="${escapeHtml(barcodeImageUrl)}"
              alt="Barcode for ${escapeHtml(productName)}"
            />
          </article>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!packingBarcodeList.innerHTML.trim()) {
      packingBarcodeList.innerHTML = '<div class="empty-state">No product barcodes selected yet.</div>';
    }
  }

  function getSelectedScanEntry() {
    const group = getPendingGroupById(state.selectedScanGroupId);
    if (!group || !state.selectedScanKey) {
      return null;
    }

    return (
      getPackingScanEntries(group).find(
        (entry) => String(entry.scanKey) === String(state.selectedScanKey),
      ) || null
    );
  }

  function clearBarcodeSelection() {
    state.selectedScanGroupId = "";
    state.selectedScanProductId = "";
    state.selectedScanKey = "";
    if (barcodeHiddenInput) {
      barcodeHiddenInput.value = "";
    }
  }

  function hasActiveScanSelection() {
    return Boolean(state.selectedScanGroupId && state.selectedScanKey);
  }

  function focusHiddenBarcodeInputForSelection() {
    if (!barcodeHiddenInput || !hasActiveScanSelection() || isPackingModalOpen()) {
      return;
    }

    barcodeHiddenInput.value = "";
    window.requestAnimationFrame(() => {
      barcodeHiddenInput.focus({ preventScroll: true });
    });
  }

  function selectBarcodeScanItem(groupId, scanKey, options = {}) {
    const group = getPendingGroupById(String(groupId));
    if (!group) {
      return;
    }

    const entry = getPackingScanEntries(group).find(
      (item) => String(item.scanKey) === String(scanKey),
    );
    if (!entry) {
      return;
    }

    const hasBarcode = Boolean(getEntryBarcode(entry));
    if (entry.isAddOn) {
      setAddOnDropdownExpanded(getAddOnDropdownKey(group.createdAtEpochMs, entry), true);
    }

    state.selectedScanGroupId = String(group.createdAtEpochMs);
    state.selectedScanProductId = String(entry.productId);
    state.selectedScanKey = String(entry.scanKey);

    const shouldFocusHiddenInput = options.focusHiddenInput !== false;
    if (hasBarcode && shouldFocusHiddenInput) {
      focusHiddenBarcodeInputForSelection();
    }

    // Toggle selected class on DOM elements instead of full re-render
    document.querySelectorAll(".insight-order-item--selected").forEach((el) => {
      el.classList.remove("insight-order-item--selected");
    });
    const selector = `[data-scan-order-item-group="${CSS.escape(String(group.createdAtEpochMs))}"][data-scan-order-item-key="${CSS.escape(String(entry.scanKey))}"]`;
    const targetEl = document.querySelector(selector);
    if (targetEl) {
      targetEl.classList.add("insight-order-item--selected");
    }
  }

  function processBarcodeScan(barcodeValue, qty) {
    const selectedGroupId = String(state.selectedScanGroupId);
    const selectedScanKey = String(state.selectedScanKey);
    if (!selectedGroupId || !selectedScanKey) {
      return { success: false };
    }

    const group = getPendingGroupById(selectedGroupId);
    if (!group) {
      return {
        success: false,
        message: "Packing order not found.",
        mode: "notice",
      };
    }

    const targetEntry = getPackingScanEntries(group).find(
      (entry) => String(entry.scanKey) === selectedScanKey,
    );
    if (!targetEntry) {
      return {
        success: false,
        message: "Selected item cannot be scanned for this order.",
        mode: "notice",
      };
    }

    const matchedProductId = resolveProductIdByBarcode(barcodeValue);
    const selectedEntryBarcode = getEntryBarcode(targetEntry);
    const matchesSelectedEntryBarcode =
      normalizeBarcodeValue(barcodeValue) === normalizeBarcodeValue(selectedEntryBarcode);
    if (!matchedProductId && !matchesSelectedEntryBarcode) {
      return {
        success: false,
        message: "Incorrect barcode.",
        mode: "notice",
      };
    }

    if (matchedProductId && String(matchedProductId) !== String(targetEntry.productId)) {
      return {
        success: false,
        message: "Incorrect barcode.",
        mode: "notice",
      };
    }

    const scanQty = Math.max(1, parseInt(qty, 10) || 1);
    const currentQuantity = getScannedQuantity(selectedGroupId, selectedScanKey);
    const remainingQuantity = Math.max(0, targetEntry.quantity - currentQuantity);
    if (remainingQuantity <= 0) {
      const nextEntry = getPendingBarcodeEntry(group);
      if (isOrderBundleScanComplete(group, targetEntry)) {
        setAddOnDropdownExpanded(getAddOnDropdownKey(selectedGroupId, targetEntry), false);
      }
      if (nextEntry) {
        selectBarcodeScanItem(selectedGroupId, String(nextEntry.scanKey));
      } else {
        clearBarcodeSelection();
      }
      render();
      return {
        success: true,
        addQty: 0,
        scannedQuantity: currentQuantity,
        remainingQuantity: 0,
        nextEntry,
        groupComplete: !nextEntry,
      };
    }

    const addQty = Math.min(scanQty, remainingQuantity);
    setScannedQuantity(selectedGroupId, selectedScanKey, currentQuantity + addQty);

    const newScannedQuantity = getScannedQuantity(selectedGroupId, selectedScanKey);
    const newRemaining = Math.max(0, targetEntry.quantity - newScannedQuantity);
    const nextEntry = newRemaining <= 0 ? getPendingBarcodeEntry(group) : targetEntry;
    const dropdownKey = getAddOnDropdownKey(selectedGroupId, targetEntry);
    if (newRemaining <= 0) {
      if (isOrderBundleScanComplete(group, targetEntry)) {
        setAddOnDropdownExpanded(dropdownKey, false);
      }
      if (nextEntry) {
        selectBarcodeScanItem(selectedGroupId, String(nextEntry.scanKey));
      } else {
        clearBarcodeSelection();
      }
    } else if (targetEntry.isAddOn) {
      setAddOnDropdownExpanded(dropdownKey, true);
    }

    render();
    return {
      success: true,
      addQty,
      scannedQuantity: newScannedQuantity,
      remainingQuantity: newRemaining,
      nextEntry,
      groupComplete: !nextEntry,
    };
  }

  function getPendingGroupById(groupId) {
    return state.preparingGroups.find(
      (group) => String(group.createdAtEpochMs) === String(groupId),
    ) || null;
  }

  function getPackingGroupById(groupId) {
    return [...state.preparingGroups, ...state.shippingGroups].find(
      (group) => String(group.createdAtEpochMs) === String(groupId),
    ) || null;
  }

  function getScanSummaryMarkup(entry, group) {
    // Show scan summary for all items (with or without barcode)
    // Items need to be scanned regardless of barcode presence

    const scanned = getScannedQuantity(String(group.createdAtEpochMs), entry.scanKey);
    const remaining = Math.max(0, entry.quantity - scanned);
    const isComplete = remaining === 0;
    const label = isComplete ? "Scanned" : `Scan required ${scanned}/${entry.quantity}`;
    return `<span class="insight-order-item__status${isComplete ? " is-scanned" : ""}">${escapeHtml(label)}</span>`;
  }

  function getScanStatusBadge(entry, group) {
    const { quantity, scanned, isComplete } = getEntryScanProgress(entry, group);

    if (isComplete) {
      return `
        <span
          class="scan-status-badge scan-status-badge--complete"
          title="Scan complete"
          data-scan-check-animation="${escapeHtml(SCAN_COMPLETE_CHECK_ANIMATION_URL)}"
        >
          <svg class="scan-status-badge__check" viewBox="0 0 600 480" aria-hidden="true" focusable="false">
            <path class="scan-status-badge__check-path" pathLength="100" d="M67.264 254.166 L261.379 415.862 L547.923 64.845" />
          </svg>
        </span>
      `;
    }

    // Show scanned/quantity before product name
    return `<span class="scan-status-badge scan-status-badge--pending" title="Scan required">${scanned}/${quantity}</span>`;
  }

  function getPackingOrderId(group) {
    return `ORD-${String(group.createdAtEpochMs || "").slice(-8)}`;
  }

  function getCourierInitials(value) {
    const words = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) {
      return "NA";
    }

    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }

  function getPackingMetricIcon(metricKey) {
    switch (metricKey) {
      case "courier":
        return PACKING_ORDER_COURIER_ICON_MARKUP;
      case "amount":
        return PACKING_ORDER_AMOUNT_ICON_MARKUP;
      case "place-order-time":
        return PACKING_ORDER_CLOCK_ICON_MARKUP;
      default:
        return "";
    }
  }

  function createPackingMetricMarkup(label, value, metricKey) {
    const iconMarkup = getPackingMetricIcon(metricKey);
    return `
      <div class="product-insight-rank-card__metric" data-metric="${escapeHtml(metricKey)}">
        ${iconMarkup ? `<span class="product-insight-metric-icon">${iconMarkup}</span>` : ""}
        <div class="product-insight-rank-card__metric-copy">
          <span class="product-insight-rank-card__metric-label">${escapeHtml(label)}</span>
          <strong class="product-insight-rank-card__metric-value">${escapeHtml(value)}</strong>
        </div>
      </div>
    `;
  }

  function getPackingQueueTableHeaderMarkup(showAction = false) {
    return `
      <div class="packing-admin-table-header" role="row">
        <span>Order</span>
        <span>Customer</span>
        <span>Courier</span>
        <span>Items</span>
        <span>Amount</span>
        <span>Status</span>
        ${showAction ? "<span>Action</span>" : "<span aria-hidden=\"true\"></span>"}
      </div>
    `;
  }

  function getPackingFeedTableHeaderMarkup() {
    return `
      <div class="packing-admin-feed-table-header" role="row">
        <span>Order</span>
        <span>Activity</span>
        <span>Detail</span>
        <span>Time</span>
      </div>
    `;
  }

  function buildPackingOrderItemsMarkup(group, options) {
    const canScan = options.canScan !== false;
    return `
      <div class="insight-order-items">
        ${group.entries
          .map((entry) => renderOrderBundleMarkup(entry, group, { canScan }))
          .join("")}
      </div>
    `;
  }

  function buildPackingOrderListRowMarkup(group, options) {
    const isBusy = options.activeRequestId === String(group.createdAtEpochMs);
    const paymentLabel =
      String(group.paymentOption || "").toLowerCase().startsWith("cod")
        ? "COD"
        : group.paymentOption;
    const showAction = Boolean(options.buttonAttribute);
    const actionDisabled = isBusy || (typeof options.disableAction === "function" && options.disableAction(group));

    return `
      <article
        class="packing-order-list-row insight-order-card product-insight-rank-card"
        data-packing-order-card="${escapeHtml(String(group.createdAtEpochMs))}"
        data-packing-order-stage="${escapeHtml(String(options.stageKey || options.stageLabel || ""))}"
      >
        <div class="packing-order-list-row__order">
          <span class="packing-order-list-row__avatar">${escapeHtml(getCourierInitials(group.courierName))}</span>
          <span class="packing-order-list-row__order-copy">
            <strong>${escapeHtml(getPackingOrderId(group))}</strong>
            <span>${escapeHtml(formatTimestamp(group.createdAtEpochMs))}</span>
          </span>
        </div>
        <div class="packing-order-list-row__customer">
          <strong>${escapeHtml(group.customerName)}</strong>
          <span>${escapeHtml(group.address)}${paymentLabel ? ` · ${escapeHtml(paymentLabel)}` : ""}</span>
        </div>
        <div class="packing-order-list-row__courier">${escapeHtml(group.courierName || "—")}</div>
        <div class="packing-order-list-row__items">${escapeHtml(formatItemsLabel(group.itemCount))}</div>
        <div class="packing-order-list-row__amount">${escapeHtml(formatMoney(group.grandTotalAmount))}</div>
        <div class="packing-order-list-row__status">
          <span class="insight-order-chip ${escapeHtml(options.chipClass)}">${escapeHtml(options.stageLabel)}</span>
        </div>
        <div class="packing-order-list-row__action">
          ${showAction ? `
            <button
              type="button"
              class="dashboard-link-button"
              ${options.buttonAttribute}="${escapeHtml(group.createdAtEpochMs)}"
              ${actionDisabled ? "disabled" : ""}
            >
              ${isBusy ? options.loadingLabel : options.buttonLabel}
            </button>
          ` : ""}
        </div>
        <div class="packing-order-list-row__details">
          ${buildPackingOrderItemsMarkup(group, options)}
          <div class="insight-order-actions">
            <span class="insight-order-meta-note">${escapeHtml(options.note(group))}</span>
          </div>
        </div>
      </article>
    `;
  }

  function bindPackingQueueInteractions(queueListEl, options) {
    if (!queueListEl) {
      return;
    }

    if (options.buttonAttribute && typeof options.onAction === "function") {
      queueListEl.querySelectorAll(`[${options.buttonAttribute}]`).forEach((button) => {
        button.addEventListener("click", () => {
          const createdAtEpochMs = button.getAttribute(options.buttonAttribute) || "";
          void options.onAction(createdAtEpochMs);
        });
      });
    }

    queueListEl.querySelectorAll("[data-scan-order-item-group]").forEach((item) => {
      item.addEventListener("click", (event) => {
        if (
          event.target.closest("[data-item-menu-btn]")
          || event.target.closest("[data-item-dropdown]")
          || event.target.closest("[data-addon-dropdown-toggle]")
          || event.target.closest("[data-packing-image-preview]")
        ) {
          return;
        }
        const groupId = item.getAttribute("data-scan-order-item-group") || "";
        const scanKey = item.getAttribute("data-scan-order-item-key") || "";
        void handleProductClick(groupId, scanKey);
      });

      item.addEventListener("keydown", (event) => {
        if (
          event.target.closest("[data-item-menu-btn]")
          || event.target.closest("[data-item-dropdown]")
          || event.target.closest("[data-addon-dropdown-toggle]")
          || event.target.closest("[data-packing-image-preview]")
        ) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const groupId = item.getAttribute("data-scan-order-item-group") || "";
          const scanKey = item.getAttribute("data-scan-order-item-key") || "";
          void handleProductClick(groupId, scanKey);
        }
      });
    });

    queueListEl.querySelectorAll("[data-addon-dropdown-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const dropdownKey = button.getAttribute("data-addon-dropdown-toggle") || "";
        const nextIsExpanded = button.getAttribute("aria-expanded") !== "true";
        setAddOnDropdownExpanded(dropdownKey, nextIsExpanded);
      });
    });

    queueListEl.querySelectorAll("[data-packing-image-preview]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPackingPhotoModal(
          button.getAttribute("data-packing-image-preview-group") || "",
          button.getAttribute("data-packing-image-preview-key") || "",
          button,
        );
      });
    });

    queueListEl.querySelectorAll("[data-item-menu-btn]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        const groupId = btn.getAttribute("data-item-menu-btn") || "";
        const scanKey = btn.getAttribute("data-item-scan-key") || "";
        selectBarcodeScanItem(groupId, scanKey, {
          focusHiddenInput: false,
        });
        void openPackingModal(groupId, scanKey);
      });
    });
  }

  function normalizeOrderEntries(payload) {
    const rawOrders = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.orders)
        ? payload.orders
        : [];

    return rawOrders
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: String(entry.id || "").trim(),
        productId: String(entry.productId || "").trim(),
        productName: String(entry.productName || "Unnamed product").trim(),
        productImageUrl: String(entry.productImageUrl || "").trim(),
        variantId: String(entry.variantId || "").trim(),
        variantName: String(entry.variantName || "").trim(),
        addOns: normalizeOrderAddOns(entry.addOns),
        quantity: Math.max(1, Number(entry.quantity) || 1),
        unitPrice: Number(entry.unitPrice) || 0,
        stage: String(entry.stage || "").trim(),
        createdAtEpochMs: Number(entry.createdAtEpochMs) || 0,
        grandTotalAmount: Number(entry.grandTotalAmount) || 0,
        amountToPayAmount: Number(entry.amountToPayAmount) || 0,
        remainingBalanceAmount: Number(entry.remainingBalanceAmount) || 0,
        shippingFeeAmount: Number(entry.shippingFeeAmount) || 0,
        paymentOptionLabel: String(entry.paymentOptionLabel || "").trim(),
        paymentPartnerName: String(entry.paymentPartnerName || "").trim(),
        deliveryPartnerName: String(entry.deliveryPartnerName || "").trim(),
        clientName: String(entry.clientName || "").trim(),
        clientContactNumber: String(entry.clientContactNumber || "").trim(),
        clientAddress: String(entry.clientAddress || "").trim(),
        updatedAt: String(entry.updatedAt || entry.stageUpdatedAt || "").trim(),
        packedAt: String(entry.packedAt || "").trim(),
        shippedAt: String(entry.shippedAt || entry.handedOverAt || "").trim(),
      }))
      .filter((entry) => entry.id && entry.productId && entry.productName);
  }

  function buildOrderGroup(group) {
    const firstEntry = group.entries[0];
    const subtotalAmount = group.entries.reduce(
      (total, entry) => total + entry.unitPrice * entry.quantity,
      0,
    );
    const shippingFeeAmount =
      firstEntry.shippingFeeAmount > 0 ? firstEntry.shippingFeeAmount : 0;
    const grandTotalAmount =
      firstEntry.grandTotalAmount > 0
        ? firstEntry.grandTotalAmount
        : subtotalAmount + shippingFeeAmount;
    const remainingBalanceAmount =
      firstEntry.remainingBalanceAmount > 0
        ? firstEntry.remainingBalanceAmount
        : 0;
    const deductionAmount = Math.max(
      grandTotalAmount - remainingBalanceAmount,
      0,
    );
    const itemCount = group.entries.reduce(
      (total, entry) => total + entry.quantity,
      0,
    );

    return {
      createdAtEpochMs: group.createdAtEpochMs,
      stage: firstEntry.stage,
      entries: group.entries,
      customerName: firstEntry.clientName || "Unknown client",
      contactNumber: firstEntry.clientContactNumber || "No contact number",
      address: firstEntry.clientAddress || "No address provided",
      courierName: firstEntry.deliveryPartnerName || "No courier selected",
      paymentOption:
        firstEntry.paymentOptionLabel ||
        firstEntry.paymentPartnerName ||
        "Unspecified",
      subtotalAmount,
      shippingFeeAmount,
      grandTotalAmount,
      remainingBalanceAmount,
      deductionAmount,
      itemCount,
      activityAt: firstEntry.shippedAt || firstEntry.packedAt || firstEntry.updatedAt || "",
    };
  }

  function groupOrdersByStage(entries, stage, predicate) {
    const groups = new Map();

    entries.forEach((entry) => {
      if (entry.stage !== stage) {
        return;
      }
      if (typeof predicate === "function" && !predicate(entry)) {
        return;
      }

      const groupKey = String(entry.createdAtEpochMs);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          createdAtEpochMs: entry.createdAtEpochMs,
          entries: [],
        });
      }

      groups.get(groupKey).entries.push(entry);
    });

    return [...groups.values()]
      .map(buildOrderGroup)
      .sort((left, right) => right.createdAtEpochMs - left.createdAtEpochMs);
  }

  function groupOrdersByStages(entries, stages) {
    const acceptedStages = new Set((Array.isArray(stages) ? stages : []).map(String));
    const groups = new Map();

    entries.forEach((entry) => {
      if (!acceptedStages.has(String(entry.stage || ""))) {
        return;
      }
      const groupKey = String(entry.createdAtEpochMs);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { createdAtEpochMs: entry.createdAtEpochMs, entries: [] });
      }
      groups.get(groupKey).entries.push(entry);
    });

    return [...groups.values()]
      .map(buildOrderGroup)
      .sort((left, right) => right.createdAtEpochMs - left.createdAtEpochMs);
  }

  function setLoadingState(isLoading) {
    state.isLoading = isLoading;
  }

  async function loadPackingOrders(options = {}) {
    const preserveWorkspaceState = options?.preserveWorkspaceState === true;
    setLoadingState(true);
    if (!preserveWorkspaceState) {
      state.groupScannedQuantities = {};
      state.pendingScanGroupId = "";
      state.expandedAddOnDropdowns = {};
    }

    try {
      const response = await fetch("/api/orders", {
        headers: withPackingAdminTenantHeaders({
          Accept: "application/json",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load orders.");
      }

      const entries = normalizeOrderEntries(data);
      state.allEntries = entries;
      state.preparingGroups = groupOrdersByStage(entries, "toPrepare");
      state.shippingGroups = groupOrdersByStage(entries, "toShip");
      state.inTransitGroups = groupOrdersByStages(entries, ["toReceive", "inTransit", "in-transit"]);
      state.shippedGroups = groupOrdersByStages(entries, ["received", "completed", "delivered", "shipped"]);
      state.cancelledGroups = groupOrdersByStages(entries, ["cancelled", "returned", "rejected"]);
      if (preserveWorkspaceState && state.selectedScanGroupId && !getSelectedScanEntry()) {
        clearBarcodeSelection();
      }
      render();
    } catch (error) {
      if (options?.preserveOnError === true) {
        console.warn("Unable to refresh fulfillment queues in the background.", error);
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load the fulfillment queues.";
      state.preparingGroups = [];
      state.shippingGroups = [];
      state.inTransitGroups = [];
      state.shippedGroups = [];
      state.cancelledGroups = [];
      state.allEntries = [];
      renderSummary();
      preparingOrderListEl.innerHTML = `
        <div class="empty-state">${escapeHtml(message)}</div>
      `;
      shippingOrderListEl.innerHTML = `
        <div class="empty-state">${escapeHtml(message)}</div>
      `;
      [preparingPaginationEl, shippingPaginationEl].forEach((paginationElement) => {
        if (paginationElement instanceof HTMLElement) {
          paginationElement.replaceChildren();
          paginationElement.hidden = true;
        }
      });
      if (preparingCountPillEl) {
        preparingCountPillEl.textContent = "0 orders";
      }
      if (shippingCountPillEl) {
        shippingCountPillEl.textContent = "0 orders";
      }
    } finally {
      setLoadingState(false);
    }
  }

  function schedulePackingRealtimeRefresh(delay = 180) {
    window.clearTimeout(packingRealtimeRefreshTimer);
    packingRealtimeRefreshTimer = window.setTimeout(async () => {
      packingRealtimeRefreshTimer = 0;
      if (
        packingRealtimeRefreshInFlight
        || state.isLoading
        || state.activePackRequestId
        || state.activeShipRequestId
      ) {
        schedulePackingRealtimeRefresh(240);
        return;
      }

      const refreshProducts = packingRealtimeProductsPending;
      const refreshOrders = packingRealtimeOrdersPending;
      packingRealtimeProductsPending = false;
      packingRealtimeOrdersPending = false;
      if (!refreshProducts && !refreshOrders) {
        return;
      }

      packingRealtimeRefreshInFlight = true;
      try {
        if (refreshProducts) {
          await loadProducts();
        }
        if (refreshOrders) {
          await loadPackingOrders({
            preserveWorkspaceState: true,
            preserveOnError: true,
          });
        } else if (refreshProducts) {
          render();
        }
      } finally {
        packingRealtimeRefreshInFlight = false;
        if (packingRealtimeProductsPending || packingRealtimeOrdersPending) {
          schedulePackingRealtimeRefresh(120);
        }
      }
    }, delay);
  }

  function handlePackingRealtimeChange(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    if (detail.type === "ready") {
      if (detail.reconnected !== true) {
        return;
      }
      packingRealtimeProductsPending = true;
      packingRealtimeOrdersPending = true;
    } else if (detail.type === "data-change") {
      const topics = Array.isArray(detail.topics)
        ? detail.topics.map((topic) => String(topic || "").trim().toLowerCase())
        : [];
      const refreshAll = topics.includes("all");
      const refreshProducts = refreshAll
        || topics.includes("products")
        || topics.includes("inventory");
      const refreshOrders = refreshAll || topics.includes("orders");
      if (!refreshProducts && !refreshOrders) {
        return;
      }
      packingRealtimeProductsPending ||= refreshProducts;
      packingRealtimeOrdersPending ||= refreshOrders;
    } else {
      return;
    }

    schedulePackingRealtimeRefresh();
  }

  async function markOrderPacked(createdAtEpochMs) {
    if (!createdAtEpochMs || state.activePackRequestId === String(createdAtEpochMs)) {
      return;
    }

    const group = state.preparingGroups.find(
      (item) => String(item.createdAtEpochMs) === String(createdAtEpochMs),
    );
    if (!group) {
      window.alert("Packing order not found.");
      return;
    }

    if (!isGroupReadyToPack(group)) {
      window.alert(
        "Please scan all required item barcodes before marking this order as packed.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Move this packed order from To Prepare to To Ship?",
    );
    if (!confirmed) {
      return;
    }

    state.activePackRequestId = String(createdAtEpochMs);
    render();
    let didMoveOrder = false;
    const transferAnimationPromise = runPackingOrderTransferAnimation(createdAtEpochMs).catch(() => {});

    const scannedItems = getPackingScanEntries(group).map((entry) => ({
      orderEntryId: String(entry.id || ""),
      productId: String(entry.productId),
      productName: String(entry.productName || ""),
      variantId: String(entry.variantId || ""),
      variantName: String(entry.variantName || ""),
      quantity: Number(entry.quantity) || 0,
      isAddOn: Boolean(entry.isAddOn),
      parentProductId: String(entry.parentProductId || ""),
      parentVariantId: String(entry.parentVariantId || ""),
    }));

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(createdAtEpochMs)}/pack`,
        {
          method: "POST",
          headers: withPackingAdminTenantHeaders({
            Accept: "application/json",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            deductInventory: true,
            scannedItems,
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to move order to To Ship.");
      }

      await transferAnimationPromise;
      state.activePackRequestId = "";
      await loadPackingOrders();
      didMoveOrder = true;
    } catch (error) {
      await transferAnimationPromise.catch(() => {});
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to move order to To Ship.",
      );
    } finally {
      state.activePackRequestId = "";
      if (!didMoveOrder) {
        render();
      }
    }
  }

  async function markOrderShipped(createdAtEpochMs) {
    if (!createdAtEpochMs || state.activeShipRequestId === String(createdAtEpochMs)) {
      return;
    }

    const confirmed = window.confirm(
      "Move this shipped order from To Ship to To Receive?",
    );
    if (!confirmed) {
      return;
    }

    state.activeShipRequestId = String(createdAtEpochMs);
    render();

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(createdAtEpochMs)}/ship`,
        {
          method: "POST",
          headers: withPackingAdminTenantHeaders({
            Accept: "application/json",
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to move order to To Receive.");
      }

      await loadPackingOrders();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to move order to To Receive.",
      );
    } finally {
      state.activeShipRequestId = "";
      render();
    }
  }

  function getPreparingGroupBuckets() {
    const buckets = { pending: [], progress: [], complete: [] };
    state.preparingGroups.forEach((group) => {
      const requiredEntries = getRequiredBarcodeEntries(group);
      const requiredQuantity = requiredEntries.reduce(
        (total, entry) => total + Math.max(1, Number(entry.quantity) || 1),
        0,
      );
      const scannerSummary = getGroupScannerSummary(group);
      const remainingQuantity = scannerSummary?.remainingQuantity ?? 0;
      if (isGroupReadyToPack(group)) {
        buckets.complete.push(group);
      } else if (requiredQuantity > 0 && remainingQuantity < requiredQuantity) {
        buckets.progress.push(group);
      } else {
        buckets.pending.push(group);
      }
    });
    return buckets;
  }

  function groupMatchesWorkspaceSearch(group) {
    const term = normalizeSearchTerm(state.workspaceSearchTerm);
    if (!term) {
      return true;
    }
    return [
      getPackingOrderId(group),
      group.customerName,
      group.contactNumber,
      group.address,
      group.courierName,
      group.paymentOption,
      ...group.entries.flatMap((entry) => [entry.productName, entry.variantName]),
    ].some((value) => normalizeSearchTerm(value).includes(term));
  }

  function getActivityEpochMs(group) {
    const activityDate = new Date(group?.activityAt || "");
    return Number.isFinite(activityDate.getTime())
      ? activityDate.getTime()
      : Number(group?.createdAtEpochMs) || 0;
  }

  function isToday(epochMs) {
    const date = new Date(Number(epochMs) || 0);
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  function getPackingFeedDescriptor(group) {
    const stage = String(group?.stage || "");
    if (["toShip"].includes(stage)) {
      return { category: "shipping", className: "is-shipping", title: "Packing completed", detail: "Ready for courier handoff" };
    }
    if (["toReceive", "inTransit", "in-transit"].includes(stage)) {
      return { category: "shipping", className: "is-shipping", title: "Handed to shipping station", detail: group.courierName || "Shipment is in transit" };
    }
    if (["received", "completed", "delivered", "shipped"].includes(stage)) {
      return { category: "complete", className: "is-complete", title: "Delivery completed", detail: group.courierName || "Order completed" };
    }
    if (["cancelled", "returned", "rejected"].includes(stage)) {
      return { category: "complete", className: "is-cancelled", title: "Order returned or cancelled", detail: group.customerName };
    }
    return { category: "packing", className: "is-packing", title: "Order queued for packing", detail: `${group.itemCount} item${group.itemCount === 1 ? "" : "s"} for ${group.customerName}` };
  }

  function getPackingFeedIconMarkup(descriptor) {
    if (descriptor.className === "is-complete") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>';
    }
    if (descriptor.className === "is-shipping") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>';
    }
    if (descriptor.className === "is-cancelled") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>';
  }

  function renderPackingFeed() {
    if (!packingFeedListEl) {
      return;
    }
    const groups = groupOrdersByStages(state.allEntries, [
      "toPrepare", "toShip", "toReceive", "inTransit", "in-transit",
      "received", "completed", "delivered", "shipped", "cancelled", "returned", "rejected",
    ])
      .filter(groupMatchesWorkspaceSearch)
      .map((group) => ({ group, descriptor: getPackingFeedDescriptor(group) }))
      .filter((entry) => state.feedFilter === "all" || entry.descriptor.category === state.feedFilter)
      .sort((left, right) => getActivityEpochMs(right.group) - getActivityEpochMs(left.group))
      .slice(0, 8);

    if (!groups.length) {
      if (
        normalizeSearchTerm(state.workspaceSearchTerm)
        && window.GMS_ADMIN_SEARCH_NOT_FOUND
      ) {
        window.GMS_ADMIN_SEARCH_NOT_FOUND.replace(packingFeedListEl, { compact: true });
      } else {
        packingFeedListEl.innerHTML = '<div class="empty-state">No packing activity matches the current view.</div>';
      }
    } else if (packingFeedListEl.classList.contains("is-list-view")) {
      packingFeedListEl.innerHTML = [
        getPackingFeedTableHeaderMarkup(),
        ...groups.map(({ group, descriptor }) => {
          const activityAt = getActivityEpochMs(group);
          const activityTime = new Date(activityAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
          return `
            <article class="packing-feed-list-row ${escapeHtml(descriptor.className)}">
              <div class="packing-feed-list-row__order">
                <span class="packing-feed-list-row__icon">${getPackingFeedIconMarkup(descriptor)}</span>
                <strong>${escapeHtml(getPackingOrderId(group))}</strong>
              </div>
              <div class="packing-feed-list-row__activity">${escapeHtml(descriptor.title)}</div>
              <div class="packing-feed-list-row__detail">${escapeHtml(descriptor.detail)}</div>
              <time datetime="${escapeHtml(new Date(activityAt).toISOString())}">${escapeHtml(activityTime)}</time>
            </article>
          `;
        }),
      ].join("");
    } else {
      packingFeedListEl.innerHTML = groups.map(({ group, descriptor }) => {
        const activityAt = getActivityEpochMs(group);
        const activityTime = new Date(activityAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
        return `
          <article class="packing-feed-entry ${escapeHtml(descriptor.className)}">
            <span class="packing-feed-entry__icon">${getPackingFeedIconMarkup(descriptor)}</span>
            <span class="packing-feed-entry__copy">
              <strong>${escapeHtml(getPackingOrderId(group))}</strong>
              <span>${escapeHtml(descriptor.title)}<br>${escapeHtml(descriptor.detail)}</span>
            </span>
            <time datetime="${escapeHtml(new Date(activityAt).toISOString())}">${escapeHtml(activityTime)}</time>
          </article>`;
      }).join("");
    }
    if (packingFeedUpdatedEl) {
      packingFeedUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`;
    }
  }

  function renderSummary() {
    const packingGroups = state.preparingGroups;
    const orderCount = packingGroups.length;
    const itemCount = packingGroups.reduce(
      (total, group) => total + group.itemCount,
      0,
    );
    const deductionTotal = packingGroups.reduce(
      (total, group) => total + group.deductionAmount,
      0,
    );
    const balanceTotal = packingGroups.reduce(
      (total, group) => total + group.remainingBalanceAmount,
      0,
    );
    const preparingBuckets = getPreparingGroupBuckets();
    const shippedTodayCount = state.shippedGroups.filter((group) => isToday(getActivityEpochMs(group))).length;

    if (preparingCountPillEl) {
      preparingCountPillEl.textContent = String(preparingBuckets.pending.length);
    }
    if (shippingCountPillEl) {
      shippingCountPillEl.textContent = String(state.shippingGroups.length);
    }
    if (orderCountEl) {
      orderCountEl.textContent = `${orderCount}`;
    }
    if (itemCountEl) {
      itemCountEl.textContent = `${itemCount}`;
    }
    if (deductionTotalEl) {
      deductionTotalEl.textContent = formatMoney(deductionTotal);
    }
    if (balanceTotalEl) {
      balanceTotalEl.textContent = formatMoney(balanceTotal);
    }
    if (packingInProgressCountEl) {
      packingInProgressCountEl.textContent = String(preparingBuckets.progress.length);
    }
    if (packingReadyShipCountEl) {
      packingReadyShipCountEl.textContent = String(state.shippingGroups.length);
    }
    if (packingShippedTodayCountEl) {
      packingShippedTodayCountEl.textContent = String(shippedTodayCount);
    }
    if (packingProgressPillEl) {
      packingProgressPillEl.textContent = String(preparingBuckets.progress.length);
    }
    if (packingCompletePillEl) {
      packingCompletePillEl.textContent = String(preparingBuckets.complete.length);
    }
    if (packingTransitPillEl) {
      packingTransitPillEl.textContent = String(state.inTransitGroups.length);
    }
    if (packingShippedPillEl) {
      packingShippedPillEl.textContent = String(state.shippedGroups.length);
    }
    if (packingSelectionCopyEl) {
      const selectedEntry = getSelectedScanEntry();
      packingSelectionCopyEl.textContent = selectedEntry
        ? `${selectedEntry.productName}: ready for barcode input.`
        : "Select an order item to begin barcode verification.";
    }
    renderPackingFeed();
  }

  function getEntryMetaText(entry) {
    return entry.isAddOn
      ? `Qty ${entry.quantity}`
      : [
          entry.variantName || "",
          `Qty ${entry.quantity}`,
        ]
          .filter(Boolean)
          .join(" | ");
  }

  function renderAddOnToggleMarkup(group, mainEntry, addOnEntries, isExpanded) {
    if (!addOnEntries.length) {
      return "";
    }

    const dropdownKey = getAddOnDropdownKey(group.createdAtEpochMs, mainEntry);

    return `
      <button
        type="button"
        class="packing-addon-toggle${isExpanded ? " is-open" : ""}"
        data-addon-dropdown-toggle="${escapeHtml(dropdownKey)}"
        aria-expanded="${isExpanded ? "true" : "false"}"
        aria-label="${isExpanded ? "Hide add-ons" : "Show add-ons"}"
        title="${isExpanded ? "Hide add-ons" : "Show add-ons"}"
      >
        <i class="fa-solid fa-chevron-down packing-addon-toggle__chevron" aria-hidden="true"></i>
      </button>
    `;
  }

  function renderPackingItemPhotoButton(entry, group) {
    const preview = getPackingEntryPhotoPreview(entry);
    if (!preview.imageUrl) {
      return "";
    }

    const label = `View ${entry.productName || "product"} photo`;
    return `
      <button
        type="button"
        class="insight-order-item__photo-btn packing-product-photo-btn"
        data-packing-image-preview
        data-packing-image-preview-group="${escapeHtml(String(group.createdAtEpochMs))}"
        data-packing-image-preview-key="${escapeHtml(String(entry.scanKey))}"
        aria-label="${escapeHtml(label)}"
        title="View product photo"
      >
        <img src="${escapeHtml(preview.imageUrl)}" alt="" loading="lazy" />
      </button>
    `;
  }

  function renderPackingItemMarkup(entry, group, { canScan = true, extraClass = "", addOnToggleMarkup = "" } = {}) {
    const itemMeta = getEntryMetaText(entry);
    const hasBarcode = Boolean(getEntryBarcode(entry));
    const canScanEntry = canScan && hasBarcode;
    const clickClass = canScanEntry ? "insight-order-item--clickable" : "";
    const scanClass = canScanEntry && hasBarcode ? " insight-order-item--scan-required" : "";
    const completeClass = canScan && getEntryScanProgress(entry, group).isComplete
      ? " insight-order-item--scan-complete"
      : "";
    const isSelected = canScanEntry &&
      String(state.selectedScanGroupId) === String(group.createdAtEpochMs) &&
      String(state.selectedScanKey) === String(entry.scanKey);
    const selectedClass = isSelected ? " insight-order-item--selected" : "";
    const entryRole = canScanEntry ? "button" : "presentation";
    const entryTabIndex = canScanEntry ? "0" : "-1";

    return `
      <div
        class="insight-order-item ${clickClass}${selectedClass}${scanClass}${completeClass}${extraClass}"
        role="${entryRole}"
        aria-pressed="${isSelected ? "true" : "false"}"
        tabindex="${entryTabIndex}"
        ${canScanEntry ? `data-scan-order-item-group="${escapeHtml(String(group.createdAtEpochMs))}" data-scan-order-item-key="${escapeHtml(String(entry.scanKey))}"` : ""}
      >
        <div class="insight-order-item__copy">
          <div class="insight-order-item__heading">
            ${canScanEntry ? getScanStatusBadge(entry, group) : ""}
            ${renderPackingItemPhotoButton(entry, group)}
            <strong>${escapeHtml(entry.productName)}</strong>
            <span class="insight-order-item__meta">${escapeHtml(itemMeta)}</span>
          </div>
        </div>
        <div class="insight-order-item__right">
          <span class="insight-order-item__amount">${entry.isAddOn ? "" : entry.unitPrice > 0 ? escapeHtml(formatMoney(entry.unitPrice * entry.quantity)) : "&mdash;"}</span>
          ${addOnToggleMarkup}
          <button
            type="button"
            class="insight-order-item__menu-btn"
            data-item-menu-btn="${escapeHtml(String(group.createdAtEpochMs))}"
            data-item-scan-key="${escapeHtml(String(entry.scanKey))}"
            ${canScanEntry ? "" : "disabled"}
            aria-label="More options"
          >
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>
      </div>
    `;
  }

  function renderOrderBundleMarkup(orderEntry, group, { canScan = true } = {}) {
    const mainEntry = createMainScanEntry(orderEntry);
    const addOnEntries = normalizeOrderAddOns(orderEntry.addOns)
      .map((addOn) => createAddOnScanEntry(orderEntry, addOn));
    const hasAddOns = addOnEntries.length > 0;
    const dropdownKey = getAddOnDropdownKey(group.createdAtEpochMs, mainEntry);
    const isExpanded = hasAddOns && isAddOnDropdownExpanded(group.createdAtEpochMs, mainEntry);
    const mainMarkup = renderPackingItemMarkup(mainEntry, group, {
      canScan,
      extraClass: hasAddOns ? " insight-order-item--has-addons" : "",
      addOnToggleMarkup: renderAddOnToggleMarkup(group, mainEntry, addOnEntries, isExpanded),
    });

    if (!hasAddOns) {
      return mainMarkup;
    }

    return `
      <div class="packing-order-bundle">
        ${mainMarkup}
        <div
          class="packing-addons-dropdown${isExpanded ? " is-open" : ""}"
          data-addon-dropdown="${escapeHtml(dropdownKey)}"
          aria-hidden="${isExpanded ? "false" : "true"}"
          ${isExpanded ? "" : "inert"}
        >
          <div class="packing-addons-dropdown__inner">
            ${addOnEntries
              .map((entry) => renderPackingItemMarkup(entry, group, {
                canScan,
                extraClass: " insight-order-item--addon",
              }))
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderPackingPagination(paginationElement, totalItems, pageStateKey) {
    if (!(paginationElement instanceof HTMLElement)) {
      return;
    }

    paginationElement.replaceChildren();
    const total = Math.max(0, Number(totalItems) || 0);
    if (total <= PACKING_LIST_PAGE_SIZE) {
      paginationElement.hidden = true;
      state[pageStateKey] = 1;
      return;
    }

    paginationElement.hidden = false;
    const pageCount = Math.max(1, Math.ceil(total / PACKING_LIST_PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(state[pageStateKey]) || 1), pageCount);
    state[pageStateKey] = currentPage;
    const firstRecord = ((currentPage - 1) * PACKING_LIST_PAGE_SIZE) + 1;
    const lastRecord = Math.min(total, currentPage * PACKING_LIST_PAGE_SIZE);

    const info = document.createElement("p");
    info.className = "packing-admin-pagination__info";
    info.textContent = `Showing ${firstRecord} to ${lastRecord} of ${total} orders`;

    const controls = document.createElement("div");
    controls.className = "packing-admin-pagination__controls";
    const createButton = (label, page, buttonOptions = {}) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `packing-admin-page-button${buttonOptions.current ? " is-current" : ""}`;
      button.disabled = Boolean(buttonOptions.disabled);
      button.setAttribute("aria-label", buttonOptions.ariaLabel || `Page ${page}`);
      if (buttonOptions.current) {
        button.setAttribute("aria-current", "page");
      }
      if (buttonOptions.icon) {
        button.innerHTML = label;
      } else {
        button.textContent = String(label);
      }
      button.addEventListener("click", () => {
        if (button.disabled || state[pageStateKey] === page) {
          return;
        }
        state[pageStateKey] = page;
        render();
      });
      return button;
    };

    const previousIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
    const nextIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

    controls.appendChild(createButton(previousIcon, Math.max(1, currentPage - 1), {
      disabled: currentPage === 1,
      ariaLabel: "Previous page",
      icon: true,
    }));
    const firstVisiblePage = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const lastVisiblePage = Math.min(pageCount, firstVisiblePage + 4);
    for (let page = firstVisiblePage; page <= lastVisiblePage; page += 1) {
      controls.appendChild(createButton(page, page, { current: page === currentPage }));
    }
    controls.appendChild(createButton(nextIcon, Math.min(pageCount, currentPage + 1), {
      disabled: currentPage === pageCount,
      ariaLabel: "Next page",
      icon: true,
    }));
    paginationElement.append(info, controls);
  }

  function renderQueue(queueListEl, groups, options) {
    if (!queueListEl) {
      return;
    }

    const paginationElement = options.paginationElement;
    const pageStateKey = options.pageStateKey;
    const canPaginate = Boolean(
      isPackingAdminWorkspace
      && paginationElement instanceof HTMLElement
      && pageStateKey,
    );

    if (!groups.length) {
      if (paginationElement instanceof HTMLElement) {
        paginationElement.replaceChildren();
        paginationElement.hidden = true;
      }
      if (options.searchEmpty && window.GMS_ADMIN_SEARCH_NOT_FOUND) {
        window.GMS_ADMIN_SEARCH_NOT_FOUND.replace(queueListEl);
      } else {
        queueListEl.innerHTML = `<div class="empty-state">${escapeHtml(options.emptyMessage)}</div>`;
      }
      return;
    }

    const canScan = options.canScan !== false;
    const useListView = isPackingAdminWorkspace;
    let visibleGroups = groups;

    if (canPaginate) {
      const pageCount = Math.max(1, Math.ceil(groups.length / PACKING_LIST_PAGE_SIZE));
      state[pageStateKey] = Math.min(Math.max(1, Number(state[pageStateKey]) || 1), pageCount);
      const pageStart = (state[pageStateKey] - 1) * PACKING_LIST_PAGE_SIZE;
      visibleGroups = groups.slice(pageStart, pageStart + PACKING_LIST_PAGE_SIZE);
      renderPackingPagination(paginationElement, groups.length, pageStateKey);
    }

    if (useListView) {
      queueListEl.innerHTML = [
        getPackingQueueTableHeaderMarkup(Boolean(options.buttonAttribute)),
        ...visibleGroups.map((group) => buildPackingOrderListRowMarkup(group, { ...options, canScan })),
      ].join("");
      bindPackingQueueInteractions(queueListEl, options);
      return;
    }

    queueListEl.innerHTML = visibleGroups
      .map((group) => {
        const isBusy = options.activeRequestId === String(group.createdAtEpochMs);
        const paymentLabel =
          String(group.paymentOption || "").toLowerCase().startsWith("cod")
            ? "COD"
            : group.paymentOption;

        return `
          <article
            class="insight-order-card product-insight-rank-card"
            data-packing-order-card="${escapeHtml(String(group.createdAtEpochMs))}"
            data-packing-order-stage="${escapeHtml(String(options.stageKey || options.stageLabel || ""))}"
          >
            <div class="insight-order-card__header product-insight-rank-card__header">
              <div class="product-insight-rank-card__leading">
                <div class="product-insight-rank-card__media insight-order-card__media">
                  <span class="insight-order-card__media-fallback">${escapeHtml(getCourierInitials(group.courierName))}</span>
                </div>
                <div class="insight-order-card__title product-insight-rank-card__title">
                  <div class="insight-order-card__eyebrow">
                    <p class="section-label">${escapeHtml(getPackingOrderId(group))}</p>
                  </div>
                  <h3>${escapeHtml(group.customerName)}</h3>
                  <p class="insight-order-card__route">
                    ${escapeHtml(group.address)} | ${escapeHtml(formatItemsLabel(group.itemCount))} | ${escapeHtml(paymentLabel || "Unspecified")}
                  </p>
                </div>
              </div>
              <span class="insight-order-chip ${escapeHtml(options.chipClass)}">${escapeHtml(
                options.stageLabel,
              )}</span>
            </div>

            <div class="insight-order-card__meta product-insight-rank-card__metrics">
              ${createPackingMetricMarkup("Courier", group.courierName, "courier")}
              ${createPackingMetricMarkup("Amount", formatMoney(group.grandTotalAmount), "amount")}
              ${createPackingMetricMarkup("Place order time", formatTimestamp(group.createdAtEpochMs), "place-order-time")}
            </div>

            ${buildPackingOrderItemsMarkup(group, { canScan })}

            <div class="insight-order-actions">
              <span class="insight-order-meta-note">
                ${escapeHtml(options.note(group))}
              </span>
              ${options.buttonAttribute ? `
                <button
                  type="button"
                  class="dashboard-link-button"
                  ${options.buttonAttribute}="${escapeHtml(group.createdAtEpochMs)}"
                  ${isBusy || (typeof options.disableAction === "function" && options.disableAction(group)) ? "disabled" : ""}
                >
                  ${isBusy ? options.loadingLabel : options.buttonLabel}
                </button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    bindPackingQueueInteractions(queueListEl, options);
  }

  const packingModal = document.querySelector("[data-packing-modal]");
  const packingModalBackdrop = document.querySelector("[data-packing-modal-backdrop]");
  const packingModalClose = document.querySelector("[data-packing-modal-close]");
  const packingModalCancel = document.querySelector("[data-packing-modal-cancel]");
  const packingModalSubmit = document.querySelector("[data-packing-modal-submit]");
  const packingModalInput = document.querySelector("[data-packing-modal-input]");
  const packingModalInputError = document.querySelector("[data-packing-modal-input-error]");
  const packingModalQty = document.querySelector("[data-packing-modal-qty]");
  const packingModalProductName = document.querySelector("[data-modal-product-name]");
  const packingModalProductMeta = document.querySelector("[data-modal-product-meta]");
  const packingModalCount = document.querySelector("[data-packing-modal-count]");
  const packingValidationModal = document.querySelector("[data-packing-validation-modal]");
  const packingValidationClose = document.querySelector("[data-packing-validation-close]");
  const packingValidationAction = document.querySelector("[data-packing-validation-action]");
  const packingValidationTitle = document.querySelector("[data-packing-validation-title]");
  const packingValidationCopy = document.querySelector("[data-packing-validation-copy]");
  const packingValidationIcon = document.querySelector("[data-packing-validation-icon]");

  let currentModalGroupId = "";
  let currentModalScanKey = "";
  let isPackingModalBarcodeLocked = false;
  let packingPhotoModalElements = null;
  let packingPhotoModalTrigger = null;

  function isPackingModalOpen() {
    return Boolean(packingModal?.classList.contains("is-open"));
  }

  function setPackingModalBarcodeError(hasError = false) {
    const shouldShowError =
      typeof hasError === "boolean"
        ? hasError
        : Boolean(String(hasError || "").trim());
    packingModalInput?.classList.toggle("is-invalid", shouldShowError);
    packingModalInput?.setAttribute("aria-invalid", shouldShowError ? "true" : "false");
    if (packingModalInputError) {
      packingModalInputError.textContent = "";
      packingModalInputError.hidden = true;
    }
  }

  function setPackingModalBarcodeLocked(isLocked, value = null) {
    isPackingModalBarcodeLocked = Boolean(isLocked);
    if (packingModalInput) {
      if (value !== null) {
        packingModalInput.value = String(value ?? "");
      }
      packingModalInput.disabled = isPackingModalBarcodeLocked;
    }
  }

  function hidePackingValidationModalOverlay(callback) {
    if (!(packingValidationModal instanceof HTMLElement)) {
      if (typeof callback === "function") {
        callback();
      }
      return;
    }

    packingValidationModal.classList.remove("is-open");

    let hasClosed = false;
    const cleanup = () => {
      if (hasClosed) {
        return;
      }
      hasClosed = true;
      packingValidationModal.hidden = true;
      packingValidationModal.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(exitTimer);
      if (typeof callback === "function") {
        callback();
      }
    };

    const onTransitionEnd = (event) => {
      if (event.target !== packingValidationModal) {
        return;
      }
      cleanup();
    };

    packingValidationModal.addEventListener("transitionend", onTransitionEnd);
    const exitTimer = window.setTimeout(cleanup, 300);
  }

  function closePackingValidationModal() {
    hidePackingValidationModalOverlay(() => {
      focusPackingModalInput();
    });
  }

  function openPackingValidationModal({
    title = "Important Notice",
    copy = "Mali yung product barcode.",
    mode = "notice",
  } = {}) {
    if (!packingValidationModal) {
      return;
    }

    if (packingValidationTitle) {
      packingValidationTitle.textContent = title;
    }
    if (packingValidationCopy) {
      packingValidationCopy.textContent = copy;
      packingValidationCopy.hidden = !String(copy || "").trim();
    }
    if (packingValidationIcon) {
      packingValidationIcon.className = `validation-modal__icon validation-modal__icon--${mode}`;
      packingValidationIcon.innerHTML =
        mode === "success"
          ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>';
    }
    packingValidationModal.hidden = false;
    window.requestAnimationFrame(() => {
      packingValidationModal.classList.add("is-open");
    });
    window.WebTheme?.applyFontAwesomeIcons?.(packingValidationModal);
    window.requestAnimationFrame(() => {
      packingValidationAction?.focus();
    });
  }

  function ensurePackingPhotoModal() {
    if (packingPhotoModalElements) {
      return packingPhotoModalElements;
    }

    const overlay = document.createElement("div");
    overlay.className = "product-gallery-modal-overlay packing-product-photo-modal";
    overlay.hidden = true;
    overlay.dataset.packingProductPhotoModal = "";
    overlay.innerHTML = `
      <section
        class="product-gallery-modal packing-product-photo-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="packing-product-photo-title"
      >
        <div class="product-gallery-modal__header">
          <div>
            <h2 id="packing-product-photo-title" data-packing-product-photo-title>Product photo</h2>
            <p class="product-gallery-modal__meta" data-packing-product-photo-meta></p>
          </div>
          <button
            type="button"
            class="product-gallery-modal__close validation-modal__close"
            data-packing-product-photo-close
            aria-label="Close product photo"
            title="Close product photo"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="product-gallery-modal__viewer packing-product-photo-modal__viewer">
          <div class="product-gallery-modal__stage packing-product-photo-modal__stage">
            <img data-packing-product-photo-image alt="" />
          </div>
        </div>
        <div class="product-gallery-modal__zoom packing-product-photo-modal__zoom">
          <button
            type="button"
            class="product-gallery-modal__zoom-button"
            data-packing-product-photo-zoom-out
            aria-label="Zoom out"
          >-</button>
          <input
            type="range"
            class="product-gallery-modal__zoom-range"
            data-packing-product-photo-zoom-range
            min="100"
            max="300"
            step="10"
            value="100"
            aria-label="Photo zoom"
          />
          <button
            type="button"
            class="product-gallery-modal__zoom-button"
            data-packing-product-photo-zoom-in
            aria-label="Zoom in"
          >+</button>
          <span class="product-gallery-modal__count" data-packing-product-photo-zoom-label>100%</span>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);

    const elements = {
      overlay,
      dialog: overlay.querySelector(".packing-product-photo-modal__dialog"),
      title: overlay.querySelector("[data-packing-product-photo-title]"),
      meta: overlay.querySelector("[data-packing-product-photo-meta]"),
      closeButton: overlay.querySelector("[data-packing-product-photo-close]"),
      image: overlay.querySelector("[data-packing-product-photo-image]"),
      zoomRange: overlay.querySelector("[data-packing-product-photo-zoom-range]"),
      zoomOut: overlay.querySelector("[data-packing-product-photo-zoom-out]"),
      zoomIn: overlay.querySelector("[data-packing-product-photo-zoom-in]"),
      zoomLabel: overlay.querySelector("[data-packing-product-photo-zoom-label]"),
    };

    elements.closeButton?.addEventListener("click", closePackingPhotoModal);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closePackingPhotoModal();
      }
    });
    elements.dialog?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    elements.zoomRange?.addEventListener("input", () => {
      setPackingPhotoZoom(elements.zoomRange.value);
    });
    elements.zoomOut?.addEventListener("click", () => {
      setPackingPhotoZoom(Number(elements.zoomRange?.value || 100) - 10);
    });
    elements.zoomIn?.addEventListener("click", () => {
      setPackingPhotoZoom(Number(elements.zoomRange?.value || 100) + 10);
    });

    packingPhotoModalElements = elements;
    window.WebTheme?.applyFontAwesomeIcons?.(overlay);
    return elements;
  }

  function setPackingPhotoZoom(value) {
    const elements = packingPhotoModalElements;
    if (!elements) {
      return;
    }

    const zoom = Math.max(100, Math.min(300, Math.round(Number(value) || 100)));
    const progress = ((zoom - 100) / 200) * 100;
    if (elements.image) {
      elements.image.style.transform = `scale(${(zoom / 100).toFixed(2)})`;
    }
    if (elements.zoomRange) {
      elements.zoomRange.value = String(zoom);
      elements.zoomRange.style.setProperty("--zoom-range-progress", `${progress}%`);
    }
    if (elements.zoomLabel) {
      elements.zoomLabel.textContent = `${zoom}%`;
    }
    if (elements.zoomOut) {
      elements.zoomOut.disabled = zoom <= 100;
    }
    if (elements.zoomIn) {
      elements.zoomIn.disabled = zoom >= 300;
    }
  }

  function isPackingPhotoModalOpen() {
    return Boolean(packingPhotoModalElements && !packingPhotoModalElements.overlay.hidden);
  }

  function closePackingPhotoModal() {
    if (!packingPhotoModalElements) {
      return;
    }

    packingPhotoModalElements.overlay.hidden = true;
    if (packingPhotoModalElements.image) {
      packingPhotoModalElements.image.removeAttribute("src");
      packingPhotoModalElements.image.alt = "";
      packingPhotoModalElements.image.style.transform = "";
    }
    if (packingPhotoModalTrigger instanceof HTMLElement) {
      packingPhotoModalTrigger.focus({ preventScroll: true });
    }
    packingPhotoModalTrigger = null;
  }

  function openPackingPhotoModal(groupId, scanKey, trigger = null) {
    const group = getPackingGroupById(groupId);
    if (!group) {
      return;
    }

    const entry = getPackingScanEntries(group).find(
      (item) => String(item.scanKey) === String(scanKey),
    );
    if (!entry) {
      return;
    }

    const preview = getPackingEntryPhotoPreview(entry);
    if (!preview.imageUrl) {
      return;
    }

    const elements = ensurePackingPhotoModal();
    packingPhotoModalTrigger = trigger instanceof HTMLElement ? trigger : null;
    if (elements.title) {
      elements.title.textContent = preview.title || "Product photo";
    }
    if (elements.meta) {
      elements.meta.textContent = preview.meta || "Product photo";
      elements.meta.hidden = !String(preview.meta || "").trim();
    }
    if (elements.image) {
      elements.image.src = preview.imageUrl;
      elements.image.alt = preview.title || "Product photo";
      elements.image.style.objectPosition = preview.objectPosition || "center center";
    }
    elements.overlay.hidden = false;
    setPackingPhotoZoom(100);
    window.requestAnimationFrame(() => {
      elements.closeButton?.focus({ preventScroll: true });
    });
  }

  function focusPackingModalInput() {
    if (!packingModalInput || !isPackingModalOpen()) {
      return;
    }

    window.requestAnimationFrame(() => {
      packingModalInput.focus({ preventScroll: true });
      const valueLength = String(packingModalInput.value || "").length;
      if (typeof packingModalInput.setSelectionRange === "function") {
        packingModalInput.setSelectionRange(valueLength, valueLength);
      }
    });
  }

  function fitPackingModalProductName() {
    if (!packingModalProductName) {
      return;
    }

    const maxFontSize = 30;
    const minFontSize = 16;
    const lineHeightRatio = 1.12;
    packingModalProductName.style.fontSize = `${maxFontSize}px`;
    packingModalProductName.style.lineHeight = `${Math.round(maxFontSize * lineHeightRatio)}px`;
    packingModalProductName.style.maxHeight = `${Math.ceil(maxFontSize * lineHeightRatio * 2)}px`;

    window.requestAnimationFrame(() => {
      for (let size = maxFontSize; size >= minFontSize; size -= 1) {
        const lineHeight = Math.round(size * lineHeightRatio);
        packingModalProductName.style.fontSize = `${size}px`;
        packingModalProductName.style.lineHeight = `${lineHeight}px`;
        packingModalProductName.style.maxHeight = `${lineHeight * 2}px`;
        if (packingModalProductName.scrollHeight <= lineHeight * 2 + 1) {
          break;
        }
      }
    });
  }

  function syncPackingModalQuantityLimit(groupId, entry) {
    if (!entry) {
      return 0;
    }

    const scannedQuantity = getScannedQuantity(groupId, entry.scanKey);
    const remainingQuantity = Math.max(0, entry.quantity - scannedQuantity);

    if (packingModalCount) {
      packingModalCount.textContent =
        remainingQuantity > 0
          ? `Scanned: ${scannedQuantity}/${entry.quantity}`
          : `Scanned: ${entry.quantity}/${entry.quantity} | Complete`;
    }

    if (packingModalQty) {
      const currentQty = Math.max(1, parseInt(packingModalQty.value, 10) || 1);
      packingModalQty.min = remainingQuantity > 0 ? "1" : "0";
      packingModalQty.max = String(remainingQuantity);
      packingModalQty.value =
        remainingQuantity > 0
          ? String(Math.min(currentQty, remainingQuantity))
          : "0";
      packingModalQty.disabled = remainingQuantity <= 0;
      packingModalQty.placeholder = remainingQuantity > 0 ? "1" : "0";
    }

    if (packingModalInput) {
      packingModalInput.disabled = isPackingModalBarcodeLocked || remainingQuantity <= 0;
    }

    if (packingModalSubmit) {
      packingModalSubmit.disabled = remainingQuantity <= 0;
      packingModalSubmit.textContent = remainingQuantity > 0 ? "Add Scan" : "Complete";
    }

    return remainingQuantity;
  }

  function setPackingModalCompleteState() {
    isPackingModalBarcodeLocked = true;
    if (packingModalProductName) {
      packingModalProductName.textContent = "Scan complete";
    }
    if (packingModalProductMeta) {
      packingModalProductMeta.textContent = "Ready to pack";
    }
    if (packingModalCount) {
      packingModalCount.textContent = "Ready to pack.";
    }
    if (packingModalInput) {
      packingModalInput.value = "";
      packingModalInput.disabled = true;
    }
    if (packingModalQty) {
      packingModalQty.min = "0";
      packingModalQty.max = "0";
      packingModalQty.value = "0";
      packingModalQty.disabled = true;
    }
    if (packingModalSubmit) {
      packingModalSubmit.disabled = true;
      packingModalSubmit.textContent = "Complete";
    }
    fitPackingModalProductName();
  }

  function setPackingModalEntry(group, entry) {
    if (!group || !entry) {
      setPackingModalCompleteState();
      return;
    }

    isPackingModalBarcodeLocked = false;
    currentModalGroupId = String(group.createdAtEpochMs);
    currentModalScanKey = String(entry.scanKey);
    selectBarcodeScanItem(currentModalGroupId, currentModalScanKey, {
      focusHiddenInput: false,
    });

    const itemMeta = entry.scanMetaLabel || entry.variantName || "";
    if (packingModalProductName) {
      packingModalProductName.textContent = entry.productName;
    }
    if (packingModalProductMeta) {
      packingModalProductMeta.textContent = itemMeta;
    }
    if (packingModalInput) {
      packingModalInput.value = "";
      packingModalInput.disabled = false;
    }
    setPackingModalBarcodeError("");

    syncPackingModalQuantityLimit(currentModalGroupId, entry);
    fitPackingModalProductName();
    focusPackingModalInput();
  }

  function openPackingModal(groupId, scanKey) {
    const group = getPendingGroupById(groupId);
    if (!group) {
      return;
    }

    const entry = getPackingScanEntries(group).find(
      (item) => String(item.scanKey) === String(scanKey),
    );
    if (!entry) {
      return;
    }

    currentModalGroupId = groupId;
    currentModalScanKey = String(entry.scanKey);
    const currentScannedQuantity = getScannedQuantity(groupId, entry.scanKey);
    const currentRemainingQuantity = Math.max(0, entry.quantity - currentScannedQuantity);
    if (currentRemainingQuantity <= 0 || isGroupReadyToPack(group)) {
      closePackingModal();
      return;
    }

    if (packingModal) {
      packingModal.classList.add("is-open");
    }

    setPackingModalEntry(group, entry);
    window.setTimeout(focusPackingModalInput, 100);
  }

  function closePackingModal() {
    currentModalGroupId = "";
    currentModalScanKey = "";
    isPackingModalBarcodeLocked = false;

    if (packingModal) {
      packingModal.classList.remove("is-open");
    }
  }

  function handleModalSubmit() {
    if (!currentModalGroupId || !currentModalScanKey) {
      return;
    }

    const value = String(packingModalInput?.value || "").trim();
    if (!value) {
      setPackingModalBarcodeError(true);
      focusPackingModalInput();
      return;
    }
    setPackingModalBarcodeError("");

    const group = getPendingGroupById(currentModalGroupId);
    const entry = group ? getPackingScanEntries(group).find(
      (item) => String(item.scanKey) === String(currentModalScanKey),
    ) : null;
    if (!group || !entry) {
      return;
    }

    const remainingQuantity = Math.max(
      0,
      entry.quantity - getScannedQuantity(currentModalGroupId, currentModalScanKey),
    );
    if (remainingQuantity <= 0) {
      closePackingModal();
      return;
    }

    const requestedQty = Math.max(1, parseInt(packingModalQty?.value || "1", 10) || 1);
    const qty = Math.min(requestedQty, remainingQuantity);
    if (packingModalQty) {
      packingModalQty.value = String(qty);
    }

    selectBarcodeScanItem(currentModalGroupId, currentModalScanKey, {
      focusHiddenInput: false,
    });
    const result = processBarcodeScan(value, qty);
    if (!result?.success) {
      if (result?.message) {
        openPackingValidationModal({
          title: "Important Notice",
          copy: result.message,
          mode: result.mode || "notice",
        });
      } else {
        focusPackingModalInput();
      }
      return;
    }

    setPackingModalBarcodeLocked(true, value);
    syncPackingModalQuantityLimit(currentModalGroupId, entry);

    if (result.remainingQuantity > 0) {
      return;
    }

    closePackingModal();
  }

  if (packingModalBackdrop) {
    packingModalBackdrop.addEventListener("click", closePackingModal);
  }

  if (packingModalClose) {
    packingModalClose.addEventListener("click", closePackingModal);
  }

  if (packingModalCancel) {
    packingModalCancel.addEventListener("click", closePackingModal);
  }

  if (packingModalSubmit) {
    packingModalSubmit.addEventListener("click", handleModalSubmit);
  }

  if (packingModalInput) {
    packingModalInput.addEventListener("focus", () => {
      if (isPackingModalBarcodeLocked) {
        packingModalInput.blur();
      }
    });

    packingModalInput.addEventListener("input", () => {
      if (isPackingModalBarcodeLocked) {
        return;
      }
      if (String(packingModalInput.value || "").trim()) {
        setPackingModalBarcodeError("");
      }
    });

    packingModalInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleModalSubmit();
      }

      if (event.key === "Escape") {
        closePackingModal();
      }
    });
  }

  packingValidationClose?.addEventListener("click", closePackingValidationModal);
  packingValidationAction?.addEventListener("click", closePackingValidationModal);
  packingValidationModal?.addEventListener("click", (event) => {
    if (event.target === packingValidationModal) {
      closePackingValidationModal();
    }
  });

  if (packingModalQty) {
    packingModalQty.addEventListener("input", () => {
      const max = Number(packingModalQty.max || "0");
      const min = Number(packingModalQty.min || "1");
      let value = Number(packingModalQty.value || "0");

      if (Number.isNaN(value) || value < min) {
        value = min;
      }
      if (max > 0 && value > max) {
        value = max;
      }

      packingModalQty.value = String(value);
    });
  }

  if (packingBarcodeToggle) {
    packingBarcodeToggle.addEventListener("click", () => {
      setPackingBarcodePanelOpen(packingBarcodePanel?.hidden ?? true, {
        restoreFocus: true,
      });
      if (isPackingModalOpen()) {
        window.setTimeout(focusPackingModalInput, 80);
      }
    });
  }

  if (packingBarcodeClose) {
    packingBarcodeClose.addEventListener("click", () => {
      setPackingBarcodePanelOpen(false, { restoreFocus: true });
      if (isPackingModalOpen()) {
        window.setTimeout(focusPackingModalInput, 80);
      }
    });
  }

  if (packingBarcodeSearchInput) {
    packingBarcodeSearchInput.addEventListener("input", () => {
      window.clearTimeout(packingBarcodeSearchTimer);
      packingBarcodeSearchTimer = window.setTimeout(() => {
        state.packingBarcodeSearchTerm = packingBarcodeSearchInput.value;
        renderPackingBarcodeList();
      }, 500);
    });
  }

  window.addEventListener("resize", () => {
    if (isPackingModalOpen()) {
      fitPackingModalProductName();
    }
  });

  let documentBarcodeBuffer = "";
  let documentBarcodeBufferTimer = 0;

  function isEditableBarcodeTarget(target) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true']"),
    );
  }

  function clearDocumentBarcodeBufferSoon() {
    window.clearTimeout(documentBarcodeBufferTimer);
    documentBarcodeBufferTimer = window.setTimeout(() => {
      documentBarcodeBuffer = "";
    }, 240);
  }

  function processSelectedBarcodeScanValue(value) {
    const barcodeValue = String(value || "").trim();
    if (!barcodeValue || !hasActiveScanSelection()) {
      return null;
    }

    const result = processBarcodeScan(barcodeValue);
    if (!result?.success && result?.message) {
      openPackingValidationModal({
        title: "Important Notice",
        copy: result.message,
        mode: result.mode || "notice",
      });
    }
    if (barcodeHiddenInput) {
      barcodeHiddenInput.value = "";
    }
    return result;
  }

  document.addEventListener("pointerup", (event) => {
    if (!hasActiveScanSelection() || isPackingModalOpen() || isEditableBarcodeTarget(event.target)) {
      return;
    }

    window.setTimeout(focusHiddenBarcodeInputForSelection, 0);
  });

  document.addEventListener("keydown", (event) => {
    if (
      !hasActiveScanSelection()
      || isPackingModalOpen()
      || event.target === barcodeHiddenInput
      || isEditableBarcodeTarget(event.target)
      || event.ctrlKey
      || event.altKey
      || event.metaKey
    ) {
      return;
    }

    if (event.key === "Enter") {
      if (!documentBarcodeBuffer) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      processSelectedBarcodeScanValue(documentBarcodeBuffer);
      documentBarcodeBuffer = "";
      window.clearTimeout(documentBarcodeBufferTimer);
      focusHiddenBarcodeInputForSelection();
      return;
    }

    if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      event.stopPropagation();
      documentBarcodeBuffer += event.key;
      clearDocumentBarcodeBufferSoon();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isPackingPhotoModalOpen()) {
      closePackingPhotoModal();
      return;
    }

    if (event.key === "Escape" && packingValidationModal && !packingValidationModal.hidden) {
      closePackingValidationModal();
      return;
    }

    if (packingModal?.classList.contains("is-open")) {
      if (event.key === "Escape") {
        closePackingModal();
      }
    }

    if (
      event.key === "Escape"
      && packingBarcodePanel
      && !packingBarcodePanel.hidden
    ) {
      setPackingBarcodePanelOpen(false, { restoreFocus: true });
    }
  });

  function getScrollSnapshot() {
    const scrollElement = document.scrollingElement || document.documentElement;
    return {
      left: scrollElement?.scrollLeft || window.scrollX || 0,
      top: scrollElement?.scrollTop || window.scrollY || 0,
    };
  }

  function restoreScrollSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    const scrollElement = document.scrollingElement || document.documentElement;
    if (scrollElement && typeof scrollElement.scrollTo === "function") {
      scrollElement.scrollTo({
        left: snapshot.left,
        top: snapshot.top,
        behavior: "auto",
      });
      return;
    }

    window.scrollTo(snapshot.left, snapshot.top);
  }

  function getPreparingGroupsForRender(preparingBuckets) {
    const hasPrepareFilterTabs = document.querySelectorAll("[data-packing-prepare-filter]").length > 0;
    if (!isPackingAdminWorkspace) {
      return state.preparingGroups;
    }
    if (!hasPrepareFilterTabs) {
      return [
        ...preparingBuckets.pending,
        ...preparingBuckets.progress,
        ...preparingBuckets.complete,
      ];
    }
    return ({
      "to-pack": preparingBuckets.pending,
      packing: preparingBuckets.progress,
      packed: preparingBuckets.complete,
    })[state.prepareFilter] || preparingBuckets.pending;
  }

  function render() {
    const scrollSnapshot = getScrollSnapshot();
    renderSummary();
    const preparingBuckets = getPreparingGroupBuckets();
    const preparingGroups = getPreparingGroupsForRender(preparingBuckets);
    const visiblePreparingGroups = preparingGroups.filter(groupMatchesWorkspaceSearch);
    renderQueue(preparingOrderListEl, visiblePreparingGroups, {
      emptyMessage: "No orders in To Prepare right now.",
      chipClass: "is-preparing",
      stageLabel: "Preparing",
      stageKey: "preparing",
      buttonAttribute: "data-pack-order-group",
      activeRequestId: state.activePackRequestId,
      buttonLabel: "Order Packed",
      loadingLabel: "Moving...",
      searchEmpty: Boolean(normalizeSearchTerm(state.workspaceSearchTerm)),
      note: (group) => {
        const summary = getGroupScannerSummary(group);
        if (summary && summary.remainingQuantity > 0) {
          return `Scan ${summary.remainingQuantity} item${summary.remainingQuantity === 1 ? "" : "s"} before packing.`;
        }
        return `Ready to pack: ${formatItemsLabel(group.itemCount)}. Press Order Packed when packing is finished.`;
      },
      disableAction: (group) => !isGroupReadyToPack(group),
      onAction: markOrderPacked,
      paginationElement: preparingPaginationEl,
      pageStateKey: "preparingPage",
    });
    const shippingView = isPackingAdminWorkspace
      ? ({
          ready: {
            groups: state.shippingGroups,
            emptyMessage: "No packages are waiting for courier handoff.",
            chipClass: "is-in-transit",
            stageLabel: "Ready to Ship",
            stageKey: "shipping",
            buttonAttribute: "data-ship-order-group",
            activeRequestId: state.activeShipRequestId,
            buttonLabel: "Handover to Courier",
            loadingLabel: "Updating...",
            note: (group) => `Ready to dispatch: ${formatItemsLabel(group.itemCount)}.`,
            onAction: markOrderShipped,
          },
          "in-transit": {
            groups: state.inTransitGroups,
            emptyMessage: "No shipments are currently in transit.",
            chipClass: "is-in-transit",
            stageLabel: "In Transit",
            stageKey: "in-transit",
            buttonAttribute: "",
            activeRequestId: "",
            buttonLabel: "",
            loadingLabel: "",
            note: (group) => `Courier: ${group.courierName}. Shipment is in transit.`,
          },
          shipped: {
            groups: state.shippedGroups,
            emptyMessage: "No completed shipments match this view.",
            chipClass: "is-complete",
            stageLabel: "Shipped",
            stageKey: "shipped",
            buttonAttribute: "",
            activeRequestId: "",
            buttonLabel: "",
            loadingLabel: "",
            note: (group) => `Completed shipment for ${group.customerName}.`,
          },
        })[state.shippingFilter]
      : {
          groups: state.shippingGroups,
          emptyMessage: "No orders in To Ship right now.",
          chipClass: "is-in-transit",
          stageLabel: "To Ship",
          stageKey: "shipping",
          buttonAttribute: "data-ship-order-group",
          activeRequestId: state.activeShipRequestId,
          buttonLabel: "Shipped",
          loadingLabel: "Updating...",
          note: (group) => `Ready to dispatch: ${formatItemsLabel(group.itemCount)}. Press Shipped after courier handoff is complete.`,
          onAction: markOrderShipped,
        };
    renderQueue(
      shippingOrderListEl,
      (shippingView?.groups || []).filter(groupMatchesWorkspaceSearch),
      {
        ...shippingView,
        canScan: false,
        searchEmpty: Boolean(normalizeSearchTerm(state.workspaceSearchTerm)),
        paginationElement: shippingPaginationEl,
        pageStateKey: "shippingPage",
      },
    );
    restoreScrollSnapshot(scrollSnapshot);
    requestAnimationFrame(() => {
      restoreScrollSnapshot(scrollSnapshot);
    });
  }

  if (barcodeHiddenInput) {
    barcodeHiddenInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = String(barcodeHiddenInput.value || "").trim();
        if (!value) {
          return;
        }

        processSelectedBarcodeScanValue(value);
        barcodeHiddenInput.value = "";
      }
    });
  }

  function handleProductClick(groupId, scanKey) {
    selectBarcodeScanItem(groupId, scanKey);
  }

  function setPackingFilter(attribute, value) {
    document.querySelectorAll(`[${attribute}]`).forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute(attribute) === value);
    });
  }

  document.querySelectorAll("[data-packing-prepare-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-packing-prepare-filter") || "to-pack";
      if (!["to-pack", "packing", "packed"].includes(filter)) {
        return;
      }
      state.prepareFilter = filter;
      state.preparingPage = 1;
      setPackingFilter("data-packing-prepare-filter", filter);
      render();
    });
  });

  document.querySelectorAll("[data-packing-shipping-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.getAttribute("data-packing-shipping-filter") || "ready";
      if (!["ready", "in-transit", "shipped"].includes(filter)) {
        return;
      }
      state.shippingFilter = filter;
      state.shippingPage = 1;
      setPackingFilter("data-packing-shipping-filter", filter);
      render();
    });
  });

  packingWorkspaceSearchInput?.addEventListener("input", () => {
    state.workspaceSearchTerm = packingWorkspaceSearchInput.value;
    state.preparingPage = 1;
    state.shippingPage = 1;
    render();
  });

  packingFeedFilterEl?.addEventListener("change", () => {
    state.feedFilter = packingFeedFilterEl.value || "all";
    renderPackingFeed();
  });

  document.querySelectorAll("[data-packing-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.isLoading && !state.activePackRequestId && !state.activeShipRequestId) {
        void loadPackingOrders();
      }
    });
  });

  document.querySelector("[data-packing-print]")?.addEventListener("click", () => {
    window.print();
  });

  async function initializePackingDashboard() {
    await loadProducts();
    await loadPackingOrders();
  }

  window.addEventListener("gms:realtime-change", handlePackingRealtimeChange);
  void initializePackingDashboard();
})();

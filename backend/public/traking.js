(function () {
  const app = document.querySelector("[data-tracking-app]");
  if (!app) {
    return;
  }

  const orderListEl = document.querySelector("[data-tracking-order-list]");
  const orderCountEl = document.querySelector("[data-tracking-order-count]");
  const searchInput = document.querySelector("[data-tracking-search]");
  const filterButtons = Array.from(document.querySelectorAll("[data-tracking-filter]"));
  const refreshButton = document.querySelector("[data-tracking-refresh]");
  const googleMapIframe = document.querySelector("[data-tracking-google-map]");
  const mapSvg = document.querySelector("[data-tracking-map]");
  const leafletMapEl = document.querySelector("[data-tracking-leaflet-map]");
  const mapKickerEl = document.querySelector("[data-tracking-map-kicker]");
  const mapTitleEl = document.querySelector("[data-tracking-map-title]");
  const mapStatusEl = document.querySelector("[data-tracking-map-status]");
  const mapOriginEl = document.querySelector("[data-tracking-map-origin]");
  const mapDestinationEl = document.querySelector("[data-tracking-map-destination]");
  const mapCardTitleEl = document.querySelector("[data-tracking-map-card-title]");
  const mapCardCopyEl = document.querySelector("[data-tracking-map-card-copy]");
  const mapLayerButtons = Array.from(document.querySelectorAll("[data-tracking-map-layer]"));
  const detailStatusEl = document.querySelector("[data-tracking-detail-status]");
  const detailOrderEl = document.querySelector("[data-tracking-detail-order]");
  const detailCourierEl = document.querySelector("[data-tracking-detail-courier]");
  const detailCustomerEl = document.querySelector("[data-tracking-detail-customer]");
  const detailAddressEl = document.querySelector("[data-tracking-detail-address]");
  const detailItemsEl = document.querySelector("[data-tracking-detail-items]");
  const timelineEl = document.querySelector("[data-tracking-timeline]");
  const summaryActiveEl = document.querySelector("[data-tracking-summary-active]");
  const summaryRouteEl = document.querySelector("[data-tracking-summary-route]");
  const summaryDeliveredEl = document.querySelector("[data-tracking-summary-delivered]");

  const REFRESH_INTERVAL_MS = 15000;
  const MAP_WIDTH = 1000;
  const MAP_HEIGHT = 560;
  const MAP_PADDING_X = 92;
  const MAP_PADDING_Y = 64;

  const WAREHOUSE_LOCATION = Object.freeze({
    name: "GMS Packing Hub",
    lat: 14.5995,
    lng: 120.9842,
  });

  const KNOWN_PLACES = Object.freeze([
    { name: "Catbalogan", keys: ["catbalogan"], lat: 11.7753, lng: 124.8861 },
    { name: "Quezon City", keys: ["quezon city", "qc"], lat: 14.6760, lng: 121.0437 },
    { name: "Makati", keys: ["makati"], lat: 14.5547, lng: 121.0244 },
    { name: "Pasig", keys: ["pasig"], lat: 14.5764, lng: 121.0851 },
    { name: "Taguig", keys: ["taguig", "bgc", "bonifacio global"], lat: 14.5176, lng: 121.0509 },
    { name: "Manila", keys: ["manila"], lat: 14.5995, lng: 120.9842 },
    { name: "Marikina", keys: ["marikina"], lat: 14.6507, lng: 121.1029 },
    { name: "Caloocan", keys: ["caloocan"], lat: 14.7566, lng: 120.9830 },
    { name: "Mandaluyong", keys: ["mandaluyong"], lat: 14.5794, lng: 121.0359 },
    { name: "San Juan", keys: ["san juan"], lat: 14.6042, lng: 121.0296 },
    { name: "Paranaque", keys: ["paranaque", "paranaque"], lat: 14.4793, lng: 121.0198 },
    { name: "Pasay", keys: ["pasay"], lat: 14.5378, lng: 121.0014 },
    { name: "Las Pinas", keys: ["las pinas", "las pinas"], lat: 14.4445, lng: 120.9939 },
    { name: "Muntinlupa", keys: ["muntinlupa", "alabang"], lat: 14.4081, lng: 121.0415 },
    { name: "Valenzuela", keys: ["valenzuela"], lat: 14.7011, lng: 120.9830 },
    { name: "Malabon", keys: ["malabon"], lat: 14.6681, lng: 120.9658 },
    { name: "Navotas", keys: ["navotas"], lat: 14.6574, lng: 120.9470 },
    { name: "Pateros", keys: ["pateros"], lat: 14.5448, lng: 121.0671 },
    { name: "Cebu City", keys: ["cebu"], lat: 10.3157, lng: 123.8854 },
    { name: "Davao City", keys: ["davao"], lat: 7.1907, lng: 125.4553 },
    { name: "Baguio", keys: ["baguio"], lat: 16.4023, lng: 120.5960 },
    { name: "Iloilo", keys: ["iloilo"], lat: 10.7202, lng: 122.5621 },
    { name: "Bacolod", keys: ["bacolod"], lat: 10.6765, lng: 122.9509 },
    { name: "Cagayan de Oro", keys: ["cagayan de oro", "cdo"], lat: 8.4542, lng: 124.6319 },
    { name: "General Santos", keys: ["general santos", "gensan"], lat: 6.1164, lng: 125.1716 },
  ]);

  const STATUS_META = Object.freeze({
    toPay: {
      label: "Payment",
      filter: "packing",
      tone: "warning",
      progress: 0.08,
      rank: 1,
    },
    toPrepare: {
      label: "Packing",
      filter: "packing",
      tone: "packing",
      progress: 0.22,
      rank: 2,
    },
    toShip: {
      label: "Ready",
      filter: "ready",
      tone: "ready",
      progress: 0.44,
      rank: 3,
    },
    toReceive: {
      label: "On route",
      filter: "route",
      tone: "route",
      progress: 0.72,
      rank: 4,
    },
    toReview: {
      label: "Delivered",
      filter: "done",
      tone: "done",
      progress: 1,
      rank: 5,
    },
    returnRequest: {
      label: "Return",
      filter: "done",
      tone: "warning",
      progress: 0.36,
      rank: 4,
    },
    cancelled: {
      label: "Cancelled",
      filter: "done",
      tone: "cancelled",
      progress: 0,
      rank: 0,
    },
  });

  const TIMELINE_STEPS = Object.freeze([
    { key: "toPrepare", label: "Packing" },
    { key: "toShip", label: "Ready" },
    { key: "toReceive", label: "On route" },
    { key: "toReview", label: "Delivered" },
  ]);

  let leafletMap = null;
  let leafletRouteLayer = null;
  let leafletStreetLayer = null;
  let leafletSatelliteLayer = null;
  let activeLeafletLayer = "street";

  const GOOGLE_MAP_DEFAULT_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.123456789!2d120.9842195!3d14.5995124!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397ca3c1a3b1fbf%3A0x9c2d3b456789!2sManila!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph";

  const state = {
    groups: [],
    selectedGroupKey: "",
    searchTerm: "",
    activeFilter: "all",
    isLoading: false,
    lastMapSignature: "",
  };
  let trackingSearchTimer = 0;

  const moneyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function formatOrderCount(count) {
    const value = Number(count) || 0;
    return `${value} ${value === 1 ? "order" : "orders"}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return dateFormatter.format(date);
  }

  function normalizeSearchText(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function hashString(value) {
    const input = String(value ?? "");
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizeStage(value) {
    const rawValue = String(value ?? "").trim();
    const compactValue = rawValue.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (!compactValue) {
      return "toPrepare";
    }

    if (compactValue === "topay" || compactValue === "payment" || compactValue === "pendingpayment") {
      return "toPay";
    }

    if (
      compactValue === "toprepare" ||
      compactValue === "preparing" ||
      compactValue === "processing" ||
      compactValue === "pending" ||
      compactValue === "packing"
    ) {
      return "toPrepare";
    }

    if (
      compactValue === "toship" ||
      compactValue === "packed" ||
      compactValue === "ready" ||
      compactValue === "readytoship"
    ) {
      return "toShip";
    }

    if (
      compactValue === "toreceive" ||
      compactValue === "intransit" ||
      compactValue === "shipped" ||
      compactValue === "outfordelivery" ||
      compactValue === "onroute"
    ) {
      return "toReceive";
    }

    if (
      compactValue === "toreview" ||
      compactValue === "delivered" ||
      compactValue === "completed" ||
      compactValue === "received"
    ) {
      return "toReview";
    }

    if (compactValue === "returnrequest" || compactValue === "return" || compactValue === "returned") {
      return "returnRequest";
    }

    if (compactValue === "cancelled" || compactValue === "canceled" || compactValue === "cancel") {
      return "cancelled";
    }

    return "toPrepare";
  }

  function getStatusMeta(stage) {
    return STATUS_META[normalizeStage(stage)] || STATUS_META.toPrepare;
  }

  function getGroupStage(entries) {
    const stages = entries.map((entry) => normalizeStage(entry.stage || entry.status));
    if (stages.length && stages.every((stage) => stage === "cancelled")) {
      return "cancelled";
    }

    return stages.reduce((selectedStage, stage) => {
      const selectedMeta = getStatusMeta(selectedStage);
      const currentMeta = getStatusMeta(stage);
      return currentMeta.rank >= selectedMeta.rank ? stage : selectedStage;
    }, "toPrepare");
  }

  function createDisplayOrderId(entry, index) {
    const epochMs = Math.trunc(Number(entry.createdAtEpochMs) || 0);
    if (epochMs > 0) {
      return `GMS-${String(epochMs).slice(-8)}`;
    }

    const rawId = String(entry.id || entry.orderId || "").trim();
    if (rawId) {
      return rawId.length > 18 ? rawId.slice(0, 18).toUpperCase() : rawId.toUpperCase();
    }

    return `GMS-${String(index + 1).padStart(4, "0")}`;
  }

  function normalizeOrderEntry(order, index) {
    const createdAtEpochMs = Math.trunc(Number(order?.createdAtEpochMs) || 0);
    const quantity = Math.max(1, Math.trunc(Number(order?.quantity || order?.items || 1)) || 1);
    const customerName = String(
      order?.customerName ||
      order?.clientName ||
      order?.customer ||
      [order?.firstName, order?.lastName].filter(Boolean).join(" ") ||
      "Unknown customer",
    ).trim();
    const address = String(order?.address || order?.clientAddress || order?.city || "").trim();
    const courier = String(
      order?.courier ||
      order?.deliveryProvider ||
      order?.deliveryPartnerName ||
      "Unassigned",
    ).trim();

    return {
      id: String(order?.id || order?.orderId || `order-${index + 1}`).trim(),
      displayId: createDisplayOrderId(order, index),
      groupKey: createdAtEpochMs > 0
        ? `created-${createdAtEpochMs}`
        : `entry-${String(order?.id || index).trim()}`,
      productName: String(order?.productName || "Ordered item").trim(),
      variantName: String(order?.variantName || "").trim(),
      quantity,
      createdAtEpochMs,
      createdAt: order?.createdAt || order?.receivedAt || (createdAtEpochMs ? new Date(createdAtEpochMs).toISOString() : ""),
      amount: Number(
        order?.grandTotalAmount ||
        order?.amount ||
        order?.total ||
        order?.price ||
        0,
      ) || 0,
      stage: normalizeStage(order?.stage || order?.status),
      customerName,
      contactNumber: String(order?.contactNumber || order?.clientContactNumber || "").trim(),
      address,
      city: String(order?.city || address || "Philippines").trim(),
      courier,
      payment: String(
        order?.payment ||
        order?.paymentOptionLabel ||
        order?.paymentMethod ||
        "Unspecified",
      ).trim(),
    };
  }

  function groupOrders(rawOrders) {
    const groupsByKey = new Map();
    const entries = (Array.isArray(rawOrders) ? rawOrders : [])
      .map(normalizeOrderEntry)
      .filter((entry) => entry.id);

    entries.forEach((entry, index) => {
      const existingGroup = groupsByKey.get(entry.groupKey);
      if (!existingGroup) {
        groupsByKey.set(entry.groupKey, {
          key: entry.groupKey,
          displayId: entry.displayId,
          entries: [entry],
          customerName: entry.customerName,
          contactNumber: entry.contactNumber,
          address: entry.address,
          city: entry.city,
          courier: entry.courier,
          payment: entry.payment,
          createdAtEpochMs: entry.createdAtEpochMs || index,
          createdAt: entry.createdAt,
          amount: entry.amount,
          quantity: entry.quantity,
          products: [entry.productName],
        });
        return;
      }

      existingGroup.entries.push(entry);
      existingGroup.quantity += entry.quantity;
      existingGroup.amount = Math.max(existingGroup.amount, entry.amount);
      existingGroup.products.push(entry.productName);
      existingGroup.address ||= entry.address;
      existingGroup.city ||= entry.city;
      existingGroup.courier = existingGroup.courier || entry.courier;
      existingGroup.payment = existingGroup.payment || entry.payment;
    });

    return [...groupsByKey.values()]
      .map((group) => {
        const stage = getGroupStage(group.entries);
        const statusMeta = getStatusMeta(stage);
        const uniqueProducts = [...new Set(group.products.filter(Boolean))];
        const destination = resolveDestination(group);
        const searchBlob = normalizeSearchText([
          group.displayId,
          group.customerName,
          group.address,
          group.city,
          group.courier,
          group.payment,
          statusMeta.label,
          uniqueProducts.join(" "),
        ].join(" "));

        return {
          ...group,
          stage,
          statusMeta,
          products: uniqueProducts,
          destination,
          searchBlob,
        };
      })
      .sort((left, right) => {
        const rightTime = Math.trunc(Number(right.createdAtEpochMs) || 0);
        const leftTime = Math.trunc(Number(left.createdAtEpochMs) || 0);
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        return String(left.displayId).localeCompare(String(right.displayId));
      });
  }

  function resolveDestination(group) {
    const addressText = normalizeSearchText(`${group.address} ${group.city}`);
    const exactPlace = KNOWN_PLACES.find((place) =>
      place.keys.some((key) => addressText.includes(normalizeSearchText(key))),
    );

    if (exactPlace) {
      return {
        name: exactPlace.name,
        lat: exactPlace.lat,
        lng: exactPlace.lng,
      };
    }

    const seed = hashString(addressText || group.displayId);
    const lat = 5.8 + ((seed % 11600) / 1000);
    const lng = 117.2 + (((seed >>> 8) % 9000) / 1000);
    const label = String(group.city || group.address || "Philippines")
      .replace(/\s+/g, " ")
      .trim();

    return {
      name: label.length > 28 ? `${label.slice(0, 25)}...` : label,
      lat,
      lng,
    };
  }

  function createGeoRoute(origin, destination, seedValue) {
    const seed = hashString(seedValue);
    const normalSign = seed % 2 === 0 ? 1 : -1;
    const latDelta = destination.lat - origin.lat;
    const lngDelta = destination.lng - origin.lng;
    const routeDistance = Math.hypot(latDelta, lngDelta);
    const bend = Math.min(Math.max(routeDistance * 0.16, 0.04), 1.15) * normalSign;
    const normalLat = -lngDelta * bend;
    const normalLng = latDelta * bend;

    function interpolate(ratio, bendRatio) {
      return {
        lat: origin.lat + latDelta * ratio + normalLat * bendRatio,
        lng: origin.lng + lngDelta * ratio + normalLng * bendRatio,
      };
    }

    return [
      origin,
      interpolate(0.28, 0.22),
      interpolate(0.58, 0.34),
      interpolate(0.82, 0.16),
      destination,
    ];
  }

  function createBounds(points) {
    const latValues = points.map((point) => point.lat);
    const lngValues = points.map((point) => point.lng);
    let minLat = Math.min(...latValues);
    let maxLat = Math.max(...latValues);
    let minLng = Math.min(...lngValues);
    let maxLng = Math.max(...lngValues);
    const latRange = Math.max(maxLat - minLat, 0.12);
    const lngRange = Math.max(maxLng - minLng, 0.12);
    const padLat = latRange * 0.24;
    const padLng = lngRange * 0.24;

    minLat -= padLat;
    maxLat += padLat;
    minLng -= padLng;
    maxLng += padLng;

    return { minLat, maxLat, minLng, maxLng };
  }

  function projectPoint(point, bounds) {
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lngRange = bounds.maxLng - bounds.minLng || 1;
    const x = MAP_PADDING_X + ((point.lng - bounds.minLng) / lngRange) * (MAP_WIDTH - MAP_PADDING_X * 2);
    const y = MAP_HEIGHT - MAP_PADDING_Y - ((point.lat - bounds.minLat) / latRange) * (MAP_HEIGHT - MAP_PADDING_Y * 2);
    return {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    };
  }

  function buildPathData(points) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
  }

  function getPointAtProgress(points, progress) {
    if (!points.length) {
      return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    }

    if (points.length === 1) {
      return points[0];
    }

    const lengths = [];
    let totalLength = 0;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const length = Math.hypot(current.x - previous.x, current.y - previous.y);
      lengths.push(length);
      totalLength += length;
    }

    const targetLength = Math.max(0, Math.min(1, progress)) * totalLength;
    let walkedLength = 0;

    for (let index = 1; index < points.length; index += 1) {
      const segmentLength = lengths[index - 1] || 0;
      if (walkedLength + segmentLength >= targetLength) {
        const ratio = segmentLength ? (targetLength - walkedLength) / segmentLength : 0;
        const previous = points[index - 1];
        const current = points[index];
        return {
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio,
        };
      }
      walkedLength += segmentLength;
    }

    return points[points.length - 1];
  }

  function getGeoPointAtProgress(points, progress) {
    if (!points.length) {
      return { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng };
    }

    if (points.length === 1) {
      return points[0];
    }

    const lengths = [];
    let totalLength = 0;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const length = Math.hypot(current.lat - previous.lat, current.lng - previous.lng);
      lengths.push(length);
      totalLength += length;
    }

    const targetLength = Math.max(0, Math.min(1, progress)) * totalLength;
    let walkedLength = 0;

    for (let index = 1; index < points.length; index += 1) {
      const segmentLength = lengths[index - 1] || 0;
      if (walkedLength + segmentLength >= targetLength) {
        const ratio = segmentLength ? (targetLength - walkedLength) / segmentLength : 0;
        const previous = points[index - 1];
        const current = points[index];
        return {
          lat: previous.lat + (current.lat - previous.lat) * ratio,
          lng: previous.lng + (current.lng - previous.lng) * ratio,
        };
      }
      walkedLength += segmentLength;
    }

    return points[points.length - 1];
  }

  function getProgressGeoRoute(points, progress) {
    if (points.length <= 1) {
      return points;
    }

    const targetPoint = getGeoPointAtProgress(points, progress);
    const route = [points[0]];
    const targetLengthRatio = Math.max(0, Math.min(1, progress));
    const segmentTarget = targetLengthRatio * (points.length - 1);
    const lastFullIndex = Math.floor(segmentTarget);

    for (let index = 1; index <= lastFullIndex && index < points.length; index += 1) {
      route.push(points[index]);
    }

    const lastPoint = route[route.length - 1];
    if (!lastPoint || lastPoint.lat !== targetPoint.lat || lastPoint.lng !== targetPoint.lng) {
      route.push(targetPoint);
    }

    return route;
  }

  function getCssAccentColor() {
    const styles = window.getComputedStyle(document.documentElement);
    return String(styles.getPropertyValue("--accent") || "").trim() || "#2563eb";
  }

  function buildGoogleMapEmbedUrl(group) {
    if (!group?.destination) {
      return GOOGLE_MAP_DEFAULT_EMBED_URL;
    }

    const destinationLabel = [group.destination.lat, group.destination.lng]
      .map((value) => Number(value).toFixed(6))
      .join(",");
    return `https://www.google.com/maps?q=${encodeURIComponent(destinationLabel)}&z=17&output=embed`;
  }

  function renderGoogleMap(group) {
    if (!googleMapIframe) {
      return false;
    }

    const nextSrc = buildGoogleMapEmbedUrl(group);
    if (googleMapIframe.src !== nextSrc) {
      googleMapIframe.src = nextSrc;
    }
    googleMapIframe.hidden = false;
    if (leafletMapEl) {
      leafletMapEl.hidden = true;
    }
    if (mapSvg) {
      mapSvg.hidden = true;
    }

    if (!group) {
      setText(mapKickerEl, "Google Maps");
      setText(mapTitleEl, "Map");
      renderStatusPill(mapStatusEl, "toPrepare");
      setText(mapOriginEl, WAREHOUSE_LOCATION.name);
      setText(mapDestinationEl, "Destination");
      setText(mapCardTitleEl, "Shipment route");
      setText(mapCardCopyEl, "Google Maps embed preview");
      return true;
    }

    setText(mapKickerEl, `${group.courier || "Route"} | Google Maps`);
    setText(mapTitleEl, group.displayId);
    renderStatusPill(mapStatusEl, group);
    setText(mapOriginEl, WAREHOUSE_LOCATION.name);
    setText(mapDestinationEl, group.destination.name || "Destination");
    setText(mapCardTitleEl, `${group.displayId} to ${group.destination.name || "Destination"}`);
    setText(mapCardCopyEl, `${group.statusMeta.label} | ${group.courier || "Unassigned courier"}`);
    return true;
  }

  function syncMapLayerButtons() {
    mapLayerButtons.forEach((button) => {
      const isActive = (button.dataset.trackingMapLayer || "street") === activeLeafletLayer;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function isLeafletReady() {
    return Boolean(
      leafletMapEl &&
      window.L &&
      typeof window.L.map === "function" &&
      typeof window.L.tileLayer === "function",
    );
  }

  function ensureLeafletMap() {
    if (!isLeafletReady()) {
      return null;
    }

    if (leafletMap) {
      return leafletMap;
    }

    leafletMap = window.L.map(leafletMapEl, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    const cleanStreetLayer = window.L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    const osmStreetLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    const satelliteLayer = window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    });

    leafletStreetLayer = cleanStreetLayer;
    leafletSatelliteLayer = satelliteLayer;

    [cleanStreetLayer, osmStreetLayer, satelliteLayer].forEach((layer) => {
      layer.on("load", () => refreshLeafletMapSize(leafletMap));
    });

    cleanStreetLayer.addTo(leafletMap);
    window.L.control.layers(
      {
        "Clean Street": cleanStreetLayer,
        "OpenStreetMap": osmStreetLayer,
        "Satellite": satelliteLayer,
      },
      {},
      {
        collapsed: true,
      },
    ).addTo(leafletMap);
    leafletMap.on("baselayerchange", () => refreshLeafletMapSize(leafletMap));

    leafletRouteLayer = window.L.layerGroup().addTo(leafletMap);
    syncMapLayerButtons();

    return leafletMap;
  }

  function setLeafletBaseLayer(layerKey) {
    const map = ensureLeafletMap();
    if (!map || !leafletStreetLayer || !leafletSatelliteLayer) {
      return;
    }

    const nextLayer = layerKey === "satellite" ? "satellite" : "street";
    const activeLayer = nextLayer === "satellite" ? leafletSatelliteLayer : leafletStreetLayer;
    const inactiveLayer = nextLayer === "satellite" ? leafletStreetLayer : leafletSatelliteLayer;
    if (map.hasLayer(inactiveLayer)) {
      map.removeLayer(inactiveLayer);
    }
    if (!map.hasLayer(activeLayer)) {
      activeLayer.addTo(map);
    }
    if (leafletRouteLayer && !map.hasLayer(leafletRouteLayer)) {
      leafletRouteLayer.addTo(map);
    }
    activeLeafletLayer = nextLayer;
    syncMapLayerButtons();
    refreshLeafletMapSize(map);
  }

  function refreshLeafletMapSize(map) {
    if (!map || typeof map.invalidateSize !== "function") {
      return;
    }

    window.requestAnimationFrame(() => {
      map.invalidateSize(false);
      window.setTimeout(() => map.invalidateSize(false), 90);
    });
  }

  function renderStatusPill(element, groupOrStage) {
    if (!element) {
      return;
    }

    const statusMeta = typeof groupOrStage === "string"
      ? getStatusMeta(groupOrStage)
      : groupOrStage?.statusMeta || getStatusMeta("toPrepare");
    element.className = `status-pill tracking-status-pill tracking-status-pill--${statusMeta.tone}`;
    element.textContent = statusMeta.label;
  }

  function getFilteredGroups() {
    const searchTerm = normalizeSearchText(state.searchTerm);
    return state.groups.filter((group) => {
      const statusMatch = state.activeFilter === "all" || group.statusMeta.filter === state.activeFilter;
      const searchMatch = !searchTerm || group.searchBlob.includes(searchTerm);
      return statusMatch && searchMatch;
    });
  }

  function getSelectedGroup(groups = state.groups) {
    return groups.find((group) => group.key === state.selectedGroupKey) || groups[0] || null;
  }

  function syncSelectedGroup(filteredGroups) {
    if (!filteredGroups.length) {
      state.selectedGroupKey = "";
      return null;
    }

    const currentGroup = filteredGroups.find((group) => group.key === state.selectedGroupKey);
    if (currentGroup) {
      return currentGroup;
    }

    const routeGroup = filteredGroups.find((group) => group.stage === "toReceive");
    state.selectedGroupKey = (routeGroup || filteredGroups[0]).key;
    return routeGroup || filteredGroups[0];
  }

  function renderSummary() {
    const activeCount = state.groups.filter((group) =>
      ["toPay", "toPrepare", "toShip", "toReceive"].includes(group.stage),
    ).length;
    const routeCount = state.groups.filter((group) => group.stage === "toReceive").length;
    const deliveredCount = state.groups.filter((group) => group.stage === "toReview").length;

    setText(summaryActiveEl, activeCount);
    setText(summaryRouteEl, routeCount);
    setText(summaryDeliveredEl, deliveredCount);
  }

  function renderFilterButtons() {
    filterButtons.forEach((button) => {
      const isActive = button.dataset.trackingFilter === state.activeFilter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function renderOrderList(filteredGroups) {
    if (!orderListEl) {
      return;
    }

    orderListEl.replaceChildren();
    setText(orderCountEl, formatOrderCount(filteredGroups.length));

    if (!filteredGroups.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = state.groups.length ? "No matching shipments." : "No shipments available.";
      orderListEl.appendChild(emptyState);
      return;
    }

    filteredGroups.forEach((group) => {
      const button = document.createElement("button");
      const isActive = group.key === state.selectedGroupKey;
      const itemCountLabel = `${group.quantity} item${group.quantity === 1 ? "" : "s"}`;
      button.type = "button";
      button.className = `tracking-order-item${isActive ? " is-active" : ""}`;
      button.dataset.trackingGroupKey = group.key;
      button.innerHTML = `
        <span class="tracking-order-item__topline">
          <strong>${escapeHtml(group.displayId)}</strong>
          <span class="tracking-order-item__status tracking-status-pill tracking-status-pill--${group.statusMeta.tone}">
            ${escapeHtml(group.statusMeta.label)}
          </span>
        </span>
        <span class="tracking-order-item__customer">${escapeHtml(group.customerName)}</span>
        <span class="tracking-order-item__meta">
          ${escapeHtml(group.courier)} · ${escapeHtml(itemCountLabel)}
        </span>
        <span class="tracking-order-item__address">${escapeHtml(group.address || group.destination.name)}</span>
      `;
      orderListEl.appendChild(button);
    });
  }

  function renderEmptyMap(message) {
    if (!mapSvg) {
      return;
    }

    mapSvg.innerHTML = `
      <defs>
        <pattern id="tracking-empty-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="rgba(82,96,122,0.18)" stroke-width="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="18" fill="url(#tracking-empty-grid)" />
      <circle cx="${MAP_WIDTH / 2}" cy="${MAP_HEIGHT / 2 - 26}" r="46" fill="rgba(37,99,235,0.12)" />
      <path d="M493 246c0-17 14-31 31-31s31 14 31 31c0 26-31 62-31 62s-31-36-31-62Z" fill="rgba(37,99,235,0.68)" />
      <circle cx="524" cy="246" r="10" fill="#ffffff" />
      <text x="${MAP_WIDTH / 2}" y="${MAP_HEIGHT / 2 + 70}" text-anchor="middle" fill="#52607a" font-size="22" font-weight="600">${escapeHtml(message)}</text>
    `;
  }

  function renderSvgMap(group) {
    if (!mapSvg) {
      return;
    }

    if (!group) {
      renderEmptyMap("No route selected");
      setText(mapKickerEl, "Route");
      setText(mapTitleEl, "Map");
      renderStatusPill(mapStatusEl, "toPrepare");
      setText(mapOriginEl, WAREHOUSE_LOCATION.name);
      setText(mapDestinationEl, "Destination");
      return;
    }

    const routeGeoPoints = createGeoRoute(
      WAREHOUSE_LOCATION,
      group.destination,
      `${group.key}-${group.address}`,
    );
    const bounds = createBounds(routeGeoPoints);
    const routePoints = routeGeoPoints.map((point) => projectPoint(point, bounds));
    const routePath = buildPathData(routePoints);
    const progress = Math.round(group.statusMeta.progress * 100);
    const markerPoint = getPointAtProgress(routePoints, group.statusMeta.progress);
    const originPoint = routePoints[0];
    const destinationPoint = routePoints[routePoints.length - 1];
    const seed = hashString(`${group.key}-${group.destination.name}`);
    const roadOffset = (seed % 90) - 45;
    const destinationLabel = group.destination.name || "Destination";
    const mapSignature = `${group.key}-${group.stage}-${Math.round(markerPoint.x)}-${Math.round(markerPoint.y)}`;

    if (mapSignature === state.lastMapSignature) {
      return;
    }
    state.lastMapSignature = mapSignature;

    mapSvg.innerHTML = `
      <defs>
        <linearGradient id="tracking-map-water" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="58%" stop-color="#eef6f4" />
          <stop offset="100%" stop-color="#f1f5f9" />
        </linearGradient>
        <linearGradient id="tracking-route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgb(var(--accent-rgb))" />
          <stop offset="100%" stop-color="#16a34a" />
        </linearGradient>
        <filter id="tracking-soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="rgba(15,23,42,0.24)" />
        </filter>
      </defs>
      <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="18" fill="url(#tracking-map-water)" />
      <path d="M-40 ${120 + roadOffset} C220 ${80 - roadOffset} 360 ${220 + roadOffset} 620 ${170 - roadOffset} S880 ${250 + roadOffset} 1040 ${205 - roadOffset}" class="tracking-map__road tracking-map__road--major" />
      <path d="M${130 + roadOffset} -30 C${210 - roadOffset} 130 ${170 + roadOffset} 330 ${270 - roadOffset} 590" class="tracking-map__road" />
      <path d="M${780 - roadOffset} -20 C${670 + roadOffset} 170 ${820 - roadOffset} 350 ${700 + roadOffset} 590" class="tracking-map__road" />
      <path d="M-20 ${360 - roadOffset} C180 ${410 + roadOffset} 370 ${330 - roadOffset} 565 ${390 + roadOffset} S820 ${470 - roadOffset} 1020 ${420 + roadOffset}" class="tracking-map__road" />
      <path d="${routePath}" class="tracking-map__route-base" />
      <path d="${routePath}" pathLength="100" class="tracking-map__route-progress" stroke-dasharray="${Math.max(progress, 1)} 100" />
      ${routePoints.slice(1, -1).map((point, index) => `
        <circle cx="${point.x}" cy="${point.y}" r="${index === 1 ? 5 : 4}" class="tracking-map__waypoint" />
      `).join("")}
      <g class="tracking-map__pin tracking-map__pin--origin" transform="translate(${originPoint.x} ${originPoint.y})">
        <circle r="18" />
        <path d="M-7 4h14v9h-14zM-10 4 0-7 10 4" />
      </g>
      <g class="tracking-map__pin tracking-map__pin--destination" transform="translate(${destinationPoint.x} ${destinationPoint.y})">
        <path d="M0-26c13 0 23 10 23 23 0 18-23 43-23 43S-23 15-23-3c0-13 10-23 23-23Z" />
        <circle r="7" />
      </g>
      <g class="tracking-map__courier" transform="translate(${markerPoint.x} ${markerPoint.y})" filter="url(#tracking-soft-shadow)">
        <circle r="22" />
        <path d="M-12 1h16l4 5h8v8h-5a5 5 0 0 1-10 0h-8a5 5 0 0 1-10 0h-4V5c0-2 1-4 4-4h5Z" />
        <circle cx="-11" cy="14" r="2.9" />
        <circle cx="6" cy="14" r="2.9" />
      </g>
      <g class="tracking-map__label" transform="translate(${Math.min(MAP_WIDTH - 270, Math.max(24, originPoint.x + 24))} ${Math.min(MAP_HEIGHT - 72, Math.max(38, originPoint.y - 54))})">
        <rect width="190" height="42" rx="8" />
        <text x="14" y="27">${escapeHtml(WAREHOUSE_LOCATION.name)}</text>
      </g>
      <g class="tracking-map__label" transform="translate(${Math.min(MAP_WIDTH - 280, Math.max(24, destinationPoint.x - 72))} ${Math.min(MAP_HEIGHT - 58, Math.max(48, destinationPoint.y + 34))})">
        <rect width="220" height="42" rx="8" />
        <text x="14" y="27">${escapeHtml(destinationLabel)}</text>
      </g>
    `;

    setText(mapKickerEl, group.courier || "Route");
    setText(mapTitleEl, group.displayId);
    renderStatusPill(mapStatusEl, group);
    setText(mapOriginEl, WAREHOUSE_LOCATION.name);
    setText(mapDestinationEl, destinationLabel);
  }

  function renderLeafletMap(group) {
    if (leafletMapEl) {
      leafletMapEl.hidden = false;
      void leafletMapEl.offsetWidth;
    }
    if (mapSvg) {
      mapSvg.hidden = true;
    }

    const map = ensureLeafletMap();
    if (!map || !leafletRouteLayer || !leafletMapEl) {
      return false;
    }

    leafletRouteLayer.clearLayers();

    if (!group) {
      window.L.circleMarker([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng], {
        radius: 10,
        color: getCssAccentColor(),
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 4,
      })
        .bindPopup(WAREHOUSE_LOCATION.name)
        .addTo(leafletRouteLayer);
      map.setView([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng], 10);
      setText(mapKickerEl, "OpenStreetMap");
      setText(mapTitleEl, "Map");
      renderStatusPill(mapStatusEl, "toPrepare");
      setText(mapOriginEl, WAREHOUSE_LOCATION.name);
      setText(mapDestinationEl, "Destination");
      setText(mapCardTitleEl, "Shipment route");
      setText(mapCardCopyEl, "Select an order to preview delivery.");
      refreshLeafletMapSize(map);
      return true;
    }

    const routeGeoPoints = createGeoRoute(
      WAREHOUSE_LOCATION,
      group.destination,
      `${group.key}-${group.address}`,
    );
    const routeLatLngs = routeGeoPoints.map((point) => [point.lat, point.lng]);
    const progressGeoPoints = getProgressGeoRoute(routeGeoPoints, group.statusMeta.progress);
    const progressLatLngs = progressGeoPoints.map((point) => [point.lat, point.lng]);
    const courierPoint = getGeoPointAtProgress(routeGeoPoints, group.statusMeta.progress);

    window.L.polyline(routeLatLngs, {
      color: "#5f6368",
      weight: 8,
      opacity: 0.22,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(leafletRouteLayer);

    window.L.polyline(progressLatLngs, {
      color: "#1a73e8",
      weight: 6,
      opacity: 0.96,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(leafletRouteLayer);

    const hubIcon = window.L.divIcon({
      className: "tracking-leaflet-pin tracking-leaflet-pin--hub",
      html: "<span>H</span>",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const destinationIcon = window.L.divIcon({
      className: "tracking-leaflet-pin tracking-leaflet-pin--destination",
      html: "<span></span>",
      iconSize: [34, 42],
      iconAnchor: [17, 38],
    });
    const courierIcon = window.L.divIcon({
      className: "tracking-leaflet-courier",
      html: "<span></span>",
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    window.L.marker([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng], { icon: hubIcon })
      .bindPopup(WAREHOUSE_LOCATION.name)
      .addTo(leafletRouteLayer);
    window.L.marker([group.destination.lat, group.destination.lng], { icon: destinationIcon })
      .bindPopup(group.destination.name || "Destination")
      .addTo(leafletRouteLayer);
    window.L.marker([courierPoint.lat, courierPoint.lng], { icon: courierIcon })
      .bindPopup(`${group.displayId} | ${group.statusMeta.label}`)
      .addTo(leafletRouteLayer);

    const bounds = window.L.latLngBounds(routeLatLngs);
    map.fitBounds(bounds, {
      padding: [34, 34],
      maxZoom: 12,
      animate: false,
    });

    setText(mapKickerEl, `${group.courier || "Route"} | OpenStreetMap`);
    setText(mapTitleEl, group.displayId);
    renderStatusPill(mapStatusEl, group);
    setText(mapOriginEl, WAREHOUSE_LOCATION.name);
    setText(mapDestinationEl, group.destination.name || "Destination");
    setText(mapCardTitleEl, `${group.displayId} to ${group.destination.name || "Destination"}`);
    setText(mapCardCopyEl, `${group.statusMeta.label} | ${group.courier || "Unassigned courier"}`);
    refreshLeafletMapSize(map);
    return true;
  }

  function renderMap(group) {
    if (renderGoogleMap(group)) {
      return;
    }

    if (renderLeafletMap(group)) {
      return;
    }

    if (googleMapIframe) {
      googleMapIframe.hidden = true;
    }
    if (leafletMapEl) {
      leafletMapEl.hidden = true;
    }
    if (mapSvg) {
      mapSvg.hidden = false;
    }
    renderSvgMap(group);
  }

  function renderDetails(group) {
    if (!group) {
      renderStatusPill(detailStatusEl, "toPrepare");
      setText(detailOrderEl, "-");
      setText(detailCourierEl, "-");
      setText(detailCustomerEl, "-");
      setText(detailAddressEl, "-");
      setText(detailItemsEl, "-");
      if (timelineEl) {
        timelineEl.innerHTML = "";
      }
      return;
    }

    const itemNames = group.products.slice(0, 2).join(", ");
    const overflowCount = group.products.length - 2;
    const itemLabel = [
      `${group.quantity} item${group.quantity === 1 ? "" : "s"}`,
      itemNames,
      overflowCount > 0 ? `+${overflowCount} more` : "",
    ].filter(Boolean).join(" | ");

    renderStatusPill(detailStatusEl, group);
    setText(detailOrderEl, `${group.displayId} | ${formatDateTime(group.createdAt)}`);
    setText(detailCourierEl, group.courier || "Unassigned");
    setText(detailCustomerEl, group.customerName || "Unknown customer");
    setText(detailAddressEl, group.address || group.destination.name);
    setText(detailItemsEl, `${itemLabel} | ${moneyFormatter.format(group.amount || 0)}`);

    if (!timelineEl) {
      return;
    }

    const currentRank = group.statusMeta.rank;
    timelineEl.innerHTML = TIMELINE_STEPS.map((step) => {
      const stepMeta = getStatusMeta(step.key);
      const isComplete = currentRank > stepMeta.rank || group.stage === "toReview";
      const isActive = normalizeStage(group.stage) === step.key;
      const className = [
        "tracking-timeline__step",
        isComplete ? "is-complete" : "",
        isActive ? "is-active" : "",
      ].filter(Boolean).join(" ");

      return `
        <div class="${className}">
          <span class="tracking-timeline__dot" aria-hidden="true"></span>
          <span class="tracking-timeline__content">
            <strong>${escapeHtml(step.label)}</strong>
            <small>${escapeHtml(stepMeta.label)}</small>
          </span>
        </div>
      `;
    }).join("");
  }

  function render() {
    const filteredGroups = getFilteredGroups();
    const selectedGroup = syncSelectedGroup(filteredGroups);

    renderSummary();
    renderFilterButtons();
    renderOrderList(filteredGroups);
    renderMap(selectedGroup);
    renderDetails(selectedGroup);
  }

  async function loadOrders() {
    if (state.isLoading) {
      return;
    }

    state.isLoading = true;
    refreshButton?.setAttribute("aria-busy", "true");

    try {
      const response = await fetch("/api/orders", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Unable to load orders.");
      }

      const rawOrders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : [];
      state.groups = groupOrders(rawOrders);
      state.lastMapSignature = "";
      if (!state.selectedGroupKey || !state.groups.some((group) => group.key === state.selectedGroupKey)) {
        const initialGroup = state.groups.find((group) => group.stage === "toReceive") || state.groups[0];
        state.selectedGroupKey = initialGroup?.key || "";
      }
    } catch (error) {
      if (!state.groups.length && orderListEl) {
        orderListEl.innerHTML = '<div class="empty-state">Unable to load shipments.</div>';
      }
      void error;
    } finally {
      state.isLoading = false;
      refreshButton?.removeAttribute("aria-busy");
      render();
    }
  }

  orderListEl?.addEventListener("click", function (event) {
    const item = event.target.closest("[data-tracking-group-key]");
    if (!item) {
      return;
    }

    state.selectedGroupKey = item.dataset.trackingGroupKey || "";
    state.lastMapSignature = "";
    render();
  });

  searchInput?.addEventListener("input", function () {
    window.clearTimeout(trackingSearchTimer);
    trackingSearchTimer = window.setTimeout(() => {
      state.searchTerm = searchInput.value || "";
      state.lastMapSignature = "";
      render();
    }, 500);
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const nextFilter = button.dataset.trackingFilter || "all";
      if (state.activeFilter === nextFilter) {
        return;
      }

      state.activeFilter = nextFilter;
      state.lastMapSignature = "";
      render();
    });
  });

  mapLayerButtons.forEach((button) => {
    button.addEventListener("click", function () {
      setLeafletBaseLayer(button.dataset.trackingMapLayer || "street");
    });
  });

  refreshButton?.addEventListener("click", function () {
    loadOrders();
  });

  renderEmptyMap("Loading route");
  loadOrders();
  window.setInterval(loadOrders, REFRESH_INTERVAL_MS);
})();

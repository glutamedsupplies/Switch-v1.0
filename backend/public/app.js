//node.js For app
const form = document.getElementById("product-form");
const productList = document.getElementById("product-list");
const productListFocusSurface = productList?.closest(".dashboard-content") ?? null;
const productSearchInput = document.getElementById("product-search-input");
const productCategoryFilterDropdown = document.getElementById("product-category-filter");
const productCategoryFilterTrigger = document.getElementById("product-category-filter-trigger");
const productCategoryFilterSummary = document.getElementById("product-category-filter-summary");
const productCategoryFilterMenu = document.getElementById("product-category-filter-menu");
const productStatusFilterDropdown = document.getElementById("product-status-filter");
const productStatusFilterTrigger = document.getElementById("product-status-filter-trigger");
const productStatusFilterSummary = document.getElementById("product-status-filter-summary");
const productStatusFilterMenu = document.getElementById("product-status-filter-menu");
const productCount = document.getElementById("product-count");
const productListingFooter = document.querySelector("[data-product-listing-footer]");
const productListingPageMeta = document.querySelector("[data-product-listing-page-meta]");
const productListingPagination = document.querySelector("[data-product-listing-pagination]");
const productListingSquarePenIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>';
const productListingFlashDealZapIconMarkup = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap" aria-hidden="true"><path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z"/></svg>';
const productListingSummaryValues = {
  total: document.querySelector("[data-product-listing-total]"),
  active: document.querySelector("[data-product-listing-active]"),
  inactive: document.querySelector("[data-product-listing-inactive]"),
  review: document.querySelector("[data-product-listing-review]"),
  revision: document.querySelector("[data-product-listing-revision]"),
  restricted: document.querySelector("[data-product-listing-restricted]"),
};
const helperText = document.getElementById("helper-text");
const statusPill = document.getElementById("status-pill");
const serverStatusPill = document.getElementById("server-status-pill");
const refreshButton = document.getElementById("refresh-button");
const submitButton = document.getElementById("submit-button");
const backToProductsButton = document.getElementById("back-to-products-button");
const formSectionLabel = document.getElementById("form-section-label");
const formTitle = document.getElementById("form-title");
const categorySelect = form?.elements?.category ?? null;
const productExpiryDatePicker = document.getElementById("product-expiry-date-picker");
const productExpiryDateInput = document.getElementById("product-expiry-date-input") ?? form?.elements?.expiryDate ?? null;
const productExpiryDateTrigger = document.getElementById("product-expiry-date-trigger");
const productExpiryDateValue = document.querySelector("[data-product-expiry-date-value]");
const selectedCategoryChips = document.getElementById("selected-category-chips");
const selectedCategoryCarousel = document.getElementById("selected-category-carousel");
const selectedCategoryCarouselButtons = Array.from(
  document.querySelectorAll("[data-product-category-scroll]"),
);
const categoryMultiSelect = document.getElementById("product-category-multiselect");
const categoryTriggerButton = document.getElementById("product-category-trigger");
const categorySummary = document.getElementById("product-category-summary");
const categoryMenu = document.getElementById("product-category-menu");
const addImageInputButton = document.getElementById("add-image-input-button");
const productPhotoMediaPanel = document.getElementById("product-photo-media");
const productPhotoFileInput = document.getElementById("product-photo-file-input");
const addVideoInputButton = document.getElementById("add-video-input-button");
const productVideoMediaPanel = document.getElementById("product-video-media");
const productVideoFileInput = document.getElementById("product-video-file-input");
const productImageInputList = document.getElementById("product-image-input-list");
const productPhotoCarousel = document.getElementById("product-photo-carousel");
const productPhotoUploaderLoading = document.getElementById("product-photo-uploader-loading");
const productPhotoCarouselButtons = Array.from(
  document.querySelectorAll("[data-product-photo-scroll]"),
);
const productPhotoCount = document.querySelector("[data-product-photo-count]");
const productVideoInputList = document.getElementById("product-video-input-list");
const productVideoCarousel = document.getElementById("product-video-carousel");
const productVideoCarouselButtons = Array.from(
  document.querySelectorAll("[data-product-video-scroll]"),
);
const productVideoCount = document.querySelector("[data-product-video-count]");
const productDescriptionImageList = document.getElementById("product-description-image-list");
const productDescriptionImageCarousel = document.getElementById("product-description-image-carousel");
const productDescriptionImageCarouselButtons = Array.from(
  document.querySelectorAll("[data-description-image-scroll]"),
);
const productDescriptionImageInput = document.getElementById("product-description-image-input");
const productDescriptionImageCount = document.querySelector("[data-description-image-count]");
const productDescriptionUploadSnackbar = document.querySelector("[data-description-upload-snackbar]");
const productDescriptionUploadSnackbarMessage = document.querySelector(
  "[data-description-upload-snackbar-message]",
);
const productDescriptionUploadSnackbarClose = document.querySelector(
  "[data-description-upload-snackbar-close]",
);
const productDescriptionEditor = document.querySelector("[data-product-description-editor]");
const productDescriptionUploadNote = document.getElementById("product-description-upload-note");
const productDescriptionModeButtons = Array.from(
  document.querySelectorAll("[data-product-description-mode]"),
);
const productDescriptionModePanels = Array.from(
  document.querySelectorAll("[data-product-description-panel]"),
);
const productDescriptionTextarea = form?.elements?.description ?? null;
const productNameCharacterCount = document.querySelector(
  "[data-product-name-character-count]",
);
const productDescriptionCharacterCount = document.querySelector(
  "[data-product-description-character-count]",
);
const addVariantButton = document.getElementById("add-variant-button");
const productVariantList = document.getElementById("product-variant-list");
const barcodeInput = form?.querySelector("[name='barcode']") ?? null;
const barcodePreviewContainer = document.getElementById("barcode-preview-container");
const barcodeScanPrompt = document.getElementById("barcode-scan-prompt");
const barcodePackingCheckbox = document.querySelector(".barcode-packing-checkbox");
const barcodePackingCheckboxInput = form?.elements?.moveBarcodeToPackingDashboard ?? null;
const productDetailsBarcodeToggle = document.getElementById("product-details-barcode-toggle");
const productDetailsBarcodeModal = document.getElementById("product-details-barcode-modal");
const productDetailsBarcodeModalCloseButtons = Array.from(
  document.querySelectorAll("[data-product-barcode-modal-dismiss]"),
);
const productDetailsBarcodeModalReset = document.getElementById("product-barcode-modal-reset");
const productDetailsBarcodeModalSave = document.getElementById("product-barcode-modal-save");
const productBarcodeScanFocusButton = document.getElementById("product-barcode-scan-focus");
const productDetailsBarcodeThumbnail = document.getElementById("product-details-barcode-thumbnail");
const productDetailsBarcodeThumbnailImage = document.getElementById(
  "product-details-barcode-thumbnail-image",
);
const productDetailsModelToggle = document.getElementById("product-details-model-toggle");
const productDetailsModelModal = document.getElementById("product-details-model-modal");
const productDetailsModelModalCloseButtons = Array.from(
  document.querySelectorAll("[data-product-model-modal-dismiss]"),
);
const productDetailsVariantsToggle = document.getElementById("product-details-variants-toggle");
const productDetailsVariantsModal = document.getElementById("product-details-variants-modal");
const productDetailsVariantsModalCloseButtons = Array.from(
  document.querySelectorAll("[data-product-variants-modal-dismiss]"),
);
const productDetailsDeliveryToggle = document.getElementById("product-details-delivery-toggle");
const productDetailsDeliveryModal = document.getElementById("product-details-delivery-modal");
const productDetailsDeliveryModalCloseButtons = Array.from(
  document.querySelectorAll("[data-product-delivery-modal-dismiss]"),
);
const productDetailsPaymentToggle = document.getElementById("product-details-payment-toggle");
const productDetailsPaymentModal = document.getElementById("product-details-payment-modal");
const productDetailsPaymentModalCloseButtons = Array.from(
  document.querySelectorAll("[data-product-payment-modal-dismiss]"),
);
const visualSearchPreviewContainer = document.getElementById("visual-search-preview-container");
const productModelViewer = document.getElementById("product-model-viewer");
const productModelCube = document.getElementById("product-model-cube");
const productModelStatus = document.getElementById("product-model-status");
const productModelScanButton = document.getElementById("product-model-scan-button");
const productModelUploadButton = document.getElementById("product-model-upload-button");
const productModelRemoveButton = document.getElementById("product-model-remove-button");
const productModelFileInput = document.getElementById("product-model-file-input");
const productComposerModal = document.getElementById("product-composer-modal");
const productFormPanel = document.querySelector(".product-panel-grid__form");
const productComposerCloseButton = document.getElementById("close-product-composer-button");
const productComposerOpenButton = document.getElementById("open-product-composer-button");
const productComposerDismissButton = document.getElementById("dismiss-product-composer-button");
const productComposerSubtitle = document.querySelector(".product-composer-modal__subtitle");
const productComposerBrandIcon = document.querySelector(".product-composer-modal__brand-icon");
const dashboardSidebar = document.getElementById("product-dashboard-sidebar");
const dashboardLayout = document.querySelector(".dashboard-layout");
const dashboardShell = document.querySelector(".dashboard-shell--panel-nav");
const dashboardSidebarToggleButton = document.querySelector("[data-dashboard-sidebar-toggle]");
const dashboardSidebarBackdrop = document.querySelector("[data-dashboard-sidebar-backdrop]");
const dashboardSidebarNavItems = Array.from(document.querySelectorAll("#product-dashboard-sidebar .dashboard-nav__item"),);
const androidPreviewStage = document.getElementById("android-preview-stage");
const androidPreviewThemeButtons = Array.from(document.querySelectorAll("[data-android-preview-theme]"),);
const productEditorSectionCarouselButtons = Array.from(document.querySelectorAll("[data-product-editor-section-target]"),);
const defaultProductEditorSectionId = "product-editor-section-photo";
let productComposerCloseTimer = 0;
let listingDraftFab = null;
let listingDraftAutoSaveTimer = 0;
let listingDraftPersistPromise = null;
let listingDraftDb = null;
let listingDraftDbPromise = null;
let isApplyingListingDraft = false;
let productPhotoCarouselControlFrame = 0;
let productImageReorderAnimationFrame = 0;
let productImageReorderAnimationElements = [];
let productVideoCarouselControlFrame = 0;
let selectedCategoryCarouselControlFrame = 0;
let productDescriptionCarouselControlFrame = 0;
let productDescriptionUploadSnackbarTimer = 0;
let productEditorSnackbarTimer = 0;
let productEditorSnackbarElements = null;
const PRODUCT_SNACKBAR_AUTO_DISMISS_MS = 15000;
let imageEnhancementAvailability = null;
let imageEnhancementAvailabilityPromise = null;
const productEditorMediaSection = document.getElementById("product-editor-section-media");
const productEditorPhotoSection = document.getElementById("product-editor-section-photo");
const productEditorVideoSection = document.getElementById("product-editor-section-video");
const productEditorDetailsSection = document.getElementById("product-editor-section-details");
const productEditorServicesSection = document.getElementById("product-editor-section-services");
const productEditorImageSearchSection = document.getElementById("product-editor-section-image-search");
const productEditorModelSection = document.getElementById("product-editor-section-3d-model");
const productEditorVariantsSection = document.getElementById("product-editor-section-variants");
const DEFAULT_CARD_IMAGE_POSITION_X = 50;
const DEFAULT_CARD_IMAGE_POSITION = 50;
const isStandaloneProductEditorPage = document.body?.dataset?.productEditorPage === "standalone";
const ANDROID_PREVIEW_THEME_LIGHT = "light";
const ANDROID_PREVIEW_THEME_DARK = "dark";
const PRODUCT_PANEL_SUCCESS_FLASH_KEY = "gms-product-panel-success-flash";
const PRODUCT_ILLEGAL_CONTENT_ERROR_CODE = "PRODUCT_ILLEGAL_CONTENT_AUTO_REJECTED";
const PRODUCT_VALIDATION_LOTTIE_PLAYER_URL = "/vendor/lottie.min.js";
const PRODUCT_VALIDATION_SUCCESS_ANIMATION_PATH = "/animations/employee-account-check.json";
const PRODUCT_PARTNER_CHECK_ANIMATION_PATH = "/animations/check-mark.json";
const PRODUCT_VALIDATION_SUCCESS_ANIMATION_MS = 1500;
const PRODUCT_VALIDATION_SUCCESS_HOLD_MS = 500;
const PRODUCT_DELETE_SUCCESS_AUDIO_URL = "/audio/delete-success.m4a";
const PRODUCT_VALIDATION_SUCCESS_ICON_MARKUP = '<div class="product-validation-lottie-check" data-product-validation-lottie-check></div>';
const PRODUCT_STATUS_MOBILE_NAV_CLASS = "product-status-mobile-nav-open";
const PRODUCT_STATUS_MOBILE_NAV_BREAKPOINT = "(max-width: 860px)";
const PRODUCT_NAME_MAX_LENGTH = 150;
const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;
const PRODUCT_PRICE_MAX = 500_000;
const PRODUCT_IMAGE_MAX_COUNT = 10;
const PRODUCT_IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT = 8;
const PRODUCT_DESCRIPTION_IMAGE_MIN_DIMENSION = 600;
const PRODUCT_IMAGE_ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const PRODUCT_IMAGE_ACCEPTED_FILE_PATTERN = /\.(?:jpe?g|png|webp)$/i;
const PRODUCT_DESCRIPTION_IMAGE_ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const PRODUCT_DESCRIPTION_IMAGE_ACCEPTED_FILE_PATTERN = /\.(?:jpe?g|png)$/i;
const PRODUCT_VIDEO_MAX_FILE_SIZE = 100 * 1024 * 1024;
const PRODUCT_VIDEO_MAX_COUNT = 1;
/** Listing video card: square width, height = square + 1/4 → width/height = 4/5. */
const PRODUCT_VIDEO_CARD_ASPECT_RATIO = 4 / 5;

/*
 * LISTING DRAFT FEATURE — temporarily disabled (not ready yet).
 * Set LISTING_DRAFT_FEATURE_ENABLED to true to re-enable auto-save, FAB, and draft restore.
 */
const LISTING_DRAFT_FEATURE_ENABLED = false;

const LISTING_DRAFT_STORAGE_KEY = "gms-listing-add-draft-v1";
const LISTING_DRAFT_DB_NAME = "gms-listing-draft-db";
const LISTING_DRAFT_DB_VERSION = 1;
const LISTING_DRAFT_MEDIA_STORE = "media";
const LISTING_DRAFT_AUTOSAVE_MS = 600;
const PRODUCT_COMPOSER_CLOSE_ANIMATION_MS = 220;
const PRODUCT_VIDEO_ACCEPTED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-quicktime",
  "video/webm",
]);
const PRODUCT_VIDEO_ACCEPTED_FILE_PATTERN = /\.(?:mp4|mov|webm)$/i;
const PRODUCT_PHOTO_COVER_ICON_MARKUP = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="256"
    height="256"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-house-icon lucide-house"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </svg>
`;
const PRODUCT_PHOTO_REMOVE_ICON_MARKUP = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="256"
    height="256"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-x-icon lucide-x"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
`;
const PRODUCT_PHOTO_VIEW_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
`;
const PRODUCT_PHOTO_ENHANCE_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
    <path d="m14 7 3 3" />
    <path d="M5 6v4" />
    <path d="M19 14v4" />
    <path d="M10 2v2" />
    <path d="M7 8H3" />
    <path d="M21 16h-4" />
    <path d="M11 3H9" />
  </svg>
`;
const PRODUCT_PHOTO_CROP_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
`;
const PRODUCT_PHOTO_REPLACE_ICON_MARKUP = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
`;
const PRODUCT_MEDIA_DROPZONE_ICON_MARKUP = `
  <span class="product-photo-dropzone__icon" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      <path d="M12 13v8" />
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="m8 17 4-4 4 4" />
    </svg>
  </span>
`;

function getProductMediaDropzoneMarkup({ title, isProcessing = false } = {}) {
  if (isProcessing) {
    return `
      ${PRODUCT_MEDIA_DROPZONE_ICON_MARKUP}
      <strong>Checking...</strong>
    `;
  }

  return `
    ${PRODUCT_MEDIA_DROPZONE_ICON_MARKUP}
    <strong>${title}</strong>
    <span class="product-photo-dropzone__or">or</span>
    <span class="product-photo-dropzone__browse">Browse Files</span>
  `;
}
const VISUAL_SEARCH_TFJS_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const VISUAL_SEARCH_COCO_SSD_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
const VISUAL_SEARCH_DETECTION_MIN_SCORE = 0.42;
const VISUAL_SEARCH_DETECTION_CENTER_MIN_SCORE = 0.3;
const VISUAL_SEARCH_DETECTION_CENTER_DISTANCE_LIMIT = 0.28;
const VISUAL_SEARCH_DETECTION_INTERVAL_MS = 700;
const VISUAL_SEARCH_DETECTION_MAX_AGE_MS = 1800;
const VISUAL_SEARCH_CAPTURE_PADDING_RATIO = 0.14;
const VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE = "front";
const VISUAL_SEARCH_IMAGE_ANGLE_SLOTS = Object.freeze([
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "up", label: "Up" },
  { key: "down", label: "Down" },
]);
const VISUAL_SEARCH_OTHER_IMAGE_PREFIX = "other";
const productStatusFilterOptions = Object.freeze([
  { value: "all", label: "Total Listing" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "review", label: "In Review" },
  { value: "revision", label: "In Revision" },
  { value: "restricted", label: "Restricted" },
]);
const PRODUCT_LISTING_PAGE_SIZE = 10;

function readProductPanelSessionStorageJson(key) {
  try {
    return JSON.parse(window.sessionStorage?.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function normalizeProductPanelAdminTenantId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function isUsableProductPanelAdminTenantId(value) {
  const normalizedValue = normalizeProductPanelAdminTenantId(value, "");
  return Boolean(normalizedValue) && normalizedValue !== "admin";
}

function resolveProductPanelAdminTenantIdFromSession(session, fallback = "") {
  if (!session || typeof session !== "object") {
    return fallback;
  }

  return [
    session.adminId,
    session.ownerAdminId,
    session.tenantId,
    session.workspaceId,
    session.storeAdminId,
    session.sellerId,
    session.shopId,
    session.id,
    session.accountCode,
    session.userId,
    session.email,
  ]
    .map((value) => normalizeProductPanelAdminTenantId(value, ""))
    .find(isUsableProductPanelAdminTenantId) || fallback;
}

function getStoredProductPanelAdminTenantId() {
  try {
    return normalizeProductPanelAdminTenantId(window.localStorage?.getItem("gms-admin-id"), "");
  } catch (error) {
    return "";
  }
}

function getActiveProductPanelAdminTenantId() {
  const employeeSession = readProductPanelSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveProductPanelAdminTenantIdFromSession(employeeSession, "");
  if (isUsableProductPanelAdminTenantId(employeeAdminId)) {
    return employeeAdminId;
  }

  const adminSession = readProductPanelSessionStorageJson("gms-admin-session");
  const adminId = resolveProductPanelAdminTenantIdFromSession(adminSession, "");
  if (isUsableProductPanelAdminTenantId(adminId)) {
    return adminId;
  }

  const storedAdminId = getStoredProductPanelAdminTenantId();
  return isUsableProductPanelAdminTenantId(storedAdminId) ? storedAdminId : "";
}

function getActiveProductPanelAdminSessionToken() {
  const employeeSession = readProductPanelSessionStorageJson("gms-employee-session");
  const employeeAdminId = resolveProductPanelAdminTenantIdFromSession(employeeSession, "");
  if (isUsableProductPanelAdminTenantId(employeeAdminId)) {
    return String(employeeSession?.sessionToken || "").trim();
  }

  const adminSession = readProductPanelSessionStorageJson("gms-admin-session");
  const adminId = resolveProductPanelAdminTenantIdFromSession(adminSession, "");
  return isUsableProductPanelAdminTenantId(adminId)
    ? String(adminSession?.sessionToken || "").trim()
    : "";
}

function requireActiveProductPanelAdminTenantId() {
  const adminId = getActiveProductPanelAdminTenantId();
  if (!adminId) {
    throw new Error("Unable to identify the logged-in account. Please sign in again.");
  }
  return adminId;
}

function withProductPanelAdminScopeHeaders(headers = {}) {
  const adminId = requireActiveProductPanelAdminTenantId();
  const sessionToken = getActiveProductPanelAdminSessionToken();
  const scopedHeaders = {
    ...headers,
    "X-GMS-Admin-ID": adminId,
  };
  if (sessionToken) {
    scopedHeaders["X-GMS-Admin-Session"] = sessionToken;
  }
  return scopedHeaders;
}

function getFlashDealForProduct(productId) {
  const id = String(productId ?? "").trim();
  if (!id) return null;
  return flashDealsByProductId.get(id) || null;
}

function flashDealStatusLabel(deal) {
  const display = String(deal?.displayStatus || deal?.status || "")
    .trim()
    .toLowerCase();
  if (display === "pending") return "Pending";
  if (display === "upcoming") return "Upcoming";
  if (display === "live") return "Live";
  if (display === "ended") return "Ended";
  if (display === "cancelled") return "Cancelled";
  if (display === "rejected") return "Rejected";
  return "";
}

function flashDealStatusToneClass(deal) {
  const display = String(deal?.displayStatus || deal?.status || "")
    .trim()
    .toLowerCase();
  if (display === "pending") return "is-pending";
  if (display === "upcoming") return "is-upcoming";
  if (display === "live") return "is-live";
  if (display === "ended" || display === "cancelled" || display === "rejected") {
    return "is-ended";
  }
  return "";
}

async function refreshSellerFlashDealsCache() {
  try {
    const response = await fetch("/api/admin/flash-deals", {
      cache: "no-store",
      credentials: "same-origin",
      headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json().catch(() => ({}));
    const deals = Array.isArray(data.deals) ? data.deals : [];
    const nextMap = new Map();
    for (const deal of deals) {
      const productId = String(deal?.productId || "").trim();
      if (!productId) continue;
      const display = String(deal?.displayStatus || deal?.status || "")
        .trim()
        .toLowerCase();
      if (
        display === "ended" ||
        display === "cancelled" ||
        display === "rejected"
      ) {
        // Keep ended tags briefly if nothing newer; prefer active/pending.
        if (!nextMap.has(productId)) {
          nextMap.set(productId, deal);
        }
        continue;
      }
      nextMap.set(productId, deal);
    }
    flashDealsByProductId = nextMap;
  } catch (_) {
    // Listing still works without flash deal badges.
  }
}

function withProductPanelAdminScopePayload(payload = {}) {
  const adminId = requireActiveProductPanelAdminTenantId();
  return {
    ...payload,
    adminId,
  };
}

function getProductPanelSessionProfileImageUrl(session) {
  return [
    session?.profileImageUrl,
    session?.avatarUrl,
    session?.photoUrl,
    session?.profilePhotoUrl,
    session?.employeePhotoUrl,
    session?.pictureUrl,
    session?.imageUrl,
    session?.logoUrl,
  ]
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";
}

function getProductPanelStoredLoginLogoUrl() {
  try {
    return String(window.localStorage?.getItem("gms-login-logo") || "").trim();
  } catch (error) {
    return "";
  }
}

function hasProductPanelAdminSession() {
  const adminSession = readProductPanelSessionStorageJson("gms-admin-session");
  return Boolean(adminSession && typeof adminSession === "object");
}

function isProductPanelEmployeeSession(session) {
  if (!session || typeof session !== "object") {
    return false;
  }

  const role = String(session.role ?? "").trim().toLowerCase();
  const accountId = String(
    session.employeeId ??
      session.accountCode ??
      session.id ??
      session.email ??
      "",
  ).trim();
  const position = String(session.position ?? "").trim();
  const accessPermissions = Array.isArray(session.accessPermissions)
    ? session.accessPermissions
        .map((permission) => String(permission ?? "").trim().toLowerCase())
        .filter(Boolean)
    : [];

  return Boolean(role === "employee" || accountId || position || accessPermissions.length);
}

function getProductPanelEmployeeAccessPermissions(session) {
  return Array.isArray(session?.accessPermissions)
    ? session.accessPermissions
        .map((permission) => String(permission ?? "").trim().toLowerCase())
        .filter(Boolean)
    : [];
}

function getProductPanelPermissionForPath(pathname = window.location.pathname) {
  const normalizedPath = String(pathname || "").trim().toLowerCase();
  if (/^\/(?:product_panel|edit_products)\.html$/i.test(normalizedPath)) {
    return "products";
  }

  return "";
}

function hasProductPanelEmployeeAccessForCurrentPage() {
  const employeeSession = readProductPanelSessionStorageJson("gms-employee-session");
  if (!isProductPanelEmployeeSession(employeeSession)) {
    return false;
  }

  const accessPermissions = getProductPanelEmployeeAccessPermissions(employeeSession);
  const hasConfiguredAccess =
    employeeSession.accessPermissionsConfigured || accessPermissions.length > 0;
  const pagePermission = getProductPanelPermissionForPath();
  return Boolean(hasConfiguredAccess && pagePermission && accessPermissions.includes(pagePermission));
}

function isProductPanelEmployeeWorkspacePage() {
  const searchParams = new URLSearchParams(window.location.search);
  const explicitRole = String(searchParams.get("role") ?? searchParams.get("workspace") ?? "").trim().toLowerCase();
  if (explicitRole === "employee") {
    return true;
  }

  if (document.querySelector("script[data-employee-access-guard]")) {
    return true;
  }

  if (hasProductPanelEmployeeAccessForCurrentPage()) {
    return true;
  }

  if (
    document.querySelector(
      [
        ".dashboard-nav[aria-label='Employee navigation']",
        ".dashboard-sidebar__logo[href='/employee_dashboard.html']",
        ".product-panel-toolbar__profile[data-employee-workspace-profile='true']",
      ].join(", "),
    )
  ) {
    return true;
  }

  const normalizedPath = String(window.location.pathname || "").trim().toLowerCase();
  const isProductEditorPath = /^\/(?:product_panel|edit_products)\.html$/i.test(normalizedPath);
  if (!isProductEditorPath || hasProductPanelAdminSession()) {
    return false;
  }

  const referrer = String(document.referrer || "").trim().toLowerCase();
  return /\/(?:employee_dashboard|face_verfication|employee_stock|live_chat|employee_order_insight)\.html(?:[?#]|$)/i.test(
    referrer,
  );
}

function getProductPanelEmployeeActivityActor(employeeSession) {
  const displayName = String(
    [employeeSession.firstName, employeeSession.lastName].filter(Boolean).join(" ") ||
      employeeSession.displayName ||
      employeeSession.fullName ||
      "",
  ).replace(/\s+/g, " ").trim();

  return {
    role: "employee",
    accountId: String(
      employeeSession.employeeId ??
        employeeSession.accountCode ??
        employeeSession.id ??
        employeeSession.email ??
        "",
    ).trim(),
    displayName: displayName || "Employee",
    profileImageUrl: getProductPanelSessionProfileImageUrl(employeeSession),
  };
}

function getProductPanelAdminActivityActor(adminSession) {
  return {
    role: "admin",
    accountId: String(adminSession?.email ?? "admin").trim(),
    displayName: "Admin",
    profileImageUrl: getProductPanelSessionProfileImageUrl(adminSession) || getProductPanelStoredLoginLogoUrl(),
  };
}

function getProductPanelActivityActor() {
  const employeeSession = readProductPanelSessionStorageJson("gms-employee-session");
  if (isProductPanelEmployeeSession(employeeSession) && isProductPanelEmployeeWorkspacePage()) {
    return getProductPanelEmployeeActivityActor(employeeSession);
  }

  return getProductPanelAdminActivityActor(
    readProductPanelSessionStorageJson("gms-admin-session"),
  );
}
const PRODUCT_MODEL_SUPPORTED_EXTENSIONS = Object.freeze([".glb"]);
const PRODUCT_MODEL_VIEWER_SCRIPT_URL =
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
const PRODUCT_MODEL_UNITY_VIEWER_URL = "/unity/product-viewer/index.html";
const PRODUCT_MODEL_SCAN_STEPS = Object.freeze([
  { key: "front", label: "Front" },
  { key: "right", label: "Right side" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left side" },
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
]);
const VISUAL_SEARCH_NON_PRODUCT_DETECTION_CLASSES = new Set([
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "clock",
]);
const visualSearchDetectorScriptPromises = new Map();

let editingProductId = null;
let isProductFormSubmitting = false;
let editingListingActiveSourceBatch = "";
let productEditBaselineSnapshot = "";
let selectedProductCategories = [];
let draggedSelectedCategoryIndex = -1;
let editingImageUrls = [""];
let selectedMainImageSlot = 0;
let editingCardImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
let editingCardImagePosition = DEFAULT_CARD_IMAGE_POSITION;
let previewCardCroppedImageUrl = "";
let previewCardCropSourceUrl = "";
let editingBuyModalImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
let editingBuyModalImagePositionY = DEFAULT_CARD_IMAGE_POSITION;
let editingVisualSearchImageUrl = "";
let editingVisualSearchImageAngles = createVisualSearchImageSlotMap();
let pendingVisualSearchImageFile = null;
let pendingVisualSearchImageFiles = createVisualSearchImageSlotMap(null);
let visualSearchPreviewObjectUrl = "";
let visualSearchPreviewObjectUrls = createVisualSearchImageSlotMap();
let editingProductModelUrl = "";
let pendingProductModelFile = null;
let pendingProductModelObjectUrl = "";
let editingProductModelScanImageUrls = [];
let pendingProductModelScanFiles = [];
let pendingProductModelScanObjectUrls = [];
let productModelScanOverlay = null;
let productModelScanEscapeHandler = null;
let productModelScanCarouselTimer = null;
let productModelScanStream = null;
let productModelScanPreviewStage = null;
let productModelScanPreviewStatus = null;
let productModelScanFramePreviewCleanup = null;
let productModelViewerScriptPromise = null;
let productModelRotationX = -18;
let productModelRotationY = 34;
let visualSearchCameraStream = null;
let visualSearchCameraOverlay = null;
let visualSearchCameraEscapeHandler = null;
let visualSearchDetectionSessionId = 0;
let visualSearchDetectorModel = null;
let visualSearchDetectorModelPromise = null;
let previewBuyModalCroppedImageUrl = "";
let previewBuyModalCropSourceUrl = "";
let previewDetailsCropStates = new Map();
let previewDetailsCropEntriesBySourceUrl = new Map();
let pendingImageFiles = [null];
let imagePreviewObjectUrls = [""];
let productPhotoCropSourceUrls = [""];
let productPhotoCropStates = [null];
let editingDescriptionImageUrls = [];
let pendingDescriptionImageFiles = [];
let descriptionImagePreviewObjectUrls = [];
let productDescriptionMode = "text";
let draggedDescriptionImageIndex = -1;
let suppressDescriptionImageClick = false;
let isDescriptionImageProcessing = false;
const processingProductImageSlotIndexes = new Set();
let productImageProcessingSessionId = 0;
let draggedProductImageSlotIndex = -1;
let draggedProductVideoSlotIndex = -1;
let draggedProductVariantIndex = -1;
let quickAddProductImageInput = null;
let editingVideoUrls = [];
let pendingVideoFiles = [];
let pendingVideoUploadTasks = [];
let videoPreviewObjectUrls = [];
let editingVideoThumbnailUrls = [];
let pendingVideoThumbnailFiles = [];
let videoThumbnailPreviewObjectUrls = [];
let productVideoCropSourceUrls = [];
let productVideoCropStates = [];
let quickAddProductVideoInput = null;
let editingVariants = [];
let nextEditableVariantEditorKey = 0;
let previewDetailsActiveImageIndex = null;
let previewDetailsImageStateKey = "";
let availableCategories = [];
let currentProducts = [];
/** @type {Map<string, object>} productId → latest blocking/public flash deal */
let flashDealsByProductId = new Map();
let currentDeliveryPartners = [];
let currentPaymentPartners = [];
let selectedDeliveryPartnerIds = [];
let selectedPaymentPartnerIds = [];
const prototypeActiveDeliveryPartners = [
  { id: "delivery-partner-lalamove-1781749191099", branch: "Lalamove", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/lalamove_logo-1781749191095.webp" },
  { id: "delivery-partner-lbc-1778678330793", branch: "LBC", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/lbc_logo-1778678330789.png" },
  { id: "delivery-partner-jnt-express-1778676186685", branch: "JnT Express", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/jnt_logo-1778676186681.jpg" },
];
const prototypeActivePaymentPartners = [
  { id: "payment-partner-gcash-1781943945556", branch: "Gcash", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/gcash_logo-1781943945544.webp" },
  { id: "payment-partner-china-bank-1780738792157", branch: "China Bank", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/images-1780738792153.webp" },
  { id: "payment-partner-bdo-1778680546489", branch: "BDO", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/bdo_logo-1778680546485.jpg" },
  { id: "payment-partner-pay-maya-1778680467297", branch: "Pay Maya", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/maya_logo-1778680467289.png" },
  { id: "payment-partner-bpi-1778680363204", branch: "BPI", status: "active", enabled: true, isActive: true, imageUrl: "/uploads/bpi_logo-1778680363195.jpg" },
];
let openProductPartnerDropdownType = "";
const collapsedProductPartnerTypes = new Set();
const initialProductEditorSearchParams = new URLSearchParams(window.location.search);
let requestedEditProductId = initialProductEditorSearchParams.get("edit") ?? "";
let shouldRevealRequestedProductComposer =
  initialProductEditorSearchParams.get("composer") === "add";
let requestedProductListFocusId =
  initialProductEditorSearchParams.get("product") ??
  initialProductEditorSearchParams.get("focusProduct") ??
  "";
let requestedProductEditorFocusToken = normalizeProductEditorFocusToken(
  initialProductEditorSearchParams.get("focus"),
);
let requestedProductEditorFocusVariantId = String(
  initialProductEditorSearchParams.get("variantId") ?? "",
).trim();
let requestedProductEditorFocusVariantName = String(
  initialProductEditorSearchParams.get("variant") ?? "",
).trim();
let requestedProductEditorFocusSectionId = normalizeProductEditorFocusSectionId(
  requestedProductEditorFocusToken,
);
let shouldAnimateProductEditorFocus =
  initialProductEditorSearchParams.get("notificationFocus") === "1";
let productEditorFocusAnimationTimer = 0;
let productListFocusAnimationTimer = 0;
let productListFocusSpotlightFrame = 0;
let descriptionModalElements = null;
let descriptionModalCloseTimer = 0;
let descriptionModalOpenFrame = 0;
let descriptionModalTrigger = null;
let productGalleryModalElements = null;
let productValidationModalElements = null;
let productValidationSuccessAnimation = null;
let productValidationLottieLoadPromise = null;
let productValidationAutoCloseTimer = 0;
let productDeleteSuccessAudio = null;
let androidPreviewThemeMode = ANDROID_PREVIEW_THEME_LIGHT;
let shouldBypassUpdateAddOnNotice = false;
let shouldBypassListingStockDeductReason = false;
let listingStockDeductReasonDraft = null;
let listingStockDeductReasonModalElements = null;
let productSearchTerm = "";
let productSearchTimer = 0;
let productCategoryFilter = "";
let productStatusFilter = "all";
let productListingPage = 1;
let productRealtimeRefreshTimer = 0;
let productRealtimeRefreshInFlight = false;
let productRealtimeRefreshQueued = false;
const pendingProductRealtimeTopics = new Set();
const productRealtimeTopics = new Set([
  "all",
  "products",
  "product-requests",
  "inventory",
  "orders",
  "categories",
  "store-types",
  "delivery-partners",
  "payment-partners",
]);
let categorySearchTerm = "";
let categorySearchTimer = 0;
let productExpiryDateCalendar = null;
let productExpiryDateViewMonth = null;
let productExpiryDatePositionFrame = 0;
let pendingBarcodeScanValue = "";
let isValidatingBarcode = false;
let hasLoadedProductsForBarcodeValidation = false;
let isBlockingBarcodeScan = false;
let productBarcodeModalOpeningSnapshot = null;
let productValidationModalIgnoreEnterUntil = 0;

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const visibleValidationModal = document.querySelector(".validation-modal-overlay:not([hidden])");
  if (!visibleValidationModal) {
    return;
  }

  const shouldBlockScannerEnter =
    isBlockingBarcodeScan || Date.now() < productValidationModalIgnoreEnterUntil;
  if (shouldBlockScannerEnter) {
    event.preventDefault();
    event.stopImmediatePropagation();
    isBlockingBarcodeScan = false;
  }
}, true);

function syncModalOpenClass() {
  const hasVisibleDescriptionModal = Boolean(
    document.querySelector(
      ".product-description-modal-overlay:not([hidden]), .seller-listing-detail-drawer-overlay:not([hidden])",
    ),
  );
  const hasVisibleProductGalleryModal = Boolean(
    document.querySelector(".product-gallery-modal-overlay:not([hidden])"),
  );
  const hasVisibleValidationModal = Boolean(
    document.querySelector(".validation-modal-overlay:not([hidden])"),
  );
  const hasVisibleProductComposer = Boolean(productComposerModal && !productComposerModal.hidden);
  document.body.classList.toggle(
    "modal-open",
    hasVisibleDescriptionModal
      || hasVisibleProductGalleryModal
      || hasVisibleValidationModal
      || hasVisibleProductComposer,
  );
}

function isEventWithinElement(event, element) {
  if (!(element instanceof HTMLElement) || !event) {
    return false;
  }

  if (typeof event.composedPath === "function") {
    const eventPath = event.composedPath();
    if (Array.isArray(eventPath) && eventPath.includes(element)) {
      return true;
    }
  }

  return event.target instanceof Node && element.contains(event.target);
}

function isProductStatusMobileNavViewport() {
  return typeof window.matchMedia === "function"
    && window.matchMedia(PRODUCT_STATUS_MOBILE_NAV_BREAKPOINT).matches;
}

function syncProductStatusMobileNavExpandedState(isExpanded) {
  if (!dashboardSidebarToggleButton) {
    return;
  }

  const navigationTooltipLabel = isExpanded ? "Close navigation" : "Open navigation";
  dashboardSidebarToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  dashboardSidebarToggleButton.setAttribute("aria-label", navigationTooltipLabel);
  dashboardSidebarToggleButton.setAttribute("data-ui-tooltip", navigationTooltipLabel);
  dashboardSidebarToggleButton.removeAttribute("title");
}

function setProductStatusMobileNavOpen(isOpen, options = {}) {
  if (!dashboardSidebar || !dashboardSidebarToggleButton) {
    return;
  }

  const { restoreFocus = false } = options;
  const shouldOpen = Boolean(isOpen) && isProductStatusMobileNavViewport();
  document.body.classList.toggle(PRODUCT_STATUS_MOBILE_NAV_CLASS, shouldOpen);
  syncProductStatusMobileNavExpandedState(shouldOpen);

  if (!shouldOpen && restoreFocus) {
    dashboardSidebarToggleButton.focus();
  }
}

function initializeProductStatusMobileNav() {
  if (!dashboardSidebar || !dashboardSidebarToggleButton || !dashboardSidebarBackdrop) {
    return;
  }

  syncProductStatusMobileNavExpandedState(false);

  dashboardSidebarToggleButton.addEventListener("click", () => {
    const isOpen = document.body.classList.contains(PRODUCT_STATUS_MOBILE_NAV_CLASS);
    setProductStatusMobileNavOpen(!isOpen);
  });

  dashboardSidebarBackdrop.addEventListener("click", () => {
    setProductStatusMobileNavOpen(false, { restoreFocus: true });
  });

  dashboardSidebarNavItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (!isProductStatusMobileNavViewport()) {
        return;
      }

      setProductStatusMobileNavOpen(false);
    });
  });

  window.addEventListener("resize", () => {
    if (isProductStatusMobileNavViewport()) {
      return;
    }

    setProductStatusMobileNavOpen(false);
  });
}

function normalizeAndroidPreviewThemeMode(mode) {
  return String(mode ?? "").trim().toLowerCase() === ANDROID_PREVIEW_THEME_DARK
    ? ANDROID_PREVIEW_THEME_DARK
    : ANDROID_PREVIEW_THEME_LIGHT;
}

function syncAndroidPreviewThemePresentation() {
  const normalizedThemeMode = normalizeAndroidPreviewThemeMode(androidPreviewThemeMode);

  if (androidPreviewStage) {
    androidPreviewStage.dataset.previewTheme = normalizedThemeMode;
  }

  if (!androidPreviewThemeButtons.length) {
    return;
  }

  androidPreviewThemeButtons.forEach((button) => {
    const buttonThemeMode = normalizeAndroidPreviewThemeMode(
      button?.dataset?.androidPreviewTheme,
    );
    const isActive = buttonThemeMode === normalizedThemeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setActiveProductEditorSection(sectionId = defaultProductEditorSectionId) {
  const normalizedSectionId = String(sectionId ?? "").trim() || defaultProductEditorSectionId;
  productEditorSectionCarouselButtons.forEach((button) => {
    const isActive =
      String(button?.dataset?.productEditorSectionTarget ?? "").trim() === normalizedSectionId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function usesProductComposerOverviewLayout() {
  return Boolean(
    productComposerModal?.querySelector(".product-composer-modal--workspace"),
  );
}

function resetProductComposerCanvasScroll() {
  const canvas = productComposerModal?.querySelector(".product-composer-canvas");
  if (!(canvas instanceof HTMLElement)) {
    return;
  }

  canvas.style.scrollBehavior = "auto";
  canvas.scrollTo(0, 0);
  window.requestAnimationFrame(() => {
    canvas.scrollTo(0, 0);
  });
  window.setTimeout(() => {
    canvas.scrollTo(0, 0);
    canvas.style.removeProperty("scroll-behavior");
  }, 360);
}

function syncProductDetailsHeaderToggleBadge(toggle, { count = 0, isDot = false } = {}) {
  if (!(toggle instanceof HTMLButtonElement)) {
    return;
  }

  const normalizedCount = Math.max(0, Number(count) || 0);
  const shouldShow = normalizedCount > 0;
  let badge = toggle.querySelector(".product-details-header-toggle-badge");

  if (!shouldShow) {
    badge?.remove();
    toggle.classList.remove("has-dot-badge", "has-count-badge");
    return;
  }

  if (!(badge instanceof HTMLElement)) {
    badge = document.createElement("span");
    badge.className = "product-details-header-toggle-badge";
    badge.setAttribute("aria-hidden", "true");
    toggle.appendChild(badge);
  }

  badge.classList.toggle("is-dot", isDot);
  badge.classList.toggle("is-count", !isDot);
  badge.textContent = isDot ? "" : (normalizedCount > 99 ? "99+" : String(normalizedCount));
  toggle.classList.toggle("has-dot-badge", isDot);
  toggle.classList.toggle("has-count-badge", !isDot);
}

function syncProductDetailsBarcodeToggleState() {
  if (!(productDetailsBarcodeToggle instanceof HTMLButtonElement)) {
    return;
  }

  const isOpen = productDetailsBarcodeModal instanceof HTMLElement
    && !productDetailsBarcodeModal.hidden;
  const hasBarcode = Boolean(String(barcodeInput?.value ?? "").trim());
  productDetailsBarcodeToggle.classList.toggle("is-open", isOpen);
  productDetailsBarcodeToggle.classList.toggle("has-barcode", hasBarcode);
  syncProductDetailsHeaderToggleBadge(productDetailsBarcodeToggle, {
    count: hasBarcode ? 1 : 0,
    isDot: true,
  });
  productDetailsBarcodeToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  productDetailsBarcodeToggle.setAttribute(
    "aria-label",
    isOpen
      ? "Close barcode modal"
      : hasBarcode
        ? "Open saved barcode"
        : "Open barcode scanner",
  );
  productDetailsBarcodeToggle.title = isOpen ? "Close barcode" : "Barcode";
}

function ensureProductDetailsBarcodeModalPlacement() {
  ensureProductDetailsHeaderDropdownPlacement(productDetailsBarcodeModal);
}

function syncProductDetailsBarcodeHeaderPreview(barcodeValue = "", imageUrl = "") {
  if (
    !(productDetailsBarcodeThumbnail instanceof HTMLElement)
    || !(productDetailsBarcodeThumbnailImage instanceof HTMLImageElement)
  ) {
    return;
  }

  const normalizedBarcode = String(barcodeValue ?? "").trim();
  const normalizedImageUrl = String(imageUrl ?? "").trim();
  const shouldShow = Boolean(normalizedBarcode && normalizedImageUrl);
  productDetailsBarcodeThumbnail.hidden = !shouldShow;

  if (!shouldShow) {
    productDetailsBarcodeThumbnailImage.removeAttribute("src");
    productDetailsBarcodeThumbnailImage.alt = "";
    return;
  }

  productDetailsBarcodeThumbnailImage.src = normalizedImageUrl;
  productDetailsBarcodeThumbnailImage.alt = `Barcode ${normalizedBarcode}`;
}

function getProductBarcodeModalSnapshot() {
  return {
    barcode: String(barcodeInput?.value ?? "").trim(),
    moveToPacking: Boolean(barcodePackingCheckboxInput?.checked),
  };
}

function syncProductBarcodeModalSaveState() {
  if (!(productDetailsBarcodeModalSave instanceof HTMLButtonElement)) {
    return;
  }

  const barcodeValue = String(barcodeInput?.value ?? "").trim();
  const hasBarcodeImage = Boolean(
    barcodePreviewContainer?.querySelector(".barcode-preview-image"),
  );
  const isRemovingSavedBarcode = Boolean(
    productBarcodeModalOpeningSnapshot?.barcode && !barcodeValue,
  );
  productDetailsBarcodeModalSave.disabled = Boolean(
    isValidatingBarcode || (!hasBarcodeImage && !isRemovingSavedBarcode),
  );
}

function getProductDetailsHeaderActionsEl() {
  return document.querySelector(".product-details-header-actions");
}

function getProductDetailsHeaderDropdownPanels() {
  return [
    productDetailsDeliveryModal,
    productDetailsPaymentModal,
    productDetailsVariantsModal,
    productDetailsBarcodeModal,
    productDetailsModelModal,
  ].filter((panel) => panel instanceof HTMLElement);
}

function getOpenProductDetailsHeaderDropdown() {
  return getProductDetailsHeaderDropdownPanels().find((panel) => !panel.hidden) ?? null;
}

function getProductDetailsHeaderDropdownWidth(panel) {
  if (panel === productDetailsVariantsModal) {
    return 460;
  }
  if (panel === productDetailsModelModal) {
    return 400;
  }
  if (panel === productDetailsDeliveryModal || panel === productDetailsPaymentModal) {
    return 380;
  }
  return 340;
}

function ensureProductDetailsHeaderDropdownPlacement(panel) {
  if (!(panel instanceof HTMLElement)) {
    return;
  }
  panel.classList.add("product-details-header-dropdown");
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
}

function getProductDetailsHeaderDropdownToggle(panel) {
  if (panel === productDetailsDeliveryModal) {
    return productDetailsDeliveryToggle;
  }
  if (panel === productDetailsPaymentModal) {
    return productDetailsPaymentToggle;
  }
  if (panel === productDetailsVariantsModal) {
    return productDetailsVariantsToggle;
  }
  if (panel === productDetailsBarcodeModal) {
    return productDetailsBarcodeToggle;
  }
  if (panel === productDetailsModelModal) {
    return productDetailsModelToggle;
  }
  return null;
}

function clearProductDetailsHeaderDropdownPosition(panel) {
  if (!(panel instanceof HTMLElement)) {
    return;
  }
  panel.style.removeProperty("position");
  panel.style.removeProperty("top");
  panel.style.removeProperty("left");
  panel.style.removeProperty("right");
  panel.style.removeProperty("bottom");
  panel.style.removeProperty("width");
  panel.style.removeProperty("z-index");
  panel.style.removeProperty("--product-details-header-dropdown-arrow-left");
  panel.classList.remove("is-above");
}

function positionProductDetailsHeaderDropdown(panel = getOpenProductDetailsHeaderDropdown()) {
  if (!(panel instanceof HTMLElement) || panel.hidden) {
    return;
  }

  ensureProductDetailsHeaderDropdownPlacement(panel);
  const actions = getProductDetailsHeaderActionsEl();
  if (!(actions instanceof HTMLElement)) {
    return;
  }

  const rect = actions.getBoundingClientRect();
  const toggle = getProductDetailsHeaderDropdownToggle(panel);
  const toggleRect =
    toggle instanceof HTMLElement ? toggle.getBoundingClientRect() : null;
  const gap = 10;
  const pad = 12;
  const width = Math.min(
    getProductDetailsHeaderDropdownWidth(panel),
    Math.max(240, window.innerWidth - pad * 2),
  );
  let left = Math.round(rect.right - width);
  left = Math.min(left, window.innerWidth - width - pad);
  left = Math.max(pad, left);
  let top = Math.round(rect.bottom + gap);

  let arrowLeft = width / 2;
  if (toggleRect) {
    arrowLeft = toggleRect.left + toggleRect.width / 2 - left;
  }
  arrowLeft = Math.min(Math.max(arrowLeft, 18), width - 18);

  panel.style.position = "fixed";
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.width = `${Math.round(width)}px`;
  panel.style.zIndex = "2400";
  panel.style.setProperty(
    "--product-details-header-dropdown-arrow-left",
    `${Math.round(arrowLeft)}px`,
  );
  panel.classList.remove("is-above");

  window.requestAnimationFrame(() => {
    if (panel.hidden) {
      return;
    }
    const dialog = panel.querySelector(".product-barcode-modal__dialog");
    const height = dialog instanceof HTMLElement
      ? dialog.getBoundingClientRect().height
      : panel.offsetHeight;
    if (top + height + pad > window.innerHeight) {
      const above = Math.round(rect.top - height - gap);
      if (above >= pad) {
        panel.style.top = `${above}px`;
        panel.classList.add("is-above");
      } else {
        panel.style.top = `${Math.max(pad, window.innerHeight - height - pad)}px`;
      }
    }
  });
}

function syncOpenVariantAddonPickerOverlay() {
  const openPicker = document.querySelector("[data-variant-addon-picker].is-open");
  if (!(openPicker instanceof HTMLElement)) {
    return;
  }
  const pickerKey = openPicker.getAttribute("data-variant-addon-picker");
  const panel =
    document.querySelector(
      `.product-variant-addon-picker__panel.is-portal-open[data-variant-addon-panel="${pickerKey}"]`,
    )
    || openPicker.querySelector(".product-variant-addon-picker__panel");
  const trigger = openPicker.querySelector(".product-variant-addon-picker__trigger");
  if (!(panel instanceof HTMLElement) || panel.hidden || !(trigger instanceof HTMLElement)) {
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();
  const width = Math.max(300, Math.round(triggerRect.width));
  const left = Math.min(
    Math.max(12, Math.round(triggerRect.left)),
    Math.max(12, window.innerWidth - width - 12),
  );
  const gap = 10;
  let top = Math.round(triggerRect.bottom + gap);
  let arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
  arrowLeft = Math.min(Math.max(arrowLeft, 18), width - 18);

  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  panel.classList.add("is-portal-open");
  panel.classList.remove("is-above");
  panel.style.position = "fixed";
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.width = `${width}px`;
  panel.style.height = "auto";
  panel.style.maxHeight = `${Math.min(420, window.innerHeight - 24)}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
  panel.style.zIndex = "2500";
  panel.style.setProperty(
    "--product-variant-addon-arrow-left",
    `${Math.round(arrowLeft)}px`,
  );

  window.requestAnimationFrame(() => {
    if (panel.hidden) {
      return;
    }
    const height = panel.getBoundingClientRect().height;
    if (top + height + 12 > window.innerHeight) {
      const above = Math.round(triggerRect.top - height - gap);
      if (above >= 12) {
        panel.style.top = `${above}px`;
        panel.classList.add("is-above");
      }
    }
  });
}

function syncProductDetailsHeaderDropdownPosition() {
  positionProductDetailsHeaderDropdown();
  syncOpenVariantAddonPickerOverlay();
}

function closeProductDetailsHeaderDropdownsFromOutside(event) {
  const openPanel = getOpenProductDetailsHeaderDropdown();
  if (!openPanel || !(event.target instanceof Node)) {
    return;
  }

  // Variant dropdown stays open until the X button is pressed.
  if (openPanel === productDetailsVariantsModal) {
    return;
  }

  const actions = getProductDetailsHeaderActionsEl();
  const openAddonPanel = document.querySelector(
    ".product-variant-addon-picker__panel.is-portal-open",
  );
  if (
    openPanel.contains(event.target)
    || actions?.contains(event.target)
    || (openAddonPanel instanceof HTMLElement && openAddonPanel.contains(event.target))
  ) {
    return;
  }

  closeProductDetailsUtilityModals();
}

function closeProductDetailsUtilityModals(except = "") {
  if (except !== "barcode") {
    setProductDetailsBarcodeModalOpen(false, {
      focusInput: false,
      skipOthers: true,
    });
  }
  if (except !== "model") {
    setProductDetailsModelModalOpen(false, { skipOthers: true });
  }
  if (except !== "variants") {
    setProductDetailsVariantsModalOpen(false, { skipOthers: true });
  }
  if (except !== "delivery") {
    setProductDetailsPartnerModalOpen("delivery", false, { skipOthers: true });
  }
  if (except !== "payment") {
    setProductDetailsPartnerModalOpen("payment", false, { skipOthers: true });
  }
}

function setProductDetailsBarcodeModalOpen(
  isOpen,
  { focusInput = true, restoreFocus = false, discardChanges = true, skipOthers = false } = {},
) {
  ensureProductDetailsBarcodeModalPlacement();
  if (!(productDetailsBarcodeModal instanceof HTMLElement)) {
    return;
  }

  const nextIsOpen = Boolean(isOpen);
  const wasOpen = !productDetailsBarcodeModal.hidden;
  if (nextIsOpen && !skipOthers) {
    closeProductDetailsUtilityModals("barcode");
  }
  if (nextIsOpen && !wasOpen) {
    productBarcodeModalOpeningSnapshot = getProductBarcodeModalSnapshot();
  }

  if (!nextIsOpen && wasOpen && discardChanges && productBarcodeModalOpeningSnapshot) {
    if (barcodeInput instanceof HTMLInputElement) {
      barcodeInput.value = productBarcodeModalOpeningSnapshot.barcode;
    }
    if (barcodePackingCheckboxInput instanceof HTMLInputElement) {
      barcodePackingCheckboxInput.checked = productBarcodeModalOpeningSnapshot.moveToPacking;
    }
    syncBarcodePreview();
    renderAndroidProductPreview();
    syncProductFormSubmitState();
  }
  if (!nextIsOpen) {
    productBarcodeModalOpeningSnapshot = null;
  }

  productDetailsBarcodeModal.hidden = !nextIsOpen;
  productDetailsBarcodeModal.classList.toggle("is-open", nextIsOpen);
  productDetailsBarcodeModal.setAttribute("aria-hidden", nextIsOpen ? "false" : "true");
  if (nextIsOpen) {
    positionProductDetailsHeaderDropdown(productDetailsBarcodeModal);
  } else {
    clearProductDetailsHeaderDropdownPosition(productDetailsBarcodeModal);
  }

  if (nextIsOpen) {
    syncBarcodePreview();
  } else if (document.activeElement === barcodeInput) {
    barcodeInput.blur();
  }
  syncProductDetailsBarcodeToggleState();
  syncProductBarcodeModalSaveState();
  syncBarcodeScanFocusState();

  if (nextIsOpen && focusInput && barcodeInput instanceof HTMLInputElement) {
    window.requestAnimationFrame(() => {
      barcodeInput.focus({ preventScroll: true });
    });
  } else if (!nextIsOpen && restoreFocus && productDetailsBarcodeToggle instanceof HTMLButtonElement) {
    productDetailsBarcodeToggle.focus({ preventScroll: true });
  }
}

function isBarcodeScannerFocused() {
  return Boolean(
    barcodeInput instanceof HTMLInputElement
    && document.activeElement === barcodeInput
  );
}

function syncBarcodeScanFocusState() {
  const isModalOpen = productDetailsBarcodeModal instanceof HTMLElement
    && !productDetailsBarcodeModal.hidden;
  const hasBarcode = Boolean(String(barcodeInput?.value ?? "").trim());
  const isFocused = isBarcodeScannerFocused();

  productBarcodeScanFocusButton?.classList.toggle("is-active", isModalOpen && isFocused && !hasBarcode);
  productBarcodeScanFocusButton?.classList.toggle("needs-focus", isModalOpen && !isFocused && !hasBarcode);

  if (!(barcodeScanPrompt instanceof HTMLElement)) {
    return;
  }

  if (!isModalOpen || hasBarcode) {
    barcodeScanPrompt.hidden = true;
    return;
  }

  barcodeScanPrompt.hidden = false;
  barcodeScanPrompt.textContent = isFocused
    ? "Scanner ready. Scan a barcode now."
    : "Click first to scan";
  barcodeScanPrompt.classList.toggle("is-ready", isFocused);
  barcodeScanPrompt.classList.toggle("needs-focus", !isFocused);
}

function syncProductDetailsModelToggleState() {
  if (!(productDetailsModelToggle instanceof HTMLButtonElement)) {
    return;
  }

  const isOpen = productDetailsModelModal instanceof HTMLElement
    && !productDetailsModelModal.hidden;
  const hasModel = Boolean(pendingProductModelFile || editingProductModelUrl);
  productDetailsModelToggle.classList.toggle("is-open", isOpen);
  productDetailsModelToggle.classList.toggle("has-model", hasModel);
  syncProductDetailsHeaderToggleBadge(productDetailsModelToggle, {
    count: hasModel ? 1 : 0,
    isDot: true,
  });
  productDetailsModelToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  productDetailsModelToggle.setAttribute(
    "aria-label",
    isOpen
      ? "Close 3D model"
      : hasModel
        ? "Open saved 3D model"
        : "Open 3D model",
  );
  productDetailsModelToggle.title = isOpen ? "Close 3D model" : "3D Model";
}

function ensureProductDetailsModelModalPlacement() {
  ensureProductDetailsHeaderDropdownPlacement(productDetailsModelModal);
}

function setProductDetailsModelModalOpen(isOpen, { restoreFocus = false, skipOthers = false } = {}) {
  ensureProductDetailsModelModalPlacement();
  if (!(productDetailsModelModal instanceof HTMLElement)) {
    return;
  }

  const nextIsOpen = Boolean(isOpen);
  if (nextIsOpen && !skipOthers) {
    closeProductDetailsUtilityModals("model");
  }

  productDetailsModelModal.hidden = !nextIsOpen;
  productDetailsModelModal.classList.toggle("is-open", nextIsOpen);
  productDetailsModelModal.setAttribute("aria-hidden", nextIsOpen ? "false" : "true");
  if (nextIsOpen) {
    positionProductDetailsHeaderDropdown(productDetailsModelModal);
  } else {
    clearProductDetailsHeaderDropdownPosition(productDetailsModelModal);
  }
  syncProductDetailsModelToggleState();

  if (nextIsOpen) {
    window.requestAnimationFrame(() => {
      productModelUploadButton?.focus({ preventScroll: true });
    });
  } else if (restoreFocus && productDetailsModelToggle instanceof HTMLButtonElement) {
    productDetailsModelToggle.focus({ preventScroll: true });
  }
}

function syncProductDetailsVariantsToggleState() {
  if (!(productDetailsVariantsToggle instanceof HTMLButtonElement)) {
    return;
  }

  const isOpen = productDetailsVariantsModal instanceof HTMLElement
    && !productDetailsVariantsModal.hidden;
  const variantCount = Array.isArray(editingVariants) ? editingVariants.length : 0;
  const hasVariants = variantCount > 0;
  productDetailsVariantsToggle.classList.toggle("is-open", isOpen);
  productDetailsVariantsToggle.classList.toggle("has-variants", hasVariants);
  syncProductDetailsHeaderToggleBadge(productDetailsVariantsToggle, {
    count: variantCount,
    isDot: false,
  });
  productDetailsVariantsToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  productDetailsVariantsToggle.setAttribute(
    "aria-label",
    isOpen
      ? "Close variants"
      : hasVariants
        ? "Open saved variants"
        : "Open variants",
  );
  productDetailsVariantsToggle.title = isOpen ? "Close variants" : "Variants";
}

function ensureProductDetailsVariantsModalPlacement() {
  ensureProductDetailsHeaderDropdownPlacement(productDetailsVariantsModal);
}

function setProductDetailsVariantsModalOpen(isOpen, { restoreFocus = false, skipOthers = false } = {}) {
  ensureProductDetailsVariantsModalPlacement();
  if (!(productDetailsVariantsModal instanceof HTMLElement)) {
    return;
  }

  const nextIsOpen = Boolean(isOpen);
  if (nextIsOpen && !skipOthers) {
    closeProductDetailsUtilityModals("variants");
  }

  productDetailsVariantsModal.hidden = !nextIsOpen;
  productDetailsVariantsModal.classList.toggle("is-open", nextIsOpen);
  productDetailsVariantsModal.setAttribute("aria-hidden", nextIsOpen ? "false" : "true");
  if (nextIsOpen) {
    positionProductDetailsHeaderDropdown(productDetailsVariantsModal);
  } else {
    clearProductDetailsHeaderDropdownPosition(productDetailsVariantsModal);
    document.querySelectorAll("[data-variant-addon-picker].is-open").forEach((picker) => {
      picker.classList.remove("is-open");
      const trigger = picker.querySelector(".product-variant-addon-picker__trigger");
      const pickerKey = picker.getAttribute("data-variant-addon-picker");
      const panel =
        picker.querySelector(".product-variant-addon-picker__panel")
        || document.querySelector(
          `.product-variant-addon-picker__panel[data-variant-addon-panel="${pickerKey}"]`,
        );
      if (trigger instanceof HTMLButtonElement) {
        trigger.setAttribute("aria-expanded", "false");
      }
      if (panel instanceof HTMLElement) {
        panel.hidden = true;
        panel.classList.remove("is-portal-open", "is-above");
        panel.style.removeProperty("position");
        panel.style.removeProperty("top");
        panel.style.removeProperty("left");
        panel.style.removeProperty("width");
        panel.style.removeProperty("height");
        panel.style.removeProperty("max-height");
        panel.style.removeProperty("right");
        panel.style.removeProperty("bottom");
        panel.style.removeProperty("z-index");
        panel.style.removeProperty("--product-variant-addon-arrow-left");
        if (panel.parentElement !== picker) {
          picker.appendChild(panel);
        }
      }
    });
    if (Array.isArray(editingVariants)) {
      editingVariants.forEach((variant) => {
        variant.isAddOnPickerOpen = false;
      });
    }
  }
  syncProductDetailsVariantsToggleState();

  if (nextIsOpen) {
    window.requestAnimationFrame(() => {
      addVariantButton?.focus({ preventScroll: true });
    });
  } else if (restoreFocus && productDetailsVariantsToggle instanceof HTMLButtonElement) {
    productDetailsVariantsToggle.focus({ preventScroll: true });
  }
}

function getProductDetailsPartnerModal(type) {
  return normalizeProductPartnerType(type) === "payment"
    ? productDetailsPaymentModal
    : productDetailsDeliveryModal;
}

function getProductDetailsPartnerToggle(type) {
  return normalizeProductPartnerType(type) === "payment"
    ? productDetailsPaymentToggle
    : productDetailsDeliveryToggle;
}

function syncProductDetailsPartnerToggleState(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const toggle = getProductDetailsPartnerToggle(normalizedType);
  const modal = getProductDetailsPartnerModal(normalizedType);
  if (!(toggle instanceof HTMLButtonElement)) {
    return;
  }

  const isOpen = modal instanceof HTMLElement && !modal.hidden;
  const selectedCount = getSelectedActiveProductPartnerIds(normalizedType).length;
  const hasSelection = selectedCount > 0;
  const label = normalizedType === "payment" ? "payment partners" : "delivery partners";
  toggle.classList.toggle("is-open", isOpen);
  toggle.classList.toggle("has-partners", hasSelection);
  syncProductDetailsHeaderToggleBadge(toggle, {
    count: selectedCount,
    isDot: false,
  });
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggle.setAttribute(
    "aria-label",
    isOpen ? `Close ${label}` : hasSelection ? `Open selected ${label}` : `Open ${label}`,
  );
  toggle.title = isOpen
    ? `Close ${normalizedType === "payment" ? "Payment Partners" : "Delivery Partners"}`
    : normalizedType === "payment"
      ? "Payment Partners"
      : "Delivery Partners";
}

function syncProductDetailsPartnerToggleStates() {
  syncProductDetailsPartnerToggleState("delivery");
  syncProductDetailsPartnerToggleState("payment");
}

function ensureProductDetailsPartnerModalPlacement(type) {
  ensureProductDetailsHeaderDropdownPlacement(getProductDetailsPartnerModal(type));
}

function setProductDetailsPartnerModalOpen(type, isOpen, { restoreFocus = false, skipOthers = false } = {}) {
  const normalizedType = normalizeProductPartnerType(type);
  const modal = getProductDetailsPartnerModal(normalizedType);
  const toggle = getProductDetailsPartnerToggle(normalizedType);
  ensureProductDetailsPartnerModalPlacement(normalizedType);
  if (!(modal instanceof HTMLElement)) {
    return;
  }

  const nextIsOpen = Boolean(isOpen);
  if (nextIsOpen && !skipOthers) {
    closeProductDetailsUtilityModals(normalizedType);
  }

  modal.hidden = !nextIsOpen;
  modal.classList.toggle("is-open", nextIsOpen);
  modal.setAttribute("aria-hidden", nextIsOpen ? "false" : "true");
  if (nextIsOpen) {
    positionProductDetailsHeaderDropdown(modal);
  } else {
    clearProductDetailsHeaderDropdownPosition(modal);
  }
  syncProductDetailsPartnerToggleState(normalizedType);

  if (nextIsOpen) {
    window.requestAnimationFrame(() => {
      const firstOption = modal.querySelector(".product-partner-selection__option, .product-partner-selection__empty");
      if (firstOption instanceof HTMLElement) {
        firstOption.focus?.({ preventScroll: true });
      }
    });
  } else if (restoreFocus && toggle instanceof HTMLButtonElement) {
    toggle.focus({ preventScroll: true });
  }
}

function saveProductBarcodeFromModal() {
  const barcodeValue = String(barcodeInput?.value ?? "").trim();
  const isRemovingSavedBarcode = Boolean(
    productBarcodeModalOpeningSnapshot?.barcode && !barcodeValue,
  );
  const hasBarcodeImage = Boolean(
    barcodePreviewContainer?.querySelector(".barcode-preview-image"),
  );
  if (isValidatingBarcode || (!hasBarcodeImage && !isRemovingSavedBarcode)) {
    barcodeInput?.focus({ preventScroll: true });
    return;
  }

  productBarcodeModalOpeningSnapshot = null;
  syncBarcodePreview();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  setHelperText(
    isRemovingSavedBarcode
      ? "Barcode removal saved. Save the product to apply the update."
      : "Barcode saved to this product. Save the product to apply the update.",
  );
  setStatus(isRemovingSavedBarcode ? "Barcode Removed" : "Barcode Saved", "success");
  setProductDetailsBarcodeModalOpen(false, {
    focusInput: false,
    restoreFocus: true,
    discardChanges: false,
  });
}

function resetProductBarcodeFromModal() {
  if (!(barcodeInput instanceof HTMLInputElement)) {
    return;
  }

  pendingBarcodeScanValue = "";
  isBlockingBarcodeScan = false;
  barcodeInput.value = "";
  if (barcodePackingCheckboxInput instanceof HTMLInputElement) {
    barcodePackingCheckboxInput.checked = false;
  }
  syncBarcodePreview();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  barcodeInput.focus({ preventScroll: true });
}

function syncProductEditorSectionVisibility(sectionId = defaultProductEditorSectionId) {
  const normalizedSectionId = String(sectionId ?? "").trim() || defaultProductEditorSectionId;
  const isPhotoSection = normalizedSectionId === "product-editor-section-photo";
  const isVideoSection = normalizedSectionId === "product-editor-section-video";
  const isDetailsSection = normalizedSectionId === "product-editor-section-details";
  const isServicesSection = normalizedSectionId === "product-editor-section-services";
  const isImageSearchSection = normalizedSectionId === "product-editor-section-image-search";
  const isModelSection = normalizedSectionId === "product-editor-section-3d-model";
  const isVariantsSection = normalizedSectionId === "product-editor-section-variants";

  if (usesProductComposerOverviewLayout()) {
    productEditorMediaSection?.classList.remove("is-nav-only");
    [
      productEditorPhotoSection,
      productEditorVideoSection,
      productEditorDetailsSection,
      productEditorServicesSection,
      productEditorImageSearchSection,
      productEditorModelSection,
      productEditorVariantsSection,
    ].forEach((section) => {
      if (section) {
        section.hidden = false;
      }
    });
    return;
  }

  productEditorMediaSection?.classList.toggle(
    "is-nav-only",
      !isPhotoSection &&
      !isVideoSection &&
      !isDetailsSection &&
      !isServicesSection &&
      !isImageSearchSection &&
      !isModelSection &&
      !isVariantsSection,
  );

  if (productEditorPhotoSection) {
    productEditorPhotoSection.hidden = !isPhotoSection;
  }
  if (productEditorVideoSection) {
    productEditorVideoSection.hidden = !isVideoSection;
  }
  if (productEditorDetailsSection) {
    productEditorDetailsSection.hidden = !isDetailsSection;
  }
  if (productEditorServicesSection) {
    productEditorServicesSection.hidden = usesProductPartnerHeaderModals()
      ? false
      : !isServicesSection;
  }
  if (productEditorImageSearchSection) {
    productEditorImageSearchSection.hidden = !isImageSearchSection;
  }
  if (productEditorModelSection) {
    productEditorModelSection.hidden = !isModelSection;
  }
  if (productEditorVariantsSection) {
    productEditorVariantsSection.hidden = !isVariantsSection;
  }
}

function getProductEditorSectionScrollTarget(sectionId = defaultProductEditorSectionId) {
  const normalizedSectionId = String(sectionId ?? "").trim() || defaultProductEditorSectionId;
  if (usesProductComposerOverviewLayout()) {
    return document.getElementById(normalizedSectionId);
  }
  if (
    normalizedSectionId === "product-editor-section-photo"
    || normalizedSectionId === "product-editor-section-video"
    || normalizedSectionId === "product-editor-section-details"
    || normalizedSectionId === "product-editor-section-services"
    || normalizedSectionId === "product-editor-section-image-search"
    || normalizedSectionId === "product-editor-section-3d-model"
    || normalizedSectionId === "product-editor-section-variants"
  ) {
    return productEditorMediaSection;
  }

  return document.getElementById(normalizedSectionId);
}

function revealProductEditorSection(
  sectionId = defaultProductEditorSectionId,
  options = {},
) {
  const requestedSectionId = String(sectionId ?? "").trim() || defaultProductEditorSectionId;
  const shouldRevealBarcode = requestedSectionId === "product-editor-section-barcode";
  const shouldRevealModel = requestedSectionId === "product-editor-section-3d-model"
    && productDetailsModelModal instanceof HTMLElement;
  const shouldRevealVariants = requestedSectionId === "product-editor-section-variants"
    && productDetailsVariantsModal instanceof HTMLElement;
  const shouldRevealDelivery = (
    requestedSectionId === "product-editor-section-services"
    || requestedSectionId === "product-editor-section-delivery"
  ) && productDetailsDeliveryModal instanceof HTMLElement;
  const shouldRevealPayment = requestedSectionId === "product-editor-section-payment"
    && productDetailsPaymentModal instanceof HTMLElement;
  const normalizedSectionId = shouldRevealBarcode
    || shouldRevealModel
    || shouldRevealVariants
    || shouldRevealDelivery
    || shouldRevealPayment
    ? "product-editor-section-details"
    : requestedSectionId;
  const { shouldScroll = true } = options;
  const targetSection = getProductEditorSectionScrollTarget(normalizedSectionId);
  syncProductEditorSectionVisibility(normalizedSectionId);
  setActiveProductEditorSection(normalizedSectionId);
  if (shouldRevealBarcode) {
    setProductDetailsBarcodeModalOpen(true);
  }
  if (shouldRevealModel) {
    setProductDetailsModelModalOpen(true);
  }
  if (shouldRevealVariants) {
    setProductDetailsVariantsModalOpen(true);
  }
  if (shouldRevealDelivery) {
    setProductDetailsPartnerModalOpen("delivery", true);
  }
  if (shouldRevealPayment) {
    setProductDetailsPartnerModalOpen("payment", true);
  }
  if (!shouldScroll) {
    return;
  }
  if (normalizedSectionId === "product-editor-section-image-search") {
    if (barcodeScanPrompt) {
      barcodeScanPrompt.hidden = true;
    }
    const firstVisualSearchButton =
      visualSearchPreviewContainer?.querySelector(
        ".visual-search-angle-card__button, .visual-search-angle-card__source-button, .visual-search-angle-card__icon-button",
      ) ?? null;
    if (firstVisualSearchButton && typeof firstVisualSearchButton.focus === "function") {
      firstVisualSearchButton.focus({ preventScroll: true });
    }
  } else if (normalizedSectionId === "product-editor-section-3d-model") {
    if (barcodeScanPrompt) {
      barcodeScanPrompt.hidden = true;
    }
    if (productModelUploadButton && typeof productModelUploadButton.focus === "function") {
      productModelUploadButton.focus({ preventScroll: true });
    }
  } else if (barcodeScanPrompt) {
    barcodeScanPrompt.hidden = true;
  }

  if (!targetSection || typeof targetSection.scrollIntoView !== "function") {
    return;
  }

  if (usesProductComposerOverviewLayout()) {
    const canvas = targetSection.closest(".product-composer-canvas");
    if (canvas instanceof HTMLElement) {
      const targetTop =
        targetSection.getBoundingClientRect().top
        - canvas.getBoundingClientRect().top
        + canvas.scrollTop
        - 14;
      canvas.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }
    return;
  }

  targetSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
}

function normalizeProductEditorFocusSectionId(value = "") {
  const normalizedValue = normalizeProductEditorFocusToken(value);
  const sectionByFocusToken = {
    photo: "product-editor-section-photo",
    image: "product-editor-section-photo",
    "main-image": "product-editor-section-photo",
    "main-product-image": "product-editor-section-photo",
    media: "product-editor-section-photo",
    display: "product-editor-section-photo",
    video: "product-editor-section-video",
    "video-thumbnail": "product-editor-section-video",
    details: "product-editor-section-details",
    detail: "product-editor-section-details",
    name: "product-editor-section-details",
    "product-name": "product-editor-section-details",
    category: "product-editor-section-details",
    price: "product-editor-section-details",
    "original-price": "product-editor-section-details",
    "sale-price": "product-editor-section-details",
    "sales-price": "product-editor-section-details",
    stock: "product-editor-section-details",
    description: "product-editor-section-details",
    visibility: "product-editor-section-details",
    active: "product-editor-section-details",
    services: "product-editor-section-delivery",
    service: "product-editor-section-delivery",
    delivery: "product-editor-section-delivery",
    "delivery-partner": "product-editor-section-delivery",
    "delivery-partners": "product-editor-section-delivery",
    payment: "product-editor-section-payment",
    "payment-method": "product-editor-section-payment",
    "payment-methods": "product-editor-section-payment",
    "payment-partners": "product-editor-section-payment",
    variants: "product-editor-section-variants",
    variant: "product-editor-section-variants",
    "variant-name": "product-editor-section-variants",
    "variant-price": "product-editor-section-variants",
    "variant-photo": "product-editor-section-variants",
    "variant-stock": "product-editor-section-variants",
    "variant-addons": "product-editor-section-variants",
    barcode: "product-editor-section-details",
    "image-search": "product-editor-section-image-search",
    "visual-search": "product-editor-section-image-search",
    model: "product-editor-section-3d-model",
    "3d-model": "product-editor-section-3d-model",
  };

  return sectionByFocusToken[normalizedValue] || "";
}

function normalizeProductEditorFocusToken(value = "") {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeProductEditorVariantLocator(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function getRequestedProductEditorVariantIndex() {
  const normalizedVariantId = normalizeProductEditorVariantLocator(
    requestedProductEditorFocusVariantId,
  );
  const normalizedVariantName = normalizeProductEditorVariantLocator(
    requestedProductEditorFocusVariantName,
  );

  if (normalizedVariantId) {
    const variantIdIndex = editingVariants.findIndex(
      (variant) => normalizeProductEditorVariantLocator(variant?.id) === normalizedVariantId,
    );
    if (variantIdIndex >= 0) {
      return variantIdIndex;
    }
  }

  if (normalizedVariantName) {
    const variantNameIndex = editingVariants.findIndex(
      (variant) => normalizeProductEditorVariantLocator(variant?.name) === normalizedVariantName,
    );
    if (variantNameIndex >= 0) {
      return variantNameIndex;
    }
  }

  return editingVariants.length ? 0 : -1;
}

function getProductEditorVariantFocusTarget(focusToken = "variant") {
  if (!productVariantList) {
    return null;
  }

  const variantIndex = getRequestedProductEditorVariantIndex();
  if (variantIndex >= 0 && editingVariants[variantIndex] && !editingVariants[variantIndex].isExpanded) {
    editingVariants[variantIndex].isExpanded = true;
    renderProductVariants();
  }

  const variantRow =
    variantIndex >= 0
      ? productVariantList.querySelector(`.product-variant-row[data-variant-index="${variantIndex}"]`)
      : productVariantList.querySelector(".product-variant-row");
  if (!(variantRow instanceof HTMLElement)) {
    return null;
  }

  const variantFieldSelectors = {
    "variant-name": '[data-variant-field="name"]',
    "variant-price": '[data-variant-field="salesPrice"], [data-variant-field="originalPrice"]',
    "variant-photo": '[data-variant-field="image"]',
    "variant-stock": '[data-variant-field="stock"]',
    "variant-addons": '[data-variant-field="addOns"]',
    variant: ".product-variant-row__toggle",
  };
  const variantSelector = variantFieldSelectors[focusToken] || ".product-variant-row__toggle";
  const variantTarget = variantRow.querySelector(variantSelector);
  if (variantTarget instanceof HTMLElement && !variantTarget.closest("[hidden]")) {
    return variantTarget;
  }

  return variantRow.querySelector(".product-variant-row__toggle") ?? variantRow;
}

function getProductEditorFieldFocusTarget(focusToken = "") {
  const normalizedFocusToken = normalizeProductEditorFocusToken(focusToken);
  const detailsFieldSelectors = {
    name: '[name="name"]',
    "product-name": '[name="name"]',
    category: "#product-category-trigger",
    price: '[name="originalPrice"]',
    "original-price": '[name="originalPrice"]',
    "sale-price": '[name="salesPrice"]',
    "sales-price": '[name="salesPrice"]',
    stock: '[name="stock"]',
    description: '[name="description"]',
  };
  const detailsSelector = detailsFieldSelectors[normalizedFocusToken];
  if (detailsSelector) {
    return form?.querySelector(detailsSelector) ?? null;
  }

  if (normalizedFocusToken === "barcode") {
    return (
      barcodePreviewContainer?.querySelector(".barcode-preview-image") ||
      barcodePreviewContainer ||
      barcodeInput
    );
  }

  if (
    normalizedFocusToken === "photo" ||
    normalizedFocusToken === "image" ||
    normalizedFocusToken === "main-image" ||
    normalizedFocusToken === "main-product-image" ||
    normalizedFocusToken === "display"
  ) {
    return (
      productImageInputList?.querySelector(
        '.product-photo-thumbnail[data-slot-index="0"] .product-photo-thumbnail__preview',
      ) ||
      productImageInputList?.querySelector(".product-photo-thumbnail__preview") ||
      productImageInputList?.querySelector("[data-product-photo-add]") ||
      addImageInputButton
    );
  }

  if (normalizedFocusToken === "video" || normalizedFocusToken === "video-thumbnail") {
    return (
      productVideoInputList?.querySelector(".product-video-upload-card__preview") ||
      productVideoInputList?.querySelector("[data-product-video-add]") ||
      addVideoInputButton
    );
  }

  if (normalizedFocusToken.startsWith("variant-") || normalizedFocusToken === "variant") {
    return getProductEditorVariantFocusTarget(normalizedFocusToken);
  }

  if (normalizedFocusToken === "3d-model" || normalizedFocusToken === "model") {
    return productModelViewer || productModelUploadButton;
  }

  if (normalizedFocusToken === "image-search" || normalizedFocusToken === "visual-search") {
    return visualSearchPreviewContainer?.querySelector(
      ".visual-search-angle-card__preview-button, .visual-search-angle-card__button, .visual-search-angle-card__source-button, .visual-search-angle-card__icon-button",
    ) ?? null;
  }

  return null;
}

function getProductEditorFocusTarget(focusTokenOrSectionId = defaultProductEditorSectionId) {
  const fieldTarget = getProductEditorFieldFocusTarget(focusTokenOrSectionId);
  if (fieldTarget instanceof HTMLElement) {
    return fieldTarget;
  }

  const normalizedSectionId =
    normalizeProductEditorFocusSectionId(focusTokenOrSectionId) ||
    String(focusTokenOrSectionId ?? "").trim() ||
    defaultProductEditorSectionId;
  return (
    document.getElementById(normalizedSectionId) ||
    getProductEditorSectionScrollTarget(normalizedSectionId)
  );
}

function flashProductEditorFocusTarget(focusTokenOrSectionId = defaultProductEditorSectionId) {
  const target = getProductEditorFocusTarget(focusTokenOrSectionId);
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (productEditorFocusAnimationTimer) {
    window.clearTimeout(productEditorFocusAnimationTimer);
    productEditorFocusAnimationTimer = 0;
  }
  target.classList.remove("is-notification-focus-pop");
  if (!target.id?.startsWith("product-editor-section-") && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }
  if (typeof target.focus === "function") {
    target.focus({ preventScroll: true });
  }
  void target.offsetWidth;
  target.classList.add("is-notification-focus-pop");
  productEditorFocusAnimationTimer = window.setTimeout(() => {
    target.classList.remove("is-notification-focus-pop");
    productEditorFocusAnimationTimer = 0;
  }, 1700);
}

function getProductListFocusTarget(productId = "") {
  const normalizedProductId = String(productId ?? "").trim();
  if (!productList || !normalizedProductId) {
    return null;
  }

  return Array.from(productList.children).find(
    (card) =>
      card instanceof HTMLElement &&
      card.classList.contains("product-card") &&
      String(card.dataset.productId ?? "").trim() === normalizedProductId,
  ) ?? null;
}

function clearProductListFocusSpotlight() {
  if (productListFocusSpotlightFrame) {
    window.cancelAnimationFrame(productListFocusSpotlightFrame);
    productListFocusSpotlightFrame = 0;
  }

  if (productListFocusSurface instanceof HTMLElement) {
    productListFocusSurface.style.removeProperty("--product-list-focus-left");
    productListFocusSurface.style.removeProperty("--product-list-focus-top");
    productListFocusSurface.style.removeProperty("--product-list-focus-width");
    productListFocusSurface.style.removeProperty("--product-list-focus-height");
  }
}

function updateProductListFocusSpotlight(target) {
  if (!(productListFocusSurface instanceof HTMLElement) || !(target instanceof HTMLElement)) {
    return;
  }

  const focusPadding = 14;
  const targetRect = target.getBoundingClientRect();
  const left = Math.max(0, targetRect.left - focusPadding);
  const top = Math.max(0, targetRect.top - focusPadding);
  const width = Math.min(window.innerWidth - left, targetRect.width + (focusPadding * 2));
  const height = Math.min(window.innerHeight - top, targetRect.height + (focusPadding * 2));

  productListFocusSurface.style.setProperty("--product-list-focus-left", `${left}px`);
  productListFocusSurface.style.setProperty("--product-list-focus-top", `${top}px`);
  productListFocusSurface.style.setProperty("--product-list-focus-width", `${Math.max(0, width)}px`);
  productListFocusSurface.style.setProperty("--product-list-focus-height", `${Math.max(0, height)}px`);
}

function startProductListFocusSpotlight(target) {
  clearProductListFocusSpotlight();

  const trackSpotlight = () => {
    updateProductListFocusSpotlight(target);
    productListFocusSpotlightFrame = window.requestAnimationFrame(trackSpotlight);
  };

  trackSpotlight();
}

function flashProductListFocusTarget(productId = requestedProductListFocusId) {
  const target = getProductListFocusTarget(productId);
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (productListFocusAnimationTimer) {
    window.clearTimeout(productListFocusAnimationTimer);
    productListFocusAnimationTimer = 0;
  }
  clearProductListFocusSpotlight();

  productList.classList.add("is-notification-focus-active");
  productListFocusSurface?.classList.add("is-product-list-notification-focus-active");
  productList.querySelectorAll(".is-notification-focus-pop").forEach((focusedElement) => {
    focusedElement.classList.remove("is-notification-focus-pop");
  });
  target.classList.remove("is-notification-focus-pop");
  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  void target.offsetWidth;
  target.classList.add("is-notification-focus-pop");
  startProductListFocusSpotlight(target);
  productListFocusAnimationTimer = window.setTimeout(() => {
    target.classList.remove("is-notification-focus-pop");
    productList.classList.remove("is-notification-focus-active");
    productListFocusSurface?.classList.remove("is-product-list-notification-focus-active");
    clearProductListFocusSpotlight();
    productListFocusAnimationTimer = 0;
  }, 1700);
  return true;
}

function applyRequestedProductListFocus() {
  if (!requestedProductListFocusId) {
    return;
  }

  if (shouldAnimateProductEditorFocus && flashProductListFocusTarget(requestedProductListFocusId)) {
    requestedProductListFocusId = "";
  }
}

function applyRequestedProductEditorFocus() {
  if (!requestedProductEditorFocusSectionId) {
    return;
  }

  if (normalizeProductEditorFocusToken(requestedProductEditorFocusToken) === "barcode") {
    setProductDetailsBarcodeModalOpen(true);
  }
  revealProductEditorSection(requestedProductEditorFocusSectionId, { shouldScroll: true });
  if (shouldAnimateProductEditorFocus) {
    window.setTimeout(() => {
      flashProductEditorFocusTarget(
        requestedProductEditorFocusToken || requestedProductEditorFocusSectionId,
      );
    }, 180);
  }
}

function revealProductEditorSectionForControl(control) {
  if (!(control instanceof Element)) {
    return;
  }

  const targetSection = control.closest(
    "#product-editor-section-photo, #product-editor-section-video, #product-editor-section-details, #product-editor-section-services, #product-editor-section-3d-model, #product-editor-section-variants",
  );
  const targetSectionId = String(targetSection?.id ?? "").trim();
  if (!targetSectionId) {
    return;
  }

  revealProductEditorSection(targetSectionId);
}

function setStatus(message, mode = "default") {
  if (!statusPill) {
    return;
  }

  statusPill.textContent = message;
  statusPill.className = "status-pill";
  if (mode !== "default") {
    statusPill.classList.add(mode);
  }
}

function setServerStatus(message, mode = "default") {
  if (!serverStatusPill) {
    return;
  }

  serverStatusPill.textContent = message;
  serverStatusPill.className = "status-pill server-status-pill";
  if (mode !== "default") {
    serverStatusPill.classList.add(mode);
  }
}

function setHelperText(message) {
  if (!helperText) {
    return;
  }

  helperText.textContent = message;
}

function setEditQueryParam(productId = "") {
  if (!window.history?.replaceState) {
    return;
  }

  const url = new URL(window.location.href);
  if (productId) {
    url.searchParams.set("edit", productId);
  } else {
    url.searchParams.delete("edit");
    url.searchParams.delete("focus");
    url.searchParams.delete("notificationFocus");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function getProductPanelUrl() {
  return "/product_panel.html";
}

function getStandaloneProductEditorUrl(productId = "") {
  const normalizedProductId = String(productId ?? "").trim();
  return normalizedProductId
    ? `/edit_products.html?edit=${encodeURIComponent(normalizedProductId)}`
    : "/edit_products.html";
}

function shouldUseProductValidationModal() {
  return true;
}

function setProductPanelSuccessFlash(payload) {
  try {
    window.sessionStorage?.setItem(
      PRODUCT_PANEL_SUCCESS_FLASH_KEY,
      JSON.stringify({
        title: String(payload?.title ?? "Success").trim() || "Success",
        copy: String(payload?.copy ?? "").trim(),
      }),
    );
  } catch (_) {
    // Ignore storage errors and continue.
  }
}

function consumeProductPanelSuccessFlash() {
  try {
    const rawValue = window.sessionStorage?.getItem(PRODUCT_PANEL_SUCCESS_FLASH_KEY);
    if (!rawValue) {
      return null;
    }

    window.sessionStorage.removeItem(PRODUCT_PANEL_SUCCESS_FLASH_KEY);
    const parsedValue = JSON.parse(rawValue);
    return {
      title: String(parsedValue?.title ?? "Success").trim() || "Success",
      copy: String(parsedValue?.copy ?? "").trim(),
    };
  } catch (_) {
    return null;
  }
}

function ensureProductValidationLottiePlayer() {
  if (window.lottie?.loadAnimation) {
    return Promise.resolve(true);
  }

  if (productValidationLottieLoadPromise) {
    return productValidationLottieLoadPromise;
  }

  productValidationLottieLoadPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src$="${PRODUCT_VALIDATION_LOTTIE_PLAYER_URL}"], script[src*="${PRODUCT_VALIDATION_LOTTIE_PLAYER_URL}?"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      if (window.lottie?.loadAnimation) {
        resolve(true);
      }
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.src = PRODUCT_VALIDATION_LOTTIE_PLAYER_URL;
    scriptElement.async = true;
    scriptElement.addEventListener("load", () => resolve(Boolean(window.lottie?.loadAnimation)), { once: true });
    scriptElement.addEventListener("error", () => resolve(false), { once: true });
    document.head.appendChild(scriptElement);
  });

  return productValidationLottieLoadPromise;
}

function destroyProductValidationSuccessAnimation() {
  if (productValidationSuccessAnimation?.destroy) {
    productValidationSuccessAnimation.destroy();
  }
  productValidationSuccessAnimation = null;
}

function clearProductValidationAutoCloseTimer() {
  if (productValidationAutoCloseTimer) {
    window.clearTimeout(productValidationAutoCloseTimer);
    productValidationAutoCloseTimer = 0;
  }
}

function getProductDeleteSuccessAudio() {
  if (typeof Audio !== "function") {
    return null;
  }

  if (!productDeleteSuccessAudio) {
    productDeleteSuccessAudio = new Audio(PRODUCT_DELETE_SUCCESS_AUDIO_URL);
    productDeleteSuccessAudio.preload = "auto";
  }

  return productDeleteSuccessAudio;
}

function prepareProductDeleteSuccessAudio() {
  const audio = getProductDeleteSuccessAudio();
  if (audio?.load) {
    audio.load();
  }
}

function playProductDeleteSuccessAudio() {
  const audio = getProductDeleteSuccessAudio();
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    const playResult = audio.play();
    if (playResult?.catch) {
      playResult.catch((error) => {
        console.warn("Unable to play delete success audio.", error);
      });
    }
  } catch (error) {
    console.warn("Unable to play delete success audio.", error);
  }
}

async function playProductValidationSuccessAnimation() {
  const container = productValidationModalElements?.icon?.querySelector(
    "[data-product-validation-lottie-check]",
  );
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroyProductValidationSuccessAnimation();
  container.innerHTML = "";

  const canUseLottie = await ensureProductValidationLottiePlayer();
  if (
    !canUseLottie
    || !window.lottie?.loadAnimation
    || !container.isConnected
    || productValidationModalElements?.overlay?.hidden
  ) {
    return;
  }

  productValidationSuccessAnimation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: PRODUCT_VALIDATION_SUCCESS_ANIMATION_PATH,
  });
}

function getProductValidationGlyphClassName(mode, iconClassName = "") {
  const requestedClassName = String(iconClassName ?? "").trim();
  if (requestedClassName) {
    return requestedClassName;
  }

  if (mode === "success") {
    return "fa-solid fa-circle-check";
  }

  return mode === "notice"
    ? "fa-solid fa-triangle-exclamation"
    : "fa-solid fa-circle-xmark";
}

function setProductValidationIcon(modal, mode, iconClassName = "", { isDelete = false } = {}) {
  if (!modal || !(modal.icon instanceof HTMLElement)) {
    return;
  }

  modal.icon.className = `validation-modal__icon validation-modal__icon--${mode}`;
  modal.icon.classList.toggle("validation-modal__icon--delete", Boolean(isDelete));

  if (mode === "success" && !String(iconClassName ?? "").trim()) {
    modal.icon.innerHTML = PRODUCT_VALIDATION_SUCCESS_ICON_MARKUP;
    modal.iconGlyph = null;
    return;
  }

  const glyphClassName = getProductValidationGlyphClassName(mode, iconClassName);
  modal.icon.innerHTML = `
    <i
      class="${glyphClassName}"
      id="product-validation-modal-icon-glyph"
      aria-hidden="true"
    ></i>
  `;
  modal.iconGlyph = modal.icon.querySelector("#product-validation-modal-icon-glyph");
}

function openProductSuccessFeedbackModal({
  title = "Success",
  copy = "",
  onAutoClose = null,
  onOpen = null,
} = {}) {
  openProductValidationModal({
    mode: "success",
    title,
    copy,
    issues: [],
    hideAction: true,
    hideClose: true,
    allowManualClose: false,
    allowOverlayClose: false,
    autoCloseMs: PRODUCT_VALIDATION_SUCCESS_ANIMATION_MS + PRODUCT_VALIDATION_SUCCESS_HOLD_MS,
    onAutoClose,
  });
  if (typeof onOpen === "function") {
    onOpen();
  }
}

function openProductDeleteSuccessFeedbackModal(copy = "Deleted successfully.") {
  openProductSuccessFeedbackModal({
    title: "Success",
    copy,
    onOpen: playProductDeleteSuccessAudio,
  });
}

function openAdminEditSuccessFeedbackModal(copy = "Updated successfully.", options = {}) {
  openProductSuccessFeedbackModal({
    title: String(options?.title ?? "Success").trim() || "Success",
    copy,
    onAutoClose: typeof options?.onAutoClose === "function" ? options.onAutoClose : null,
  });
}

const SELLER_CONFIRM_TRASH_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10 11v6"></path><path d="M14 11v6"></path>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    <path d="M3 6h18"></path>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
`;
const SELLER_CONFIRM_NOTICE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
    <path d="M12 9v4"></path><path d="M12 17h.01"></path>
  </svg>
`;
const SELLER_CONFIRM_CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
  </svg>
`;

let sellerConfirmModalElements = null;

function escapeSellerConfirmHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function closeSellerConfirmModal(result = null) {
  if (!sellerConfirmModalElements) {
    return;
  }
  const resolver = sellerConfirmModalElements.resolvePromise;
  sellerConfirmModalElements.overlay.classList.remove("is-open");
  sellerConfirmModalElements.overlay.hidden = true;
  sellerConfirmModalElements.resolvePromise = null;
  sellerConfirmModalElements.onConfirm = null;
  sellerConfirmModalElements.onCancel = null;
  syncModalOpenClass();
  if (typeof resolver === "function") {
    resolver(result);
  }
}

function ensureSellerConfirmModal() {
  if (sellerConfirmModalElements) {
    return sellerConfirmModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "seller-confirm-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="seller-confirm-modal" role="dialog" aria-modal="true" tabindex="-1">
      <button type="button" class="seller-confirm-modal__close" data-seller-confirm-close aria-label="Close">
        ${SELLER_CONFIRM_CLOSE_ICON}
      </button>
      <span class="seller-confirm-modal__icon" data-seller-confirm-icon aria-hidden="true"></span>
      <div class="seller-confirm-modal__header">
        <h2 data-seller-confirm-title>Confirm</h2>
        <p data-seller-confirm-copy></p>
      </div>
      <div class="seller-confirm-modal__content" data-seller-confirm-content></div>
      <div class="seller-confirm-modal__actions">
        <button type="button" class="seller-confirm-modal__cancel" data-seller-confirm-cancel>Cancel</button>
        <button type="button" class="seller-confirm-modal__confirm" data-seller-confirm-confirm>
          <span data-seller-confirm-confirm-label>Continue</span>
        </button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const dialog = overlay.querySelector(".seller-confirm-modal");
  const icon = overlay.querySelector("[data-seller-confirm-icon]");
  const title = overlay.querySelector("[data-seller-confirm-title]");
  const copy = overlay.querySelector("[data-seller-confirm-copy]");
  const content = overlay.querySelector("[data-seller-confirm-content]");
  const cancelButton = overlay.querySelector("[data-seller-confirm-cancel]");
  const confirmButton = overlay.querySelector("[data-seller-confirm-confirm]");
  const confirmLabel = overlay.querySelector("[data-seller-confirm-confirm-label]");
  const closeButton = overlay.querySelector("[data-seller-confirm-close]");

  const finish = (confirmed) => {
    const onConfirm = sellerConfirmModalElements?.onConfirm;
    const onCancel = sellerConfirmModalElements?.onCancel;
    closeSellerConfirmModal(confirmed);
    if (confirmed) {
      if (typeof onConfirm === "function") {
        onConfirm();
      }
    } else if (typeof onCancel === "function") {
      onCancel();
    }
  };

  closeButton?.addEventListener("click", () => finish(false));
  cancelButton?.addEventListener("click", () => finish(false));
  confirmButton?.addEventListener("click", () => finish(true));
  overlay.addEventListener("click", (event) => {
    if (event.target !== overlay) {
      return;
    }
    if (sellerConfirmModalElements?.allowOverlayClose === false) {
      return;
    }
    finish(false);
  });

  sellerConfirmModalElements = {
    overlay,
    dialog,
    icon,
    title,
    copy,
    content,
    cancelButton,
    confirmButton,
    confirmLabel,
    closeButton,
    resolvePromise: null,
    onConfirm: null,
    onCancel: null,
    allowOverlayClose: true,
  };
  return sellerConfirmModalElements;
}

function openSellerConfirmModal({
  variant = "notice",
  title = "Important notice",
  message = "",
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  showCancel = true,
  showClose = true,
  allowOverlayClose = true,
  issues = [],
  contentHtml = "",
  onConfirm = null,
  onCancel = null,
} = {}) {
  const modal = ensureSellerConfirmModal();
  if (!modal) {
    return Promise.resolve(false);
  }

  const normalizedVariant = String(variant || "notice").trim().toLowerCase() === "delete"
    ? "delete"
    : "notice";
  modal.dialog.classList.toggle("seller-confirm-modal--notice", normalizedVariant === "notice");
  modal.dialog.classList.toggle("seller-confirm-modal--delete", normalizedVariant === "delete");
  if (modal.icon instanceof HTMLElement) {
    modal.icon.innerHTML = normalizedVariant === "delete"
      ? SELLER_CONFIRM_TRASH_ICON
      : SELLER_CONFIRM_NOTICE_ICON;
  }
  if (modal.title instanceof HTMLElement) {
    modal.title.textContent = String(title || "").trim() || "Important notice";
  }
  if (modal.copy instanceof HTMLElement) {
    const copyText = String(message || "").trim();
    modal.copy.textContent = copyText;
    modal.copy.hidden = !copyText;
  }

  const normalizedIssues = Array.isArray(issues) ? issues.filter(Boolean) : [];
  if (modal.content instanceof HTMLElement) {
    if (contentHtml) {
      modal.content.innerHTML = contentHtml;
    } else if (normalizedIssues.length) {
      modal.content.innerHTML = `<ul class="seller-confirm-modal__issues">${
        normalizedIssues.map((issue) => `<li>${escapeSellerConfirmHtml(issue.label || issue.message || issue)}</li>`).join("")
      }</ul>`;
    } else {
      modal.content.innerHTML = "";
    }
  }

  if (modal.confirmLabel instanceof HTMLElement) {
    modal.confirmLabel.textContent = String(confirmLabel || "Continue").trim() || "Continue";
  }
  if (modal.confirmButton instanceof HTMLButtonElement) {
    const existingIcon = modal.confirmButton.querySelector("svg");
    existingIcon?.remove();
    if (normalizedVariant === "delete") {
      modal.confirmButton.insertAdjacentHTML("afterbegin", SELLER_CONFIRM_TRASH_ICON);
    }
  }
  if (modal.cancelButton instanceof HTMLButtonElement) {
    modal.cancelButton.hidden = showCancel === false;
    modal.cancelButton.textContent = String(cancelLabel || "Cancel").trim() || "Cancel";
  }
  if (modal.closeButton instanceof HTMLButtonElement) {
    modal.closeButton.hidden = showClose === false;
  }

  modal.onConfirm = typeof onConfirm === "function" ? onConfirm : null;
  modal.onCancel = typeof onCancel === "function" ? onCancel : null;
  modal.allowOverlayClose = allowOverlayClose !== false;

  modal.overlay.hidden = false;
  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
    (showCancel === false ? modal.confirmButton : modal.cancelButton)?.focus?.({ preventScroll: true });
  });
  syncModalOpenClass();

  return new Promise((resolve) => {
    modal.resolvePromise = resolve;
  });
}

function ensureProductValidationModal() {
  if (productValidationModalElements) {
    return productValidationModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "validation-modal-overlay product-validation-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section
      class="validation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-validation-modal-title"
      tabindex="-1"
    >
      <button
        type="button"
        class="product-gallery-modal__close validation-modal__close"
        id="product-validation-modal-close"
        aria-label="Close validation modal"
        title="Close validation modal"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="validation-modal__top">
        <div
          class="validation-modal__icon validation-modal__icon--error"
          id="product-validation-modal-icon"
          aria-hidden="true"
          role="presentation"
          tabindex="-1"
        >
          <i
            class="fa-solid fa-circle-xmark"
            id="product-validation-modal-icon-glyph"
            aria-hidden="true"
          ></i>
        </div>
      </div>
        <div class="validation-modal__body">
          <h2 class="validation-modal__title" id="product-validation-modal-title">
          Important notice
          </h2>
        <p class="validation-modal__copy" id="product-validation-modal-copy" hidden></p>
        <ul class="validation-modal__issues" id="product-validation-modal-issues"></ul>
        <div class="validation-modal__actions">
          <button
            type="button"
            class="ghost-button validation-modal__action-button validation-modal__action-button--secondary"
            id="product-validation-modal-secondary-action"
            hidden
          >
            Go Back
          </button>
          <button
            type="button"
            class="product-editor-submit-button validation-modal__action-button"
            id="product-validation-modal-action"
          >
            Review Fields
          </button>
        </div>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const dialog = overlay.querySelector(".validation-modal");
  const closeButton = overlay.querySelector("#product-validation-modal-close");
  const icon = overlay.querySelector("#product-validation-modal-icon");
  const iconGlyph = overlay.querySelector("#product-validation-modal-icon-glyph");
  const title = overlay.querySelector("#product-validation-modal-title");
  const copy = overlay.querySelector("#product-validation-modal-copy");
  const issues = overlay.querySelector("#product-validation-modal-issues");
  const secondaryActionButton = overlay.querySelector("#product-validation-modal-secondary-action");
  const actionButton = overlay.querySelector("#product-validation-modal-action");

  productValidationModalElements = {
    overlay,
    dialog,
    closeButton,
    icon,
    iconGlyph,
    title,
    copy,
    issues,
    secondaryActionButton,
    actionButton,
    pendingIssue: null,
    onAction: null,
    onSecondaryAction: null,
    onAutoClose: null,
    allowOverlayClose: true,
    allowManualClose: true,
  };

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", () => {
      if (productValidationModalElements?.allowManualClose === false) {
        return;
      }
      closeProductValidationModal({ focusPendingIssue: true });
    });
  }

  if (actionButton instanceof HTMLButtonElement) {
    actionButton.addEventListener("click", () => {
      if (productValidationModalElements?.allowManualClose === false) {
        return;
      }
      if (typeof productValidationModalElements?.onAction === "function") {
        const handled = productValidationModalElements.onAction();
        if (handled === true) {
          return;
        }
      }
      closeProductValidationModal({ focusPendingIssue: true });
    });
  }

  if (secondaryActionButton instanceof HTMLButtonElement) {
    secondaryActionButton.addEventListener("click", () => {
      if (productValidationModalElements?.allowManualClose === false) {
        return;
      }
      if (typeof productValidationModalElements?.onSecondaryAction === "function") {
        const handled = productValidationModalElements.onSecondaryAction();
        if (handled === true) {
          return;
        }
      }
      closeProductValidationModal({ focusPendingIssue: true });
    });
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay && productValidationModalElements?.allowOverlayClose !== false) {
      closeProductValidationModal({ focusPendingIssue: false });
    }
  });

  return productValidationModalElements;
}

function focusFirstProductCategoryChoice() {
  const firstCategoryBadge = selectedCategoryChips?.querySelector(
    ".product-category-choice-badge",
  );
  if (firstCategoryBadge instanceof HTMLButtonElement) {
    firstCategoryBadge.focus();
    return true;
  }
  selectedCategoryChips?.focus();
  return false;
}

function focusProductValidationIssue(issue) {
  if (!issue || typeof issue !== "object") {
    return;
  }

  if (issue.sectionId) {
    revealProductEditorSection(issue.sectionId);
  }

  if (issue.focusTarget === "main-image") {
    focusMainProductImagePicker();
    return;
  }

  if (issue.focusTarget === "category") {
    focusFirstProductCategoryChoice();
    return;
  }

  if (issue.focusTarget === "delivery-partners" || issue.focusTarget === "payment-partners") {
    const type = issue.focusTarget === "payment-partners" ? "payment" : "delivery";
    setProductPartnerDropdownOpen(type, true);
    window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-product-partner-list="${type}"] input[type="checkbox"]`,
      );
      if (target instanceof HTMLElement && typeof target.focus === "function") {
        target.focus();
        return;
      }

      const trigger = document.querySelector(`[data-product-partner-trigger="${type}"]`);
      if (trigger instanceof HTMLElement && typeof trigger.focus === "function") {
        trigger.focus();
      }
    });
    return;
  }

  if (issue.focusTarget === "variant-field") {
    const variantIndex = Number(issue.variantIndex);
    const variantField = String(issue.variantField ?? "").trim();

    if (Number.isInteger(variantIndex) && variantIndex >= 0 && variantField) {
      if (editingVariants[variantIndex] && !editingVariants[variantIndex].isExpanded) {
        editingVariants[variantIndex].isExpanded = true;
        renderProductVariants();
      }

      window.requestAnimationFrame(() => {
        const focusTarget = getVariantFieldElement(variantIndex, variantField);
        if (focusTarget instanceof HTMLElement && typeof focusTarget.focus === "function") {
          focusTarget.focus();
        }
      });
      return;
    }
  }

  if (issue.focusControl instanceof HTMLElement && typeof issue.focusControl.focus === "function") {
    window.requestAnimationFrame(() => {
      issue.focusControl.focus();
    });
  }
}


function hideValidationOverlayWithExitAnimation(overlay, callback) {
  if (!(overlay instanceof HTMLElement)) {
    if (typeof callback === "function") {
      callback();
    }
    return;
  }

  overlay.classList.remove("is-open");

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    overlay.hidden = true;
    overlay.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(exitTimer);

    if (typeof callback === "function") {
      callback();
    }
  };

  const handleTransitionEnd = (event) => {
    if (event.target !== overlay) {
      return;
    }
    cleanup();
  };

  overlay.addEventListener("transitionend", handleTransitionEnd);
  const exitTimer = window.setTimeout(cleanup, 300);
}

function closeProductValidationModal({ focusPendingIssue = false, onClosed = null } = {}) {
  if (!productValidationModalElements) {
    return;
  }

  clearProductValidationAutoCloseTimer();
  destroyProductValidationSuccessAnimation();

  const { overlay, pendingIssue } = productValidationModalElements;
  hideValidationOverlayWithExitAnimation(overlay, () => {
    syncModalOpenClass();

    if (focusPendingIssue) {
      focusProductValidationIssue(pendingIssue);
    }

    productValidationModalElements.pendingIssue = null;
    productValidationModalElements.onAction = null;
    productValidationModalElements.onSecondaryAction = null;
    productValidationModalElements.onAutoClose = null;
    productValidationModalElements.allowOverlayClose = true;
    productValidationModalElements.allowManualClose = true;

    if (typeof onClosed === "function") {
      onClosed();
    }
  });
}

function setProductValidationPrimaryActionVariant(button, variant = "primary") {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const useSecondaryStyle = String(variant ?? "").trim().toLowerCase() === "secondary";
  button.classList.toggle("validation-modal__action-button--secondary", useSecondaryStyle);
  button.classList.toggle("ghost-button", useSecondaryStyle);
  button.classList.toggle("product-editor-submit-button", !useSecondaryStyle);
}

function openProductValidationModal({
  mode = "error",
  title = "Important notice",
  copy = "",
  issues = [],
  actionLabel = "Review Fields",
  actionVariant = "",
  secondaryActionLabel = "",
  onAction = null,
  onSecondaryAction = null,
  onAutoClose = null,
  showCloseButton = true,
  hideClose = false,
  hideAction = false,
  allowManualClose = true,
  allowOverlayClose = true,
  autoCloseMs = 0,
  iconHtml = "",
} = {}) {
  const requestedMode = String(mode ?? "").trim().toLowerCase();
  if (requestedMode === "notice") {
    const hasSecondary = Boolean(String(secondaryActionLabel ?? "").trim());
    void openSellerConfirmModal({
      variant: "notice",
      title,
      message: copy,
      confirmLabel: actionLabel || "Continue",
      cancelLabel: secondaryActionLabel || "Cancel",
      showCancel: hasSecondary,
      showClose: !(hideClose === true || showCloseButton === false),
      allowOverlayClose,
      issues,
      onConfirm: () => {
        if (typeof onAction === "function") {
          onAction();
        }
      },
      onCancel: () => {
        if (typeof onSecondaryAction === "function") {
          onSecondaryAction();
        }
      },
    });
    return;
  }

  const modal = ensureProductValidationModal();
  if (!modal) {
    return;
  }

  clearProductValidationAutoCloseTimer();
  destroyProductValidationSuccessAnimation();

  const normalizedIssues = Array.isArray(issues) ? issues.filter(Boolean) : [];
  const normalizedMode = requestedMode === "success"
    ? "success"
    : "error";
  modal.title.textContent = title;
  modal.copy.textContent = copy;
  modal.copy.hidden = !String(copy ?? "").trim();
  const normalizedActionLabel = String(actionLabel ?? "").trim() || "Review Fields";
  modal.actionButton.textContent = normalizedActionLabel;
  modal.actionButton.hidden = hideAction === true;
  modal.secondaryActionButton.hidden =
    hideAction === true || !String(secondaryActionLabel ?? "").trim();
  modal.secondaryActionButton.textContent = String(secondaryActionLabel ?? "").trim() || "Go Back";
  modal.onAction = typeof onAction === "function" ? onAction : null;
  modal.onSecondaryAction = typeof onSecondaryAction === "function" ? onSecondaryAction : null;
  modal.onAutoClose = typeof onAutoClose === "function" ? onAutoClose : null;
  modal.allowOverlayClose = allowOverlayClose !== false;
  modal.allowManualClose = allowManualClose !== false;
  const normalizedActionVariant = String(actionVariant ?? "").trim().toLowerCase();
  setProductValidationPrimaryActionVariant(
    modal.actionButton,
    normalizedActionVariant === "primary" || normalizedActionVariant === "secondary"
      ? normalizedActionVariant
      : normalizedActionLabel.toLowerCase() === "go back"
        ? "secondary"
        : "primary",
  );
  if (modal.closeButton instanceof HTMLButtonElement) {
    modal.closeButton.hidden = hideClose === true || showCloseButton === false;
  }
  setProductValidationIcon(modal, normalizedMode, iconHtml);
  modal.issues.innerHTML = "";
  modal.issues.hidden = normalizedIssues.length === 0;

  normalizedIssues.forEach((issue) => {
    const listItem = document.createElement("li");
    listItem.textContent = issue.label;
    modal.issues.appendChild(listItem);
  });

  modal.pendingIssue = normalizedIssues[0] ?? null;
  modal.overlay.hidden = false;
  if (normalizedMode === "success") {
    void playProductValidationSuccessAnimation();
  }

  const normalizedAutoCloseMs = Number(autoCloseMs);
  if (Number.isFinite(normalizedAutoCloseMs) && normalizedAutoCloseMs > 0) {
    productValidationAutoCloseTimer = window.setTimeout(() => {
      productValidationAutoCloseTimer = 0;
      const autoCloseCallback = productValidationModalElements?.onAutoClose;
      closeProductValidationModal({ focusPendingIssue: false });
      if (typeof autoCloseCallback === "function") {
        autoCloseCallback();
      }
    }, normalizedAutoCloseMs);
  }

  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
  });
  productValidationModalIgnoreEnterUntil = Date.now() + 900;
  syncModalOpenClass();

  window.requestAnimationFrame(() => {
    if (modal.actionButton instanceof HTMLButtonElement && !modal.actionButton.hidden) {
      modal.actionButton.focus();
    } else if (modal.closeButton instanceof HTMLButtonElement && !modal.closeButton.hidden) {
      modal.closeButton.focus();
    } else if (modal.dialog instanceof HTMLElement) {
      modal.dialog.focus();
    }
  });
}

function getProductIllegalContentSafety(payload = {}) {
  const source = payload?.yoloSafety ?? payload?.sellerSafety ?? payload?.safety ?? payload;
  return source && typeof source === "object" ? source : {};
}

function getProductIllegalContentConfidenceLabel(safety = {}) {
  const rawScore = Number(safety.score ?? safety.confidence);
  if (!Number.isFinite(rawScore) || rawScore <= 0) {
    return "";
  }

  const normalizedScore = rawScore > 1 ? rawScore / 100 : rawScore;
  const percent = Math.max(0, Math.min(100, Math.round(normalizedScore * 100)));
  return `YOLO confidence: ${percent}%`;
}

function openProductIllegalContentModal(payload = {}) {
  const safety = getProductIllegalContentSafety(payload);
  const confidenceLabel = getProductIllegalContentConfidenceLabel(safety);
  const matchedProductName = String(
    safety?.rejectedEvidenceMatch?.matchedProductName ||
      safety?.rejectedEvidenceMatch?.productName ||
      "",
  ).trim();
  const issues = [
    { label: "This content is illegal and cannot be listed." },
    confidenceLabel ? { label: confidenceLabel } : null,
    matchedProductName ? { label: `Matched rejected evidence: ${matchedProductName}` } : null,
  ].filter(Boolean);

  openProductValidationModal({
    mode: "error",
    title: "Illegal Content",
    copy:
      String(payload?.message ?? safety?.message ?? "").trim() ||
      "This content is illegal and cannot be listed.",
    issues,
    actionLabel: "Go Back",
    actionVariant: "secondary",
  });
}

function openProductDeleteConfirmationModal(contentLabel = "item", onContinue = null) {
  const label = String(contentLabel || "item").trim() || "item";
  void openSellerConfirmModal({
    variant: "delete",
    title: "Delete this item?",
    message: `This action cannot be undone and will permanently delete ${label}.`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    showCancel: true,
    showClose: true,
    allowOverlayClose: false,
    onConfirm: () => {
      prepareProductDeleteSuccessAudio();
      if (typeof onContinue === "function") {
        void onContinue();
      }
    },
  });
}

function openProductDeactivateConfirmationModal(product, onContinue = null) {
  const productName = String(product?.name ?? "this product").trim() || "this product";
  openProductValidationModal({
    mode: "notice",
    title: "Important Notice",
    copy: `Are you sure you want to deactivate this product "${productName}"?`,
    actionLabel: "Continue",
    secondaryActionLabel: "Cancel",
    onAction: () => {
      closeProductValidationModal({ focusPendingIssue: false });
      if (typeof onContinue === "function") {
        void onContinue();
      }
      return true;
    },
    onSecondaryAction: () => {
      closeProductValidationModal({ focusPendingIssue: false });
      setHelperText(`"${productName}" remains active in the app.`);
      return true;
    },
    showCloseButton: false,
    allowOverlayClose: false,
    iconHtml: "fa-solid fa-triangle-exclamation",
  });
}

function normalizeProductPartnerIds(values) {
  const normalizedValues = [];
  const seen = new Set();
  for (const candidate of Array.isArray(values) ? values : []) {
    const value = String(candidate ?? "").trim();
    const normalizedKey = value.toLowerCase();
    if (!value || seen.has(normalizedKey)) {
      continue;
    }
    seen.add(normalizedKey);
    normalizedValues.push(value);
  }
  return normalizedValues;
}

function readProductPartnerEnabledFlag(partner) {
  const readBoolean = (value, fallback) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value !== 0;
    }
    const normalizedValue = String(value ?? "").trim().toLowerCase();
    if (["true", "active", "enabled", "1"].includes(normalizedValue)) {
      return true;
    }
    if (["false", "inactive", "disabled", "0"].includes(normalizedValue)) {
      return false;
    }
    return fallback;
  };

  if (readBoolean(partner?.disabled, false)) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "enabled")) {
    return readBoolean(partner.enabled, true);
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isEnabled")) {
    return readBoolean(partner.isEnabled, true);
  }
  if (Object.prototype.hasOwnProperty.call(partner ?? {}, "isActive")) {
    return readBoolean(partner.isActive, true);
  }

  const status = String(partner?.status ?? "").trim().toLowerCase();
  return !["inactive", "disabled", "archived", "deleted"].includes(status);
}

function getProductPartnerId(partner) {
  return String(partner?.id ?? "").trim();
}

function getProductPartnerLabel(partner, fallbackLabel) {
  return String(
    partner?.branch ??
      partner?.name ??
      partner?.label ??
      fallbackLabel ??
      "Partner",
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProductPartnerType(type) {
  return type === "payment" ? "payment" : "delivery";
}

function getProductPartnerTypeTitle(type) {
  return normalizeProductPartnerType(type) === "payment"
    ? "Payment Methods"
    : "Delivery Partners";
}

function getProductPartnerTypeNoun(type) {
  return normalizeProductPartnerType(type) === "payment"
    ? "payment method"
    : "delivery partner";
}

function getProductPartnerImageUrl(partner) {
  return String(
    partner?.imageUrl ??
      partner?.logoUrl ??
      partner?.photoUrl ??
      partner?.pictureUrl ??
      "",
  ).trim();
}

function getProductPartnerInitial(partner, type) {
  const label = getProductPartnerLabel(
    partner,
    normalizeProductPartnerType(type) === "payment" ? "Payment Partner" : "Delivery Partner",
  );
  return label.charAt(0).toUpperCase() || "P";
}

function createProductPartnerLogo(partner, type) {
  const logo = document.createElement("span");
  logo.className = "product-partner-selection__logo";
  const imageUrl = getProductPartnerImageUrl(partner);
  if (!imageUrl) {
    logo.textContent = getProductPartnerInitial(partner, type);
    return logo;
  }

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.remove();
    logo.classList.remove("has-image");
    logo.textContent = getProductPartnerInitial(partner, type);
  }, { once: true });
  logo.classList.add("has-image");
  logo.appendChild(image);
  return logo;
}

function getActiveProductPartners(type) {
  const partners =
    type === "payment" ? currentPaymentPartners : currentDeliveryPartners;
  return (Array.isArray(partners) ? partners : [])
    .filter((partner) => getProductPartnerId(partner) && readProductPartnerEnabledFlag(partner));
}

function getSelectedProductPartnerIds(type) {
  return type === "payment" ? selectedPaymentPartnerIds : selectedDeliveryPartnerIds;
}

function setSelectedProductPartnerIds(type, ids) {
  const normalizedIds = normalizeProductPartnerIds(ids);
  if (type === "payment") {
    selectedPaymentPartnerIds = normalizedIds;
  } else {
    selectedDeliveryPartnerIds = normalizedIds;
  }
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
}

function getSelectedActiveProductPartnerIds(type) {
  const activeIds = new Map(
    getActiveProductPartners(type).map((partner) => [
      getProductPartnerId(partner).toLowerCase(),
      getProductPartnerId(partner),
    ]),
  );
  return normalizeProductPartnerIds(getSelectedProductPartnerIds(type))
    .map((id) => activeIds.get(id.toLowerCase()) ?? "")
    .filter(Boolean);
}

function getProductPartnerDropdownSummary(type, activePartners, selectedIds) {
  const normalizedType = normalizeProductPartnerType(type);
  const selectedPartners = (Array.isArray(activePartners) ? activePartners : [])
    .filter((partner) => selectedIds.has(getProductPartnerId(partner).toLowerCase()));

  if (selectedPartners.length === 0) {
    return `Select ${normalizedType} partner`;
  }

  if (selectedPartners.length === 1) {
    return getProductPartnerLabel(
      selectedPartners[0],
      normalizedType === "payment" ? "Payment Partner" : "Delivery Partner",
    );
  }

  return `${selectedPartners.length} ${normalizedType} partners selected`;
}

function usesProductPartnerHeaderModals() {
  return productDetailsDeliveryModal instanceof HTMLElement
    || productDetailsPaymentModal instanceof HTMLElement;
}

function getProductPartnerSelectionSection() {
  const list = document.getElementById("product-partner-list-delivery")
    ?? document.getElementById("product-partner-list-payment");
  if (list instanceof HTMLElement) {
    const host = list.closest("[data-product-partner-selection]");
    if (host instanceof HTMLElement) {
      return host;
    }
    return document.body;
  }

  if (productEditorServicesSection?.hasAttribute("data-product-partner-selection")) {
    return productEditorServicesSection;
  }

  return (
    productEditorServicesSection?.querySelector("[data-product-partner-selection]")
    ?? productEditorDetailsSection?.querySelector("[data-product-partner-selection]")
    ?? document.querySelector("[data-product-partner-selection]")
    ?? null
  );
}

function clearProductPartnerOverlayPosition(body) {
  if (!(body instanceof HTMLElement)) {
    return;
  }
  body.style.removeProperty("position");
  body.style.removeProperty("top");
  body.style.removeProperty("left");
  body.style.removeProperty("width");
  body.style.removeProperty("right");
}

function positionProductPartnerOverlay(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const section = getProductPartnerSelectionSection();
  if (!section?.classList.contains("product-partner-selection--overlay")) {
    return;
  }

  const group = section.querySelector(`[data-product-partner-group="${normalizedType}"]`);
  const body = section.querySelector(`[data-product-partner-dropdown="${normalizedType}"]`);
  if (!(group instanceof HTMLElement) || !(body instanceof HTMLElement) || body.hidden) {
    clearProductPartnerOverlayPosition(body);
    return;
  }

  const rect = group.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width));
  const left = Math.min(
    Math.max(12, Math.round(rect.left)),
    Math.max(12, window.innerWidth - width - 12),
  );
  const top = Math.min(
    Math.round(rect.bottom + 6),
    Math.max(12, window.innerHeight - 280),
  );
  body.style.position = "fixed";
  body.style.top = `${top}px`;
  body.style.left = `${left}px`;
  body.style.width = `${width}px`;
  body.style.right = "auto";
}

function syncProductPartnerDropdownState(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const section = getProductPartnerSelectionSection();
  if (!section) {
    return;
  }

  if (usesProductPartnerHeaderModals()) {
    const body = section.querySelector(`[data-product-partner-dropdown="${normalizedType}"]`);
    if (body instanceof HTMLElement) {
      body.hidden = false;
      clearProductPartnerOverlayPosition(body);
    }
    return;
  }

  if (!section.dataset.productPartnerDefaultsApplied) {
    collapsedProductPartnerTypes.add("delivery");
    collapsedProductPartnerTypes.add("payment");
    section.dataset.productPartnerDefaultsApplied = "true";
  }

  const isOpen = !collapsedProductPartnerTypes.has(normalizedType);
  const group = section.querySelector(`[data-product-partner-group="${normalizedType}"]`);
  const body = section.querySelector(`[data-product-partner-dropdown="${normalizedType}"]`);
  const trigger = section.querySelector(`[data-product-partner-trigger="${normalizedType}"]`);

  group?.classList.toggle("is-collapsed", !isOpen);
  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    trigger.setAttribute(
      "aria-label",
      `${isOpen ? "Collapse" : "Expand"} ${getProductPartnerTypeTitle(normalizedType).toLowerCase()}`,
    );
  }
  if (body instanceof HTMLElement) {
    body.hidden = !isOpen;
    if (!isOpen) {
      clearProductPartnerOverlayPosition(body);
    }
  }

  if (isOpen) {
    window.requestAnimationFrame(() => {
      positionProductPartnerOverlay(normalizedType);
      syncProductPartnerCarouselState(normalizedType);
    });
  }
}

function syncProductPartnerDropdownStates() {
  syncProductPartnerDropdownState("delivery");
  syncProductPartnerDropdownState("payment");
}

function setProductPartnerDropdownOpen(type, isOpen, options = {}) {
  const normalizedType = normalizeProductPartnerType(type);
  if (isOpen) {
    collapsedProductPartnerTypes.add("delivery");
    collapsedProductPartnerTypes.add("payment");
    collapsedProductPartnerTypes.delete(normalizedType);
    openProductPartnerDropdownType = normalizedType;
  } else {
    collapsedProductPartnerTypes.add(normalizedType);
    if (openProductPartnerDropdownType === normalizedType) {
      openProductPartnerDropdownType = "";
    }
  }

  if (isOpen) {
    setCategoryMultiSelectOpen(false);
    setInventoryCategoryFilterOpen(false);
    setInventoryStatusFilterOpen(false);
  }

  syncProductPartnerDropdownStates();

  if (!isOpen && options.focusTrigger) {
    const trigger = document.querySelector(`[data-product-partner-trigger="${normalizedType}"]`);
    if (trigger instanceof HTMLElement && typeof trigger.focus === "function") {
      trigger.focus();
    }
  }
}

function closeProductPartnerDropdowns() {
  collapsedProductPartnerTypes.add("delivery");
  collapsedProductPartnerTypes.add("payment");
  openProductPartnerDropdownType = "";
  syncProductPartnerDropdownStates();
}

function getProductPartnerCarouselPageCount(list) {
  if (!(list instanceof HTMLElement) || list.clientWidth <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(list.scrollWidth / list.clientWidth));
}

function syncProductPartnerCarouselState(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const section = getProductPartnerSelectionSection();
  if (!section) {
    return;
  }

  const list = section.querySelector(`[data-product-partner-list="${normalizedType}"]`);
  if (!(list instanceof HTMLElement)) {
    return;
  }

  const previousButton = section.querySelector(
    `[data-product-partner-scroll="previous"][data-product-partner-type="${normalizedType}"]`,
  );
  const nextButton = section.querySelector(
    `[data-product-partner-scroll="next"][data-product-partner-type="${normalizedType}"]`,
  );
  const dots = section.querySelector(`[data-product-partner-dots="${normalizedType}"]`);
  const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
  const currentScrollLeft = Math.max(0, list.scrollLeft);

  if (previousButton instanceof HTMLButtonElement) {
    previousButton.disabled = maxScrollLeft <= 1 || currentScrollLeft <= 2;
  }
  if (nextButton instanceof HTMLButtonElement) {
    nextButton.disabled = maxScrollLeft <= 1 || currentScrollLeft >= maxScrollLeft - 2;
  }

  if (!(dots instanceof HTMLElement)) {
    return;
  }

  const pageCount = getProductPartnerCarouselPageCount(list);
  if (dots.childElementCount !== pageCount) {
    dots.innerHTML = "";
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "product-partner-selection__dot";
      dot.dataset.productPartnerPage = String(pageIndex);
      dot.dataset.productPartnerType = normalizedType;
      dot.setAttribute("aria-label", `Show ${getProductPartnerTypeTitle(normalizedType).toLowerCase()} page ${pageIndex + 1}`);
      dots.appendChild(dot);
    }
  }

  const activePage = pageCount <= 1 || maxScrollLeft <= 1
    ? 0
    : Math.min(pageCount - 1, Math.round((currentScrollLeft / maxScrollLeft) * (pageCount - 1)));
  dots.querySelectorAll("[data-product-partner-page]").forEach((dot, index) => {
    const isActive = index === activePage;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function bindProductPartnerCarouselList(list, type) {
  if (!(list instanceof HTMLElement) || list.dataset.productPartnerScrollBound === "true") {
    return;
  }

  const normalizedType = normalizeProductPartnerType(type);
  let animationFrameId = 0;
  const scheduleSync = () => {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = window.requestAnimationFrame(() => {
      animationFrameId = 0;
      syncProductPartnerCarouselState(normalizedType);
    });
  };

  list.dataset.productPartnerScrollBound = "true";
  list.addEventListener("scroll", scheduleSync, { passive: true });
  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(list);
  }
}

function bindProductPartnerSelectionSection(section) {
  if (!(section instanceof HTMLElement) || section.dataset.productPartnerSelectionBound === "true") {
    return;
  }

  section.dataset.productPartnerSelectionBound = "true";
  section.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const trigger = event.target.closest("[data-product-partner-trigger]");
    if (trigger instanceof HTMLButtonElement) {
      const type = normalizeProductPartnerType(trigger.dataset.productPartnerTrigger);
      const isExpanded = !collapsedProductPartnerTypes.has(type);
      setProductPartnerDropdownOpen(type, !isExpanded, { focusTrigger: isExpanded });
      return;
    }

    const scrollButton = event.target.closest("[data-product-partner-scroll]");
    if (scrollButton instanceof HTMLButtonElement) {
      const type = normalizeProductPartnerType(scrollButton.dataset.productPartnerType);
      const list = section.querySelector(`[data-product-partner-list="${type}"]`);
      if (list instanceof HTMLElement) {
        const direction = scrollButton.dataset.productPartnerScroll === "previous" ? -1 : 1;
        const distance = Math.max(110, list.clientWidth * 0.82);
        list.scrollBy({ left: direction * distance, behavior: "smooth" });
      }
      return;
    }

    const dot = event.target.closest("[data-product-partner-page]");
    if (dot instanceof HTMLButtonElement) {
      const type = normalizeProductPartnerType(dot.dataset.productPartnerType);
      const list = section.querySelector(`[data-product-partner-list="${type}"]`);
      const pageIndex = Number(dot.dataset.productPartnerPage);
      if (list instanceof HTMLElement && Number.isInteger(pageIndex) && pageIndex >= 0) {
        const pageCount = getProductPartnerCarouselPageCount(list);
        const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
        const targetScrollLeft = pageCount <= 1
          ? 0
          : maxScrollLeft * (pageIndex / (pageCount - 1));
        list.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
      }
    }
  });

  ["delivery", "payment"].forEach((type) => {
    bindProductPartnerCarouselList(
      section.querySelector(`[data-product-partner-list="${type}"]`),
      type,
    );
  });
}

function getProductPartnerSelectionGroupMarkup(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const isPayment = normalizedType === "payment";
  const title = isPayment ? "Payment Methods" : "Delivery Partners";
  const description = isPayment
    ? "Select one or more payment methods."
    : "Select one or more delivery partners.";
  const icon = isPayment
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9.5h17"/><path d="M16 14h2"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3z"/><path d="M14 10h3l4 4v2h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`;

  return `
    <section class="product-partner-selection__group product-partner-selection__group--${normalizedType}" data-product-partner-group="${normalizedType}" aria-labelledby="product-partner-title-${normalizedType}">
      <button
        type="button"
        class="product-partner-selection__group-header product-partner-selection__trigger-row"
        data-product-partner-trigger="${normalizedType}"
        aria-expanded="false"
        aria-controls="product-partner-body-${normalizedType}"
      >
        <span class="product-partner-selection__group-icon" aria-hidden="true">${icon}</span>
        <span class="product-partner-selection__group-copy">
          <strong id="product-partner-title-${normalizedType}">${title}</strong>
          <span data-product-partner-summary="${normalizedType}">${description}</span>
        </span>
        <span class="product-partner-selection__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </button>
      <div class="product-partner-selection__body" id="product-partner-body-${normalizedType}" data-product-partner-dropdown="${normalizedType}" hidden>
        <div class="product-partner-selection__carousel">
          <button type="button" class="product-partner-selection__scroll-button product-partner-selection__scroll-button--previous" data-product-partner-scroll="previous" data-product-partner-type="${normalizedType}" aria-label="Previous ${title.toLowerCase()}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="product-partner-selection__list" id="product-partner-list-${normalizedType}" data-product-partner-list="${normalizedType}" role="listbox" aria-multiselectable="true"></div>
          <button type="button" class="product-partner-selection__scroll-button product-partner-selection__scroll-button--next" data-product-partner-scroll="next" data-product-partner-type="${normalizedType}" aria-label="Next ${title.toLowerCase()}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="product-partner-selection__footer">
          <div class="product-partner-selection__dots" data-product-partner-dots="${normalizedType}" aria-label="${title} pages"></div>
          <p class="product-partner-selection__status" data-product-partner-status="${normalizedType}"></p>
        </div>
      </div>
    </section>
  `;
}

function ensureProductPartnerSelectionSection() {
  const hostSection = productEditorServicesSection ?? productEditorDetailsSection;
  if (!form || !hostSection) {
    return null;
  }

  const existingSection = getProductPartnerSelectionSection();
  if (existingSection instanceof HTMLElement) {
    existingSection.dataset.productPartnerInitialized = "true";
    bindProductPartnerSelectionSection(existingSection);
    syncProductPartnerDropdownStates();
    return existingSection;
  }

  const detailsStack = productEditorDetailsSection?.querySelector(".product-form-details-stack")
    ?? productEditorDetailsSection;
  const section = document.createElement("div");
  section.className = "product-partner-selection product-partner-selection--overlay";
  section.dataset.productPartnerSelection = "true";
  section.dataset.productPartnerInitialized = "true";
  section.innerHTML = `
    ${getProductPartnerSelectionGroupMarkup("delivery")}
    ${getProductPartnerSelectionGroupMarkup("payment")}
  `;
  bindProductPartnerSelectionSection(section);
  syncProductPartnerDropdownStates();
  if (hostSection === productEditorServicesSection) {
    hostSection.appendChild(section);
    return section;
  }

  const servicesInline = hostSection.querySelector(".product-details-services-inline");
  if (servicesInline instanceof HTMLElement) {
    servicesInline.appendChild(section);
    return section;
  }

  const pricingGrid = detailsStack.querySelector('[name="originalPrice"]')?.closest(".form-grid");
  if (pricingGrid instanceof HTMLElement && pricingGrid.parentElement === detailsStack) {
    pricingGrid.after(section);
  } else {
    detailsStack.appendChild(section);
  }
  return section;
}

function syncProductPartnerSummary(type) {
  const normalizedType = normalizeProductPartnerType(type);
  const section = getProductPartnerSelectionSection();
  const selectedCount = getSelectedActiveProductPartnerIds(normalizedType).length;
  const noun = normalizedType === "payment" ? "payment method" : "delivery partner";
  const summary = section?.querySelector(`[data-product-partner-summary="${normalizedType}"]`);
  if (summary instanceof HTMLElement) {
    summary.textContent = selectedCount > 0
      ? `${selectedCount} ${noun}${selectedCount === 1 ? "" : "s"} selected`
      : normalizedType === "payment"
        ? "Select one or more payment methods."
        : "Select one or more delivery partners.";
  }
  syncProductDetailsPartnerToggleState(normalizedType);
}

function destroyProductPartnerCheckAnimation(option) {
  const animation = option?._productPartnerCheckAnimation;
  if (animation?.destroy) {
    animation.destroy();
  }
  if (option) {
    option._productPartnerCheckAnimation = null;
  }
  const container = option?.querySelector("[data-product-partner-check]");
  if (container instanceof HTMLElement) {
    container.innerHTML = "";
  }
}

async function playProductPartnerCheckAnimation(option) {
  const container = option?.querySelector("[data-product-partner-check]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  destroyProductPartnerCheckAnimation(option);
  const canUseLottie = await ensureProductValidationLottiePlayer();
  if (
    !canUseLottie
    || !window.lottie?.loadAnimation
    || !container.isConnected
    || !option.classList.contains("is-selected")
  ) {
    return;
  }

  container.innerHTML = "";
  try {
    option._productPartnerCheckAnimation = window.lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: PRODUCT_PARTNER_CHECK_ANIMATION_PATH,
    });
  } catch (_) {
    option._productPartnerCheckAnimation = null;
  }
}

function renderProductPartnerChecklist(type) {
  const section = ensureProductPartnerSelectionSection();
  if (!section) {
    return;
  }

  const list = section.querySelector(`[data-product-partner-list="${type}"]`);
  const status = section.querySelector(`[data-product-partner-status="${type}"]`);
  if (!(list instanceof HTMLElement)) {
    return;
  }

  const activePartners = getActiveProductPartners(type);
  const selectedIds = new Set(
    getSelectedActiveProductPartnerIds(type).map((id) => id.toLowerCase()),
  );
  const noun = type === "payment" ? "payment method" : "delivery partner";
  list.innerHTML = "";
  syncProductPartnerDropdownState(type);
  bindProductPartnerCarouselList(list, type);

  if (!activePartners.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "product-partner-selection__empty";
    emptyState.textContent = `No active ${noun}s are available.`;
    list.appendChild(emptyState);
    if (status instanceof HTMLElement) {
      status.textContent = `No active ${noun}s are available.`;
    }
    syncProductPartnerSummary(type);
    window.requestAnimationFrame(() => syncProductPartnerCarouselState(type));
    return;
  }

  if (status instanceof HTMLElement) {
    status.textContent = "";
  }

  activePartners.forEach((partner) => {
    const partnerId = getProductPartnerId(partner);
    const option = document.createElement("label");
    option.className = "product-partner-selection__option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", selectedIds.has(partnerId.toLowerCase()) ? "true" : "false");
    if (selectedIds.has(partnerId.toLowerCase())) {
      option.classList.add("is-selected");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = partnerId;
    checkbox.checked = selectedIds.has(partnerId.toLowerCase());
    checkbox.setAttribute(
      "aria-label",
      `${checkbox.checked ? "Remove" : "Select"} ${getProductPartnerLabel(partner, noun)}`,
    );
    checkbox.addEventListener("change", () => {
      const currentIds = getSelectedProductPartnerIds(type);
      const nextIds = checkbox.checked
        ? [...currentIds, partnerId]
        : currentIds.filter((id) => id.toLowerCase() !== partnerId.toLowerCase());
      setSelectedProductPartnerIds(type, nextIds);
      option.classList.toggle("is-selected", checkbox.checked);
      option.setAttribute("aria-selected", checkbox.checked ? "true" : "false");
      checkbox.setAttribute(
        "aria-label",
        `${checkbox.checked ? "Remove" : "Select"} ${getProductPartnerLabel(partner, noun)}`,
      );
      if (checkbox.checked) {
        void playProductPartnerCheckAnimation(option);
      } else {
        destroyProductPartnerCheckAnimation(option);
      }
      syncProductPartnerSummary(type);
      syncProductFormSubmitState();
      renderAndroidProductPreview();
    });

    const copy = document.createElement("span");
    copy.className = "product-partner-selection__name";
    copy.textContent = getProductPartnerLabel(
      partner,
      type === "payment" ? "Payment Partner" : "Delivery Partner",
    );

    const checkMark = document.createElement("span");
    checkMark.className = "product-partner-selection__check";
    checkMark.dataset.productPartnerCheck = "true";
    checkMark.setAttribute("aria-hidden", "true");

    option.append(checkbox, createProductPartnerLogo(partner, type), copy, checkMark);
    list.appendChild(option);
    if (checkbox.checked) {
      void playProductPartnerCheckAnimation(option);
    }
  });

  syncProductPartnerSummary(type);
  window.requestAnimationFrame(() => syncProductPartnerCarouselState(type));
}

function renderProductPartnerSelections() {
  renderProductPartnerChecklist("delivery");
  renderProductPartnerChecklist("payment");
}

function getProductPartnerValidationIssues() {
  const issues = [];

  if (!getSelectedActiveProductPartnerIds("delivery").length) {
    issues.push({
      label: getActiveProductPartners("delivery").length
        ? "Select at least one delivery partner."
        : "No active delivery partners are available.",
      sectionId: "product-editor-section-delivery",
      focusTarget: "delivery-partners",
    });
  }

  if (!getSelectedActiveProductPartnerIds("payment").length) {
    issues.push({
      label: getActiveProductPartners("payment").length
        ? "Select at least one payment method."
        : "No active payment methods are available.",
      sectionId: "product-editor-section-payment",
      focusTarget: "payment-partners",
    });
  }

  return issues;
}

async function fetchProductPartnerOptions(endpoint) {
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Unable to load product partner options.");
  }
  return (Array.isArray(data.partners) ? data.partners : []).filter(
    (partner) => getProductPartnerId(partner) && readProductPartnerEnabledFlag(partner),
  );
}

async function fetchPrototypeActivePartnerOptions(endpoint) {
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Unable to load active partner options.");
  }
  return (Array.isArray(data.partners) ? data.partners : []).filter(
    (partner) => getProductPartnerId(partner) && readProductPartnerEnabledFlag(partner),
  );
}

async function loadProductPartnerOptions(options = {}) {
  if (!form) {
    return;
  }

  const quiet = options?.quiet === true;
  ensureProductPartnerSelectionSection();
  try {
    const loadPartnerOptions = async (type) => {
      const endpoint = type === "payment" ? "/api/payment-partners" : "/api/delivery-partners";
      try {
        const productOptions = await fetchProductPartnerOptions(`${endpoint}?productOptions=1&prototype=1`);
        if (productOptions.length) {
          return productOptions;
        }
      } catch (error) {
        console.warn(`Product ${type} partner options unavailable; using prototype fallback.`, error);
      }
      try {
        const prototypePartners = await fetchPrototypeActivePartnerOptions(
          `${endpoint}?productOptions=1&prototype=1&status=active&page=1&pageSize=100`,
        );
        if (prototypePartners.length) {
          return prototypePartners;
        }
      } catch (error) {
        console.warn(`Active ${type} partner API unavailable; using local prototype catalog.`, error);
      }
      return type === "payment"
        ? prototypeActivePaymentPartners
        : prototypeActiveDeliveryPartners;
    };
    const [deliveryPartners, paymentPartners] = await Promise.all([
      loadPartnerOptions("delivery"),
      loadPartnerOptions("payment"),
    ]);
    currentDeliveryPartners = deliveryPartners.filter(
      (partner) => getProductPartnerId(partner) && readProductPartnerEnabledFlag(partner),
    );
    currentPaymentPartners = paymentPartners.filter(
      (partner) => getProductPartnerId(partner) && readProductPartnerEnabledFlag(partner),
    );
  } catch (error) {
    console.error(error);
    if (!quiet) {
      setHelperText(
        error instanceof Error
          ? error.message
          : "Unable to load product partner options.",
      );
    }
  }

  renderProductPartnerSelections();
  syncProductFormSubmitState();
}

function syncProductFieldLimitIndicators() {
  const rawName = String(form?.elements?.name?.value ?? "");
  const trimmedNameLength = rawName.trim().length;
  if (productNameCharacterCount) {
    productNameCharacterCount.textContent =
      `${trimmedNameLength} / ${PRODUCT_NAME_MAX_LENGTH} characters`;
    productNameCharacterCount.classList.toggle(
      "is-invalid",
      trimmedNameLength > PRODUCT_NAME_MAX_LENGTH,
    );
  }

  const rawDescription = String(productDescriptionTextarea?.value ?? "");
  const trimmedDescriptionLength = rawDescription.trim().length;
  if (productDescriptionCharacterCount) {
    productDescriptionCharacterCount.textContent =
      `${trimmedDescriptionLength} / ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters`;
    productDescriptionCharacterCount.classList.toggle(
      "is-invalid",
      trimmedDescriptionLength > PRODUCT_DESCRIPTION_MAX_LENGTH,
    );
  }
}

function createProductListingFieldIssue(label, focusControl) {
  return {
    label,
    sectionId: "product-editor-section-details",
    focusControl,
  };
}

function getProductListingFieldLimitValidationIssues() {
  if (!form) {
    return [];
  }

  const issues = [];
  const nameControl = form.elements.name;
  const productName = String(nameControl?.value ?? "").trim();
  if (productName.length > PRODUCT_NAME_MAX_LENGTH) {
    issues.push(createProductListingFieldIssue(
      `Product Name cannot exceed ${PRODUCT_NAME_MAX_LENGTH} characters.`,
      nameControl,
    ));
  }

  const priceFields = [
    ["originalPrice", "Original Price"],
    ["salesPrice", "Sales Price"],
  ];
  priceFields.forEach(([fieldName, fieldLabel]) => {
    const control = form.elements[fieldName];
    const rawValue = String(control?.value ?? "").trim();
    if (!rawValue) {
      return;
    }

    const price = Number(rawValue);
    if (!Number.isFinite(price) || price < 0) {
      issues.push(createProductListingFieldIssue(
        `${fieldLabel} must be a valid number greater than or equal to zero.`,
        control,
      ));
      return;
    }

    if (price > PRODUCT_PRICE_MAX) {
      issues.push(createProductListingFieldIssue(
        `${fieldLabel} cannot exceed ₱${PRODUCT_PRICE_MAX.toLocaleString("en-US")}.`,
        control,
      ));
    }
  });

  const shouldValidateDescriptionText =
    !isProductDescriptionModeSwitcherAvailable()
    || getProductDescriptionMode() === "text";
  const description = String(productDescriptionTextarea?.value ?? "").trim();
  if (
    shouldValidateDescriptionText
    && description.length > PRODUCT_DESCRIPTION_MAX_LENGTH
  ) {
    issues.push(createProductListingFieldIssue(
      `Description cannot exceed ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters.`,
      productDescriptionTextarea,
    ));
  }

  return issues;
}

function getProductValidationIssues() {
  if (!form) {
    return [];
  }

  const issues = [];
  const detailsSectionId = "product-editor-section-details";

  if (!getMainProductImagePreviewUrl()) {
    issues.push({
      label: "Main image is required.",
      sectionId: "product-editor-section-photo",
      focusTarget: "main-image",
    });
  }

  if (!String(form.elements.name?.value ?? "").trim()) {
    issues.push({
      label: "Product Name is required.",
      sectionId: detailsSectionId,
      focusControl: form.elements.name,
    });
  }

  if (!selectedProductCategories.length && !String(categorySelect?.value ?? "").trim()) {
    issues.push({
      label: "Category is required.",
      sectionId: detailsSectionId,
      focusTarget: "category",
    });
  }

  if (!String(form.elements.originalPrice?.value ?? "").trim()) {
    issues.push({
      label: "Original Price is required.",
      sectionId: detailsSectionId,
      focusControl: form.elements.originalPrice,
    });
  }

  if (!String(form.elements.stock?.value ?? "").trim()) {
    issues.push({
      label: "Stock is required.",
      sectionId: detailsSectionId,
      focusControl: form.elements.stock,
    });
  }

  if (!hasProductDescriptionContent()) {
    const isImageDescription = isProductDescriptionModeSwitcherAvailable()
      && getProductDescriptionMode() === "image";
    issues.push({
      label: isImageDescription
        ? "Add at least one square PNG, JPG, or JPEG description photo."
        : "Description text is required.",
      sectionId: detailsSectionId,
      focusControl: getProductDescriptionFocusControl(),
    });
  }

  if (isDescriptionImageProcessing) {
    issues.push({
      label: "Wait for the selected description photos to finish checking.",
      sectionId: detailsSectionId,
      focusControl: getProductDescriptionFocusControl(),
    });
  }

  issues.push(...getProductListingFieldLimitValidationIssues());
  issues.push(...getProductPartnerValidationIssues());
  issues.push(...getAllEditableVariantValidationIssues());

  return issues;
}

function getMainProductSalesPriceLimitIssue() {
  if (!form) {
    return null;
  }

  const originalPriceRaw = String(form.elements.originalPrice?.value ?? "").trim();
  const salesPriceRaw = String(form.elements.salesPrice?.value ?? "").trim();
  if (!originalPriceRaw || !salesPriceRaw) {
    return null;
  }

  const originalPrice = Number(originalPriceRaw);
  const salesPrice = Number(salesPriceRaw);
  if (!Number.isFinite(originalPrice) || !Number.isFinite(salesPrice)) {
    return null;
  }

  if (salesPrice <= originalPrice) {
    return null;
  }

  return {
    label: "Sales price cannot be higher than original price.",
    sectionId: "product-editor-section-details",
    focusControl: form.elements.salesPrice,
  };
}

function hasEditableVariantContent(variant) {
  const name = String(variant?.name ?? "").trim();
  const imageUrl = String(getVariantPreviewUrl(variant) ?? "").trim();
  const originalPrice = String(variant?.originalPrice ?? "").trim();
  const salesPrice = String(variant?.salesPrice ?? "").trim();
  const addOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
  return Boolean(name || imageUrl || originalPrice || salesPrice || addOns.length || variant?.pendingImageFile);
}

function createEditableVariantValidationIssue(variantIndex, variantField, message) {
  return {
    label: `Variant ${variantIndex + 1}: ${message}`,
    sectionId: "product-editor-section-variants",
    focusTarget: "variant-field",
    variantIndex,
    variantField,
  };
}

function getEditableVariantValidationIssues(variant, variantIndex) {
  if (!hasEditableVariantContent(variant)) {
    return [];
  }

  const name = String(variant?.name ?? "").trim();
  const imageUrl = String(getVariantPreviewUrl(variant) ?? "").trim();
  const originalPriceRaw = String(variant?.originalPrice ?? "").trim();
  const salesPriceRaw = String(variant?.salesPrice ?? "").trim();
  const hasOriginalPrice = originalPriceRaw !== "";
  const hasSalesPrice = salesPriceRaw !== "";
  const originalPrice = Number(originalPriceRaw);
  const salesPrice = Number(salesPriceRaw);
  const isOriginalPriceValid = hasOriginalPrice && Number.isFinite(originalPrice) && originalPrice >= 0;
  const isSalesPriceValid = hasSalesPrice && Number.isFinite(salesPrice) && salesPrice >= 0;
  const priceLimitIssues = [];

  if (isOriginalPriceValid && originalPrice > PRODUCT_PRICE_MAX) {
    priceLimitIssues.push(createEditableVariantValidationIssue(
      variantIndex,
      "originalPrice",
      `original price cannot exceed ₱${PRODUCT_PRICE_MAX.toLocaleString("en-US")}.`,
    ));
  }

  if (isSalesPriceValid && salesPrice > PRODUCT_PRICE_MAX) {
    priceLimitIssues.push(createEditableVariantValidationIssue(
      variantIndex,
      "salesPrice",
      `sales price cannot exceed ₱${PRODUCT_PRICE_MAX.toLocaleString("en-US")}.`,
    ));
  }

  if (priceLimitIssues.length) {
    return priceLimitIssues;
  }

  const missingOrInvalidFields = [];
  let focusField = "name";

  if (!name) {
    missingOrInvalidFields.push("name");
    focusField = "name";
  }

  if (!imageUrl) {
    missingOrInvalidFields.push("photo");
    if (focusField === "name" && name) {
      focusField = "image";
    }
  }

  if (!hasOriginalPrice || !isOriginalPriceValid) {
    missingOrInvalidFields.push("original price");
    if (
      (focusField === "name" && name && imageUrl)
      || (focusField === "image" && imageUrl)
    ) {
      focusField = "originalPrice";
    }
  }

  if (
    !hasSalesPrice
    || !isSalesPriceValid
    || (isOriginalPriceValid && isSalesPriceValid && salesPrice > originalPrice)
  ) {
    missingOrInvalidFields.push("sales price");
    if (
      focusField === "image" && imageUrl
      || focusField === "originalPrice" && hasOriginalPrice && isOriginalPriceValid
    ) {
      focusField = "salesPrice";
    }
  }

  if (!missingOrInvalidFields.length) {
    return [];
  }

  return [
    createEditableVariantValidationIssue(
      variantIndex,
      focusField,
      `${missingOrInvalidFields.join(", ")} is required.`,
    ),
  ];
}

function getAllEditableVariantValidationIssues(variants = editingVariants) {
  const normalizedVariants = Array.isArray(variants) ? variants : [];
  return normalizedVariants.reduce((collectedIssues, variant, variantIndex) => {
    collectedIssues.push(...getEditableVariantValidationIssues(variant, variantIndex));
    return collectedIssues;
  }, []);
}

function getEditableVariantMissingAddOnIssues(variants = editingVariants) {
  const normalizedVariants = Array.isArray(variants) ? variants : [];
  return normalizedVariants.reduce((collectedIssues, variant, variantIndex) => {
    const variantId = String(variant?.id ?? "").trim();
    const addOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
    if (variantId || !hasEditableVariantContent(variant) || addOns.length) {
      return collectedIssues;
    }

    collectedIssues.push({
      label: `Variant ${variantIndex + 1}: no add-ons selected.`,
      sectionId: "product-editor-section-variants",
      focusTarget: "variant-field",
      variantIndex,
      variantField: "addOns",
    });
    return collectedIssues;
  }, []);
}

function getVariantFieldElement(variantIndex, variantField) {
  if (!productVariantList) {
    return null;
  }

  return productVariantList.querySelector(
    `[data-variant-index="${variantIndex}"][data-variant-field="${variantField}"]`,
  );
}

function showPendingProductPanelSuccessFeedback() {
  if (!productList || isStandaloneProductEditorPage) {
    return;
  }

  const flashPayload = consumeProductPanelSuccessFlash();
  if (!flashPayload) {
    return;
  }

  openProductSuccessFeedbackModal({
    title: flashPayload.title || "Success",
    copy: flashPayload.copy,
  });
}

function ensureDescriptionModal() {
  if (descriptionModalElements) {
    return descriptionModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className =
    "super-admin-product-detail-modal-overlay seller-listing-detail-drawer-overlay";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  overlay.innerHTML = `
    <section
      class="super-admin-product-detail-modal seller-listing-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-listing-detail-title"
      tabindex="-1"
    >
      <header class="super-admin-product-detail-modal__header seller-listing-detail-drawer__header">
        <div>
          <span class="super-admin-product-detail-modal__header-eyebrow"></span>
          <h2 id="seller-listing-detail-title">Listing Details</h2>
        </div>
        <button
          type="button"
          class="super-admin-product-detail-modal__close seller-listing-detail-drawer__close"
          aria-label="Close listing details"
          title="Close listing details"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </header>
      <div
        class="super-admin-product-detail-modal__body seller-listing-detail-drawer__body"
        id="seller-listing-detail-body"
      >
      </div>
    </section>
  `;

  const modal = overlay.querySelector(".seller-listing-detail-drawer");
  const title = overlay.querySelector("#seller-listing-detail-title");
  const closeButton = overlay.querySelector(".seller-listing-detail-drawer__close");
  const layout = overlay.querySelector("#seller-listing-detail-body");

  const closeModal = (options = {}) => {
    if (overlay.hidden) {
      return;
    }

    const shouldRestoreFocus = options.restoreFocus !== false;
    const trigger = descriptionModalTrigger;
    descriptionModalTrigger = null;

    if (descriptionModalOpenFrame) {
      window.cancelAnimationFrame(descriptionModalOpenFrame);
      descriptionModalOpenFrame = 0;
    }
    if (descriptionModalCloseTimer) {
      window.clearTimeout(descriptionModalCloseTimer);
    }

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    descriptionModalCloseTimer = window.setTimeout(() => {
      overlay.hidden = true;
      document.body.classList.remove("product-description-drawer-open");
      descriptionModalCloseTimer = 0;
      syncModalOpenClass();
      if (shouldRestoreFocus && trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    }, 180);
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  closeButton?.addEventListener("click", () => closeModal());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      closeModal();
    }
  });

  document.body.appendChild(overlay);
  descriptionModalElements = {
    overlay,
    modal,
    title,
    closeButton,
    layout,
    closeModal,
  };
  return descriptionModalElements;
}

function createProductDescriptionReadonlyField(
  labelText,
  value,
  { multiline = false, rows = 7 } = {},
) {
  const label = document.createElement("label");
  label.append(document.createTextNode(labelText));

  const field = multiline ? document.createElement("textarea") : document.createElement("input");
  if (field instanceof HTMLInputElement) {
    field.type = "text";
  } else {
    field.rows = rows;
  }

  field.readOnly = true;
  field.value = String(value ?? "").trim();
  label.append(field);
  return label;
}

function renderProductDescriptionModalDetails(detailsRoot, product) {
  if (!(detailsRoot instanceof HTMLElement)) {
    return;
  }

  const previewName = String(product?.name ?? "").trim() || "Product Name Preview";
  const previewCategory = getProductCategoryLabel(product);
  const originalPrice = getOriginalPrice(product);
  const salesPrice = getSalesPrice(product);
  const previewDescription =
    String(product?.description ?? "").trim() || "No details available about this product yet.";

  const stack = document.createElement("div");
  stack.className = "product-form-details-stack";

  const topGrid = document.createElement("div");
  topGrid.className = "form-grid";
  topGrid.append(
    createProductDescriptionReadonlyField("Product Name", previewName),
    createProductDescriptionReadonlyField("Category", previewCategory),
  );

  const pricingGrid = document.createElement("div");
  pricingGrid.className = "form-grid form-grid--triple";
  pricingGrid.append(
    createProductDescriptionReadonlyField("Original Price", formatPriceAmount(originalPrice)),
    createProductDescriptionReadonlyField(
      "Sales Price",
      salesPrice === null ? "" : formatPriceAmount(salesPrice),
    ),
    createProductDescriptionReadonlyField("Stock", String(getStock(product))),
  );

  const descriptionField = createProductDescriptionReadonlyField(
    "About this product",
    previewDescription,
    { multiline: true, rows: 7 },
  );

  stack.append(topGrid, pricingGrid, descriptionField);
  detailsRoot.replaceChildren(stack);
}

function enableStaticProductDescriptionPreviewSwipe(previewRoot) {
  if (!(previewRoot instanceof HTMLElement)) {
    return;
  }

  const hero = previewRoot.querySelector(".android-preview-details__hero");
  const heroTrack = previewRoot.querySelector(".android-preview-details__hero-track");
  const indicatorRail = previewRoot.querySelector(".android-preview-details__hero-indicators");
  if (!(hero instanceof HTMLElement) || !(heroTrack instanceof HTMLElement)) {
    return;
  }

  const slides = Array.from(heroTrack.querySelectorAll(".android-preview-details__hero-slide"));
  const indicators = indicatorRail
    ? Array.from(indicatorRail.querySelectorAll(".android-preview-details__hero-indicator"))
    : [];
  if (slides.length <= 1) {
    hero.classList.remove("is-slideable", "is-dragging");
    hero.removeAttribute("tabindex");
    hero.removeAttribute("role");
    hero.removeAttribute("aria-label");
    return;
  }

  const getInitialSlideIndex = () => {
    const transformValue = String(heroTrack.style.transform ?? "");
    const match = transformValue.match(/translateX\(-(\d+(?:\.\d+)?)%\)/);
    if (!match) {
      return 0;
    }

    const parsedIndex = Number.parseFloat(match[1]) / 100;
    return Number.isFinite(parsedIndex)
      ? Math.min(Math.max(Math.round(parsedIndex), 0), slides.length - 1)
      : 0;
  };

  let activeIndex = getInitialSlideIndex();
  let pointerStartX = 0;
  let pointerCurrentX = 0;
  let isDraggingHero = false;

  const syncStaticHeroPosition = () => {
    heroTrack.style.transform = `translateX(-${activeIndex * 100}%)`;
    hero.setAttribute("aria-label", `Preview media, ${activeIndex + 1} of ${slides.length}`);
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle("is-active", index === activeIndex);
    });
  };

  const finishHeroSwipe = (event) => {
    if (!isDraggingHero) {
      return;
    }

    isDraggingHero = false;
    hero.classList.remove("is-dragging");
    const deltaX = pointerCurrentX - pointerStartX;
    const swipeThreshold = Math.max(40, hero.clientWidth * 0.12);

    if (event?.pointerId !== undefined && hero.hasPointerCapture?.(event.pointerId)) {
      hero.releasePointerCapture(event.pointerId);
    }

    if (deltaX <= -swipeThreshold && activeIndex < slides.length - 1) {
      activeIndex += 1;
    } else if (deltaX >= swipeThreshold && activeIndex > 0) {
      activeIndex -= 1;
    }

    syncStaticHeroPosition();
  };

  hero.classList.add("is-slideable");
  hero.tabIndex = 0;
  hero.setAttribute("role", "group");
  syncStaticHeroPosition();

  hero.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerStartX = event.clientX;
    pointerCurrentX = event.clientX;
    isDraggingHero = true;
    hero.classList.add("is-dragging");
    hero.setPointerCapture?.(event.pointerId);
  });

  hero.addEventListener("pointermove", (event) => {
    if (!isDraggingHero) {
      return;
    }

    pointerCurrentX = event.clientX;
    const offsetX = pointerCurrentX - pointerStartX;
    heroTrack.style.transform = `translateX(calc(-${activeIndex * 100}% + ${offsetX}px))`;
    event.preventDefault();
  });

  hero.addEventListener("pointerup", finishHeroSwipe);
  hero.addEventListener("pointercancel", finishHeroSwipe);
  hero.addEventListener("lostpointercapture", finishHeroSwipe);
  hero.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && activeIndex > 0) {
      event.preventDefault();
      activeIndex -= 1;
      syncStaticHeroPosition();
    }

    if (event.key === "ArrowRight" && activeIndex < slides.length - 1) {
      event.preventDefault();
      activeIndex += 1;
      syncStaticHeroPosition();
    }
  });
}

function createStaticProductDescriptionModalPreview(product) {
  const draftProduct = product && typeof product === "object" ? product : {};
  const draftId = String(draftProduct?.id ?? "__draft-preview__");
  const previewName = String(draftProduct?.name ?? "").trim() || "Product Name Preview";
  const previewCategory = getProductCategoryLabel(draftProduct);
  const previewInitial = previewName[0]?.toUpperCase() ?? "P";
  const previewDescription =
    String(draftProduct?.description ?? "").trim() ||
    "No details available about this product yet.";
  const topSellerIds = buildPreviewTopSellerIdSet(draftProduct);
  const originalPrice = getOriginalPrice(draftProduct);
  const salesPrice = getSalesPrice(draftProduct);
  const hasSalesPrice = salesPrice !== null && salesPrice >= 0 && salesPrice < originalPrice;
  const showOriginalPrice = hasSalesPrice;
  const displayPrice = hasSalesPrice ? salesPrice : originalPrice;
  const discountPercent = getDiscountPercent(draftProduct);
  const isTopRated = isTopRatedProduct(draftProduct);
  const showsTopSellerBadge = topSellerIds.has(draftId);
  const postedDate = formatPreviewPostedDate(draftProduct?.createdAt);

  const interactivePreview = createAndroidProductDetailsPreview({
    draftProduct,
    previewName,
    previewCategory,
    previewInitial,
    previewDescription,
    originalPrice,
    displayPrice,
    showOriginalPrice,
    discountPercent,
    isTopRated,
    showsTopSellerBadge,
    postedDate,
  });

  const staticPreview = interactivePreview.cloneNode(true);
  const hero = staticPreview.querySelector(".android-preview-details__hero");
  if (hero instanceof HTMLElement) {
    hero.classList.remove("is-clickable", "is-dragging");
  }

  staticPreview.querySelectorAll("button").forEach((button) => {
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  });

  enableStaticProductDescriptionPreviewSwipe(staticPreview);

  return staticPreview;
}

function renderProductDescriptionModalPreview(previewRoot, product) {
  if (!(previewRoot instanceof HTMLElement)) {
    return;
  }

  previewRoot.replaceChildren(createStaticProductDescriptionModalPreview(product));
}

function createSellerListingDetailIcon(pathMarkup) {
  const icon = document.createElement("span");
  icon.className = "super-admin-product-detail-modal__icon";
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${pathMarkup}
    </svg>
  `;
  return icon;
}

function hasSellerListingDetailValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return Boolean(value.trim());
  }
  return true;
}

function formatSellerListingDetailValue(value, fallback = "-") {
  if (!hasSellerListingDetailValue(value)) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : fallback;
  }
  return String(value).trim() || fallback;
}

function formatSellerListingDetailMoney(value, fallback = "Not set") {
  if (!hasSellerListingDetailValue(value)) {
    return fallback;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? formatPrice(amount) : fallback;
}

function formatSellerListingDetailDate(value, { includeTime = false, fallback = "-" } = {}) {
  if (!hasSellerListingDetailValue(value)) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function createSellerListingDetailField(label, value, options = {}) {
  const row = document.createElement("div");
  row.className = "super-admin-product-detail-modal__field";
  row.classList.toggle("is-wide", options.wide === true);
  row.classList.toggle("is-multiline", options.multiline === true);
  if (options.className) {
    row.classList.add(...String(options.className).split(/\s+/).filter(Boolean));
  }

  const labelElement = document.createElement("span");
  labelElement.className = "super-admin-product-detail-modal__field-label";
  labelElement.textContent = String(label || "").trim();

  const valueElement = document.createElement("span");
  valueElement.className = "super-admin-product-detail-modal__field-value";
  if (options.valueClassName) {
    valueElement.classList.add(options.valueClassName);
  }
  if (value instanceof Node) {
    valueElement.append(value);
  } else {
    valueElement.textContent = formatSellerListingDetailValue(value, options.fallback || "-");
  }

  row.append(labelElement, valueElement);
  return row;
}

function createSellerListingDetailPriceValue(product) {
  const originalPrice = getOriginalPrice(product);
  const salesPrice = getSalesPrice(product);
  const hasDiscount = salesPrice !== null && originalPrice > 0 && salesPrice >= 0 && salesPrice < originalPrice;
  const valueStack = document.createElement("div");
  valueStack.className = "seller-listing-detail-drawer__price-stack";

  const primaryPrice = document.createElement("span");
  primaryPrice.className = "seller-listing-detail-drawer__price-primary";
  primaryPrice.textContent = formatSellerListingDetailMoney(hasDiscount ? salesPrice : originalPrice);
  valueStack.appendChild(primaryPrice);

  if (hasDiscount) {
    const originalPriceLine = document.createElement("span");
    originalPriceLine.className = "seller-listing-detail-drawer__price-original";
    originalPriceLine.textContent = formatSellerListingDetailMoney(originalPrice);
    valueStack.appendChild(originalPriceLine);
  }

  return valueStack;
}

function createSellerListingDetailFieldGrid(fields) {
  const grid = document.createElement("div");
  grid.className = "super-admin-product-detail-modal__field-grid";
  fields.filter((field) => field instanceof Node).forEach((field) => grid.append(field));
  return grid;
}

function createSellerListingDetailSection(title, children, className = "") {
  const visibleChildren = (Array.isArray(children) ? children : [])
    .filter((child) => child instanceof Node);
  if (!visibleChildren.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "super-admin-product-detail-modal__section";
  if (className) {
    section.classList.add(...className.split(/\s+/).filter(Boolean));
  }
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading, ...visibleChildren);
  return section;
}

function getSellerListingDetailMediaItems(product) {
  return getProductGalleryItems(product)
    .map((item, galleryIndex) => ({ ...item, galleryIndex }))
    .sort((left, right) => {
      const leftOrder = left.type === "image" ? 0 : 1;
      const rightOrder = right.type === "image" ? 0 : 1;
      return leftOrder - rightOrder;
    });
}

function createSellerListingDetailLiveBadge() {
  const badge = document.createElement("span");
  badge.className = "super-admin-product-detail-modal__live-badge";
  badge.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16.247 7.761a6 6 0 0 1 0 8.478"></path>
      <path d="M19.075 4.933a10 10 0 0 1 0 14.134"></path>
      <path d="M4.925 19.067a10 10 0 0 1 0-14.134"></path>
      <path d="M7.753 16.239a6 6 0 0 1 0-8.478"></path>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
    Live
  `;
  return badge;
}

function createSellerListingDetailStatusBadge(product) {
  if (getProductApprovalStatus(product) === "pending") {
    const badge = document.createElement("span");
    badge.className = "super-admin-product-detail-modal__hero-status-badge is-warning";
    badge.textContent = "In review";
    return badge;
  }
  if (isActiveProductInApp(product)) {
    return createSellerListingDetailLiveBadge();
  }

  const badge = document.createElement("span");
  badge.className = "super-admin-product-detail-modal__hero-status-badge is-offline";
  badge.textContent = "Offline";
  return badge;
}

function openSellerListingDetailMedia(product, galleryIndex = 0) {
  openProductGallery(product, galleryIndex);
}

function createSellerListingDetailMediaCarousel(product, mediaItems, statusBadge) {
  const carousel = document.createElement("div");
  carousel.className = "super-admin-product-detail-modal__hero-gallery";
  carousel.classList.toggle("has-single-item", mediaItems.length === 1);
  carousel.setAttribute("aria-label", "Product media");

  const header = document.createElement("div");
  header.className = "super-admin-product-detail-modal__hero-gallery-header";
  const badgeRow = document.createElement("div");
  badgeRow.className = "super-admin-product-detail-modal__hero-badge-row";
  badgeRow.append(statusBadge);

  const controls = document.createElement("div");
  controls.className = "super-admin-product-detail-modal__hero-gallery-controls";
  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "super-admin-product-detail-modal__hero-gallery-button";
  previousButton.setAttribute("aria-label", "Previous media");
  previousButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
  `;
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "super-admin-product-detail-modal__hero-gallery-button";
  nextButton.setAttribute("aria-label", "Next media");
  nextButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
  `;
  controls.append(previousButton, nextButton);
  header.append(badgeRow, controls);

  const track = document.createElement("div");
  track.className = "super-admin-product-detail-modal__hero-gallery-track";
  track.setAttribute("role", "list");

  const syncControls = () => {
    const canScroll = track.scrollWidth > track.clientWidth + 1;
    controls.hidden = !canScroll;
    previousButton.disabled = !canScroll || track.scrollLeft <= 1;
    nextButton.disabled =
      !canScroll || track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
  };

  mediaItems.forEach((item, index) => {
    const mediaButton = document.createElement("button");
    mediaButton.type = "button";
    mediaButton.className = "super-admin-product-detail-modal__hero-gallery-item";
    mediaButton.setAttribute("role", "listitem");
    mediaButton.setAttribute("aria-label", item.label || `Product media ${index + 1}`);
    mediaButton.title = item.label || `Product media ${index + 1}`;

    const previewUrl = item.type === "video" ? item.thumbnailUrl : item.url;
    if (previewUrl) {
      const image = document.createElement("img");
      image.src = previewUrl;
      image.alt = item.label || `Product media ${index + 1}`;
      image.loading = "lazy";
      image.addEventListener("load", syncControls);
      mediaButton.append(image);

      const hoverOverlay = document.createElement("span");
      hoverOverlay.className = "super-admin-product-detail-modal__hero-hover-overlay";
      hoverOverlay.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>
        </svg>
      `;
      mediaButton.append(hoverOverlay);
    } else {
      mediaButton.append(createSellerListingDetailIcon(
        '<path d="m10 8 6 4-6 4Z" stroke-linejoin="round"></path><rect width="20" height="14" x="2" y="5" rx="2"></rect>',
      ));
    }

    const typeBadge = document.createElement("span");
    typeBadge.className = "super-admin-product-detail-modal__hero-gallery-type";
    typeBadge.title = item.type === "video" ? "Video" : "Image";
    typeBadge.innerHTML = item.type === "video"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
    mediaButton.append(typeBadge);
    mediaButton.addEventListener("click", () => {
      openSellerListingDetailMedia(product, item.galleryIndex);
    });
    track.append(mediaButton);
  });

  const scrollTrack = (direction) => {
    track.scrollBy({
      left: direction * Math.max(160, track.clientWidth),
      behavior: "smooth",
    });
    window.setTimeout(syncControls, 180);
  };
  previousButton.addEventListener("click", () => scrollTrack(-1));
  nextButton.addEventListener("click", () => scrollTrack(1));
  track.addEventListener("scroll", syncControls, { passive: true });
  window.setTimeout(syncControls, 0);
  window.setTimeout(syncControls, 160);

  carousel.append(header, track);
  return carousel;
}

function createSellerListingDetailHero(product) {
  const hero = document.createElement("section");
  hero.className = "super-admin-product-detail-modal__hero";
  const mediaItems = getSellerListingDetailMediaItems(product);
  const useMediaCarousel = mediaItems.length > 1 || mediaItems.some((item) => item.type === "video");
  const statusBadge = createSellerListingDetailStatusBadge(product);

  const visual = document.createElement("div");
  visual.className = "super-admin-product-detail-modal__hero-visual";
  visual.classList.toggle("is-media-only", useMediaCarousel);
  visual.classList.toggle("is-single-image", mediaItems.length === 1 && !useMediaCarousel);

  if (useMediaCarousel) {
    visual.append(createSellerListingDetailMediaCarousel(product, mediaItems, statusBadge));
  } else {
    const media = document.createElement("div");
    media.className = "super-admin-product-detail-modal__hero-media";
    const item = mediaItems[0];
    if (item?.url) {
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = String(product?.name || "Product image").trim();
      media.append(image);

      const zoomButton = document.createElement("button");
      zoomButton.type = "button";
      zoomButton.className = "super-admin-product-image-zoom-button seller-listing-detail-drawer__media-button";
      zoomButton.setAttribute("aria-label", `View ${String(product?.name || "product").trim()} media`);
      zoomButton.title = "View product media";
      zoomButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>
        </svg>
      `;
      zoomButton.addEventListener("click", () => {
        openSellerListingDetailMedia(product, item.galleryIndex);
      });
      media.classList.add("has-image-zoom");
      media.append(zoomButton);
    } else {
      media.append(createSellerListingDetailIcon(
        '<path d="M5 7.5h14v9H5z" stroke-linejoin="round"></path><path d="m7.5 15 3.5-3.6 2.2 2.2 1.4-1.5 2 2.9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M8.5 9.2h.01" stroke-linecap="round" stroke-width="3"></path>',
      ));
    }
    media.append(statusBadge);
    visual.append(media);
  }

  const copy = document.createElement("div");
  copy.className = "super-admin-product-detail-modal__hero-copy";
  const titleRow = document.createElement("div");
  titleRow.className = "super-admin-product-detail-modal__title-row";
  const title = document.createElement("h3");
  title.dataset.sellerListingDetailName = "true";
  title.textContent = String(product?.name || "Unnamed product").trim();
  titleRow.append(title);
  copy.append(titleRow);
  hero.append(visual, copy);
  return hero;
}

function getSellerListingTypeLabel(product) {
  const createdAt = new Date(product?.createdAt || product?.submittedAt || "");
  const updatedAt = new Date(product?.updatedAt || product?.approvalUpdatedAt || "");
  if (
    !Number.isNaN(createdAt.getTime())
    && !Number.isNaN(updatedAt.getTime())
    && updatedAt.getTime() - createdAt.getTime() > 60 * 1000
  ) {
    return "Edited";
  }
  return "New listing";
}

function getSellerListingStoreLabel(product) {
  const session = readProductPanelSessionStorageJson("gms-admin-session") || {};
  return String(
    product?.storeName
      || product?.businessName
      || product?.companyName
      || session.companyName
      || session.businessName
      || session.storeName
      || session.email
      || "Seller store",
  ).trim();
}

function getSellerListingDiscountLabel(product) {
  const originalPrice = getOriginalPrice(product);
  const salesPrice = getSalesPrice(product);
  if (salesPrice === null || originalPrice <= 0 || salesPrice < 0 || salesPrice >= originalPrice) {
    return "No discount";
  }
  return `${Math.round(((originalPrice - salesPrice) / originalPrice) * 100)}% off`;
}

function createSellerListingRatingStarMarkup(rating) {
  const score = Number(rating);
  const normalizedScore = Number.isFinite(score) && score > 0 ? Math.min(5, Math.max(0, score)) : 0;
  const fillPercent = Math.round((normalizedScore / 5) * 100);
  return `
    <span class="seller-listing-detail-drawer__rating-star" style="--star-fill: ${fillPercent}%" aria-hidden="true">
      <span class="seller-listing-detail-drawer__rating-star-base">&#9733;</span>
      <span class="seller-listing-detail-drawer__rating-star-fill">&#9733;</span>
    </span>
  `;
}

function createSellerListingDetailRatingValue(product) {
  const rating = Number(product?.rating ?? product?.productRating ?? 0);
  const score = Number.isFinite(rating) && rating > 0 ? Math.min(5, Math.max(0, rating)) : 0;
  const value = document.createElement("span");
  value.className = "seller-listing-detail-drawer__rating-value";
  value.setAttribute("aria-label", `${score.toFixed(1)} out of 5 stars`);
  value.innerHTML = `${createSellerListingRatingStarMarkup(score)}<span class="seller-listing-detail-drawer__rating-text">${score.toFixed(1)}</span>`;
  return value;
}

function createSellerListingDetailsSection(product) {
  const discountLabel = getSellerListingDiscountLabel(product);
  const fields = [
    createSellerListingDetailField("Listing ID", product?.sku || product?.code || product?.id),
    createSellerListingDetailField("Price", createSellerListingDetailPriceValue(product)),
    createSellerListingDetailField("Stock", getStock(product).toLocaleString()),
    createSellerListingDetailField("Sold", getSold(product).toLocaleString()),
    createSellerListingDetailField("Rating", createSellerListingDetailRatingValue(product), {
      className: "seller-listing-detail-drawer__field--rating",
    }),
    createSellerListingDetailField("Review / Comment Count", getProductReviewCount(product).toLocaleString()),
    createSellerListingDetailField("Discount", discountLabel, {
      valueClassName: discountLabel !== "No discount" ? "seller-listing-detail-drawer__discount-badge" : "",
    }),
    createSellerListingDetailField("Expiry Date", formatSellerListingDetailDate(
      getListingActiveExpiryDate(product) || product?.expiryDate,
    )),
    createSellerListingDetailField("Barcode", product?.barcode || "Not set"),
    createSellerListingDetailField(
      "Move Barcode To Packing",
      Boolean(product?.moveBarcodeToPackingDashboard),
    ),
    createSellerListingDetailField(
      "Stocked Date",
      formatSellerListingDetailDate(product?.stockedDate, { includeTime: true }),
    ),
  ];
  return createSellerListingDetailSection(
    "Listing Details",
    [createSellerListingDetailFieldGrid(fields)],
    "super-admin-product-detail-modal__section--listing-details",
  );
}

function getSellerListingTags(product) {
  const values = [
    ...(Array.isArray(product?.tags) ? product.tags : []),
    ...getProductCategoryList(product),
  ];
  const seen = new Set();
  return values.map((value) => String(value || "").trim()).filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function createSellerListingTagsSection(product) {
  const tags = getSellerListingTags(product);
  if (!tags.length) {
    return null;
  }
  const tagList = document.createElement("div");
  tagList.className = "super-admin-product-detail-modal__tag-list";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "super-admin-product-detail-modal__tag-chip";
    chip.textContent = tag;
    tagList.append(chip);
  });
  return createSellerListingDetailSection(
    "Tags",
    [tagList],
    "super-admin-product-detail-modal__section--tags",
  );
}

function createSellerListingDescriptionSection(product) {
  const descriptionText = String(product?.description || "").trim();
  const descriptionImageUrls = Array.from(new Set(
    (Array.isArray(product?.descriptionImageUrls) ? product.descriptionImageUrls : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
  if (!descriptionText && !descriptionImageUrls.length) {
    return null;
  }

  const content = [];
  if (descriptionText) {
    const description = document.createElement("p");
    description.className = "super-admin-product-detail-modal__description-text";
    description.dataset.sellerListingDescriptionText = "true";
    description.textContent = descriptionText;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "super-admin-product-detail-modal__description-toggle";
    toggle.dataset.sellerListingDescriptionToggle = "true";
    toggle.textContent = "Show more";
    toggle.hidden = true;
    content.push(description, toggle);
  }

  if (descriptionImageUrls.length) {
    const mediaGrid = document.createElement("div");
    mediaGrid.className = "super-admin-product-detail-modal__description-media-grid";
    descriptionImageUrls.forEach((imageUrl, index) => {
      const mediaButton = document.createElement("button");
      mediaButton.type = "button";
      mediaButton.className = "super-admin-product-detail-modal__description-media-item";
      mediaButton.setAttribute("aria-label", `View description image ${index + 1}`);
      mediaButton.title = "View image";
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = `${String(product?.name || "Product").trim()} description image ${index + 1}`;
      image.loading = "lazy";
      const zoomHint = document.createElement("span");
      zoomHint.className = "super-admin-product-detail-modal__description-media-zoom";
      zoomHint.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
      `;
      mediaButton.append(image, zoomHint);
      mediaButton.addEventListener("click", () => {
        openPreviewImageGallery(product?.name || "Product", descriptionImageUrls, index);
      });
      mediaGrid.append(mediaButton);
    });
    content.push(mediaGrid);
  }

  return createSellerListingDetailSection(
    "Description",
    content,
    "super-admin-product-detail-modal__section--description",
  );
}

function setupSellerListingDescriptionToggle(container) {
  const description = container?.querySelector?.("[data-seller-listing-description-text]");
  const toggle = container?.querySelector?.("[data-seller-listing-description-toggle]");
  if (!(description instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
    return;
  }

  const sync = () => {
    const isExpanded = description.classList.contains("is-expanded");
    const isOverflowing = description.scrollHeight > description.clientHeight + 1;
    toggle.hidden = !isExpanded && !isOverflowing;
    toggle.textContent = isExpanded ? "Show less" : "Show more";
    toggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  };
  toggle.addEventListener("click", () => {
    const isExpanded = description.classList.toggle("is-expanded");
    description.style.maxHeight = isExpanded ? `${description.scrollHeight}px` : "";
    sync();
  });
  window.requestAnimationFrame(sync);
  window.setTimeout(sync, 120);
}

function getSellerListingPartnerRecord(type, partnerId) {
  const id = String(partnerId || "").trim().toLowerCase();
  const partners = type === "payment" ? currentPaymentPartners : currentDeliveryPartners;
  return (Array.isArray(partners) ? partners : []).find(
    (partner) => getProductPartnerId(partner).toLowerCase() === id,
  ) || null;
}

function getSellerListingPartnerFallbackLabel(partnerId) {
  return String(partnerId || "Partner")
    .replace(/^(?:delivery|payment)-partner-/i, "")
    .replace(/-\d{8,}$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || "Partner";
}

function createSellerListingPartnerList(type, partnerIds) {
  const ids = normalizeProductPartnerIds(partnerIds);
  const list = document.createElement("div");
  list.className = "super-admin-product-detail-modal__partner-list";
  if (!ids.length) {
    const empty = document.createElement("span");
    empty.className = "super-admin-product-detail-modal__partner-empty";
    empty.textContent = "None selected";
    list.append(empty);
    return list;
  }

  ids.forEach((id) => {
    const partner = getSellerListingPartnerRecord(type, id);
    const label = partner
      ? getProductPartnerLabel(partner, getSellerListingPartnerFallbackLabel(id))
      : getSellerListingPartnerFallbackLabel(id);
    const badge = document.createElement("span");
    badge.className = "super-admin-product-detail-modal__partner-badge";
    badge.title = label;
    badge.setAttribute("aria-label", label);
    const appendFallback = () => {
      badge.append(createSellerListingDetailIcon(
        type === "payment"
          ? '<rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line>'
          : '<path d="M10 17h4V5H2v12h3"></path><path d="M14 9h4l4 4v4h-3"></path><circle cx="7.5" cy="17.5" r="2.5"></circle><circle cx="16.5" cy="17.5" r="2.5"></circle>',
      ));
    };
    const imageUrl = getProductPartnerImageUrl(partner);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = label;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.remove();
        appendFallback();
      }, { once: true });
      badge.append(image);
    } else {
      appendFallback();
    }
    list.append(badge);
  });
  return list;
}

function createSellerListingPartnersSection(product) {
  const section = document.createElement("section");
  section.className =
    "super-admin-product-detail-modal__section super-admin-product-detail-modal__section--partner-methods";
  const createBlock = (titleText, content) => {
    const block = document.createElement("div");
    block.className = "super-admin-product-detail-modal__partner-method";
    const title = document.createElement("h3");
    title.className = "super-admin-product-detail-modal__partner-method-title";
    title.textContent = titleText;
    block.append(title, content);
    return block;
  };
  section.append(
    createBlock(
      "Type of Delivery",
      createSellerListingPartnerList("delivery", product?.deliveryPartnerIds),
    ),
    createBlock(
      "Payment Method",
      createSellerListingPartnerList("payment", product?.paymentPartnerIds),
    ),
  );
  return section;
}

function createSellerListingVariantsSection(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) {
    return null;
  }

  const section = document.createElement("section");
  section.className =
    "super-admin-product-detail-modal__section super-admin-product-detail-modal__section--variants";
  const heading = document.createElement("h3");
  heading.textContent = "Variants";
  const list = document.createElement("div");
  list.className = "super-admin-product-detail-modal__variant-list";

  variants.forEach((variant, index) => {
    const dropdown = document.createElement("details");
    dropdown.className = "super-admin-product-detail-modal__variant-dropdown";
    dropdown.dataset.variantAnimating = "false";
    const summary = document.createElement("summary");
    summary.className = "super-admin-product-detail-modal__variant-summary";
    const title = document.createElement("span");
    title.className = "super-admin-product-detail-modal__variant-title";
    const titleText = String(variant?.name || `Variant ${index + 1}`).trim();
    const titleTrack = document.createElement("span");
    titleTrack.className = "super-admin-product-detail-modal__variant-title-track";
    titleTrack.dataset.variantTitle = titleText;
    titleTrack.textContent = titleText;
    title.append(titleTrack);
    const meta = document.createElement("span");
    meta.className = "super-admin-product-detail-modal__variant-meta";
    meta.textContent = `${formatSellerListingDetailMoney(
      variant?.salesPrice ?? variant?.originalPrice ?? variant?.price,
    )} · ${formatSellerListingDetailValue(variant?.stock ?? 0)} stock`;
    summary.append(title, meta);

    const fields = [
      createSellerListingDetailField("Variant ID", variant?.id),
      createSellerListingDetailField(
        "Original Price",
        formatSellerListingDetailMoney(variant?.originalPrice ?? variant?.price),
      ),
      createSellerListingDetailField(
        "Sales Price",
        formatSellerListingDetailMoney(variant?.salesPrice),
      ),
      createSellerListingDetailField("Stock", variant?.stock ?? 0),
    ];
    const addOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
    if (addOns.length) {
      fields.push(createSellerListingDetailField(
        "Add-ons",
        addOns.map((addOn) =>
          `${String(addOn?.name || addOn?.id || "Add-on").trim()} x ${
            formatSellerListingDetailValue(addOn?.quantity ?? 1)
          }`
        ).join(", "),
        { wide: true, multiline: true },
      ));
    }

    const grid = createSellerListingDetailFieldGrid(fields);
    grid.classList.add("super-admin-product-detail-modal__variant-field-grid");
    const content = document.createElement("div");
    content.className = "super-admin-product-detail-modal__variant-content";
    const contentInner = document.createElement("div");
    contentInner.className = "super-admin-product-detail-modal__variant-content-inner";
    const imageUrl = String(variant?.imageUrl || "").trim();
    if (imageUrl) {
      const imagePreview = document.createElement("span");
      imagePreview.className = "super-admin-product-detail-modal__variant-image-preview";
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = `${titleText} image`;
      image.loading = "lazy";
      imagePreview.append(image);
      contentInner.append(imagePreview);
    }
    contentInner.append(grid);
    content.append(contentInner);
    dropdown.append(summary, content);

    window.requestAnimationFrame(() => {
      title.classList.toggle("is-marquee", titleTrack.scrollWidth > title.clientWidth + 2);
    });
    summary.addEventListener("click", (event) => {
      if (dropdown.dataset.variantAnimating === "true") {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      dropdown.dataset.variantAnimating = "true";
      if (!dropdown.open) {
        dropdown.open = true;
        content.getBoundingClientRect();
        window.requestAnimationFrame(() => {
          dropdown.classList.add("is-open");
          window.setTimeout(() => {
            dropdown.dataset.variantAnimating = "false";
          }, 220);
        });
        return;
      }
      dropdown.classList.remove("is-open");
      dropdown.classList.add("is-closing");
      window.setTimeout(() => {
        dropdown.open = false;
        dropdown.classList.remove("is-closing");
        dropdown.dataset.variantAnimating = "false";
      }, 220);
    });
    list.append(dropdown);
  });

  section.append(heading, list);
  return section;
}

function createSellerListingRevisionSection(product) {
  const revision = product?.yoloRevision && typeof product.yoloRevision === "object"
    ? product.yoloRevision
    : product?.revisionSignal && typeof product.revisionSignal === "object"
      ? product.revisionSignal
      : null;
  const message = String(
    revision?.message || revision?.reason || product?.revisionMessage || "",
  ).trim();
  if (!message) {
    return null;
  }
  const copy = document.createElement("p");
  copy.className =
    "super-admin-product-detail-modal__description-text super-admin-product-detail-modal__ai-inspection-text";
  copy.textContent = message;
  return createSellerListingDetailSection(
    "Revision Request",
    [copy],
    "super-admin-product-detail-modal__section--ai-inspection",
  );
}

function renderSellerListingDetailDrawer(container, product) {
  if (!(container instanceof HTMLElement)) {
    return null;
  }
  const sourceProduct = getDisplayProductSourceProduct(product);
  const displayProduct = sourceProduct === product
    ? sourceProduct
    : {
        ...sourceProduct,
        stock: product?.stock ?? sourceProduct?.stock,
        expiryDate:
          getListingActiveExpiryDate(product)
          || product?.expiryDate
          || getListingActiveExpiryDate(sourceProduct)
          || sourceProduct?.expiryDate,
        isActive: product?.isActive ?? sourceProduct?.isActive,
      };
  const sections = [
    createSellerListingDetailHero(displayProduct),
    createSellerListingDetailsSection(displayProduct),
    createSellerListingTagsSection(displayProduct),
    createSellerListingDescriptionSection(displayProduct),
    createSellerListingVariantsSection(displayProduct),
    createSellerListingPartnersSection(displayProduct),
    createSellerListingRevisionSection(displayProduct),
  ].filter((section) => section instanceof Node);
  container.replaceChildren(...sections);
  setupSellerListingDescriptionToggle(container);
  return displayProduct;
}

function openDescriptionModal(product, trigger = null) {
  const { overlay, title, closeButton, layout } =
    ensureDescriptionModal();
  const displayProduct = renderSellerListingDetailDrawer(layout, product);

  const syncHeaderTitle = () => {
    if (!(title instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
      return;
    }
    const productNameHeading = layout.querySelector("[data-seller-listing-detail-name]");
    if (!(productNameHeading instanceof HTMLElement)) {
      title.textContent = "Listing Details";
      return;
    }
    const bodyRect = layout.getBoundingClientRect();
    const nameRect = productNameHeading.getBoundingClientRect();
    title.textContent = nameRect.bottom <= bodyRect.top + 6
      ? String(displayProduct?.name || "Listing Details").trim()
      : "Listing Details";
  };
  if (layout instanceof HTMLElement) {
    layout.onscroll = syncHeaderTitle;
  }

  if (descriptionModalCloseTimer) {
    window.clearTimeout(descriptionModalCloseTimer);
    descriptionModalCloseTimer = 0;
  }
  if (descriptionModalOpenFrame) {
    window.cancelAnimationFrame(descriptionModalOpenFrame);
  }

  descriptionModalTrigger = trigger instanceof HTMLElement
    ? trigger
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const isAlreadyOpen = !overlay.hidden && overlay.classList.contains("is-open");
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("product-description-drawer-open");
  if (layout instanceof HTMLElement) {
    layout.scrollTop = 0;
  }
  syncHeaderTitle();
  syncModalOpenClass();

  if (isAlreadyOpen) {
    closeButton?.focus({ preventScroll: true });
    return;
  }

  overlay.classList.remove("is-open");
  descriptionModalOpenFrame = window.requestAnimationFrame(() => {
    descriptionModalOpenFrame = 0;
    if (overlay.hidden) {
      return;
    }
    overlay.classList.add("is-open");
    syncHeaderTitle();
    closeButton?.focus({ preventScroll: true });
  });
}

function ensureProductGalleryModal() {
  if (productGalleryModalElements) {
    return productGalleryModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "product-gallery-modal-overlay";
  overlay.hidden = true;

  overlay.innerHTML = `
    <div
      class="product-gallery-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-gallery-title"
    >
      <div class="product-gallery-modal__header">
        <div>
          <h2 id="product-gallery-title">Product images</h2>
          <p class="product-gallery-modal__meta" id="product-gallery-meta"></p>
        </div>
        <div class="product-gallery-modal__header-actions">
          <button
            type="button"
            class="product-gallery-modal__model-button"
            id="product-gallery-model-button"
            aria-label="View 3D model"
            title="No 3D model uploaded"
            disabled
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            <span>3D</span>
          </button>
          <button
            type="button"
            class="product-gallery-modal__close"
            aria-label="Close product gallery"
            title="Close product gallery"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="product-gallery-modal__viewer">
        <button
          type="button"
          class="product-gallery-modal__nav-button"
          data-gallery-nav="prev"
          aria-label="Previous image"
          title="Previous image"
        >
          <svg
            class="product-gallery-modal__nav-icon"
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M27.5 15.5 18 24l9.5 8.5"></path>
          </svg>
        </button>
        <div class="product-gallery-modal__stage-shell">
          <div
            class="product-gallery-modal__stage"
            id="product-gallery-stage"
            tabindex="0"
            aria-label="Product image preview. Use the zoom slider below."
          >
            <img id="product-gallery-image" alt="" />
            <video
              id="product-gallery-video"
              playsinline
              controls
              preload="metadata"
              hidden
            ></video>
            <div
              class="product-gallery-modal__model-viewer"
              id="product-gallery-model-viewer"
              hidden
            ></div>
          </div>
          <div
            class="product-gallery-modal__crop-guide"
            id="product-gallery-crop-guide"
            hidden
            aria-hidden="true"
          >
            <div
              class="product-gallery-modal__crop-guide-window"
              id="product-gallery-crop-guide-window"
            ></div>
          </div>
        </div>
        <button
          type="button"
          class="product-gallery-modal__nav-button"
          data-gallery-nav="next"
          aria-label="Next image"
          title="Next image"
        >
          <svg
            class="product-gallery-modal__nav-icon"
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M20.5 15.5 30 24l-9.5 8.5"></path>
          </svg>
        </button>
      </div>
      <div class="product-gallery-modal__zoom" id="product-gallery-zoom-controls">
        <button
          type="button"
          class="product-gallery-modal__zoom-button"
          id="product-gallery-zoom-out"
          aria-label="Zoom out"
          title="Zoom out"
        >
          -
        </button>
        <input
          type="range"
          class="product-gallery-modal__zoom-range"
          id="product-gallery-zoom-range"
          min="0"
          max="500"
          step="1"
          value="0"
          aria-label="Zoom product image"
        />
        <button
          type="button"
          class="product-gallery-modal__zoom-button"
          id="product-gallery-zoom-in"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <span class="product-gallery-modal__count" id="product-gallery-count"></span>
      </div>
      <div class="product-gallery-modal__actions" id="product-gallery-actions" hidden>
        <div
          class="product-gallery-modal__video-controls"
          id="product-gallery-video-controls"
          hidden
        >
          <button
            type="button"
            class="product-gallery-modal__action-button product-gallery-modal__action-button--secondary"
            id="product-gallery-playback-button"
            aria-label="Play video"
            title="Play video"
          >
            <span class="product-gallery-modal__video-glyph" aria-hidden="true">&#9654;</span>
          </button>
          <input
            type="range"
            class="product-gallery-modal__video-progress"
            id="product-gallery-video-progress"
            min="0"
            max="1000"
            step="1"
            value="0"
            aria-label="Video progress"
          />
          <span
            class="product-gallery-modal__video-time"
            id="product-gallery-video-time"
          >
            0:00 / 0:00
          </span>
        </div>
        <div class="product-gallery-modal__action-group">
          <button
            type="button"
            class="product-gallery-modal__action-button product-gallery-modal__action-button--secondary"
            id="product-gallery-secondary-button"
            hidden
          >
            Secondary
          </button>
          <button
            type="button"
            class="product-gallery-modal__action-button product-gallery-modal__action-button--text"
            id="product-gallery-cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            class="product-gallery-modal__action-button product-gallery-modal__action-button--primary"
            id="product-gallery-save-button"
          >
            Save
          </button>
        </div>
      </div>
      <div class="product-gallery-modal__thumbs" id="product-gallery-thumbs"></div>
    </div>
  `;

  const title = overlay.querySelector("#product-gallery-title");
  const meta = overlay.querySelector("#product-gallery-meta");
  const image = overlay.querySelector("#product-gallery-image");
  const video = overlay.querySelector("#product-gallery-video");
  const modelViewerRoot = overlay.querySelector("#product-gallery-model-viewer");
  const stage = overlay.querySelector("#product-gallery-stage");
  const cropGuide = overlay.querySelector("#product-gallery-crop-guide");
  const cropGuideWindow = overlay.querySelector("#product-gallery-crop-guide-window");
  const zoomControls = overlay.querySelector("#product-gallery-zoom-controls");
  const zoomRange = overlay.querySelector("#product-gallery-zoom-range");
  const zoomOutButton = overlay.querySelector("#product-gallery-zoom-out");
  const zoomInButton = overlay.querySelector("#product-gallery-zoom-in");
  const footer = overlay.querySelector(".product-gallery-modal__footer");
  const actions = overlay.querySelector("#product-gallery-actions");
  const videoControls = overlay.querySelector("#product-gallery-video-controls");
  const playbackActionButton = overlay.querySelector("#product-gallery-playback-button");
  const videoProgressRange = overlay.querySelector("#product-gallery-video-progress");
  const videoTimeLabel = overlay.querySelector("#product-gallery-video-time");
  const secondaryActionButton = overlay.querySelector("#product-gallery-secondary-button");
  const cancelActionButton = overlay.querySelector("#product-gallery-cancel-button");
  const saveActionButton = overlay.querySelector("#product-gallery-save-button");
  const count = overlay.querySelector("#product-gallery-count");
  const thumbs = overlay.querySelector("#product-gallery-thumbs");
  const modelButton = overlay.querySelector("#product-gallery-model-button");
  const closeButton = overlay.querySelector(".product-gallery-modal__close");
  const prevButton = overlay.querySelector('[data-gallery-nav="prev"]');
  const nextButton = overlay.querySelector('[data-gallery-nav="next"]');

  let galleryItems = [];
  let currentIndex = 0;
  let galleryTitle = "Product images";
  let showGalleryFooter = true;
  let showGalleryThumbs = true;
  let showGalleryActions = false;
  let showGalleryModelButton = true;
  let useItemLabelAsGalleryTitle = false;
  let showCancelGalleryAction = true;
  let showSecondaryGalleryAction = false;
  let showCardCropGuide = false;
  let onSaveSelection = null;
  let onCancelGalleryAction = null;
  let onSecondaryGalleryAction = null;
  let useCompactGalleryLayout = false;
  let useProductStatusGalleryLayout = false;
  let showGalleryZoom = true;
  let autoplayGalleryVideo = false;
  let useVideoCropPlayback = false;
  let initialCardCropState = null;
  let primaryGalleryActionLabel = "Save";
  let primaryGalleryActionMediaType = "";
  let secondaryGalleryActionLabel = "";
  let secondaryGalleryActionMediaType = "";
  let closeBeforePrimaryAction = false;
  let closeBeforeSecondaryAction = false;
  let currentZoomPercent = 0;
  const ZOOM_MIN = 0;
  const ZOOM_MAX = 500;
  const ZOOM_BUTTON_STEP = 25;
  const PRODUCT_CARD_IMAGE_ASPECT_RATIO = 189.5 / 180;
  let cropGuideAspectRatio = PRODUCT_CARD_IMAGE_ASPECT_RATIO;
  let isStagePanning = false;
  let stagePanStartX = 0;
  let stagePanStartY = 0;
  let currentPanX = 0;
  let currentPanY = 0;
  let stagePanOriginX = 0;
  let stagePanOriginY = 0;

  const getCurrentGalleryItem = () => galleryItems[currentIndex] ?? null;
  const isCurrentGalleryItemVideo = () => getCurrentGalleryItem()?.type === "video";
  const isCurrentGalleryItemModel = () => getCurrentGalleryItem()?.type === "model3d";
  const shouldShowPrimaryGalleryActionForCurrentItem = () => {
    if (!showGalleryActions || !saveActionButton) {
      return false;
    }

    const requiredMediaType = String(primaryGalleryActionMediaType || "").trim().toLowerCase();
    if (!requiredMediaType) {
      return true;
    }

    return getCurrentGalleryItem()?.type === requiredMediaType;
  };
  const shouldShowSecondaryGalleryActionForCurrentItem = () => {
    if (
      !showGalleryActions ||
      !showSecondaryGalleryAction ||
      !secondaryActionButton ||
      showCardCropGuide
    ) {
      return false;
    }

    const requiredMediaType = String(secondaryGalleryActionMediaType || "").trim().toLowerCase();
    if (!requiredMediaType) {
      return true;
    }

    return getCurrentGalleryItem()?.type === requiredMediaType;
  };
  const getCurrentGalleryMediaElement = () => {
    if (isCurrentGalleryItemVideo()) {
      return video;
    }

    if (isCurrentGalleryItemModel()) {
      return null;
    }

    return image;
  };
  const getCurrentMediaIntrinsicSize = () => {
    if (isCurrentGalleryItemVideo()) {
      return {
        width: Number(video?.videoWidth || 0),
        height: Number(video?.videoHeight || 0),
      };
    }

    if (isCurrentGalleryItemModel()) {
      return { width: 0, height: 0 };
    }

    return {
      width: Number(image?.naturalWidth || 0),
      height: Number(image?.naturalHeight || 0),
    };
  };

  const syncCardCropGuide = () => {
    const shouldShowCropGuide = showCardCropGuide && !overlay.hidden;
    if (cropGuide) {
      cropGuide.hidden = !shouldShowCropGuide;
    }
    overlay.classList.toggle("has-card-crop-guide", shouldShowCropGuide);
    if (!shouldShowCropGuide || !cropGuideWindow || !stage) {
      return;
    }

    const stageStyles = window.getComputedStyle(stage);
    const horizontalPadding =
      (Number.parseFloat(stageStyles.paddingLeft) || 0) +
      (Number.parseFloat(stageStyles.paddingRight) || 0);
    const verticalPadding =
      (Number.parseFloat(stageStyles.paddingTop) || 0) +
      (Number.parseFloat(stageStyles.paddingBottom) || 0);
    const availableWidth = Math.max(stage.clientWidth - horizontalPadding - 8, 0);
    const availableHeight = Math.max(stage.clientHeight - verticalPadding - 8, 0);

    if (!availableWidth || !availableHeight) {
      cropGuideWindow.style.width = "0px";
      cropGuideWindow.style.height = "0px";
      return;
    }

    const activeCropGuideAspectRatio =
      Number.isFinite(cropGuideAspectRatio) && cropGuideAspectRatio > 0
        ? cropGuideAspectRatio
        : PRODUCT_CARD_IMAGE_ASPECT_RATIO;
    let cropWidth = Math.min(availableWidth, availableHeight * activeCropGuideAspectRatio);
    let cropHeight = cropWidth / activeCropGuideAspectRatio;

    if (cropHeight > availableHeight) {
      cropHeight = availableHeight;
      cropWidth = cropHeight * activeCropGuideAspectRatio;
    }

    cropGuideWindow.style.width = `${cropWidth}px`;
    cropGuideWindow.style.height = `${cropHeight}px`;
  };

  const toCenterFractionFromObjectPosition = (
    positionPercent,
    visibleFraction,
    fallback = 0.5,
  ) => {
    if (!Number.isFinite(visibleFraction) || visibleFraction <= 0) {
      return fallback;
    }

    if (visibleFraction >= 0.999) {
      return 0.5;
    }

    const normalizedStart =
      normalizeCardImagePosition(positionPercent, fallback * 100) / 100;
    return Math.min(
      1,
      Math.max(0, normalizedStart * (1 - visibleFraction) + visibleFraction / 2),
    );
  };

  const loadImageIntrinsicSize = (url) =>
    new Promise((resolve) => {
      const normalizedUrl = String(url ?? "").trim();
      if (!normalizedUrl) {
        resolve(null);
        return;
      }

      const probe = new window.Image();
      probe.onload = () => {
        resolve({
          width: Number(probe.naturalWidth || 0),
          height: Number(probe.naturalHeight || 0),
        });
      };
      probe.onerror = () => resolve(null);
      probe.src = normalizedUrl;
    });

  const syncGalleryToInitialCardCropState = async () => {
    if (!stage) {
      return;
    }

    const cropState = initialCardCropState;
    if (!cropState) {
      return;
    }

    const currentItemUrl = String(galleryItems[currentIndex]?.url ?? "").trim();
    const sourceUrl = String(cropState.sourceUrl ?? "").trim();
    if (!currentItemUrl || !sourceUrl || currentItemUrl !== sourceUrl) {
      return;
    }

    if (showCardCropGuide) {
      syncCardCropGuide();
    }
    const { width: baseWidth, height: baseHeight } = getBaseMediaRenderSize();
    const targetRect =
      showCardCropGuide && cropGuideWindow && cropGuide && !cropGuide.hidden
        ? cropGuideWindow.getBoundingClientRect()
        : stage.getBoundingClientRect();
    const { width: naturalWidth, height: naturalHeight } = getCurrentMediaIntrinsicSize();

    if (
      !baseWidth ||
      !baseHeight ||
      !targetRect.width ||
      !targetRect.height ||
      !naturalWidth ||
      !naturalHeight
    ) {
      return;
    }

    let visibleWidthFraction = Math.min(1, Math.max(0, targetRect.width / baseWidth));
    let visibleHeightFraction = Math.min(1, Math.max(0, targetRect.height / baseHeight));
    let derivedZoomPercent = normalizePreviewCropZoomPercent(cropState.zoomPercent, 0);
    const storedVisibleWidthFraction = normalizePreviewVisibleFraction(
      cropState.visibleWidthFraction,
      0,
    );
    const storedVisibleHeightFraction = normalizePreviewVisibleFraction(
      cropState.visibleHeightFraction,
      0,
    );
    const croppedImageUrl = String(cropState.croppedImageUrl ?? "").trim();

    if (storedVisibleWidthFraction > 0 && storedVisibleHeightFraction > 0) {
      visibleWidthFraction = storedVisibleWidthFraction;
      visibleHeightFraction = storedVisibleHeightFraction;
      const requiredImageWidth = targetRect.width / Math.max(visibleWidthFraction, 0.0001);
      const requiredImageHeight =
        targetRect.height / Math.max(visibleHeightFraction, 0.0001);
      const derivedZoomScale = Math.max(
        1,
        requiredImageWidth / baseWidth,
        requiredImageHeight / baseHeight,
      );
      derivedZoomPercent = normalizePreviewCropZoomPercent((derivedZoomScale - 1) * 100, 0);
    } else if (!derivedZoomPercent && !isCurrentGalleryItemVideo() && croppedImageUrl) {
      const cropImageSize = await loadImageIntrinsicSize(croppedImageUrl);
      if (overlay.hidden || initialCardCropState !== cropState) {
        return;
      }

      if (cropImageSize?.width && cropImageSize?.height) {
        visibleWidthFraction = Math.min(
          1,
          Math.max(0, cropImageSize.width / naturalWidth),
        );
        visibleHeightFraction = Math.min(
          1,
          Math.max(0, cropImageSize.height / naturalHeight),
        );
      }

      const requiredImageWidth = targetRect.width / Math.max(visibleWidthFraction, 0.0001);
      const requiredImageHeight =
        targetRect.height / Math.max(visibleHeightFraction, 0.0001);
      const derivedZoomScale = Math.max(
        1,
        requiredImageWidth / baseWidth,
        requiredImageHeight / baseHeight,
      );
      derivedZoomPercent = normalizePreviewCropZoomPercent((derivedZoomScale - 1) * 100, 0);
    }

    currentZoomPercent = derivedZoomPercent;
    applyGalleryZoom();

    const appliedZoomScale = 1 + currentZoomPercent / 100;
    const scaledWidth = baseWidth * appliedZoomScale;
    const scaledHeight = baseHeight * appliedZoomScale;
    const appliedWidthFraction = Math.min(
      1,
      Math.max(0, targetRect.width / Math.max(scaledWidth, 1)),
    );
    const appliedHeightFraction = Math.min(
      1,
      Math.max(0, targetRect.height / Math.max(scaledHeight, 1)),
    );
    const centerFractionX = toCenterFractionFromObjectPosition(
      cropState.positionX,
      appliedWidthFraction,
      0.5,
    );
    const centerFractionY = toCenterFractionFromObjectPosition(
      cropState.positionY,
      appliedHeightFraction,
      0.5,
    );

    currentPanX = (0.5 - centerFractionX) * scaledWidth;
    currentPanY = (0.5 - centerFractionY) * scaledHeight;
    applyGalleryTransform();
    if (useVideoCropPlayback && video) {
      video.style.opacity = "";
    }
  };

  const getCurrentCropSelection = () => {
    const defaultSelection = {
      positionX: DEFAULT_CARD_IMAGE_POSITION_X,
      positionY: DEFAULT_CARD_IMAGE_POSITION,
      zoomPercent: normalizePreviewCropZoomPercent(currentZoomPercent, 0),
    };

    const mediaElement = getCurrentGalleryMediaElement();
    if (!mediaElement) {
      return defaultSelection;
    }

    const mediaRect = mediaElement.getBoundingClientRect();
    if (!mediaRect.width || !mediaRect.height) {
      return defaultSelection;
    }

    const targetRect =
      cropGuideWindow && cropGuide && !cropGuide.hidden
        ? cropGuideWindow.getBoundingClientRect()
        : stage?.getBoundingClientRect();

    if (!targetRect?.width || !targetRect?.height) {
      return defaultSelection;
    }

    const centerX = targetRect.left + targetRect.width / 2;
    const centerY = targetRect.top + targetRect.height / 2;

    const widthFraction = Math.min(1, Math.max(0, targetRect.width / mediaRect.width));
    const heightFraction = Math.min(1, Math.max(0, targetRect.height / mediaRect.height));
    const centerXFraction = (centerX - mediaRect.left) / mediaRect.width;
    const centerYFraction = (centerY - mediaRect.top) / mediaRect.height;

    const toObjectPositionPercent = (centerFraction, visibleFraction, fallback) => {
      if (!Number.isFinite(centerFraction) || !Number.isFinite(visibleFraction)) {
        return fallback;
      }

      if (visibleFraction >= 0.999) {
        return 50;
      }

      const normalizedStart = (centerFraction - visibleFraction / 2) / (1 - visibleFraction);
      return normalizeCardImagePosition(normalizedStart * 100, fallback);
    };

    return {
      positionX: toObjectPositionPercent(
        centerXFraction,
        widthFraction,
        DEFAULT_CARD_IMAGE_POSITION_X,
      ),
      positionY: toObjectPositionPercent(
        centerYFraction,
        heightFraction,
        DEFAULT_CARD_IMAGE_POSITION,
      ),
      zoomPercent: normalizePreviewCropZoomPercent(currentZoomPercent, 0),
      visibleWidthFraction: widthFraction,
      visibleHeightFraction: heightFraction,
    };
  };

  const buildCurrentCropPreviewDataUrl = () => {
    if (
      !image ||
      isCurrentGalleryItemVideo() ||
      isCurrentGalleryItemModel() ||
      !cropGuideWindow ||
      !cropGuide ||
      cropGuide.hidden
    ) {
      return "";
    }

    const imageRect = image.getBoundingClientRect();
    const targetRect = cropGuideWindow.getBoundingClientRect();
    const naturalWidth = Number(image.naturalWidth || 0);
    const naturalHeight = Number(image.naturalHeight || 0);

    if (!imageRect.width || !imageRect.height || !targetRect.width || !targetRect.height) {
      return "";
    }

    if (!naturalWidth || !naturalHeight) {
      return "";
    }

    const sx = ((targetRect.left - imageRect.left) / imageRect.width) * naturalWidth;
    const sy = ((targetRect.top - imageRect.top) / imageRect.height) * naturalHeight;
    const sw = (targetRect.width / imageRect.width) * naturalWidth;
    const sh = (targetRect.height / imageRect.height) * naturalHeight;

    const sourceX = Math.max(0, Math.min(naturalWidth - 1, sx));
    const sourceY = Math.max(0, Math.min(naturalHeight - 1, sy));
    const sourceWidth = Math.max(1, Math.min(naturalWidth - sourceX, sw));
    const sourceHeight = Math.max(1, Math.min(naturalHeight - sourceY, sh));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));

    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    try {
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Unable to build cropped preview image.", error);
      return "";
    }
  };

  const getStageViewportSize = () => {
    if (!stage) {
      return { width: 0, height: 0 };
    }

    const stageStyles = window.getComputedStyle(stage);
    const horizontalPadding =
      (Number.parseFloat(stageStyles.paddingLeft) || 0) +
      (Number.parseFloat(stageStyles.paddingRight) || 0);
    const verticalPadding =
      (Number.parseFloat(stageStyles.paddingTop) || 0) +
      (Number.parseFloat(stageStyles.paddingBottom) || 0);

    return {
      width: Math.max(0, stage.clientWidth - horizontalPadding),
      height: Math.max(0, stage.clientHeight - verticalPadding),
    };
  };

  const getGalleryPanViewportSize = () => {
    if (showCardCropGuide && cropGuideWindow && cropGuide && !cropGuide.hidden) {
      const cropRect = cropGuideWindow.getBoundingClientRect();
      if (cropRect.width > 0 && cropRect.height > 0) {
        return {
          width: cropRect.width,
          height: cropRect.height,
        };
      }
    }

    return getStageViewportSize();
  };

  const getBaseMediaRenderSize = () => {
    const mediaElement = getCurrentGalleryMediaElement();
    if (!mediaElement) {
      return { width: 0, height: 0 };
    }

    const { width: naturalWidth, height: naturalHeight } = getCurrentMediaIntrinsicSize();
    const { width: viewportWidth, height: viewportHeight } = getStageViewportSize();

    if (!naturalWidth || !naturalHeight || !viewportWidth || !viewportHeight) {
      return { width: 0, height: 0 };
    }

    const fitScale = Math.min(viewportWidth / naturalWidth, viewportHeight / naturalHeight);
    return {
      width: naturalWidth * fitScale,
      height: naturalHeight * fitScale,
    };
  };

  const clampGalleryPan = () => {
    const zoomScale = 1 + currentZoomPercent / 100;
    const { width: viewportWidth, height: viewportHeight } = getGalleryPanViewportSize();
    const { width: baseWidth, height: baseHeight } = getBaseMediaRenderSize();

    if (!viewportWidth || !viewportHeight || !baseWidth || !baseHeight) {
      currentPanX = 0;
      currentPanY = 0;
      return;
    }

    const scaledWidth = baseWidth * zoomScale;
    const scaledHeight = baseHeight * zoomScale;
    const maxPanX = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - viewportHeight) / 2);

    currentPanX = Math.min(maxPanX, Math.max(-maxPanX, currentPanX));
    currentPanY = Math.min(maxPanY, Math.max(-maxPanY, currentPanY));
  };

  const canPanGallery = () => {
    if (useVideoCropPlayback) {
      return false;
    }

    const zoomScale = 1 + currentZoomPercent / 100;
    const { width: viewportWidth, height: viewportHeight } = getGalleryPanViewportSize();
    const { width: baseWidth, height: baseHeight } = getBaseMediaRenderSize();

    if (!viewportWidth || !viewportHeight || !baseWidth || !baseHeight) {
      return false;
    }

    const scaledWidth = baseWidth * zoomScale;
    const scaledHeight = baseHeight * zoomScale;
    return scaledWidth > viewportWidth + 0.5 || scaledHeight > viewportHeight + 0.5;
  };

  const applyGalleryTransform = () => {
    const mediaElement = getCurrentGalleryMediaElement();
    if (!mediaElement) {
      return;
    }

    if (!useVideoCropPlayback) {
      clampGalleryPan();
    }
    const zoomScale = 1 + currentZoomPercent / 100;
    mediaElement.style.transform =
      `translate(${currentPanX}px, ${currentPanY}px) scale(${zoomScale})`;
  };

  const resetGalleryMediaTransforms = () => {
    if (image) {
      image.style.transform = "translate(0px, 0px) scale(1)";
    }
    if (video) {
      video.style.transform = "translate(0px, 0px) scale(1)";
      video.style.opacity = "";
    }
  };

  const clearProductGalleryModelViewer = () => {
    if (!modelViewerRoot) {
      return;
    }

    modelViewerRoot.hidden = true;
    modelViewerRoot.innerHTML = "";
    delete modelViewerRoot.dataset.modelViewerSrc;
  };

  const renderProductGalleryModelViewer = (item) => {
    if (!modelViewerRoot || !item?.url) {
      return;
    }

    clearProductGalleryModelViewer();
    modelViewerRoot.hidden = false;
    modelViewerRoot.dataset.modelViewerSrc = item.url;

    const viewerElement = document.createElement("model-viewer");
    viewerElement.className = "product-gallery-modal__model-element";
    viewerElement.setAttribute("src", item.url);
    viewerElement.setAttribute("camera-controls", "");
    viewerElement.setAttribute("interaction-prompt", "none");
    viewerElement.setAttribute("shadow-intensity", "0.72");
    viewerElement.setAttribute("exposure", "1");
    viewerElement.setAttribute("alt", item.label || "Product 3D model");

    const loadingState = document.createElement("div");
    loadingState.className = "product-gallery-modal__model-state";
    loadingState.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    `;

    modelViewerRoot.append(viewerElement, loadingState);
    ensureProductModelViewerScript()
      .then(() => {
        if (modelViewerRoot.dataset.modelViewerSrc === item.url) {
          loadingState.remove();
        }
      })
      .catch(() => {
        if (modelViewerRoot.dataset.modelViewerSrc === item.url) {
          viewerElement.remove();
          loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>3D preview unavailable.</span>
          `;
        }
      });
  };

  const getProductGalleryModelIndex = () =>
    galleryItems.findIndex((item) => item?.type === "model3d" && item?.url);

  const syncProductGalleryModelButton = () => {
    if (!modelButton) {
      return;
    }

    const modelIndex = getProductGalleryModelIndex();
    const hasModel = showGalleryModelButton && modelIndex >= 0;
    modelButton.hidden = !showGalleryModelButton;
    modelButton.disabled = !hasModel;
    modelButton.classList.toggle("is-active", hasModel && currentIndex === modelIndex);
    modelButton.setAttribute(
      "aria-label",
      hasModel ? "View 3D model" : "No 3D model uploaded",
    );
    modelButton.title = hasModel ? "View 3D model" : "No 3D model uploaded";
  };

  const syncGalleryPanState = () => {
    if (!stage) {
      return;
    }

    const isPannable = canPanGallery();
    stage.classList.toggle("is-pannable", isPannable);
    if (!isPannable) {
      stage.classList.remove("is-panning");
    }
  };

  const getCurrentGalleryVideoPreviewTimeMs = () =>
    normalizePreviewMediaTimeMs((Number(video?.currentTime || 0) || 0) * 1000, 0);

  const formatGalleryVideoTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const syncGalleryVideoProgressRange = () => {
    if (!videoProgressRange) {
      return;
    }

    const currentSeconds = Number(video?.currentTime || 0) || 0;
    const durationSeconds = Number(video?.duration || 0) || 0;
    const progressValue =
      durationSeconds > 0
        ? Math.round((Math.min(currentSeconds, durationSeconds) / durationSeconds) * 1000)
        : 0;

    videoProgressRange.value = String(progressValue);
    videoProgressRange.disabled = durationSeconds <= 0;
    videoProgressRange.style.setProperty(
      "--video-progress",
      `${(progressValue / 1000) * 100}%`,
    );
  };

  const syncGalleryVideoTimeLabel = () => {
    if (!videoTimeLabel) {
      return;
    }

    const currentSeconds = Number(video?.currentTime || 0) || 0;
    const durationSeconds = Number(video?.duration || 0) || 0;
    videoTimeLabel.textContent = `${formatGalleryVideoTime(currentSeconds)} / ${formatGalleryVideoTime(durationSeconds)}`;
    syncGalleryVideoProgressRange();
  };

  const syncGalleryVideoPlaybackControls = () => {
    if (!videoControls || !playbackActionButton) {
      return;
    }

    const isEditingVideoCrop =
      showGalleryActions && showCardCropGuide && isCurrentGalleryItemVideo();
    const isCroppedVideoPlayback =
      useVideoCropPlayback && isCurrentGalleryItemVideo();
    videoControls.hidden = !isEditingVideoCrop && !isCroppedVideoPlayback;
    syncGalleryVideoTimeLabel();
    if (!isEditingVideoCrop && !isCroppedVideoPlayback) {
      return;
    }

    const isPaused = Boolean(video?.paused ?? true);
    playbackActionButton.disabled = false;
    playbackActionButton.setAttribute(
      "aria-label",
      isPaused ? "Play video" : "Pause video",
    );
    playbackActionButton.title = isPaused ? "Play video" : "Pause video";
    playbackActionButton.innerHTML = isPaused
      ? `<span class="product-gallery-modal__video-glyph" aria-hidden="true">&#9654;</span>`
      : `<span class="product-gallery-modal__video-glyph product-gallery-modal__video-glyph--pause" aria-hidden="true">&#10074;&#10074;</span>`;
  };

  const applyGalleryZoom = () => {
    const normalizedZoom = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, Math.round(Number(currentZoomPercent) || 0)),
    );
    currentZoomPercent = normalizedZoom;
    if (zoomRange) {
      zoomRange.value = String(normalizedZoom);
      zoomRange.style.setProperty("--zoom-range-progress", `${(normalizedZoom / ZOOM_MAX) * 100}%`);
    }
    applyGalleryTransform();
    if (zoomOutButton) {
      zoomOutButton.disabled = normalizedZoom <= ZOOM_MIN;
    }
    if (zoomInButton) {
      zoomInButton.disabled = normalizedZoom >= ZOOM_MAX;
    }
    syncGalleryPanState();
    syncGalleryVideoPlaybackControls();
  };

  const closeModal = () => {
    overlay.hidden = true;
    overlay.classList.remove("is-preview-compact");
    overlay.classList.remove("has-card-crop-guide");
    overlay.classList.remove("has-inline-preview-nav");
    overlay.classList.remove("is-product-status-preview");
    overlay.classList.remove("is-video-play-preview");
    overlay.classList.remove("is-video-crop-playback");
    showGalleryZoom = true;
    autoplayGalleryVideo = false;
    useVideoCropPlayback = false;
    stage?.classList.remove("is-model-view", "is-pannable", "is-panning");
    onSaveSelection = null;
    onCancelGalleryAction = null;
    onSecondaryGalleryAction = null;
    initialCardCropState = null;
    closeBeforePrimaryAction = false;
    closeBeforeSecondaryAction = false;
    showSecondaryGalleryAction = false;
    primaryGalleryActionMediaType = "";
    secondaryGalleryActionLabel = "";
    secondaryGalleryActionMediaType = "";
    cropGuideAspectRatio = PRODUCT_CARD_IMAGE_ASPECT_RATIO;
    useProductStatusGalleryLayout = false;
    currentZoomPercent = 0;
    currentPanX = 0;
    currentPanY = 0;
    resetGalleryMediaTransforms();
    applyGalleryZoom();
    if (image) {
      image.removeAttribute("src");
      image.alt = "";
      image.hidden = false;
    }
    if (video) {
      try {
        video.pause();
      } catch (_) {}
      video.removeAttribute("src");
      video.hidden = true;
      video.load?.();
    }
    clearProductGalleryModelViewer();
    if (videoTimeLabel) {
      videoTimeLabel.textContent = "0:00 / 0:00";
    }
    if (videoProgressRange) {
      videoProgressRange.value = "0";
      videoProgressRange.disabled = true;
      videoProgressRange.style.setProperty("--video-progress", "0%");
    }
    syncModalOpenClass();
    unlockProductComposerWorkspaceScroll();
  };

  const renderCurrentItem = () => {
    const currentItem = galleryItems[currentIndex];
    if (!currentItem) {
      return;
    }

    if (title) {
      title.textContent = useItemLabelAsGalleryTitle
        ? (currentItem.label || galleryTitle)
        : galleryTitle;
    }

    if (meta) {
      const titleText = useItemLabelAsGalleryTitle
        ? (currentItem.label || galleryTitle)
        : galleryTitle;
      if (useItemLabelAsGalleryTitle || currentItem.label === titleText) {
        meta.textContent = "";
        meta.hidden = true;
      } else {
        meta.hidden = false;
        meta.textContent = currentItem.label;
      }
    }

    if (count) {
      count.textContent = `${currentIndex + 1} / ${galleryItems.length}`;
    }

    resetGalleryMediaTransforms();
    currentZoomPercent = 0;
    currentPanX = 0;
    currentPanY = 0;
    applyGalleryZoom();
    const isVideoItem = currentItem.type === "video";
    const isModelItem = currentItem.type === "model3d";

    if (zoomControls) {
      zoomControls.hidden = isModelItem || !showGalleryZoom;
    }
    const shouldShowPrimaryAction =
      !isModelItem && shouldShowPrimaryGalleryActionForCurrentItem();
    const shouldShowCancelAction = !isModelItem && showGalleryActions && showCancelGalleryAction;
    const shouldShowSecondaryAction =
      !isModelItem && shouldShowSecondaryGalleryActionForCurrentItem();
    if (actions) {
      actions.hidden =
        !showGalleryActions ||
        (!shouldShowPrimaryAction && !shouldShowCancelAction && !shouldShowSecondaryAction);
    }
    if (cancelActionButton) {
      cancelActionButton.hidden = !shouldShowCancelAction;
    }
    if (saveActionButton) {
      saveActionButton.hidden = !shouldShowPrimaryAction;
      saveActionButton.textContent = primaryGalleryActionLabel;
    }
    if (secondaryActionButton) {
      secondaryActionButton.hidden = !shouldShowSecondaryAction;
      secondaryActionButton.textContent = secondaryGalleryActionLabel;
    }

    if (isModelItem) {
      if (image) {
        image.removeAttribute("src");
        image.alt = "";
        image.hidden = true;
      }
      if (video) {
        try {
          video.pause();
        } catch (_) {}
        video.removeAttribute("src");
        video.hidden = true;
        video.load?.();
      }
      renderProductGalleryModelViewer(currentItem);
      stage?.classList.remove("is-pannable", "is-panning");
      stage?.classList.add("is-model-view");
    } else if (isVideoItem) {
      clearProductGalleryModelViewer();
      stage?.classList.remove("is-model-view");
      const initialVideoPreviewTimeMs =
        initialCardCropState?.sourceUrl === currentItem.url
          ? normalizePreviewMediaTimeMs(initialCardCropState?.previewTimeMs, 0)
          : 0;
      if (image) {
        image.removeAttribute("src");
        image.alt = "";
        image.hidden = true;
      }
      if (video) {
        try {
          video.pause();
        } catch (_) {}
        video.hidden = false;
        video.controls = !showCardCropGuide && !useVideoCropPlayback;
        video.draggable = false;
        video.style.pointerEvents = showCardCropGuide || useVideoCropPlayback ? "none" : "auto";
        video.style.opacity = useVideoCropPlayback ? "0" : "";
        video.src = currentItem.url;
        const videoPosterUrl = String(currentItem.thumbnailUrl ?? "").trim();
        if (videoPosterUrl) {
          video.poster = videoPosterUrl;
        } else {
          video.removeAttribute("poster");
        }
        video.setAttribute("aria-label", `${galleryTitle} - ${currentItem.label}`);
        const tryAutoplayGalleryVideo = () => {
          if (!autoplayGalleryVideo || overlay.hidden || video.hidden) {
            return;
          }
          video.muted = true;
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        };
        const applyInitialVideoFrame = () => {
          if (!video) {
            return;
          }

          const durationSeconds = Number(video.duration || 0);
          const targetSeconds =
            initialVideoPreviewTimeMs > 0
              ? Math.min(
                  Math.max(initialVideoPreviewTimeMs / 1000, 0),
                  durationSeconds > 0 ? Math.max(durationSeconds - 0.05, 0) : initialVideoPreviewTimeMs / 1000,
                )
              : autoplayGalleryVideo
                ? 0
                : 0.01;

          try {
            video.currentTime = targetSeconds;
          } catch (_) {}
          syncGalleryVideoTimeLabel();
          tryAutoplayGalleryVideo();
          if (useVideoCropPlayback) {
            window.setTimeout(() => {
              if (video && video.style.opacity === "0") {
                video.style.opacity = "";
              }
            }, 400);
          }
        };
        video.addEventListener("loadeddata", applyInitialVideoFrame, { once: true });
        video.load?.();
      }
      stage?.classList.remove("is-pannable", "is-panning");
    } else {
      clearProductGalleryModelViewer();
      stage?.classList.remove("is-model-view");
      if (video) {
        try {
          video.pause();
        } catch (_) {}
        video.removeAttribute("src");
        video.hidden = true;
        video.load?.();
      }
      if (image) {
        image.hidden = false;
        image.src = currentItem.url;
        image.alt = `${galleryTitle} - ${currentItem.label}`;
      }
    }

    syncProductGalleryModelButton();
    syncGalleryVideoPlaybackControls();

    if (!isModelItem && (showCardCropGuide || initialCardCropState)) {
      const scheduleInitialCropSync = () => {
        window.requestAnimationFrame(() => {
          syncCardCropGuide();
          void syncGalleryToInitialCardCropState();
        });
      };

      const syncOnReady = () => {
        image?.removeEventListener("load", syncOnReady);
        video?.removeEventListener("loadedmetadata", syncOnReady);
        scheduleInitialCropSync();
      };

      if (
        (isVideoItem && video?.videoWidth && video.videoHeight) ||
        (!isVideoItem && image?.complete && image.naturalWidth && image.naturalHeight)
      ) {
        scheduleInitialCropSync();
      } else {
        if (isVideoItem) {
          video?.addEventListener("loadedmetadata", syncOnReady, { once: true });
        } else {
          image?.addEventListener("load", syncOnReady, { once: true });
        }
      }
    }

    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex >= galleryItems.length - 1;
    }

    if (thumbs) {
      if (!showGalleryThumbs) {
        thumbs.innerHTML = "";
        return;
      }

      thumbs.innerHTML = "";
      galleryItems.forEach((item, index) => {
        const thumbButton = document.createElement("button");
        const isModelThumb = item.type === "model3d";
        const thumbImageUrl =
          item.type === "video" && String(item.thumbnailUrl ?? "").trim()
            ? String(item.thumbnailUrl ?? "").trim()
            : item.url;
        const isVideoThumb = item.type === "video";
        thumbButton.type = "button";
        thumbButton.className = `product-gallery-modal__thumb${
          isVideoThumb ? " is-video" : ""
        }${
          isModelThumb ? " is-model" : ""
        }${
          index === currentIndex ? " is-active" : ""
        }`;
        thumbButton.setAttribute("aria-label", item.label);
        thumbButton.title = item.label;
        thumbButton.innerHTML = isModelThumb
          ? `
            <span class="product-gallery-modal__thumb-model-badge" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              <span>3D</span>
            </span>
          `
          : `
            <img src="${thumbImageUrl}" alt="${item.label}" />
            ${
              isVideoThumb
                  ? `
                    <span class="product-gallery-modal__thumb-video-badge" aria-hidden="true">
                      <i class="fa-solid fa-play"></i>
                    </span>
                  `
                : ""
            }
          `;
        thumbButton.addEventListener("click", () => {
          currentIndex = index;
          renderCurrentItem();
        });
        thumbs.appendChild(thumbButton);
      });
    }
  };

  const stepGallery = (direction) => {
    if (showCardCropGuide) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= galleryItems.length) {
      return;
    }

    currentIndex = nextIndex;
    renderCurrentItem();
  };

  closeButton?.addEventListener("click", closeModal);
  cancelActionButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof onCancelGalleryAction === "function") {
      const handleCancelAction = onCancelGalleryAction;
      const actionPayload = {
        itemIndex: currentIndex,
        item: galleryItems[currentIndex] ?? null,
      };
      closeModal();
      handleCancelAction(actionPayload);
      return;
    }
    closeModal();
  });
  saveActionButton?.addEventListener("click", (event) => {
    event.preventDefault();
    if (typeof onSaveSelection === "function") {
      const handleSaveSelection = onSaveSelection;
      const actionPayload = {
        selection: getCurrentCropSelection(),
        croppedImageUrl: buildCurrentCropPreviewDataUrl(),
        zoomPercent: normalizePreviewCropZoomPercent(currentZoomPercent, 0),
        previewTimeMs: getCurrentGalleryVideoPreviewTimeMs(),
        itemIndex: currentIndex,
        item: galleryItems[currentIndex] ?? null,
      };
      if (closeBeforePrimaryAction) {
        closeModal();
        handleSaveSelection(actionPayload);
        return;
      }
      handleSaveSelection(actionPayload);
      closeModal();
    }
  });
  secondaryActionButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (typeof onSecondaryGalleryAction !== "function") {
      return;
    }

    const handleSecondaryAction = onSecondaryGalleryAction;
    const actionPayload = {
      selection: getCurrentCropSelection(),
      zoomPercent: normalizePreviewCropZoomPercent(currentZoomPercent, 0),
      previewTimeMs: getCurrentGalleryVideoPreviewTimeMs(),
      itemIndex: currentIndex,
      item: galleryItems[currentIndex] ?? null,
      mediaElement: getCurrentGalleryMediaElement(),
    };

    if (closeBeforeSecondaryAction) {
      closeModal();
      await handleSecondaryAction(actionPayload);
      return;
    }

    await handleSecondaryAction(actionPayload);
  });
  playbackActionButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!video || video.hidden) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (_) {}
    syncGalleryVideoPlaybackControls();
  });
  video?.addEventListener("play", syncGalleryVideoPlaybackControls);
  video?.addEventListener("pause", syncGalleryVideoPlaybackControls);
  video?.addEventListener("loadeddata", syncGalleryVideoPlaybackControls);
  video?.addEventListener("loadedmetadata", syncGalleryVideoTimeLabel);
  video?.addEventListener("timeupdate", syncGalleryVideoTimeLabel);
  video?.addEventListener("seeked", syncGalleryVideoTimeLabel);
  video?.addEventListener("durationchange", syncGalleryVideoTimeLabel);
  videoProgressRange?.addEventListener("input", (event) => {
    if (!video || video.hidden) {
      return;
    }

    const durationSeconds = Number(video.duration || 0) || 0;
    if (durationSeconds <= 0) {
      return;
    }

    const progressValue = Number(event.target?.value ?? 0) || 0;
    const targetSeconds = (Math.max(0, Math.min(progressValue, 1000)) / 1000) * durationSeconds;
    try {
      video.currentTime = targetSeconds;
    } catch (_) {}
    syncGalleryVideoTimeLabel();
  });
  modelButton?.addEventListener("click", () => {
    const modelIndex = getProductGalleryModelIndex();
    if (modelIndex < 0) {
      return;
    }

    currentIndex = modelIndex;
    renderCurrentItem();
  });
  prevButton?.addEventListener("click", () => stepGallery(-1));
  nextButton?.addEventListener("click", () => stepGallery(1));
  zoomRange?.addEventListener("input", (event) => {
    currentZoomPercent = Number(event.target?.value ?? 0);
    applyGalleryZoom();
  });
  zoomOutButton?.addEventListener("click", () => {
    currentZoomPercent -= ZOOM_BUTTON_STEP;
    applyGalleryZoom();
  });
  zoomInButton?.addEventListener("click", () => {
    currentZoomPercent += ZOOM_BUTTON_STEP;
    applyGalleryZoom();
  });
  stage?.addEventListener("pointerdown", (event) => {
    if (useVideoCropPlayback || !canPanGallery()) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    isStagePanning = true;
    stage.classList.add("is-panning");
    stagePanStartX = event.clientX;
    stagePanStartY = event.clientY;
    stagePanOriginX = currentPanX;
    stagePanOriginY = currentPanY;
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  stage?.addEventListener("pointermove", (event) => {
    if (!isStagePanning) {
      return;
    }

    const deltaX = event.clientX - stagePanStartX;
    const deltaY = event.clientY - stagePanStartY;
    currentPanX = stagePanOriginX + deltaX;
    currentPanY = stagePanOriginY + deltaY;
    applyGalleryTransform();
    event.preventDefault();
  });
  const stopStagePan = (event = null) => {
    if (!isStagePanning) {
      return;
    }

    isStagePanning = false;
    stage?.classList.remove("is-panning");
    if (
      event?.pointerId !== undefined &&
      stage?.hasPointerCapture?.(event.pointerId)
    ) {
      stage.releasePointerCapture(event.pointerId);
    }
  };
  stage?.addEventListener("pointerup", stopStagePan);
  stage?.addEventListener("pointercancel", stopStagePan);
  stage?.addEventListener("lostpointercapture", stopStagePan);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  window.addEventListener("resize", () => {
    if (!overlay.hidden) {
      syncCardCropGuide();
      applyGalleryTransform();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (overlay.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeModal();
    } else if (!showCardCropGuide && event.key === "ArrowLeft") {
      stepGallery(-1);
    } else if (!showCardCropGuide && event.key === "ArrowRight") {
      stepGallery(1);
    }
  });

  document.body.appendChild(overlay);
  productGalleryModalElements = {
    overlay,
    closeModal,
    open({
      productTitle,
      items,
      startIndex = 0,
      showFooter = true,
      showThumbs = true,
      showActions = false,
      showCancelAction = true,
      showSecondaryAction = false,
      showCropGuide = false,
      showModelButton = true,
      useItemLabelAsTitle = false,
      onSave = null,
      onCancelAction = null,
      onSecondaryAction = null,
      primaryActionLabel = "Save",
      primaryActionMediaType = "",
      secondaryActionLabel = "",
      secondaryActionMediaType = "",
      initialCropState = null,
      closeBeforeAction = false,
      closeBeforeSecondaryAction: shouldCloseBeforeSecondaryAction = false,
      cropAspectRatio = PRODUCT_CARD_IMAGE_ASPECT_RATIO,
      compact = false,
      statusPreview = false,
      showZoom = true,
      autoplay = false,
    }) {
      galleryItems = Array.isArray(items) ? items.filter((item) => item?.url) : [];
      if (!galleryItems.length) {
        return;
      }

      galleryTitle = String(productTitle || "Product images");
      showGalleryFooter = Boolean(showFooter);
      showGalleryThumbs = Boolean(showThumbs);
      showGalleryActions = Boolean(showActions);
      showGalleryModelButton = showModelButton !== false;
      useItemLabelAsGalleryTitle = Boolean(useItemLabelAsTitle);
      showCancelGalleryAction = Boolean(showCancelAction);
      showSecondaryGalleryAction = Boolean(showSecondaryAction);
      showCardCropGuide = Boolean(showCropGuide);
      onSaveSelection = typeof onSave === "function" ? onSave : null;
      onCancelGalleryAction = typeof onCancelAction === "function" ? onCancelAction : null;
      onSecondaryGalleryAction =
        typeof onSecondaryAction === "function" ? onSecondaryAction : null;
      primaryGalleryActionLabel = String(primaryActionLabel || "Save").trim() || "Save";
      primaryGalleryActionMediaType = String(primaryActionMediaType || "")
        .trim()
        .toLowerCase();
      secondaryGalleryActionLabel =
        String(secondaryActionLabel || "").trim() || "Secondary";
      secondaryGalleryActionMediaType = String(secondaryActionMediaType || "")
        .trim()
        .toLowerCase();
      closeBeforePrimaryAction = Boolean(closeBeforeAction);
      closeBeforeSecondaryAction = Boolean(shouldCloseBeforeSecondaryAction);
      initialCardCropState = initialCropState
        ? {
            sourceUrl: String(initialCropState?.sourceUrl ?? "").trim(),
            croppedImageUrl: String(initialCropState?.croppedImageUrl ?? "").trim(),
            positionX: normalizeCardImagePosition(
              initialCropState?.positionX,
              DEFAULT_CARD_IMAGE_POSITION_X,
            ),
            positionY: normalizeCardImagePosition(
              initialCropState?.positionY,
              DEFAULT_CARD_IMAGE_POSITION,
            ),
            zoomPercent: normalizePreviewCropZoomPercent(
              initialCropState?.zoomPercent,
              0,
            ),
            visibleWidthFraction: normalizePreviewVisibleFraction(
              initialCropState?.visibleWidthFraction,
              0,
            ),
            visibleHeightFraction: normalizePreviewVisibleFraction(
              initialCropState?.visibleHeightFraction,
              0,
            ),
            previewTimeMs: normalizePreviewMediaTimeMs(
              initialCropState?.previewTimeMs,
              0,
            ),
          }
        : null;
      cropGuideAspectRatio =
        Number.isFinite(Number(cropAspectRatio)) && Number(cropAspectRatio) > 0
          ? Number(cropAspectRatio)
          : PRODUCT_CARD_IMAGE_ASPECT_RATIO;
      useCompactGalleryLayout = Boolean(compact);
      useProductStatusGalleryLayout = Boolean(statusPreview);
      showGalleryZoom = showZoom !== false;
      autoplayGalleryVideo = Boolean(autoplay);
      overlay.classList.toggle("is-preview-compact", useCompactGalleryLayout);
      overlay.classList.toggle("is-product-status-preview", useProductStatusGalleryLayout);
      overlay.classList.toggle(
        "is-video-play-preview",
        autoplayGalleryVideo && galleryItems.some((item) => item?.type === "video"),
      );
      useVideoCropPlayback = Boolean(
        autoplayGalleryVideo &&
          initialCardCropState &&
          galleryItems.some((item) => item?.type === "video"),
      );
      overlay.classList.toggle("is-video-crop-playback", useVideoCropPlayback);
      const shouldShowCompactNavButtons =
        useCompactGalleryLayout && !showCardCropGuide && galleryItems.length > 1;
      overlay.classList.toggle("has-inline-preview-nav", shouldShowCompactNavButtons);
      if (prevButton) {
        prevButton.hidden = useCompactGalleryLayout
          ? !shouldShowCompactNavButtons
          : false;
      }
      if (nextButton) {
        nextButton.hidden = useCompactGalleryLayout
          ? !shouldShowCompactNavButtons
          : false;
      }
      if (zoomControls) {
        zoomControls.hidden = !showGalleryZoom;
      }
      if (footer) {
        footer.hidden = !showGalleryFooter;
      }
      if (count) {
        count.hidden = !showGalleryFooter;
      }
      if (actions) {
        actions.hidden = !showGalleryActions && !useVideoCropPlayback;
      }
      if (cancelActionButton) {
        cancelActionButton.hidden = !showGalleryActions || !showCancelGalleryAction;
      }
      if (secondaryActionButton) {
        secondaryActionButton.textContent = secondaryGalleryActionLabel;
        secondaryActionButton.hidden = !shouldShowSecondaryGalleryActionForCurrentItem();
      }
      if (saveActionButton) {
        saveActionButton.textContent = primaryGalleryActionLabel;
      }
      if (thumbs) {
        thumbs.hidden = !showGalleryThumbs;
      }
      currentIndex = Math.min(
        Math.max(Number(startIndex) || 0, 0),
        Math.max(galleryItems.length - 1, 0),
      );
      syncProductGalleryModelButton();
      captureProductComposerScrollSnapshot();
      overlay.hidden = false;
      syncModalOpenClass();
      renderCurrentItem();
      restoreProductComposerScrollSnapshot();
      window.requestAnimationFrame(() => {
        restoreProductComposerScrollSnapshot();
        syncCardCropGuide();
        void syncGalleryToInitialCardCropState();
      });
    },
  };
  return productGalleryModalElements;
}

function getProductGalleryItems(product) {
  const items = [];
  const seen = new Set();
  const videoUrls = getNormalizedProductVideoUrls(product);
  const videoThumbnailUrls = getNormalizedProductVideoThumbnailUrls(product, videoUrls);
  const baseImageUrls = getNormalizedProductImageUrls(product);
  const mainImageIndex = getResolvedProductMainImageIndex(product, baseImageUrls);
  const orderedBaseImageUrls = baseImageUrls.length
    ? [
        baseImageUrls[mainImageIndex],
        ...baseImageUrls.filter((_, index) => index !== mainImageIndex),
      ]
    : [];

  videoUrls.forEach((url, index) => {
    const normalizedUrl = String(url ?? "").trim();
    const key = normalizedUrl.toLowerCase();
    if (!normalizedUrl || seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push({
      type: "video",
      url: normalizedUrl,
      label: videoUrls.length > 1 ? `Product video ${index + 1}` : "Product video",
      thumbnailUrl: String(videoThumbnailUrls[index] ?? "").trim(),
    });
  });

  orderedBaseImageUrls.forEach((url, index) => {
    const normalizedUrl = String(url ?? "").trim();
    const key = normalizedUrl.toLowerCase();
    if (!normalizedUrl || seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push({
      type: "image",
      url: normalizedUrl,
      label: index === 0 ? "Main image" : `Image ${index + 1}`,
    });
  });

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  let variantImageCount = 0;
  variants.forEach((variant) => {
    const variantUrl = String(variant?.imageUrl ?? "").trim();
    const key = variantUrl.toLowerCase();
    if (!variantUrl || seen.has(key)) {
      return;
    }

    seen.add(key);
    variantImageCount += 1;
    const variantName = String(variant?.name ?? "").trim();
    items.push({
      type: "image",
      url: variantUrl,
      label: variantName ? `Variant: ${variantName}` : `Variant image ${variantImageCount}`,
    });
  });

  return items;
}

function getProductGalleryModelItem(product) {
  const modelUrl = normalizeProductModelUrl(product);
  if (!modelUrl || !canPreviewProductModelInBrowser(modelUrl, modelUrl)) {
    return null;
  }

  return {
    type: "model3d",
    url: modelUrl,
    label: "3D model",
  };
}

function openProductGallery(product, startIndex = 0) {
  const items = getProductGalleryItems(product);
  const modelItem = getProductGalleryModelItem(product);
  if (modelItem) {
    items.push(modelItem);
  }

  if (!items.length) {
    return;
  }

  ensureProductGalleryModal().open({
    productTitle: product?.name || "Product media",
    items,
    startIndex,
    statusPreview: true,
  });
}

function openPreviewImageGallery(productTitle, imageUrls, startIndex = 0, options = {}) {
  const items = (Array.isArray(imageUrls) ? imageUrls : [])
    .map((url, index) => {
      const normalizedUrl = String(url ?? "").trim();
      if (!normalizedUrl) {
        return null;
      }

      return {
        type: "image",
        url: normalizedUrl,
        label: index === 0 ? "Main image" : `Image ${index + 1}`,
      };
    })
    .filter(Boolean);

  openPreviewMediaGallery(productTitle, items, startIndex, options);
}

function openPreviewMediaGallery(productTitle, items, startIndex = 0, options = {}) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const normalizedUrl = String(item?.url ?? "").trim();
      if (!normalizedUrl) {
        return null;
      }

      const normalizedType = String(item?.type ?? "image").trim().toLowerCase();
      const resolvedType =
        normalizedType === "video"
          ? "video"
          : normalizedType === "model3d"
            ? "model3d"
            : "image";
      return {
        type: resolvedType,
        url: normalizedUrl,
        thumbnailUrl: String(item?.thumbnailUrl ?? "").trim(),
        label:
          String(item?.label ?? "").trim() ||
          (resolvedType === "video"
            ? "Product video"
            : resolvedType === "model3d"
              ? "3D model"
              : `Image ${index + 1}`),
      };
    })
    .filter(Boolean);
  const optionModelItem =
    options?.showModelButton === false
      ? null
      : (options?.modelItem ?? getProductGalleryModelItem(options?.product ?? options?.sourceProduct));
  if (optionModelItem?.url) {
    const modelUrl = String(optionModelItem.url ?? "").trim();
    const modelKey = modelUrl.toLowerCase();
    const hasDuplicateModel = normalizedItems.some(
      (item) => String(item?.url ?? "").trim().toLowerCase() === modelKey,
    );
    if (
      modelUrl &&
      !hasDuplicateModel &&
      canPreviewProductModelInBrowser(modelUrl, optionModelItem.label || modelUrl)
    ) {
      normalizedItems.push({
        type: "model3d",
        url: modelUrl,
        thumbnailUrl: "",
        label: String(optionModelItem.label ?? "").trim() || "3D model",
      });
    }
  }

  if (!normalizedItems.length) {
    return;
  }

  const showCropGuide = Boolean(options?.showCropGuide);
  const showActions =
    options?.showActions === undefined ? true : Boolean(options?.showActions);
  const onSave = typeof options?.onSave === "function" ? options.onSave : null;
  const onCancelAction =
    typeof options?.onCancelAction === "function" ? options.onCancelAction : null;
  const onSecondaryAction =
    typeof options?.onSecondaryAction === "function" ? options.onSecondaryAction : null;
  const showCancelAction =
    options?.showCancelAction === undefined ? true : Boolean(options?.showCancelAction);
  const showSecondaryAction = Boolean(options?.showSecondaryAction);
  const primaryActionLabel = String(options?.primaryActionLabel ?? "Save").trim() || "Save";
  const primaryActionMediaType =
    String(options?.primaryActionMediaType ?? "").trim().toLowerCase() || "";
  const secondaryActionLabel =
    String(options?.secondaryActionLabel ?? "").trim() || "";
  const secondaryActionMediaType =
    String(options?.secondaryActionMediaType ?? "").trim().toLowerCase() || "";
  const initialCropState = options?.initialCropState ?? null;
  const closeBeforeAction = Boolean(options?.closeBeforeAction);
  const closeBeforeSecondaryAction = Boolean(options?.closeBeforeSecondaryAction);
  const cropAspectRatio = Number(options?.cropAspectRatio);

  ensureProductGalleryModal().open({
    productTitle: productTitle || "Product media",
    items: normalizedItems,
    startIndex,
    showFooter: false,
    showThumbs: false,
    showActions,
    showCancelAction,
    showSecondaryAction,
    showCropGuide,
    showModelButton: options?.showModelButton !== false,
    useItemLabelAsTitle: Boolean(options?.useItemLabelAsTitle),
    onSave,
    onCancelAction,
    onSecondaryAction,
    primaryActionLabel,
    primaryActionMediaType,
    secondaryActionLabel,
    secondaryActionMediaType,
    initialCropState,
    closeBeforeAction,
    closeBeforeSecondaryAction,
    cropAspectRatio,
    compact: true,
    showZoom: options?.showZoom !== false,
    autoplay: Boolean(options?.autoplay),
  });
}

async function requestElementFullscreen(element) {
  if (!element) {
    return false;
  }

  const requestFullscreen =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.msRequestFullscreen;

  if (typeof requestFullscreen !== "function") {
    return false;
  }

  try {
    await requestFullscreen.call(element);
    return true;
  } catch (_) {
    return false;
  }
}

function getNormalizedProductVideoUrls(product) {
  const rawVideoUrls = Array.isArray(product?.videoUrls) ? product.videoUrls : [];
  const seen = new Set();
  const normalizedVideoUrls = [];

  for (const candidate of rawVideoUrls) {
    const videoUrl = String(candidate ?? "").trim();
    const normalizedKey = videoUrl.toLowerCase();
    if (!videoUrl || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedVideoUrls.push(videoUrl);
  }

  const fallbackVideoUrl = String(product?.videoUrl ?? "").trim();
  if (!normalizedVideoUrls.length && fallbackVideoUrl) {
    normalizedVideoUrls.push(fallbackVideoUrl);
  }

  return normalizedVideoUrls;
}

function getProductVideoUrl(product) {
  return getNormalizedProductVideoUrls(product)[0] ?? "";
}

function getNormalizedProductVideoThumbnailUrls(
  product,
  videoUrls = getNormalizedProductVideoUrls(product),
) {
  const normalizedVideoUrls = Array.isArray(videoUrls) ? videoUrls : [];
  if (!normalizedVideoUrls.length) {
    return [];
  }

  const rawThumbnailUrls = Array.isArray(product?.videoThumbnailUrls)
    ? product.videoThumbnailUrls
    : [];
  const fallbackThumbnailUrl = String(product?.videoThumbnailUrl ?? "").trim();

  return normalizedVideoUrls.map((_, slotIndex) => {
    const candidateThumbnailUrl = String(rawThumbnailUrls[slotIndex] ?? "").trim();
    if (candidateThumbnailUrl) {
      return candidateThumbnailUrl;
    }

    return slotIndex === 0 ? fallbackThumbnailUrl : "";
  });
}

function getProductVideoThumbnailUrl(
  product,
  videoUrl = getProductVideoUrl(product),
  videoUrls = getNormalizedProductVideoUrls(product),
) {
  const normalizedVideoUrl = String(videoUrl ?? "").trim().toLowerCase();
  if (!normalizedVideoUrl) {
    return "";
  }

  const normalizedVideoUrls = Array.isArray(videoUrls) ? videoUrls : [];
  const thumbnailUrls = getNormalizedProductVideoThumbnailUrls(product, normalizedVideoUrls);
  const matchingIndex = normalizedVideoUrls.findIndex(
    (candidate) => String(candidate ?? "").trim().toLowerCase() === normalizedVideoUrl,
  );
  if (matchingIndex < 0) {
    return "";
  }

  return String(thumbnailUrls[matchingIndex] ?? "").trim();
}

function notifyProductsUpdated() {
  window.dispatchEvent(new CustomEvent("gms:products-updated"));
}

function formatPrice(price) {
  return `\u20B1 ${formatPriceAmount(price)}`;
}

function formatPriceAmount(price) {
  return Number(price).toFixed(2);
}

function getOriginalPrice(product) {
  const originalPriceRaw = String(product?.originalPrice ?? "").trim();
  if (originalPriceRaw !== "") {
    const originalPrice = Number(originalPriceRaw);
    if (Number.isFinite(originalPrice)) {
      return originalPrice;
    }
  }

  const fallbackPriceRaw = String(product?.price ?? "").trim();
  if (fallbackPriceRaw !== "") {
    const fallbackPrice = Number(fallbackPriceRaw);
    if (Number.isFinite(fallbackPrice)) {
      return fallbackPrice;
    }
  }

  return 0;
}

function getSalesPrice(product) {
  const salesPriceRaw = String(product?.salesPrice ?? "").trim();
  if (salesPriceRaw === "") {
    return null;
  }

  const salesPrice = Number(salesPriceRaw);
  return Number.isFinite(salesPrice) ? salesPrice : null;
}

function getSold(product) {
  const sold = Number(product.sold ?? 0);
  return Number.isFinite(sold) && sold >= 0 ? Math.trunc(sold) : 0;
}

function getStock(product) {
  const stock = Number(product?.inventoryStock ?? product?.stock ?? 0);
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getProductOldStockCount(product) {
  const stock = Number(
    product?.lastRestockPreviousStock ??
      product?.oldStockCount ??
      product?.previousStockCount ??
      0,
  );
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getProductNewStockCount(product) {
  const stock = Number(
    product?.lastRestockAddedStock ??
      product?.newStockCount ??
      product?.addedStockCount ??
      0,
  );
  return Number.isFinite(stock) && stock >= 0 ? Math.trunc(stock) : 0;
}

function getProductExpiryDate(product) {
  return (
    product?.expiryDate ??
    product?.expirationDate ??
    product?.expiredDate ??
    product?.expireDate ??
    product?.bestBeforeDate ??
    product?.bestBefore ??
    ""
  );
}

function getProductNewStockDate(product) {
  const explicitDate = String(
    product?.lastRestockExpiryDate ??
      product?.newStockDate ??
      product?.newStockExpiryDate ??
      product?.restockExpiryDate ??
      "",
  ).trim();

  if (explicitDate) {
    return explicitDate;
  }

  return getProductNewStockCount(product) > 0
    ? String(getProductExpiryDate(product) ?? "").trim()
    : "";
}

function getProductOldStockExpiryDate(product) {
  const explicitDate = String(
    product?.lastRestockPreviousExpiryDate ??
      product?.oldStockExpiryDate ??
      product?.previousExpiryDate ??
      "",
  ).trim();

  if (explicitDate) {
    return explicitDate;
  }

  const currentExpiryDate = String(getProductExpiryDate(product) ?? "").trim();
  if (getProductOldStockCount(product) > 0 && getProductNewStockCount(product) <= 0 && currentExpiryDate) {
    return currentExpiryDate;
  }

  return "";
}

function formatProductDateInputValue(value) {
  const parsedDate = parseProductDateValue(value);
  if (!(parsedDate instanceof Date)) {
    return "";
  }

  const year = parsedDate.getUTCFullYear();
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseProductExpiryDateInputValue(value) {
  const match = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year
    && date.getMonth() === monthIndex
    && date.getDate() === day
      ? date
      : null;
}

function formatProductExpiryDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSelectedProductExpiryDateExpired(value) {
  const parsedDate = value instanceof Date
    ? value
    : (parseProductExpiryDateInputValue(value) || parseProductDateValue(value));
  if (!(parsedDate instanceof Date)) {
    return false;
  }

  const today = new Date();
  const expiryDayStartTimestamp = Date.UTC(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
  );
  const todayStartTimestamp = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return expiryDayStartTimestamp < todayStartTimestamp;
}

function notifyExpiredProductNotAllowed() {
  showProductEditorSnackbar(
    "Expired product",
    "Expired products are not allowed. They cannot be listed in the app and stay as inventory records only.",
    "error",
  );
}

function formatProductExpiryDateDisplay(value) {
  const date = value instanceof Date ? value : parseProductExpiryDateInputValue(value);
  if (!(date instanceof Date)) {
    return "mm/dd/yyyy";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isSameProductExpiryCalendarDay(left, right) {
  return left instanceof Date
    && right instanceof Date
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function getProductExpiryDateCalendarElements() {
  if (!(productExpiryDateCalendar instanceof HTMLElement)) {
    return null;
  }

  return {
    month: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-month]"),
    days: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-days]"),
    previous: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-previous]"),
    next: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-next]"),
    today: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-today]"),
    clear: productExpiryDateCalendar.querySelector("[data-product-expiry-calendar-clear]"),
  };
}

function syncProductExpiryDateTrigger() {
  const value = String(productExpiryDateInput?.value ?? "").trim();
  const hasValue = Boolean(parseProductExpiryDateInputValue(value));

  if (productExpiryDateTrigger instanceof HTMLButtonElement) {
    if (productExpiryDateValue) {
      productExpiryDateValue.textContent = formatProductExpiryDateDisplay(value);
    }
    productExpiryDateTrigger.classList.toggle("is-empty", !hasValue);
    productExpiryDateTrigger.setAttribute(
      "aria-label",
      hasValue
        ? `Expiry date ${formatProductExpiryDateDisplay(value)}. Open calendar.`
        : "Select expiry date",
    );
  }

  productExpiryDatePicker?.classList.toggle("has-expiry-date", hasValue);

  const calendarClear = productExpiryDateCalendar?.querySelector?.(
    "[data-product-expiry-calendar-clear]",
  );
  if (calendarClear instanceof HTMLButtonElement) {
    calendarClear.hidden = !hasValue;
  }
}

function clearProductExpiryDate({ restoreFocus = true } = {}) {
  if (!(productExpiryDateInput instanceof HTMLInputElement)) {
    return;
  }

  productExpiryDateInput.value = "";
  syncProductExpiryDateTrigger();
  productExpiryDateInput.dispatchEvent(new Event("input", { bubbles: true }));
  productExpiryDateInput.dispatchEvent(new Event("change", { bubbles: true }));
  if (typeof setProductExpiryDateCalendarOpen === "function") {
    setProductExpiryDateCalendarOpen(false, { restoreFocus: false });
  }
  if (restoreFocus) {
    if (productExpiryDateTrigger instanceof HTMLButtonElement) {
      productExpiryDateTrigger.focus();
    } else {
      productExpiryDateInput.focus();
    }
  }
}

function renderProductExpiryDateCalendar() {
  const elements = getProductExpiryDateCalendarElements();
  if (!elements || !(elements.month instanceof HTMLElement) || !(elements.days instanceof HTMLElement)) {
    return;
  }

  const selectedDate = parseProductExpiryDateInputValue(productExpiryDateInput?.value);
  const today = new Date();
  const viewMonth = productExpiryDateViewMonth instanceof Date
    ? productExpiryDateViewMonth
    : new Date(
        (selectedDate ?? today).getFullYear(),
        (selectedDate ?? today).getMonth(),
        1,
      );
  productExpiryDateViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);

  elements.month.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(productExpiryDateViewMonth);
  elements.days.replaceChildren();

  const firstVisibleDay = new Date(
    productExpiryDateViewMonth.getFullYear(),
    productExpiryDateViewMonth.getMonth(),
    1 - productExpiryDateViewMonth.getDay(),
  );
  const daysInViewMonth = new Date(
    productExpiryDateViewMonth.getFullYear(),
    productExpiryDateViewMonth.getMonth() + 1,
    0,
  ).getDate();
  const visibleDayCount = Math.max(
    35,
    Math.ceil((productExpiryDateViewMonth.getDay() + daysInViewMonth) / 7) * 7,
  );

  for (let index = 0; index < visibleDayCount; index += 1) {
    const dayDate = new Date(
      firstVisibleDay.getFullYear(),
      firstVisibleDay.getMonth(),
      firstVisibleDay.getDate() + index,
    );
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "product-expiry-calendar__day";
    dayButton.textContent = String(dayDate.getDate());
    dayButton.dataset.date = formatProductExpiryDateInputValue(dayDate);
    dayButton.setAttribute(
      "aria-label",
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(dayDate),
    );

    if (dayDate.getMonth() !== productExpiryDateViewMonth.getMonth()) {
      dayButton.classList.add("is-outside-month");
    }
    if (isSameProductExpiryCalendarDay(dayDate, today)) {
      dayButton.classList.add("is-today");
    }
    if (isSameProductExpiryCalendarDay(dayDate, selectedDate)) {
      dayButton.classList.add("is-selected");
      dayButton.setAttribute("aria-selected", "true");
    }
    if (isSelectedProductExpiryDateExpired(dayDate)) {
      dayButton.classList.add("is-expired");
    }

    dayButton.addEventListener("click", () => {
      setProductExpiryDate(dayDate);
    });
    elements.days.appendChild(dayButton);
  }

  if (elements.clear instanceof HTMLButtonElement) {
    elements.clear.hidden = !selectedDate;
  }
}

function positionProductExpiryDateCalendar() {
  if (
    !(productExpiryDateCalendar instanceof HTMLElement)
    || productExpiryDateCalendar.hidden
    || !(productExpiryDateTrigger instanceof HTMLElement)
  ) {
    return;
  }

  const triggerRect = productExpiryDateTrigger.getBoundingClientRect();
  const panelRect = productExpiryDateCalendar.getBoundingClientRect();
  const viewportPadding = 12;
  const panelGap = 13;
  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;
  const preferredLeft = triggerRect.right - panelWidth;
  const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
  const left = Math.min(Math.max(viewportPadding, preferredLeft), maxLeft);
  let top = triggerRect.bottom + panelGap;
  let opensUp = false;

  if (top + panelHeight > window.innerHeight - viewportPadding) {
    const upwardTop = triggerRect.top - panelHeight - panelGap;
    if (upwardTop >= viewportPadding) {
      top = upwardTop;
      opensUp = true;
    } else {
      top = Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding);
    }
  }

  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  const arrowLeft = Math.min(Math.max(22, triggerCenter - left), panelWidth - 22);
  productExpiryDateCalendar.classList.toggle("is-open-up", opensUp);
  productExpiryDateCalendar.style.left = `${Math.round(left)}px`;
  productExpiryDateCalendar.style.top = `${Math.round(top)}px`;
  productExpiryDateCalendar.style.setProperty(
    "--product-expiry-calendar-arrow-left",
    `${Math.round(arrowLeft)}px`,
  );
}

function requestProductExpiryDateCalendarPosition() {
  if (productExpiryDatePositionFrame) {
    return;
  }

  productExpiryDatePositionFrame = window.requestAnimationFrame(() => {
    productExpiryDatePositionFrame = 0;
    positionProductExpiryDateCalendar();
  });
}

function setProductExpiryDateCalendarOpen(isOpen, { restoreFocus = false } = {}) {
  if (
    !(productExpiryDatePicker instanceof HTMLElement)
    || !(productExpiryDateTrigger instanceof HTMLButtonElement)
  ) {
    return;
  }

  const panel = ensureProductExpiryDateCalendar();
  if (!(panel instanceof HTMLElement)) {
    return;
  }

  const nextIsOpen = Boolean(isOpen);
  panel.hidden = !nextIsOpen;
  productExpiryDatePicker.classList.toggle("is-open", nextIsOpen);
  productExpiryDateTrigger.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");

  if (nextIsOpen) {
    const selectedDate = parseProductExpiryDateInputValue(productExpiryDateInput?.value) ?? new Date();
    productExpiryDateViewMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderProductExpiryDateCalendar();
    requestProductExpiryDateCalendarPosition();
    window.requestAnimationFrame(() => {
      const preferredDay = panel.querySelector(
        ".product-expiry-calendar__day.is-selected, .product-expiry-calendar__day.is-today",
      );
      preferredDay?.focus?.({ preventScroll: true });
    });
    return;
  }

  if (restoreFocus) {
    productExpiryDateTrigger.focus({ preventScroll: true });
  }
}

function setProductExpiryDate(date) {
  if (!(productExpiryDateInput instanceof HTMLInputElement) || !(date instanceof Date)) {
    return;
  }

  if (isSelectedProductExpiryDateExpired(date)) {
    notifyExpiredProductNotAllowed();
    return;
  }

  productExpiryDateInput.value = formatProductExpiryDateInputValue(date);
  syncProductExpiryDateTrigger();
  productExpiryDateInput.dispatchEvent(new Event("input", { bubbles: true }));
  productExpiryDateInput.dispatchEvent(new Event("change", { bubbles: true }));
  setProductExpiryDateCalendarOpen(false, { restoreFocus: true });
}

function ensureProductExpiryDateCalendar() {
  if (productExpiryDateCalendar instanceof HTMLElement) {
    return productExpiryDateCalendar;
  }
  if (!(productExpiryDatePicker instanceof HTMLElement)) {
    return null;
  }

  const panel = document.createElement("div");
  panel.id = "product-expiry-date-calendar";
  panel.className = "product-expiry-calendar";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Choose expiry date");
  panel.innerHTML = `
    <div class="product-expiry-calendar__header">
      <button type="button" class="product-expiry-calendar__nav" data-product-expiry-calendar-previous aria-label="Previous month">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
      </button>
      <strong class="product-expiry-calendar__month" data-product-expiry-calendar-month></strong>
      <button type="button" class="product-expiry-calendar__nav" data-product-expiry-calendar-next aria-label="Next month">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
      </button>
    </div>
    <div class="product-expiry-calendar__weekdays" aria-hidden="true">
      ${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
        .map((weekday) => `<span class="product-expiry-calendar__weekday">${weekday}</span>`)
        .join("")}
    </div>
    <div class="product-expiry-calendar__days" role="grid" data-product-expiry-calendar-days></div>
    <div class="product-expiry-calendar__footer">
      <button type="button" class="product-expiry-calendar__clear" data-product-expiry-calendar-clear hidden aria-label="Remove expiry date" title="Remove date">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
        <span>Remove date</span>
      </button>
      <button type="button" class="product-expiry-calendar__today" data-product-expiry-calendar-today>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path>
        </svg>
        <span>Today</span>
      </button>
    </div>
  `;
  document.body.appendChild(panel);
  productExpiryDateCalendar = panel;

  const elements = getProductExpiryDateCalendarElements();
  elements?.previous?.addEventListener("click", () => {
    const viewMonth = productExpiryDateViewMonth ?? new Date();
    productExpiryDateViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderProductExpiryDateCalendar();
    requestProductExpiryDateCalendarPosition();
  });
  elements?.next?.addEventListener("click", () => {
    const viewMonth = productExpiryDateViewMonth ?? new Date();
    productExpiryDateViewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderProductExpiryDateCalendar();
    requestProductExpiryDateCalendarPosition();
  });
  elements?.today?.addEventListener("click", () => {
    setProductExpiryDate(new Date());
  });
  elements?.clear?.addEventListener("click", () => {
    clearProductExpiryDate({ restoreFocus: true });
  });

  return panel;
}

function initializeProductExpiryDatePicker() {
  if (
    !(productExpiryDatePicker instanceof HTMLElement)
    || !(productExpiryDateInput instanceof HTMLInputElement)
    || !(productExpiryDateTrigger instanceof HTMLButtonElement)
  ) {
    syncProductExpiryDateTrigger();
    return;
  }

  if (productExpiryDatePicker.dataset.initialized === "true") {
    syncProductExpiryDateTrigger();
    return;
  }

  productExpiryDatePicker.dataset.initialized = "true";
  syncProductExpiryDateTrigger();
  productExpiryDateTrigger.addEventListener("click", () => {
    setProductExpiryDateCalendarOpen(productExpiryDateTrigger.getAttribute("aria-expanded") !== "true");
  });
  productExpiryDateTrigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setProductExpiryDateCalendarOpen(true);
    }
  });
  productExpiryDateInput.addEventListener("change", () => {
    if (isSelectedProductExpiryDateExpired(productExpiryDateInput.value)) {
      notifyExpiredProductNotAllowed();
      productExpiryDateInput.value = "";
    }
    syncProductExpiryDateTrigger();
    if (productExpiryDateCalendar && !productExpiryDateCalendar.hidden) {
      renderProductExpiryDateCalendar();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      productExpiryDateCalendar?.hidden !== false
      || !(event.target instanceof Node)
      || productExpiryDatePicker.contains(event.target)
      || productExpiryDateCalendar.contains(event.target)
    ) {
      return;
    }
    setProductExpiryDateCalendarOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && productExpiryDateCalendar?.hidden === false) {
      event.preventDefault();
      setProductExpiryDateCalendarOpen(false, { restoreFocus: true });
    }
  });
  document.addEventListener("scroll", requestProductExpiryDateCalendarPosition, true);
  window.addEventListener("resize", requestProductExpiryDateCalendarPosition);
}

function hasProductRestockDetails(product) {
  return getProductOldStockCount(product) > 0 || getProductNewStockCount(product) > 0;
}

function normalizeSellPrioritySourceBatch(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (
    normalizedValue === "old"
    || normalizedValue === "new"
    || normalizedValue === "undated"
  ) {
    return normalizedValue;
  }
  if (/^dated-\d+$/.test(normalizedValue)) {
    return normalizedValue;
  }
  return "";
}

function mapSellPrioritySourceBatchToOldNew(value, product) {
  const requestedPriority = normalizeSellPrioritySourceBatch(value);
  if (requestedPriority === "old" || requestedPriority === "new") {
    return requestedPriority;
  }

  const oldExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newExpiryDate = String(getProductNewStockDate(product) ?? "").trim();
  const { oldStock, newStock } = getProductStockBreakdown(product);

  if (requestedPriority === "undated") {
    if (!oldExpiryDate && oldStock > 0) {
      return "old";
    }
    if (!newExpiryDate && newStock > 0) {
      return "new";
    }
    if (oldStock > 0) {
      return "old";
    }
    if (newStock > 0) {
      return "new";
    }
    return "";
  }

  if (requestedPriority.startsWith("dated-")) {
    const priorityDay = Number(requestedPriority.slice(6));
    const oldDateKey = formatProductDateInputValue(oldExpiryDate);
    const newDateKey = formatProductDateInputValue(newExpiryDate);
    const oldDay = oldDateKey
      ? Date.UTC(
          Number(oldDateKey.slice(0, 4)),
          Number(oldDateKey.slice(5, 7)) - 1,
          Number(oldDateKey.slice(8, 10)),
        )
      : NaN;
    const newDay = newDateKey
      ? Date.UTC(
          Number(newDateKey.slice(0, 4)),
          Number(newDateKey.slice(5, 7)) - 1,
          Number(newDateKey.slice(8, 10)),
        )
      : NaN;
    if (Number.isFinite(priorityDay) && Number.isFinite(oldDay) && priorityDay === oldDay && oldStock > 0) {
      return "old";
    }
    if (Number.isFinite(priorityDay) && Number.isFinite(newDay) && priorityDay === newDay && newStock > 0) {
      return "new";
    }
  }

  return "";
}

function isInventoryBatchSellableForListing(stock, expiryDate) {
  return Number(stock) > 0 && !isExpiryDateUnlistedFromApp(expiryDate);
}

function getListingActiveSourceBatch(product) {
  if (!hasProductRestockDetails(product)) {
    return "";
  }

  const { oldStock, newStock } = getProductStockBreakdown(product);
  const oldExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newExpiryDate = String(getProductNewStockDate(product) ?? "").trim();
  const sellableOld = isInventoryBatchSellableForListing(oldStock, oldExpiryDate);
  const sellableNew = isInventoryBatchSellableForListing(newStock, newExpiryDate);
  const priority = mapSellPrioritySourceBatchToOldNew(
    product?.sellPrioritySourceBatch,
    product,
  );

  // Prefer the inventory sell-priority batch while it still has sellable stock.
  if (priority === "old" && sellableOld) {
    return "old";
  }
  if (priority === "new" && sellableNew) {
    return "new";
  }

  // When priority is depleted/cleared, auto-select the next available batch
  // (same fallback order as sales without an active priority: new, then old).
  if (sellableNew) {
    return "new";
  }
  if (sellableOld) {
    return "old";
  }
  return "";
}

function getListingActiveExpiryDate(product) {
  const sourceBatch = getListingActiveSourceBatch(product);
  if (sourceBatch === "old") {
    return String(getProductOldStockExpiryDate(product) ?? "").trim();
  }
  if (sourceBatch === "new") {
    return String(getProductNewStockDate(product) ?? "").trim();
  }
  return String(getProductExpiryDate(product) ?? "").trim();
}

const LISTING_STOCK_DEDUCT_REASON_OPTIONS = Object.freeze([
  { value: "wrong-entry", label: "Wrong Type / Wrong Entry" },
  { value: "walk-in-order-pickup", label: "Walk-in Order Pickup" },
  { value: "damaged-accident", label: "Damaged / Accident" },
  { value: "missing-lost", label: "Missing / Lost" },
  { value: "expired-disposed", label: "Expired / Disposed" },
  { value: "other", label: "Other" },
]);

function listingExpiryDatesMatch(left, right) {
  const leftValue = formatProductDateInputValue(left);
  const rightValue = formatProductDateInputValue(right);
  if (!leftValue && !rightValue) {
    return true;
  }
  return Boolean(leftValue) && leftValue === rightValue;
}

function getListingPriorityBatchSnapshot(product, sourceBatchOverride = "") {
  const existingStock = getStock(product);
  const sourceBatch = normalizeSellPrioritySourceBatch(
    sourceBatchOverride || editingListingActiveSourceBatch || getListingActiveSourceBatch(product),
  );

  if (!hasProductRestockDetails(product) || !sourceBatch) {
    const expiryDate = String(
      getListingActiveExpiryDate(product) || getProductExpiryDate(product) || "",
    ).trim();
    return {
      sourceBatch: sourceBatch || "old",
      qty: existingStock,
      expiryDate,
      otherSourceBatch: sourceBatch === "old" ? "new" : "old",
      otherQty: 0,
      otherExpiryDate: "",
      hasSplitBatches: false,
      preservedPriority: normalizeSellPrioritySourceBatch(product?.sellPrioritySourceBatch),
    };
  }

  const { oldStock, newStock } = getProductStockBreakdown(product);
  const oldExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newExpiryDate = String(getProductNewStockDate(product) ?? "").trim();
  const isOldPriority = sourceBatch === "old";

  return {
    sourceBatch,
    qty: isOldPriority ? oldStock : newStock,
    expiryDate: isOldPriority ? oldExpiryDate : newExpiryDate,
    otherSourceBatch: isOldPriority ? "new" : "old",
    otherQty: isOldPriority ? newStock : oldStock,
    otherExpiryDate: isOldPriority ? newExpiryDate : oldExpiryDate,
    hasSplitBatches: true,
    preservedPriority: normalizeSellPrioritySourceBatch(product?.sellPrioritySourceBatch) || sourceBatch,
  };
}

function getListingPriorityDeductLimit(product, sourceBatchOverride = "") {
  return Math.max(0, getListingPriorityBatchSnapshot(product, sourceBatchOverride).qty);
}

function getListingStockInputMinimum(product, sourceBatchOverride = "") {
  const totalStock = getStock(product);
  const priorityQty = getListingPriorityDeductLimit(product, sourceBatchOverride);
  return Math.max(0, totalStock - priorityQty);
}

function syncListingStockInputLimits(product = null) {
  const stockInput = form?.elements?.stock;
  if (!(stockInput instanceof HTMLInputElement)) {
    return;
  }

  if (!editingProductId || !product) {
    stockInput.removeAttribute("min");
    stockInput.removeAttribute("data-listing-priority-stock");
    return;
  }

  const minimumStock = getListingStockInputMinimum(product);
  const priorityQty = getListingPriorityDeductLimit(product);
  stockInput.min = String(minimumStock);
  stockInput.dataset.listingPriorityStock = String(priorityQty);
  stockInput.title = priorityQty > 0
    ? `Total stock. You can deduct up to ${priorityQty} from the priority batch only.`
    : "Total stock";
}

function normalizeListingStockDeductReason(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return LISTING_STOCK_DEDUCT_REASON_OPTIONS.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "";
}

function getListingStockDeductReasonLabel(value, detail = "") {
  const normalizedValue = normalizeListingStockDeductReason(value);
  if (normalizedValue === "other") {
    return String(detail ?? "").trim() || "Other";
  }
  return LISTING_STOCK_DEDUCT_REASON_OPTIONS.find((option) => option.value === normalizedValue)?.label
    ?? "";
}

function closeListingStockDeductReasonModal() {
  if (!listingStockDeductReasonModalElements) {
    return;
  }
  listingStockDeductReasonModalElements.overlay.classList.remove("is-open");
  listingStockDeductReasonModalElements.overlay.hidden = true;
  listingStockDeductReasonModalElements.resolvePromise = null;
  syncModalOpenClass();
}

function ensureListingStockDeductReasonModal() {
  if (listingStockDeductReasonModalElements) {
    return listingStockDeductReasonModalElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "seller-confirm-modal-overlay listing-stock-deduct-reason-modal-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section
      class="seller-confirm-modal seller-confirm-modal--notice"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-stock-deduct-reason-title"
      tabindex="-1"
    >
      <button
        type="button"
        class="seller-confirm-modal__close"
        data-listing-stock-deduct-close
        aria-label="Close deduct reason modal"
      >
        ${SELLER_CONFIRM_CLOSE_ICON}
      </button>
      <span class="seller-confirm-modal__icon" aria-hidden="true">
        ${SELLER_CONFIRM_NOTICE_ICON}
      </span>
      <div class="seller-confirm-modal__header">
        <h2 id="listing-stock-deduct-reason-title">Reason for deducting</h2>
        <p data-listing-stock-deduct-copy></p>
      </div>
      <div class="seller-confirm-modal__content">
        <label class="seller-confirm-modal__field">
          <span>Reason</span>
          <select data-listing-stock-deduct-reason>
            <option value="">Select a reason</option>
            ${LISTING_STOCK_DEDUCT_REASON_OPTIONS.map(
              (option) => `<option value="${option.value}">${option.label}</option>`,
            ).join("")}
          </select>
        </label>
        <label class="seller-confirm-modal__field" data-listing-stock-deduct-other-wrap hidden>
          <span>Other reason</span>
          <input type="text" data-listing-stock-deduct-other maxlength="120" placeholder="Type the deduct reason" />
        </label>
      </div>
      <div class="seller-confirm-modal__actions">
        <button type="button" class="seller-confirm-modal__cancel" data-listing-stock-deduct-cancel>
          Cancel
        </button>
        <button type="button" class="seller-confirm-modal__confirm" data-listing-stock-deduct-continue disabled>
          <span>Continue</span>
        </button>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const reasonSelect = overlay.querySelector("[data-listing-stock-deduct-reason]");
  const otherWrap = overlay.querySelector("[data-listing-stock-deduct-other-wrap]");
  const otherInput = overlay.querySelector("[data-listing-stock-deduct-other]");
  const continueButton = overlay.querySelector("[data-listing-stock-deduct-continue]");
  const cancelButton = overlay.querySelector("[data-listing-stock-deduct-cancel]");
  const closeButton = overlay.querySelector("[data-listing-stock-deduct-close]");
  const copy = overlay.querySelector("[data-listing-stock-deduct-copy]");

  const syncContinueState = () => {
    const reason = normalizeListingStockDeductReason(reasonSelect?.value);
    const needsOther = reason === "other";
    if (otherWrap instanceof HTMLElement) {
      otherWrap.hidden = !needsOther;
    }
    const otherDetail = String(otherInput?.value ?? "").trim();
    if (continueButton instanceof HTMLButtonElement) {
      continueButton.disabled = !(reason && (!needsOther || otherDetail));
    }
  };

  reasonSelect?.addEventListener("change", syncContinueState);
  otherInput?.addEventListener("input", syncContinueState);

  const finish = (result) => {
    const resolver = listingStockDeductReasonModalElements?.resolvePromise;
    closeListingStockDeductReasonModal();
    if (typeof resolver === "function") {
      resolver(result);
    }
  };

  cancelButton?.addEventListener("click", () => finish(null));
  closeButton?.addEventListener("click", () => finish(null));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      finish(null);
    }
  });
  continueButton?.addEventListener("click", () => {
    const reason = normalizeListingStockDeductReason(reasonSelect?.value);
    const detail = String(otherInput?.value ?? "").trim();
    if (!reason || (reason === "other" && !detail)) {
      syncContinueState();
      return;
    }
    finish({
      reason,
      detail,
      label: getListingStockDeductReasonLabel(reason, detail),
    });
  });

  listingStockDeductReasonModalElements = {
    overlay,
    reasonSelect,
    otherWrap,
    otherInput,
    continueButton,
    copy,
    resolvePromise: null,
    syncContinueState,
  };
  return listingStockDeductReasonModalElements;
}

function openListingStockDeductReasonModal({ deductQuantity = 0, priorityQuantity = 0 } = {}) {
  const modal = ensureListingStockDeductReasonModal();
  if (!modal) {
    return Promise.resolve(null);
  }

  if (modal.reasonSelect instanceof HTMLSelectElement) {
    modal.reasonSelect.value = "";
  }
  if (modal.otherInput instanceof HTMLInputElement) {
    modal.otherInput.value = "";
  }
  if (modal.copy instanceof HTMLElement) {
    modal.copy.textContent =
      `You are deducting ${Math.max(0, Math.trunc(Number(deductQuantity) || 0))} from the priority batch`
      + (priorityQuantity > 0 ? ` (${priorityQuantity} available).` : ".");
    modal.copy.hidden = false;
  }
  modal.syncContinueState?.();
  modal.overlay.hidden = false;
  window.requestAnimationFrame(() => {
    modal.overlay.classList.add("is-open");
    modal.reasonSelect?.focus();
  });
  syncModalOpenClass();

  return new Promise((resolve) => {
    modal.resolvePromise = resolve;
  });
}

function createListingStockHistoryEntry({
  stock,
  addedQuantity = 0,
  deductedQuantity = 0,
  expiryDate = "",
  reason = "",
  label = "",
  sourceBatch = "",
} = {}) {
  const modifiedAt = new Date().toISOString();
  return {
    id: `listing-stock-${Date.parse(modifiedAt) || Date.now()}`,
    stock: Math.max(0, Math.trunc(Number(stock) || 0)),
    addedQuantity: Math.max(0, Math.trunc(Number(addedQuantity) || 0)),
    deductedQuantity: Math.max(0, Math.trunc(Number(deductedQuantity) || 0)),
    expiryDate: deductedQuantity > 0 ? "" : String(expiryDate ?? "").trim(),
    modifiedAt,
    reason: String(reason ?? "").trim(),
    label: String(label ?? "").trim()
      || (addedQuantity > 0
        ? "Added Stock"
        : deductedQuantity > 0
          ? "Deducted Stock"
          : "Edit Expiry Date"),
    ...(sourceBatch ? { sourceBatch } : {}),
  };
}

function buildListingBatchPayloadFields({
  sourceBatch,
  priorityQty,
  priorityExpiry,
  otherQty,
  otherExpiry,
  preservedPriority,
}) {
  const normalizedSourceBatch = normalizeSellPrioritySourceBatch(sourceBatch) || "old";
  const oldStock = normalizedSourceBatch === "old" ? priorityQty : otherQty;
  const newStock = normalizedSourceBatch === "new" ? priorityQty : otherQty;
  const oldExpiry = normalizedSourceBatch === "old" ? priorityExpiry : otherExpiry;
  const newExpiry = normalizedSourceBatch === "new" ? priorityExpiry : otherExpiry;

  return {
    lastRestockPreviousStock: Math.max(0, oldStock),
    lastRestockPreviousExpiryDate: oldStock > 0 ? String(oldExpiry ?? "").trim() : "",
    lastRestockAddedStock: Math.max(0, newStock),
    lastRestockExpiryDate: newStock > 0 ? String(newExpiry ?? "").trim() : "",
    sellPrioritySourceBatch: normalizeSellPrioritySourceBatch(preservedPriority) || normalizedSourceBatch,
    // Product-level expiry tracks the priority/active selling batch.
    expiryDate: String(priorityExpiry ?? "").trim(),
  };
}

function applyListingActiveBatchFieldsToPayload(payload, product, options = {}) {
  if (!payload || typeof payload !== "object") {
    return { ok: true, payload };
  }

  const submittedExpiryDate = formatProductDateInputValue(
    options.submittedExpiryDate ?? payload.expiryDate ?? "",
  );
  const submittedStock = getStock({ stock: payload.stock });
  const existingStock = getStock(product);
  const delta = submittedStock - existingStock;
  const snapshot = getListingPriorityBatchSnapshot(
    product,
    options.sourceBatch || editingListingActiveSourceBatch,
  );
  const deductReason = options.deductReason && typeof options.deductReason === "object"
    ? options.deductReason
    : listingStockDeductReasonDraft;

  payload.stock = submittedStock;
  payload.inventoryStock = submittedStock;

  // Single-batch listing (no old/new split yet).
  if (!snapshot.hasSplitBatches) {
    const currentExpiry = formatProductDateInputValue(
      snapshot.expiryDate || getProductExpiryDate(product),
    );

    if (delta < 0) {
      const deductQuantity = Math.abs(delta);
      if (deductQuantity > snapshot.qty) {
        return {
          ok: false,
          error:
            `You can only deduct up to ${snapshot.qty} from the current priority stock.`,
        };
      }
      payload.expiryDate = submittedExpiryDate || currentExpiry;
      payload.sellPrioritySourceBatch = "";
      payload.lastRestockPreviousStock = 0;
      payload.lastRestockPreviousExpiryDate = "";
      payload.lastRestockAddedStock = 0;
      payload.lastRestockExpiryDate = "";
      payload.stockHistoryEntry = createListingStockHistoryEntry({
        stock: submittedStock,
        deductedQuantity: deductQuantity,
        reason: String(deductReason?.label || deductReason?.reason || "").trim(),
        label: "Deducted Stock",
        sourceBatch: "old",
      });
      return { ok: true, payload };
    }

    if (delta > 0) {
      const expiryChanged =
        Boolean(submittedExpiryDate)
        && Boolean(currentExpiry)
        && !listingExpiryDatesMatch(submittedExpiryDate, currentExpiry);

      if (expiryChanged && existingStock > 0) {
        // New expiry detail row; keep previous stock as priority.
        Object.assign(payload, {
          lastRestockPreviousStock: existingStock,
          lastRestockPreviousExpiryDate: currentExpiry,
          lastRestockAddedStock: delta,
          lastRestockExpiryDate: submittedExpiryDate,
          lastRestockedAt: new Date().toISOString(),
          sellPrioritySourceBatch: "old",
          expiryDate: currentExpiry,
        });
        payload.stockHistoryEntry = createListingStockHistoryEntry({
          stock: submittedStock,
          addedQuantity: delta,
          expiryDate: submittedExpiryDate,
          reason: "edit",
          label: "Added Stock",
          sourceBatch: "new",
        });
        return { ok: true, payload };
      }

      payload.expiryDate = submittedExpiryDate || currentExpiry;
      payload.sellPrioritySourceBatch = "";
      payload.lastRestockPreviousStock = 0;
      payload.lastRestockPreviousExpiryDate = "";
      payload.lastRestockAddedStock = 0;
      payload.lastRestockExpiryDate = "";
      payload.stockHistoryEntry = createListingStockHistoryEntry({
        stock: submittedStock,
        addedQuantity: delta,
        expiryDate: payload.expiryDate,
        reason: "edit",
        label: "Added Stock",
        sourceBatch: "old",
      });
      return { ok: true, payload };
    }

    // Expiry-only edit on a single batch.
    payload.expiryDate = submittedExpiryDate;
    payload.sellPrioritySourceBatch = "";
    if (submittedExpiryDate !== currentExpiry) {
      payload.stockHistoryEntry = createListingStockHistoryEntry({
        stock: existingStock,
        expiryDate: submittedExpiryDate,
        reason: "edit",
        label: "Edit Expiry Date",
        sourceBatch: "old",
      });
    }
    return { ok: true, payload };
  }

  let priorityQty = snapshot.qty;
  let priorityExpiry = formatProductDateInputValue(snapshot.expiryDate);
  let otherQty = snapshot.otherQty;
  let otherExpiry = formatProductDateInputValue(snapshot.otherExpiryDate);
  const preservedPriority = snapshot.preservedPriority || snapshot.sourceBatch;

  if (delta < 0) {
    const deductQuantity = Math.abs(delta);
    if (deductQuantity > priorityQty) {
      return {
        ok: false,
        error:
          `You can only deduct up to ${priorityQty} from the priority batch. `
          + "The rest of the stock stays in the other expiry batch.",
      };
    }
    priorityQty -= deductQuantity;
    if (submittedExpiryDate && priorityQty > 0) {
      priorityExpiry = submittedExpiryDate;
    }
    Object.assign(
      payload,
      buildListingBatchPayloadFields({
        sourceBatch: snapshot.sourceBatch,
        priorityQty,
        priorityExpiry: priorityQty > 0 ? priorityExpiry : "",
        otherQty,
        otherExpiry,
        preservedPriority: priorityQty > 0 ? preservedPriority : "",
      }),
    );
    payload.stockHistoryEntry = createListingStockHistoryEntry({
      stock: submittedStock,
      deductedQuantity: deductQuantity,
      reason: String(deductReason?.label || deductReason?.reason || "").trim(),
      label: "Deducted Stock",
      sourceBatch: snapshot.sourceBatch,
    });
    return { ok: true, payload };
  }

  if (delta > 0) {
    const nextExpiry = submittedExpiryDate || priorityExpiry;
    const matchesPriority = listingExpiryDatesMatch(nextExpiry, priorityExpiry);
    const matchesOther = otherQty > 0 && listingExpiryDatesMatch(nextExpiry, otherExpiry);

    if (matchesPriority || !nextExpiry) {
      priorityQty += delta;
      if (submittedExpiryDate) {
        priorityExpiry = submittedExpiryDate;
      }
      Object.assign(
        payload,
        buildListingBatchPayloadFields({
          sourceBatch: snapshot.sourceBatch,
          priorityQty,
          priorityExpiry,
          otherQty,
          otherExpiry,
          preservedPriority,
        }),
      );
      payload.stockHistoryEntry = createListingStockHistoryEntry({
        stock: submittedStock,
        addedQuantity: delta,
        expiryDate: priorityExpiry,
        reason: "edit",
        label: "Added Stock",
        sourceBatch: snapshot.sourceBatch,
      });
      return { ok: true, payload };
    }

    if (matchesOther || otherQty <= 0) {
      // New/extra expiry detail — never auto-promote to priority.
      otherQty += delta;
      otherExpiry = nextExpiry;
      Object.assign(
        payload,
        buildListingBatchPayloadFields({
          sourceBatch: snapshot.sourceBatch,
          priorityQty,
          priorityExpiry,
          otherQty,
          otherExpiry,
          preservedPriority,
        }),
      );
      if (snapshot.otherSourceBatch === "new" || (!snapshot.hasSplitBatches && snapshot.sourceBatch === "old")) {
        payload.lastRestockedAt = new Date().toISOString();
      }
      payload.stockHistoryEntry = createListingStockHistoryEntry({
        stock: submittedStock,
        addedQuantity: delta,
        expiryDate: otherExpiry,
        reason: "edit",
        label: "Added Stock",
        sourceBatch: snapshot.otherSourceBatch,
      });
      return { ok: true, payload };
    }

    return {
      ok: false,
      error:
        "This listing already has two expiry batches. "
        + "Use Inventory to manage additional expiry dates.",
    };
  }

  // Expiry-only: update priority batch expiry date.
  if (submittedExpiryDate) {
    priorityExpiry = submittedExpiryDate;
  }
  Object.assign(
    payload,
    buildListingBatchPayloadFields({
      sourceBatch: snapshot.sourceBatch,
      priorityQty,
      priorityExpiry,
      otherQty,
      otherExpiry,
      preservedPriority,
    }),
  );
  if (
    submittedExpiryDate
    && !listingExpiryDatesMatch(submittedExpiryDate, snapshot.expiryDate)
  ) {
    payload.stockHistoryEntry = createListingStockHistoryEntry({
      stock: submittedStock,
      expiryDate: priorityExpiry,
      reason: "edit",
      label: "Edit Expiry Date",
      sourceBatch: snapshot.sourceBatch,
    });
  }
  return { ok: true, payload };
}

function getProductStockBreakdown(product) {
  const totalStock = getStock(product);
  if (!hasProductRestockDetails(product)) {
    return {
      oldStock: totalStock,
      newStock: 0,
    };
  }

  const storedOldStock = Math.max(0, getProductOldStockCount(product));
  const storedNewStock = Math.max(0, getProductNewStockCount(product));
  if (storedOldStock > 0 || storedNewStock > 0) {
    return {
      oldStock: storedOldStock,
      newStock: storedNewStock,
    };
  }

  return {
    oldStock: totalStock,
    newStock: 0,
  };
}

function parseProductDateValue(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getTodayDayStartTimestamp() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function isExpiryDateValueExpired(value) {
  const parsedDate = parseProductDateValue(value);
  if (!(parsedDate instanceof Date)) {
    return false;
  }

  const expiryDayStartTimestamp = Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );
  return expiryDayStartTimestamp < getTodayDayStartTimestamp();
}

const PRODUCT_SELL_PRIORITY_LOCK_DAYS = 3;

function getProductDaysUntilExpiry(value) {
  const parsedDate = parseProductDateValue(value);
  if (!(parsedDate instanceof Date)) {
    return null;
  }

  const expiryDayStartTimestamp = Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );
  return Math.round(
    (expiryDayStartTimestamp - getTodayDayStartTimestamp()) / (24 * 60 * 60 * 1000),
  );
}

function isSellPriorityLockedForExpiryDate(value) {
  const daysUntilExpiry = getProductDaysUntilExpiry(value);
  return daysUntilExpiry !== null
    && daysUntilExpiry >= 0
    && daysUntilExpiry <= PRODUCT_SELL_PRIORITY_LOCK_DAYS;
}

function isExpiryDateUnlistedFromApp(value) {
  return isExpiryDateValueExpired(value) || isSellPriorityLockedForExpiryDate(value);
}

function isSplitProductDisplayEntry(product) {
  return Boolean(product?.isSplitProductDisplayEntry);
}

function isExpiredProductDisplayEntry(product) {
  return String(product?.productDisplayRole ?? "").trim().toLowerCase() === "expired";
}

function isFreshProductDisplayEntry(product) {
  return String(product?.productDisplayRole ?? "").trim().toLowerCase() === "fresh";
}

function getDisplayProductSourceProduct(product) {
  return product?.sourceProduct && typeof product.sourceProduct === "object"
    ? product.sourceProduct
    : product;
}

function getSplitProductDisplayConfig(product) {
  const { oldStock, newStock } = getProductStockBreakdown(product);
  if (oldStock <= 0 || newStock <= 0) {
    return null;
  }

  const oldStockExpiryDate = String(getProductOldStockExpiryDate(product) ?? "").trim();
  const newStockExpiryDate = String(
    getProductNewStockDate(product) ?? getProductExpiryDate(product) ?? "",
  ).trim();
  const oldStockIsUnlisted = isExpiryDateUnlistedFromApp(getProductOldStockExpiryDate(product));
  const newStockIsUnlisted = isExpiryDateUnlistedFromApp(
    getProductNewStockDate(product) ?? getProductExpiryDate(product),
  );
  if (oldStockIsUnlisted === newStockIsUnlisted) {
    return null;
  }

  return oldStockIsUnlisted
    ? {
        fresh: {
          stock: newStock,
          expiryDate: newStockExpiryDate,
          label: getProductNewStockCount(product) > 0 ? "Fresh Stock" : "Available Stock",
        },
      }
    : {
        fresh: {
          stock: oldStock,
          expiryDate: oldStockExpiryDate,
          label: "Available Stock",
        },
      };
}

function shouldSplitProductDisplayCards(product) {
  return Boolean(getSplitProductDisplayConfig(product));
}

function createSplitProductDisplayEntry(product, overrides = {}) {
  const baseProduct = product && typeof product === "object" ? product : {};
  return {
    ...baseProduct,
    ...overrides,
    sourceProduct: baseProduct,
    isSplitProductDisplayEntry: true,
    lastRestockPreviousStock: 0,
    lastRestockPreviousExpiryDate: "",
    lastRestockAddedStock: 0,
    lastRestockExpiryDate: "",
  };
}

function getProductDisplayEntries(products = currentProducts) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  return normalizedProducts.flatMap((product) => {
    if (getProductApprovalStatus(product) === "rejected") {
      return [];
    }

    const splitDisplayConfig = getSplitProductDisplayConfig(product);
    if (!splitDisplayConfig) {
      if (isExpiryDateUnlistedFromApp(getProductExpiryDate(product))) {
        return [];
      }
      return [product];
    }

    const freshEntry = createSplitProductDisplayEntry(product, {
      productDisplayId: `${String(product?.id ?? "").trim()}::fresh`,
      productDisplayRole: "fresh",
      productDisplayLabel: splitDisplayConfig.fresh.label,
      productDisplaySortOrder: 0,
      stock: splitDisplayConfig.fresh.stock,
      expiryDate: splitDisplayConfig.fresh.expiryDate,
      isActive: product?.isActive,
    });

    return [freshEntry];
  });
}

function getProductVisibilityToggleLabel(isActive, hasStockAvailable = true) {
  if (!hasStockAvailable) {
    return "Cannot activate a product with 0 stock";
  }

  return isActive ? "Deactivate product in app" : "Activate product in app";
}

function normalizeProductActiveState(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value !== 0 : fallback;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
      return true;
    }
    if (normalizedValue === "false") {
      return false;
    }
  }

  return fallback;
}

function getProductApprovalStatus(product) {
  const normalizedStatus = String(product?.approvalStatus ?? "")
    .trim()
    .toLowerCase();
  if (normalizedStatus === "pending" || normalizedStatus === "rejected") {
    return normalizedStatus;
  }
  return "approved";
}

function isProductPendingApproval(product) {
  return getProductApprovalStatus(product) === "pending";
}

function isProductRevisionRequested(product) {
  const revisionStatus = String(product?.revisionStatus ?? "").trim().toLowerCase();
  if (revisionStatus === "requested") {
    return true;
  }
  const revision = product?.yoloRevision && typeof product.yoloRevision === "object"
    ? product.yoloRevision
    : product?.revisionSignal && typeof product.revisionSignal === "object"
      ? product.revisionSignal
      : null;
  return String(revision?.status ?? "").trim().toLowerCase() === "requested";
}

function isProductInRevision(product) {
  if (isProductListingRestricted(product)) {
    return false;
  }
  return isProductRevisionRequested(product);
}

function isProductInReview(product) {
  if (isProductListingRestricted(product) || isProductRevisionRequested(product)) {
    return false;
  }
  return isProductPendingApproval(product);
}

function isProductApprovedForApp(product) {
  return getProductApprovalStatus(product) === "approved";
}

function getRating(product) {
  const rating = Number(product.rating ?? 0);
  return Number.isFinite(rating) && rating >= 0 ? rating : 0;
}

function getProductReviewCount(product) {
  const directCount = Number(
    product?.commentCount ??
      product?.reviewCommentCount ??
      product?.productReviewCommentCount ??
      product?.reviewCount ??
      0,
  );
  if (Number.isFinite(directCount) && directCount > 0) {
    return Math.trunc(directCount);
  }

  const reviewComments =
    product?.reviewComments ?? product?.productReviewComments ?? product?.reviews;
  return Array.isArray(reviewComments) ? reviewComments.length : 0;
}

function getDiscountPercent(product) {
  const originalPrice = getOriginalPrice(product);
  const salesPrice = getSalesPrice(product);

  if (salesPrice === null || originalPrice <= 0 || salesPrice >= originalPrice) {
    return null;
  }

  const discountAmount = originalPrice - salesPrice;
  if (discountAmount <= 0) {
    return null;
  }

  return Math.round((discountAmount / originalPrice) * 100);
}

function isTopRatedProduct(product) {
  const rating = getRating(product);
  return rating >= 4.5 && rating <= 5;
}

function normalizeCategoryName(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isSameCategoryName(left, right) {
  return normalizeCategoryName(left).toLowerCase() === normalizeCategoryName(right).toLowerCase();
}

function normalizeCategoryValues(values) {
  const rawValues = Array.isArray(values)
    ? values
    : values === null || values === undefined
      ? []
      : [values];
  const seen = new Set();
  const normalizedValues = [];

  for (const value of rawValues) {
    const normalizedCategory = normalizeCategoryName(value);
    if (!normalizedCategory) {
      continue;
    }

    const normalizedKey = normalizedCategory.toLowerCase();
    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedValues.push(normalizedCategory);
  }

  return normalizedValues;
}

function getProductCategoryList(product) {
  const normalizedCategories = normalizeCategoryValues(product?.categories);
  if (normalizedCategories.length) {
    return normalizedCategories;
  }

  const fallbackCategory = normalizeCategoryName(product?.category);
  return fallbackCategory ? [fallbackCategory] : [];
}

function getPrimaryProductCategory(product) {
  return getProductCategoryList(product)[0] ?? "";
}

function getProductCategoryLabel(product, fallbackLabel = "Uncategorized") {
  const categories = getProductCategoryList(product);
  return categories.length ? categories.join(", ") : fallbackLabel;
}

function getNormalizedProductImageUrls(product) {
  const rawImageUrls = Array.isArray(product?.imageUrls) ? product.imageUrls : [];
  const seen = new Set();
  const normalizedImageUrls = [];

  for (const candidate of rawImageUrls) {
    const imageUrl = String(candidate ?? "").trim();
    const normalizedKey = imageUrl.toLowerCase();

    if (!imageUrl || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedImageUrls.push(imageUrl);
  }

  const fallbackImageUrl = String(product?.imageUrl ?? "").trim();
  if (!normalizedImageUrls.length && fallbackImageUrl) {
    normalizedImageUrls.push(fallbackImageUrl);
  }

  return normalizedImageUrls;
}

function getResolvedProductMainImageIndex(product, imageUrls = getNormalizedProductImageUrls(product)) {
  if (!imageUrls.length) {
    return 0;
  }

  const requestedMainImageIndex = Number(product?.mainImageIndex ?? 0);
  if (
    Number.isInteger(requestedMainImageIndex) &&
    requestedMainImageIndex >= 0 &&
    requestedMainImageIndex < imageUrls.length
  ) {
    return requestedMainImageIndex;
  }

  const fallbackImageUrl = String(product?.mainImageUrl ?? product?.imageUrl ?? "").trim();
  const fallbackIndex = fallbackImageUrl ? imageUrls.indexOf(fallbackImageUrl) : -1;
  return fallbackIndex >= 0 ? fallbackIndex : 0;
}

function getPrimaryProductImageUrl(product) {
  const imageUrls = getNormalizedProductImageUrls(product);
  if (!imageUrls.length) {
    return "";
  }

  return imageUrls[getResolvedProductMainImageIndex(product, imageUrls)] ?? imageUrls[0];
}

function buildProductImagePayload(slotImageUrls, selectedMainImageSlot) {
  const normalizedSlots = (Array.isArray(slotImageUrls) ? slotImageUrls : [])
    .map((value) => String(value ?? "").trim());
  const populatedSlots = normalizedSlots
    .map((imageUrl, slotIndex) => ({ imageUrl, slotIndex }))
    .filter(({ imageUrl }) => imageUrl);
  const imageUrls = populatedSlots.map(({ imageUrl }) => imageUrl);
  const mainImageIndex = 0;

  return {
    imageUrls,
    mainImageIndex,
    imageUrl: imageUrls[mainImageIndex] ?? "",
  };
}

function getMainProductImagePreviewUrl() {
  return getImageSlotPreviewUrl(0, editingImageUrls[0] ?? "");
}

function isProductFormReadyToSave() {
  if (!form) {
    return false;
  }

  const requiredControls = Array.from(form.querySelectorAll("[required]"));
  const hasCompletedRequiredFields = requiredControls.every((control) => {
    if (
      !(
        control instanceof HTMLInputElement
        || control instanceof HTMLTextAreaElement
        || control instanceof HTMLSelectElement
      )
    ) {
      return true;
    }

    if (control.disabled) {
      return true;
    }

    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox" || control.type === "radio") {
        return control.checked;
      }
    }

    return String(control.value ?? "").trim() !== "";
  });

  return (
    hasCompletedRequiredFields
    && Boolean(getMainProductImagePreviewUrl())
    && hasProductDescriptionContent()
    && !isDescriptionImageProcessing
    && getSelectedActiveProductPartnerIds("delivery").length > 0
    && getSelectedActiveProductPartnerIds("payment").length > 0
    && getProductListingFieldLimitValidationIssues().length === 0
    && getAllEditableVariantValidationIssues().length === 0
  );
}

function getProductEditFormValue(fieldName) {
  const control = form?.elements?.[fieldName];
  if (
    !(
      control instanceof HTMLInputElement
      || control instanceof HTMLTextAreaElement
      || control instanceof HTMLSelectElement
    )
  ) {
    return "";
  }

  return String(control.value ?? "").trim();
}

function getProductEditFormCheckboxValue(fieldName) {
  const control = form?.elements?.[fieldName];
  return Boolean(control instanceof HTMLInputElement && control.checked);
}

function getProductEditFileSignature(file) {
  if (!file || typeof file !== "object") {
    return null;
  }

  return {
    name: String(file.name ?? ""),
    size: Number(file.size ?? 0),
    type: String(file.type ?? ""),
    lastModified: Number(file.lastModified ?? 0),
  };
}

function getProductEditSerializableValue(value) {
  if (value instanceof Map) {
    return Array.from(value.entries())
      .sort(([leftKey], [rightKey]) => String(leftKey).localeCompare(String(rightKey)))
      .map(([key, entryValue]) => [String(key), getProductEditSerializableValue(entryValue)]);
  }

  if (Array.isArray(value)) {
    return value.map((entryValue) => getProductEditSerializableValue(entryValue));
  }

  if (value && typeof value === "object") {
    const sortedValue = {};
    for (const key of Object.keys(value).sort()) {
      sortedValue[key] = getProductEditSerializableValue(value[key]);
    }
    return sortedValue;
  }

  return value ?? "";
}

function getProductEditSlotFileSnapshot(slotMap) {
  const source = slotMap && typeof slotMap === "object" ? slotMap : {};
  return Object.keys(source)
    .sort()
    .map((slotKey) => [slotKey, getProductEditFileSignature(source[slotKey])]);
}

function getProductEditVariantSnapshot() {
  return editingVariants
    .map((variant, index) => {
      const pendingImageFile = getProductEditFileSignature(variant?.pendingImageFile);
      const payload = buildVariantsPayload([variant])[0] ?? null;
      const cropSourceUrl = String(variant?.cropSourceUrl ?? "").trim();
      const croppedImageUrl = String(variant?.croppedImageUrl ?? "").trim();
      const imageSourceUrl = String(variant?.imageSourceUrl ?? "").trim();

      return {
        payload,
        position: index,
        imageSourceUrl,
        cropSourceUrl,
        croppedImageUrl,
        imagePositionX: normalizeCardImagePosition(
          variant?.imagePositionX,
          DEFAULT_CARD_IMAGE_POSITION_X,
        ),
        imagePositionY: normalizeCardImagePosition(
          variant?.imagePositionY,
          DEFAULT_CARD_IMAGE_POSITION,
        ),
        pendingImageFile,
      };
    })
    .filter(
      (variant) =>
        variant.payload ||
        variant.pendingImageFile ||
        variant.imageSourceUrl ||
        variant.cropSourceUrl ||
        variant.croppedImageUrl,
    );
}

function getProductEditCurrentSnapshot() {
  const snapshot = {
    fields: {
      name: getProductEditFormValue("name"),
      barcode: getProductEditFormValue("barcode"),
      moveBarcodeToPackingDashboard: getProductEditFormCheckboxValue(
        "moveBarcodeToPackingDashboard",
      ),
      originalPrice: getProductEditFormValue("originalPrice"),
      salesPrice: getProductEditFormValue("salesPrice"),
      stock: getProductEditFormValue("stock"),
      expiryDate: getProductEditFormValue("expiryDate"),
      description: getProductEditFormValue("description"),
      descriptionMode: isProductDescriptionModeSwitcherAvailable()
        ? getProductDescriptionMode()
        : "legacy",
    },
    categories: normalizeCategoryValues(selectedProductCategories),
    deliveryPartnerIds: getSelectedActiveProductPartnerIds("delivery"),
    paymentPartnerIds: getSelectedActiveProductPartnerIds("payment"),
    imageUrls: editingImageUrls.map((imageUrl) => String(imageUrl ?? "").trim()),
    pendingImageFiles: pendingImageFiles.map(getProductEditFileSignature),
    descriptionImageUrls: editingDescriptionImageUrls.map((imageUrl) =>
      String(imageUrl ?? "").trim(),
    ),
    pendingDescriptionImageFiles: pendingDescriptionImageFiles.map(
      getProductEditFileSignature,
    ),
    selectedMainImageSlot: Number.isInteger(selectedMainImageSlot) ? selectedMainImageSlot : 0,
    cardImagePositionX: normalizeCardImagePosition(
      editingCardImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    cardImagePositionY: normalizeCardImagePosition(editingCardImagePosition),
    cardCroppedImageUrl: String(previewCardCroppedImageUrl ?? "").trim(),
    cardCropSourceUrl: String(previewCardCropSourceUrl ?? "").trim(),
    buyModalImagePositionX: normalizeCardImagePosition(
      editingBuyModalImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    buyModalImagePositionY: normalizeCardImagePosition(
      editingBuyModalImagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    ),
    buyModalCroppedImageUrl: String(previewBuyModalCroppedImageUrl ?? "").trim(),
    buyModalCropSourceUrl: String(previewBuyModalCropSourceUrl ?? "").trim(),
    detailsCropStates: getProductEditSerializableValue(previewDetailsCropStates),
    detailsCropEntriesBySourceUrl: getProductEditSerializableValue(
      previewDetailsCropEntriesBySourceUrl,
    ),
    videoUrls: editingVideoUrls.map((videoUrl) => String(videoUrl ?? "").trim()),
    pendingVideoFiles: pendingVideoFiles.map(getProductEditFileSignature),
    videoThumbnailUrls: editingVideoThumbnailUrls.map((thumbnailUrl) =>
      String(thumbnailUrl ?? "").trim(),
    ),
    pendingVideoThumbnailFiles: pendingVideoThumbnailFiles.map(getProductEditFileSignature),
    visualSearchImageUrl: String(editingVisualSearchImageUrl ?? "").trim(),
    visualSearchImageAngles: getProductEditSerializableValue(editingVisualSearchImageAngles),
    pendingVisualSearchImageFile: getProductEditFileSignature(pendingVisualSearchImageFile),
    pendingVisualSearchImageFiles: getProductEditSlotFileSnapshot(pendingVisualSearchImageFiles),
    productModelUrl: String(editingProductModelUrl ?? "").trim(),
    pendingProductModelFile: getProductEditFileSignature(pendingProductModelFile),
    productModelScanImageUrls: editingProductModelScanImageUrls.map((imageUrl) =>
      String(imageUrl ?? "").trim(),
    ),
    pendingProductModelScanFiles: pendingProductModelScanFiles.map(getProductEditFileSignature),
    variants: getProductEditVariantSnapshot(),
  };

  return JSON.stringify(getProductEditSerializableValue(snapshot));
}

function withListingDraftTimeout(promise, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Listing draft storage timed out."));
    }, timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function openListingDraftDb() {
  if (listingDraftDb) {
    return Promise.resolve(listingDraftDb);
  }
  if (listingDraftDbPromise) {
    return listingDraftDbPromise;
  }

  listingDraftDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(LISTING_DRAFT_DB_NAME, LISTING_DRAFT_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(LISTING_DRAFT_MEDIA_STORE)) {
        db.createObjectStore(LISTING_DRAFT_MEDIA_STORE);
      }
    };
    request.onsuccess = () => {
      listingDraftDb = request.result;
      listingDraftDb.onclose = () => {
        listingDraftDb = null;
        listingDraftDbPromise = null;
      };
      listingDraftDb.onversionchange = () => {
        listingDraftDb?.close();
        listingDraftDb = null;
        listingDraftDbPromise = null;
      };
      resolve(listingDraftDb);
    };
    request.onblocked = () => {
      listingDraftDbPromise = null;
      reject(new Error("Listing draft database blocked."));
    };
    request.onerror = () => {
      listingDraftDbPromise = null;
      reject(request.error || new Error("Unable to open listing draft database."));
    };
  });

  return listingDraftDbPromise;
}

async function runListingDraftMediaTransaction(mode, executor) {
  const db = await withListingDraftTimeout(openListingDraftDb());
  return withListingDraftTimeout(
    new Promise((resolve, reject) => {
      const tx = db.transaction(LISTING_DRAFT_MEDIA_STORE, mode);
      let settled = false;
      const settleResolve = (value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };
      const settleReject = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      try {
        executor(tx.objectStore(LISTING_DRAFT_MEDIA_STORE), settleResolve, settleReject);
      } catch (error) {
        settleReject(error);
        return;
      }
      tx.oncomplete = () => settleResolve();
      tx.onerror = () => settleReject(tx.error);
      tx.onabort = () => settleReject(tx.error);
    }),
  );
}

async function clearListingDraftMediaStore() {
  try {
    await runListingDraftMediaTransaction("readwrite", (store) => {
      store.clear();
    });
  } catch (error) {
    // Ignore IndexedDB cleanup failures.
  }
}

function getListingDraftMediaKey(kind, slotIndex) {
  return `${kind}-${slotIndex}`;
}

function collectListingDraftMediaEntries({ includeProcessing = false } = {}) {
  const entries = [];

  pendingImageFiles.forEach((file, slotIndex) => {
    if (
      file instanceof File
      && (includeProcessing || !isProductImageProcessing(slotIndex))
    ) {
      entries.push({
        key: getListingDraftMediaKey("product-image", slotIndex),
        file,
      });
    }
  });
  pendingDescriptionImageFiles.forEach((file, slotIndex) => {
    if (file instanceof File && (includeProcessing || !isDescriptionImageProcessing)) {
      entries.push({
        key: getListingDraftMediaKey("description-image", slotIndex),
        file,
      });
    }
  });
  pendingVideoFiles.forEach((file, slotIndex) => {
    if (file instanceof File) {
      entries.push({
        key: getListingDraftMediaKey("video", slotIndex),
        file,
      });
    }
  });
  pendingVideoThumbnailFiles.forEach((file, slotIndex) => {
    if (file instanceof File) {
      entries.push({
        key: getListingDraftMediaKey("video-thumbnail", slotIndex),
        file,
      });
    }
  });

  return entries;
}

async function saveListingDraftMediaToIndexedDb(entries = []) {
  await clearListingDraftMediaStore();
  if (!entries.length) {
    return;
  }

  await runListingDraftMediaTransaction("readwrite", (store) => {
    entries.forEach(({ key, file }) => {
      store.put(
        {
          blob: file.slice(0, file.size, file.type || "application/octet-stream"),
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        },
        key,
      );
    });
  });
}

async function readListingDraftMediaRecord(key) {
  try {
    return await runListingDraftMediaTransaction("readonly", (store, resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return null;
  }
}

function createListingDraftFileFromRecord(record) {
  if (!record?.blob) {
    return null;
  }

  try {
    return new File([record.blob], String(record.name || "draft-media"), {
      type: String(record.type || record.blob.type || "application/octet-stream"),
      lastModified: Number(record.lastModified) || Date.now(),
    });
  } catch (error) {
    return null;
  }
}

function hasListingDraftPendingSignature(signature) {
  if (!signature || typeof signature !== "object") {
    return false;
  }

  return Boolean(
    String(signature.name ?? "").trim()
    || Number(signature.size ?? 0) > 0
    || String(signature.type ?? "").trim(),
  );
}

function padListingDraftSlotList(values, minimumCount, fillValue) {
  const nextValues = Array.isArray(values) ? [...values] : [];
  while (nextValues.length < minimumCount) {
    nextValues.push(fillValue);
  }
  return nextValues.length ? nextValues : minimumCount > 0 ? [fillValue] : [];
}

async function restoreListingDraftMediaFromSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return false;
  }

  const restorePendingFiles = async (kind, pendingFiles, previewObjectUrls, urlArray, signatures) => {
    let restoredCount = 0;
    const pendingSignatures = Array.isArray(signatures) ? signatures : [];
    for (let slotIndex = 0; slotIndex < pendingFiles.length; slotIndex += 1) {
      if (pendingFiles[slotIndex] instanceof File) {
        continue;
      }
      if (!hasListingDraftPendingSignature(pendingSignatures[slotIndex])) {
        continue;
      }

      const record = await readListingDraftMediaRecord(getListingDraftMediaKey(kind, slotIndex));
      const file = createListingDraftFileFromRecord(record);
      if (!file) {
        continue;
      }

      if (previewObjectUrls[slotIndex]) {
        URL.revokeObjectURL(previewObjectUrls[slotIndex]);
      }

      pendingFiles[slotIndex] = file;
      previewObjectUrls[slotIndex] = URL.createObjectURL(file);
      if (Array.isArray(urlArray)) {
        urlArray[slotIndex] = "";
      }
      restoredCount += 1;
    }
    return restoredCount;
  };

  try {
    const restoredCount = (
      await restorePendingFiles(
        "product-image",
        pendingImageFiles,
        imagePreviewObjectUrls,
        editingImageUrls,
        snapshot.pendingImageFiles,
      )
    ) + (
      await restorePendingFiles(
        "description-image",
        pendingDescriptionImageFiles,
        descriptionImagePreviewObjectUrls,
        editingDescriptionImageUrls,
        snapshot.pendingDescriptionImageFiles,
      )
    ) + (
      await restorePendingFiles(
        "video",
        pendingVideoFiles,
        videoPreviewObjectUrls,
        editingVideoUrls,
        snapshot.pendingVideoFiles,
      )
    ) + (
      await restorePendingFiles(
        "video-thumbnail",
        pendingVideoThumbnailFiles,
        videoThumbnailPreviewObjectUrls,
        editingVideoThumbnailUrls,
        snapshot.pendingVideoThumbnailFiles,
      )
    );
    return restoredCount > 0;
  } catch (error) {
    return false;
  }
}

function refreshListingDraftMediaViews() {
  renderProductImageInputs();
  renderProductVideoInputs();
  renderProductDescriptionImageEditor();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
}

function restoreListingDraftMediaInBackground(snapshot) {
  void restoreListingDraftMediaFromSnapshot(snapshot).then((didRestore) => {
    if (didRestore) {
      refreshListingDraftMediaViews();
    }
  });
}

function isListingDraftAutoSaveAllowed() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return false;
  }

  if (isApplyingListingDraft || editingProductId || isStandaloneProductEditorPage || !form) {
    return false;
  }

  if (isProductImageProcessing() || isDescriptionImageProcessing) {
    return false;
  }

  return Boolean(
    productComposerModal
    && !productComposerModal.hidden
    && productComposerModal.classList.contains("is-open"),
  );
}

function scheduleListingDraftAutoSave() {
  if (!isListingDraftAutoSaveAllowed()) {
    return;
  }

  window.clearTimeout(listingDraftAutoSaveTimer);
  listingDraftAutoSaveTimer = window.setTimeout(() => {
    if (!isListingDraftAutoSaveAllowed()) {
      return;
    }
    void persistListingDraftToStorage();
  }, LISTING_DRAFT_AUTOSAVE_MS);
}

function maybeScheduleListingDraftAutoSave() {
  if (!isListingDraftAutoSaveAllowed()) {
    return;
  }

  scheduleListingDraftAutoSave();
}

function readListingDraftFromStorage() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return null;
  }

  if (typeof window.localStorage?.getItem !== "function") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(LISTING_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(rawDraft);
    if (!parsedDraft || typeof parsedDraft !== "object" || !parsedDraft.snapshot) {
      return null;
    }

    return parsedDraft;
  } catch (error) {
    return null;
  }
}

function clearListingDraftFromStorage() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return;
  }

  try {
    window.localStorage?.removeItem(LISTING_DRAFT_STORAGE_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
  void clearListingDraftMediaStore();
  syncListingDraftFab();
}

function hasListingDraftContent() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return false;
  }

  if (editingProductId || isStandaloneProductEditorPage) {
    return false;
  }

  const name = getProductEditFormValue("name").trim();
  const description = getProductEditFormValue("description").trim();
  const hasImages = editingImageUrls.some((imageUrl) => String(imageUrl ?? "").trim());
  const hasPendingImages = pendingImageFiles.some((file) => file instanceof File);
  const hasDescriptionImages = editingDescriptionImageUrls.some((imageUrl) =>
    String(imageUrl ?? "").trim(),
  );
  const hasPendingDescriptionImages = pendingDescriptionImageFiles.some(
    (file) => file instanceof File,
  );
  const hasVideo = editingVideoUrls.some((videoUrl) => String(videoUrl ?? "").trim());
  const hasPendingVideo = pendingVideoFiles.some((file) => file instanceof File);
  const hasPrice = Boolean(
    getProductEditFormValue("originalPrice").trim()
    || getProductEditFormValue("salesPrice").trim(),
  );
  const hasStock = Boolean(getProductEditFormValue("stock").trim());
  const hasBarcode = Boolean(getProductEditFormValue("barcode").trim());
  const hasExpiry = Boolean(getProductEditFormValue("expiryDate").trim());
  const hasCategories = normalizeCategoryValues(selectedProductCategories).length > 0;
  const hasVariants = editingVariants.some(
    (variant) =>
      String(variant?.name ?? "").trim()
      || String(variant?.imageUrl ?? "").trim()
      || String(variant?.salesPrice ?? "").trim(),
  );

  return Boolean(
    name
    || description
    || hasImages
    || hasPendingImages
    || hasDescriptionImages
    || hasPendingDescriptionImages
    || hasVideo
    || hasPendingVideo
    || hasPrice
    || hasStock
    || hasBarcode
    || hasExpiry
    || hasCategories
    || hasVariants
    || selectedDeliveryPartnerIds.length
    || selectedPaymentPartnerIds.length,
  );
}

function persistListingDraftToStorageNow({ includeProcessing = false } = {}) {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return false;
  }

  if (isApplyingListingDraft || editingProductId || isStandaloneProductEditorPage) {
    return false;
  }

  if (!hasListingDraftContent()) {
    return false;
  }

  let snapshot = null;
  try {
    snapshot = JSON.parse(getProductEditCurrentSnapshot());
  } catch (error) {
    return false;
  }

  const mediaEntries = collectListingDraftMediaEntries({ includeProcessing });
  const draftLabel = getProductEditFormValue("name").trim() || "Untitled draft";
  const draftPayload = {
    version: 1,
    savedAt: Date.now(),
    label: draftLabel,
    snapshot,
  };

  try {
    window.localStorage?.setItem(LISTING_DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
  } catch (error) {
    return false;
  }

  syncListingDraftFab();
  const previousMediaWrite = listingDraftPersistPromise;
  const mediaWrite = Promise.resolve(previousMediaWrite)
    .catch(() => {})
    .then(() => saveListingDraftMediaToIndexedDb(mediaEntries))
    .catch(() => {});
  listingDraftPersistPromise = mediaWrite;
  void mediaWrite.finally(() => {
    if (listingDraftPersistPromise === mediaWrite) {
      listingDraftPersistPromise = null;
    }
  });
  return true;
}

function persistListingDraftToStorage() {
  persistListingDraftToStorageNow();
  return listingDraftPersistPromise || Promise.resolve(false);
}

function saveListingDraftToStorage() {
  return persistListingDraftToStorageNow();
}

function restoreEditableVariantsFromDraftSnapshot(variantSnapshots = []) {
  if (!Array.isArray(variantSnapshots) || !variantSnapshots.length) {
    return [];
  }

  return normalizeEditableVariants(
    variantSnapshots.map((entry) => {
      const payload = entry?.payload && typeof entry.payload === "object" ? entry.payload : {};
      return {
        name: String(payload.name ?? "").trim(),
        originalPrice:
          payload.originalPrice === null || payload.originalPrice === undefined
            ? ""
            : String(payload.originalPrice),
        salesPrice:
          payload.salesPrice === null || payload.salesPrice === undefined
            ? ""
            : String(payload.salesPrice),
        imageUrl: String(payload.imageUrl ?? "").trim(),
        imageSourceUrl: String(entry?.imageSourceUrl ?? payload.imageUrl ?? "").trim(),
        cropSourceUrl: String(entry?.cropSourceUrl ?? "").trim(),
        croppedImageUrl: String(entry?.croppedImageUrl ?? "").trim(),
        imagePositionX: entry?.imagePositionX,
        imagePositionY: entry?.imagePositionY,
        addOns: Array.isArray(payload.addOns) ? payload.addOns : [],
      };
    }),
  );
}

function applyListingDraftSnapshot(snapshot) {
  if (!form || !snapshot || typeof snapshot !== "object") {
    return false;
  }

  isApplyingListingDraft = true;
  try {
    cancelProductImageProcessingSession();
    revealProductEditorSection(defaultProductEditorSectionId, { shouldScroll: false });
    clearPreviewCardCrop();
    clearPreviewBuyModalCrop();
    clearPreviewDetailsCrops();
    clearVariantPreviewObjectUrls();
    clearProductDescriptionImagePreviewObjectUrls();
    clearPreviewObjectUrls();
    clearVideoPreviewObjectUrls();
    clearVideoThumbnailPreviewObjectUrls();
    cancelAllPendingProductVideoUploads();

    const fields = snapshot.fields && typeof snapshot.fields === "object" ? snapshot.fields : {};
    if (form.elements.name) {
      form.elements.name.value = String(fields.name ?? "");
    }
    if (form.elements.barcode) {
      form.elements.barcode.value = String(fields.barcode ?? "");
    }
    if (form.elements.moveBarcodeToPackingDashboard) {
      form.elements.moveBarcodeToPackingDashboard.checked = Boolean(fields.moveBarcodeToPackingDashboard);
    }
    if (form.elements.originalPrice) {
      form.elements.originalPrice.value = String(fields.originalPrice ?? "");
    }
    if (form.elements.salesPrice) {
      form.elements.salesPrice.value = String(fields.salesPrice ?? "");
    }
    if (form.elements.stock) {
      form.elements.stock.value = String(fields.stock ?? "");
    }
    if (form.elements.expiryDate) {
      form.elements.expiryDate.value = String(fields.expiryDate ?? "");
      syncProductExpiryDateTrigger();
    }
    if (form.elements.description) {
      form.elements.description.value = String(fields.description ?? "");
    }

    setCategoryOptions(availableCategories, normalizeCategoryValues(snapshot.categories));
    setSelectedProductPartnerIds("delivery", snapshot.deliveryPartnerIds);
    setSelectedProductPartnerIds("payment", snapshot.paymentPartnerIds);
    renderProductPartnerSelections();
    syncBarcodePreview();

    const pendingImageSignatures = Array.isArray(snapshot.pendingImageFiles)
      ? snapshot.pendingImageFiles
      : [];
    const snapshotImageUrls = Array.isArray(snapshot.imageUrls)
      ? snapshot.imageUrls.map((imageUrl) => String(imageUrl ?? "").trim())
      : [];
    const imageSlotCount = Math.max(snapshotImageUrls.length, pendingImageSignatures.length, 1);
    editingImageUrls = padListingDraftSlotList(snapshotImageUrls, imageSlotCount, "");
    pendingImageFiles = Array(imageSlotCount).fill(null);
    imagePreviewObjectUrls = Array(imageSlotCount).fill("");

    const pendingDescriptionSignatures = Array.isArray(snapshot.pendingDescriptionImageFiles)
      ? snapshot.pendingDescriptionImageFiles
      : [];
    const snapshotDescriptionImageUrls = Array.isArray(snapshot.descriptionImageUrls)
      ? snapshot.descriptionImageUrls.map((imageUrl) => String(imageUrl ?? "").trim())
      : [];
    const descriptionSlotCount = Math.max(
      snapshotDescriptionImageUrls.length,
      pendingDescriptionSignatures.length,
    );
    editingDescriptionImageUrls = padListingDraftSlotList(
      snapshotDescriptionImageUrls,
      descriptionSlotCount,
      "",
    );
    pendingDescriptionImageFiles = Array(descriptionSlotCount).fill(null);
    descriptionImagePreviewObjectUrls = Array(descriptionSlotCount).fill("");

    const pendingVideoSignatures = Array.isArray(snapshot.pendingVideoFiles)
      ? snapshot.pendingVideoFiles
      : [];
    const snapshotVideoUrls = Array.isArray(snapshot.videoUrls)
      ? snapshot.videoUrls.map((videoUrl) => String(videoUrl ?? "").trim())
      : [];
    const videoSlotCount = Math.max(snapshotVideoUrls.length, pendingVideoSignatures.length);
    editingVideoUrls = padListingDraftSlotList(snapshotVideoUrls, videoSlotCount, "");
    editingVideoThumbnailUrls = padListingDraftSlotList(
      Array.isArray(snapshot.videoThumbnailUrls)
        ? snapshot.videoThumbnailUrls.map((thumbnailUrl) => String(thumbnailUrl ?? "").trim())
        : [],
      videoSlotCount,
      "",
    );
    pendingVideoFiles = Array(videoSlotCount).fill(null);
    pendingVideoUploadTasks = Array(videoSlotCount).fill(null);
    videoPreviewObjectUrls = Array(videoSlotCount).fill("");
    pendingVideoThumbnailFiles = Array(videoSlotCount).fill(null);
    videoThumbnailPreviewObjectUrls = Array(videoSlotCount).fill("");
    productVideoCropSourceUrls = Array(videoSlotCount).fill("");
    productVideoCropStates = Array(videoSlotCount).fill(null);

    selectedMainImageSlot = Number.isInteger(snapshot.selectedMainImageSlot)
      ? Math.max(0, snapshot.selectedMainImageSlot)
      : 0;
    editingCardImagePositionX = normalizeCardImagePosition(
      snapshot.cardImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    );
    editingCardImagePosition = normalizeCardImagePosition(
      snapshot.cardImagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    );
    previewCardCroppedImageUrl = String(snapshot.cardCroppedImageUrl ?? "").trim();
    previewCardCropSourceUrl = String(snapshot.cardCropSourceUrl ?? "").trim();
    editingBuyModalImagePositionX = normalizeCardImagePosition(
      snapshot.buyModalImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    );
    editingBuyModalImagePositionY = normalizeCardImagePosition(
      snapshot.buyModalImagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    );
    previewBuyModalCroppedImageUrl = String(snapshot.buyModalCroppedImageUrl ?? "").trim();
    previewBuyModalCropSourceUrl = String(snapshot.buyModalCropSourceUrl ?? "").trim();
    previewDetailsCropStates = snapshot.detailsCropStates || {};
    previewDetailsCropEntriesBySourceUrl = snapshot.detailsCropEntriesBySourceUrl || {};

    editingVariants = restoreEditableVariantsFromDraftSnapshot(snapshot.variants);
    syncEditableVariantAddOnsWithInventory();

    if (isProductDescriptionModeSwitcherAvailable()) {
      const requestedDescriptionMode = String(fields.descriptionMode ?? "").trim().toLowerCase();
      if (requestedDescriptionMode === "image" || requestedDescriptionMode === "text") {
        setProductDescriptionMode(requestedDescriptionMode);
      } else {
        setProductDescriptionMode(
          editingDescriptionImageUrls.some((imageUrl) => String(imageUrl ?? "").trim())
          || pendingDescriptionSignatures.some(hasListingDraftPendingSignature)
            ? "image"
            : "text",
        );
      }
    } else {
      renderProductDescriptionImageEditor();
    }

    renderProductImageInputs();
    renderProductVideoInputs();
    renderProductVariants();
    syncVisualSearchPreview();
    renderProductModelRegistration();
    renderAndroidProductPreview();
    syncProductFormSubmitState();
    setStatus("Adding", "default");
    restoreListingDraftMediaInBackground(snapshot);
    return true;
  } finally {
    isApplyingListingDraft = false;
  }
}

function ensureListingDraftFab() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return null;
  }

  if (listingDraftFab || isStandaloneProductEditorPage || !form) {
    return listingDraftFab;
  }

  const host =
    document.querySelector(".main-listing-view")
    || document.querySelector(".product-status-shell")
    || document.body;
  if (!(host instanceof HTMLElement)) {
    return null;
  }

  listingDraftFab = document.createElement("div");
  listingDraftFab.className = "product-listing-draft-fab";
  listingDraftFab.hidden = true;
  listingDraftFab.innerHTML = `
    <button type="button" class="product-listing-draft-fab__resume">
      <span class="product-listing-draft-fab__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path>
          <path d="M14 2v6h6"></path>
          <path d="M10 13h4"></path>
          <path d="M10 17h4"></path>
        </svg>
      </span>
      <span class="product-listing-draft-fab__copy">
        <strong data-listing-draft-label>Draft</strong>
        <small data-listing-draft-meta>Tap to resume</small>
      </span>
    </button>
    <button
      type="button"
      class="product-listing-draft-fab__dismiss"
      aria-label="Discard draft"
      title="Discard draft"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    </button>
  `;
  listingDraftFab.querySelector(".product-listing-draft-fab__resume")?.addEventListener("click", () => {
    void openListingDraftFromFab();
  });
  listingDraftFab.querySelector(".product-listing-draft-fab__dismiss")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearListingDraftFromStorage();
  });
  host.appendChild(listingDraftFab);
  return listingDraftFab;
}

function formatListingDraftSavedAt(savedAt) {
  const savedTimestamp = Number(savedAt);
  if (!Number.isFinite(savedTimestamp) || savedTimestamp <= 0) {
    return "Saved recently";
  }

  return `Saved ${new Date(savedTimestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function syncListingDraftFab() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    if (listingDraftFab instanceof HTMLElement) {
      listingDraftFab.hidden = true;
    }
    return;
  }

  if (isStandaloneProductEditorPage || !form) {
    return;
  }

  const fab = ensureListingDraftFab();
  if (!(fab instanceof HTMLElement)) {
    return;
  }

  const draft = readListingDraftFromStorage();
  const composerIsOpen = Boolean(
    productComposerModal
    && !productComposerModal.hidden
    && productComposerModal.classList.contains("is-open"),
  );
  const shouldShow = Boolean(draft && !editingProductId && !composerIsOpen);
  fab.hidden = !shouldShow;

  if (!shouldShow) {
    return;
  }

  const label = String(draft.label ?? "").trim() || "Untitled draft";
  fab.querySelector("[data-listing-draft-label]")?.replaceChildren(document.createTextNode(label));
  fab.querySelector("[data-listing-draft-meta]")?.replaceChildren(
    document.createTextNode(formatListingDraftSavedAt(draft.savedAt)),
  );
  const resumeButton = fab.querySelector(".product-listing-draft-fab__resume");
  resumeButton?.setAttribute("aria-label", `Resume draft: ${label}`);
  resumeButton?.setAttribute("title", `Resume draft: ${label}`);
}

function openListingDraftFromFab() {
  if (!LISTING_DRAFT_FEATURE_ENABLED) {
    return;
  }

  const draft = readListingDraftFromStorage();
  if (!draft?.snapshot || editingProductId) {
    return;
  }

  try {
    resetFormMode();
    if (!applyListingDraftSnapshot(draft.snapshot)) {
      revealProductComposer({ reset: false });
      return;
    }

    revealProductComposer({ reset: false });
    setHelperText(`Draft restored${draft.label ? `: ${draft.label}` : ""}.`);
    syncListingDraftFab();
  } catch (error) {
    revealProductComposer({ reset: false });
  }
}

function captureProductEditBaselineSnapshot() {
  productEditBaselineSnapshot = editingProductId ? getProductEditCurrentSnapshot() : "";
}

function clearProductEditBaselineSnapshot() {
  productEditBaselineSnapshot = "";
}

function hasProductEditChanges() {
  if (!editingProductId) {
    return true;
  }

  if (!productEditBaselineSnapshot) {
    return true;
  }

  return getProductEditCurrentSnapshot() !== productEditBaselineSnapshot;
}

function syncProductFormSubmitState() {
  if (form) {
    form.noValidate = true;
    form.setAttribute("novalidate", "novalidate");
  }

  syncProductFieldLimitIndicators();
  const isReadyToSave = isProductFormReadyToSave();
  const isEditingProduct = Boolean(editingProductId);
  const isProcessingImage = isProductImageProcessing();
  const canSubmit =
    !isProductFormSubmitting
    && !isProcessingImage
    && isReadyToSave
    && (!isEditingProduct || hasProductEditChanges());
  if (submitButton) {
    submitButton.disabled =
      isProductFormSubmitting
      || isProcessingImage
      || (isEditingProduct ? !canSubmit : false);
  }

  return canSubmit;
}

function focusMainProductImagePicker() {
  const mainImagePreview = productImageInputList?.querySelector(
    '.product-image-input-row[data-slot-index="0"] .product-image-input-row__preview',
  );

  if (!(mainImagePreview instanceof HTMLElement)) {
    return;
  }

  window.requestAnimationFrame(() => {
    mainImagePreview.focus();
    mainImagePreview.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });
}

function buildProductVideoPayload(slotVideoUrls, slotVideoThumbnailUrls = []) {
  const normalizedSlots = (Array.isArray(slotVideoUrls) ? slotVideoUrls : [])
    .map((value) => String(value ?? "").trim());
  const normalizedThumbnailSlots = (Array.isArray(slotVideoThumbnailUrls)
    ? slotVideoThumbnailUrls
    : [])
    .map((value) => String(value ?? "").trim());
  const populatedSlots = normalizedSlots
    .map((videoUrl, slotIndex) => ({
      videoUrl: String(videoUrl ?? "").trim(),
      thumbnailUrl: String(normalizedThumbnailSlots[slotIndex] ?? "").trim(),
    }))
    .filter(({ videoUrl }) => videoUrl);
  const videoUrls = populatedSlots.map(({ videoUrl }) => videoUrl);
  const videoThumbnailUrls = populatedSlots.map(({ thumbnailUrl }) => thumbnailUrl);

  return {
    videoUrls,
    videoUrl: videoUrls[0] ?? "",
    videoThumbnailUrls,
    videoThumbnailUrl: videoThumbnailUrls[0] ?? "",
  };
}

function normalizeCardImagePosition(value, fallback = DEFAULT_CARD_IMAGE_POSITION) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, normalizedValue));
}

function normalizePreviewCropZoomPercent(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(500, Math.max(0, Math.round(normalizedValue)));
}

function normalizePreviewVisibleFraction(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, normalizedValue));
}

function normalizePreviewMediaTimeMs(value, fallback = 0) {
  const normalizedValue = Number(value ?? fallback);
  if (!Number.isFinite(normalizedValue)) {
    return fallback;
  }

  return Math.max(0, Math.round(normalizedValue));
}

function getProductCardImagePositionX(product) {
  return normalizeCardImagePosition(product?.cardImagePositionX, DEFAULT_CARD_IMAGE_POSITION_X);
}

function getProductCardImagePosition(product) {
  return normalizeCardImagePosition(product?.cardImagePosition);
}

function getProductCardCropSourceUrl(product) {
  return String(product?.cardImageSourceUrl ?? "").trim();
}

function getStoredProductCardImageUrl(product) {
  const cardImageUrl = String(product?.cardImageUrl ?? "").trim();
  return cardImageUrl;
}

function getProductCardDisplayImageData(product) {
  const galleryItems = getProductGalleryItems(product);
  const mainImageUrl =
    galleryItems.find((item) => item.type !== "video")?.url || getPrimaryProductImageUrl(product);
  const storedCardImageUrl = getStoredProductCardImageUrl(product);

  return {
    imageUrl: storedCardImageUrl || mainImageUrl,
    objectPosition: storedCardImageUrl
      ? "center center"
      : formatCardImageObjectPosition(
          getProductCardImagePositionX(product),
          getProductCardImagePosition(product),
        ),
  };
}

function getProductBuyModalCropSourceUrl(product) {
  return String(product?.buyModalImageSourceUrl ?? "").trim();
}

function getStoredProductBuyModalImageUrl(product) {
  return String(product?.buyModalImageUrl ?? "").trim();
}

function formatCardImageObjectPosition(positionX, positionY) {
  return `${normalizeCardImagePosition(positionX, DEFAULT_CARD_IMAGE_POSITION_X).toFixed(2)}% ${normalizeCardImagePosition(positionY).toFixed(2)}%`;
}

function clearPreviewCardCrop() {
  previewCardCroppedImageUrl = "";
  previewCardCropSourceUrl = "";
}

function clearPreviewBuyModalCrop() {
  previewBuyModalCroppedImageUrl = "";
  previewBuyModalCropSourceUrl = "";
  editingBuyModalImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
  editingBuyModalImagePositionY = DEFAULT_CARD_IMAGE_POSITION;
}

function clearPreviewDetailsCrops() {
  previewDetailsCropStates = new Map();
  previewDetailsCropEntriesBySourceUrl = new Map();
  previewDetailsImageStateKey = "";
  previewDetailsActiveImageIndex = 0;
}

function getPreviewDetailsCropKey(stateKey, imageIndex) {
  return `${String(stateKey ?? "").trim()}::${
    Number.isFinite(Number(imageIndex)) ? Math.round(Number(imageIndex)) : 0
  }`;
}

function getPreviewDetailsCropState(stateKey, imageIndex) {
  const normalizedStateKey = String(stateKey ?? "").trim();
  if (!normalizedStateKey) {
    return null;
  }

  return previewDetailsCropStates.get(getPreviewDetailsCropKey(normalizedStateKey, imageIndex)) ?? null;
}

function getPreviewDetailsCroppedImageUrl(stateKey, imageIndex) {
  return String(getPreviewDetailsCropState(stateKey, imageIndex)?.croppedImageUrl ?? "").trim();
}

function setPreviewDetailsCropState(stateKey, imageIndex, cropState) {
  const normalizedStateKey = String(stateKey ?? "").trim();
  if (!normalizedStateKey) {
    return;
  }

  const normalizedSourceUrl = String(cropState?.sourceUrl ?? "").trim();
  const normalizedCroppedImageUrl = String(cropState?.croppedImageUrl ?? "").trim();
  const cropKey = getPreviewDetailsCropKey(normalizedStateKey, imageIndex);
  const normalizedSourceKey = normalizedSourceUrl.toLowerCase();

  if (!normalizedSourceUrl || !normalizedCroppedImageUrl) {
    previewDetailsCropStates.delete(cropKey);
    if (normalizedSourceKey) {
      previewDetailsCropEntriesBySourceUrl.delete(normalizedSourceKey);
    }
    return;
  }

  const normalizedCropState = {
    sourceUrl: normalizedSourceUrl,
    croppedImageUrl: normalizedCroppedImageUrl,
    positionX: normalizeCardImagePosition(
      cropState?.positionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    positionY: normalizeCardImagePosition(
      cropState?.positionY,
      DEFAULT_CARD_IMAGE_POSITION,
    ),
  };

  previewDetailsCropStates.set(cropKey, normalizedCropState);
  previewDetailsCropEntriesBySourceUrl.set(normalizedSourceKey, normalizedCropState);
}

function getStoredProductDetailsImageCrops(product) {
  const seen = new Set();
  return (Array.isArray(product?.detailsImageCrops) ? product.detailsImageCrops : [])
    .map((cropEntry) => {
      const sourceUrl = String(cropEntry?.sourceUrl ?? "").trim();
      const croppedImageUrl = String(cropEntry?.croppedImageUrl ?? "").trim();
      if (!sourceUrl || !croppedImageUrl) {
        return null;
      }

      const normalizedKey = sourceUrl.toLowerCase();
      if (seen.has(normalizedKey)) {
        return null;
      }

      seen.add(normalizedKey);
      return {
        sourceUrl,
        croppedImageUrl,
        positionX: normalizeCardImagePosition(
          cropEntry?.positionX,
          DEFAULT_CARD_IMAGE_POSITION_X,
        ),
        positionY: normalizeCardImagePosition(
          cropEntry?.positionY,
          DEFAULT_CARD_IMAGE_POSITION,
        ),
      };
    })
    .filter(Boolean);
}

function restorePreviewDetailsCropsFromProduct(product) {
  clearPreviewDetailsCrops();
  const imageUrls = getNormalizedProductImageUrls(product);
  if (!imageUrls.length) {
    return;
  }

  const mainImageIndex = getResolvedProductMainImageIndex(product, imageUrls);
  const stateKey = getPreviewDetailsImageStateKey(product, imageUrls, mainImageIndex);
  const cropEntries = getStoredProductDetailsImageCrops(product);
  if (!cropEntries.length) {
    return;
  }

  const cropEntryBySource = new Map(
    cropEntries.map((cropEntry) => [cropEntry.sourceUrl.toLowerCase(), cropEntry]),
  );
  imageUrls.forEach((imageUrl, imageIndex) => {
    const matchingCropEntry = cropEntryBySource.get(String(imageUrl ?? "").trim().toLowerCase());
    if (!matchingCropEntry) {
      return;
    }

    setPreviewDetailsCropState(stateKey, imageIndex, matchingCropEntry);
  });
}

function collectPreviewDetailsCropsForImageUrls(imageUrls, mainImageIndex) {
  const normalizedImageUrls = (Array.isArray(imageUrls) ? imageUrls : [])
    .map((imageUrl) => String(imageUrl ?? "").trim())
    .filter(Boolean);
  if (!normalizedImageUrls.length) {
    return [];
  }

  const draftProductIdentity = {
    id: editingProductId || "__draft-preview__",
  };
  const stateKey = getPreviewDetailsImageStateKey(
    draftProductIdentity,
    normalizedImageUrls,
    mainImageIndex,
  );

  return normalizedImageUrls
    .map((imageUrl, imageIndex) => {
      const cropState =
        getPreviewDetailsCropState(stateKey, imageIndex) ??
        previewDetailsCropEntriesBySourceUrl.get(imageUrl.toLowerCase()) ??
        null;
      if (!cropState?.croppedImageUrl) {
        return null;
      }

      return {
        imageIndex,
        sourceUrl: imageUrl,
        croppedImageUrl: cropState.croppedImageUrl,
        positionX: normalizeCardImagePosition(
          cropState.positionX,
          DEFAULT_CARD_IMAGE_POSITION_X,
        ),
        positionY: normalizeCardImagePosition(
          cropState.positionY,
          DEFAULT_CARD_IMAGE_POSITION,
        ),
      };
    })
    .filter(Boolean);
}

function createCardCropUploadFile(dataUrl, productName = "product", fileSuffix = "card-crop") {
  const normalizedDataUrl = String(dataUrl ?? "").trim();
  const match = normalizedDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const base64Payload = match[2];
  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = extensionByMimeType[mimeType] ?? "jpg";
  const safeStem =
    String(productName ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "product";
  const normalizedSuffix =
    String(fileSuffix ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "card-crop";

  try {
    const binaryString = window.atob(base64Payload);
    const bytes = new Uint8Array(binaryString.length);
    for (let index = 0; index < binaryString.length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return new File([bytes], `${safeStem}-${normalizedSuffix}.${extension}`, {
      type: mimeType,
    });
  } catch (error) {
    console.error("Unable to create a product card crop upload file.", error);
    return null;
  }
}

function getProductDetailsPreviewCropAspectRatio(previewHeroElement = null) {
  const heroElement =
    previewHeroElement || androidPreviewStage?.querySelector(".android-preview-details__hero");
  const heroWidth = Number(heroElement?.clientWidth || 0);
  const heroHeight = Number(heroElement?.clientHeight || 0);
  if (heroWidth > 0 && heroHeight > 0) {
    return heroWidth / heroHeight;
  }

  return 1;
}

function formatPreviewPostedDate(value) {
  const parsedDate = new Date(value);
  const validDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(validDate);
}

function createPreviewElement(tagName, className, text = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function createPriceElement(tagName, className, amount) {
  const priceElement = createPreviewElement(tagName, `${className} price-with-symbol`);
  priceElement.append(
    createPreviewElement("span", "price-with-symbol__symbol", "\u20B1"),
    createPreviewElement("span", "price-with-symbol__amount", formatPriceAmount(amount)),
  );
  return priceElement;
}

function createPreviewMaterialIcon(iconName, className = "android-preview-material-icon") {
  const icon = createPreviewElement("span", `material-symbols-outlined ${className}`, iconName);
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function fitPreviewTextToBounds(
  element,
  {
    cssVariableName,
    maxFontSizePx,
    minFontSizePx,
    stepPx = 0.5,
  } = {},
) {
  if (!(element instanceof HTMLElement) || !cssVariableName || !maxFontSizePx || !minFontSizePx) {
    return;
  }

  element.style.setProperty(cssVariableName, `${maxFontSizePx}px`);
  if (element.clientWidth <= 0 || element.clientHeight <= 0) {
    return;
  }

  let nextFontSize = maxFontSizePx;
  while (
    nextFontSize > minFontSizePx &&
    (
      element.scrollHeight > element.clientHeight + 1
      || element.scrollWidth > element.clientWidth + 1
    )
  ) {
    nextFontSize = Math.max(minFontSizePx, nextFontSize - stepPx);
    element.style.setProperty(cssVariableName, `${nextFontSize}px`);
  }
}

function syncAndroidPreviewVariantNameAutoFit() {
  if (!androidPreviewStage) {
    return;
  }

  window.requestAnimationFrame(() => {
    androidPreviewStage
      .querySelectorAll(".android-preview-buy__variant-name-text")
      .forEach((element) =>
        fitPreviewTextToBounds(element, {
          cssVariableName: "--android-preview-buy-variant-name-font-size",
          maxFontSizePx: 13,
          minFontSizePx: 10,
        }),
      );
  });
}

function normalizePreviewImageIndex(index, imageCount, fallback = 0) {
  if (!Number.isInteger(imageCount) || imageCount <= 0) {
    return 0;
  }

  const normalizedFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
  const requestedIndex = Number.isFinite(Number(index)) ? Number(index) : normalizedFallback;
  return Math.min(imageCount - 1, Math.max(0, Math.round(requestedIndex)));
}

function getPreviewDetailsImageStateKey(product, imageUrls, mainImageIndex) {
  const productKey = String(product?.id ?? "__draft-preview__");
  return `${productKey}::${mainImageIndex}::${(Array.isArray(imageUrls) ? imageUrls : []).join("|")}`;
}

function syncPreviewDetailsImageState(stateKey, imageCount, fallbackIndex = 0) {
  if (!imageCount) {
    previewDetailsImageStateKey = "";
    previewDetailsActiveImageIndex = 0;
    return 0;
  }

  if (previewDetailsImageStateKey !== stateKey) {
    previewDetailsImageStateKey = stateKey;
    previewDetailsActiveImageIndex = normalizePreviewImageIndex(
      fallbackIndex,
      imageCount,
      fallbackIndex,
    );
    return previewDetailsActiveImageIndex;
  }

  previewDetailsActiveImageIndex = normalizePreviewImageIndex(
    previewDetailsActiveImageIndex,
    imageCount,
    fallbackIndex,
  );
  return previewDetailsActiveImageIndex;
}

function updatePreviewDetailsImageIndex(nextIndex, imageCount, stateKey, fallbackIndex = 0) {
  const normalizedIndex = normalizePreviewImageIndex(nextIndex, imageCount, fallbackIndex);
  previewDetailsImageStateKey = stateKey;
  if (previewDetailsActiveImageIndex === normalizedIndex) {
    return;
  }

  previewDetailsActiveImageIndex = normalizedIndex;
  renderAndroidProductPreview();
}

function focusPreviewDetailsImageSlot(slotIndex) {
  syncEditableImageState();

  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  if (normalizedSlotIndex < 0 || normalizedSlotIndex >= editingImageUrls.length) {
    return false;
  }

  const previewImageSlotEntries = [];
  const seenPreviewImageKeys = new Set();
  editingImageUrls.forEach((existingImageUrl, currentSlotIndex) => {
    const previewImageUrl = String(
      getImageSlotPreviewUrl(currentSlotIndex, existingImageUrl),
    ).trim();
    const normalizedPreviewImageKey = previewImageUrl.toLowerCase();
    if (!previewImageUrl || seenPreviewImageKeys.has(normalizedPreviewImageKey)) {
      return;
    }

    seenPreviewImageKeys.add(normalizedPreviewImageKey);
    previewImageSlotEntries.push({
      slotIndex: currentSlotIndex,
      imageUrl: previewImageUrl,
    });
  });

  const targetImageIndex = previewImageSlotEntries.findIndex(
    ({ slotIndex: currentSlotIndex }) => currentSlotIndex === normalizedSlotIndex,
  );
  if (targetImageIndex < 0) {
    return false;
  }

  const draftProduct = getPreviewDraftProduct();
  const previewImageUrls = getNormalizedProductImageUrls(draftProduct);
  if (!previewImageUrls.length || targetImageIndex >= previewImageUrls.length) {
    return false;
  }

  const previewVideoUrls = getNormalizedProductVideoUrls(draftProduct);
  const defaultPreviewImageIndex = getResolvedProductMainImageIndex(
    draftProduct,
    previewImageUrls,
  );
  const detailsImageStateKey = getPreviewDetailsImageStateKey(
    draftProduct,
    previewImageUrls,
    defaultPreviewImageIndex,
  );
  const previewMediaCount = previewVideoUrls.length + previewImageUrls.length;
  const fallbackPreviewMediaIndex = previewVideoUrls.length ? 0 : defaultPreviewImageIndex;

  previewDetailsImageStateKey = detailsImageStateKey;
  previewDetailsActiveImageIndex = normalizePreviewImageIndex(
    previewVideoUrls.length + targetImageIndex,
    previewMediaCount,
    fallbackPreviewMediaIndex,
  );
  return true;
}

function preservePreviewDetailsMediaPosition() {
  const draftProduct = getPreviewDraftProduct();
  const previewVideoUrls = getNormalizedProductVideoUrls(draftProduct);
  const previewImageUrls = getNormalizedProductImageUrls(draftProduct);
  const previewMediaCount = previewVideoUrls.length + previewImageUrls.length;
  if (!previewMediaCount) {
    previewDetailsImageStateKey = "";
    previewDetailsActiveImageIndex = 0;
    return false;
  }

  const defaultPreviewImageIndex = getResolvedProductMainImageIndex(
    draftProduct,
    previewImageUrls,
  );
  const detailsImageStateKey = getPreviewDetailsImageStateKey(
    draftProduct,
    previewImageUrls,
    defaultPreviewImageIndex,
  );
  const fallbackPreviewMediaIndex = previewVideoUrls.length ? 0 : defaultPreviewImageIndex;

  previewDetailsImageStateKey = detailsImageStateKey;
  previewDetailsActiveImageIndex = normalizePreviewImageIndex(
    previewDetailsActiveImageIndex,
    previewMediaCount,
    fallbackPreviewMediaIndex,
  );
  return true;
}

function formatPriceMarkup(className, amount) {
  return `<span class="${className} price-with-symbol"><span class="price-with-symbol__symbol">\u20B1</span><span class="price-with-symbol__amount">${formatPriceAmount(amount)}</span></span>`;
}

function getPreviewDraftVariants() {
  return (Array.isArray(editingVariants) ? editingVariants : [])
    .map((variant, variantIndex) => ({
      editingIndex: variantIndex,
      id:
        String(variant?.id ?? "").trim() ||
        `preview-variant-${variantIndex + 1}`,
      name: String(variant?.name ?? "").trim(),
      imageUrl: getVariantPreviewUrl(variant),
      displayImageUrl: getVariantDisplayPreviewUrl(variant),
      sourceImageUrl: getVariantPreviewUrl(variant),
      croppedImageUrl: getVariantPreviewCroppedImageUrl(variant),
      addOns: Array.isArray(variant?.addOns)
        ? variant.addOns
            .map((addOn) => ({
              id: String(addOn?.id ?? "").trim(),
              name: String(addOn?.name ?? "").trim(),
              quantity: Math.max(1, Math.trunc(Number(addOn?.quantity ?? 1) || 1)),
            }))
            .filter((addOn) => addOn.id)
        : [],
      imagePositionX: normalizeCardImagePosition(
        variant?.imagePositionX,
        DEFAULT_CARD_IMAGE_POSITION_X,
      ),
      imagePositionY: normalizeCardImagePosition(
        variant?.imagePositionY,
        DEFAULT_CARD_IMAGE_POSITION,
      ),
      originalPrice: String(variant?.originalPrice ?? "").trim(),
      salesPrice: String(variant?.salesPrice ?? "").trim(),
    }))
    .filter(
      (variant) =>
        variant.name || variant.imageUrl || variant.originalPrice || variant.salesPrice,
    );
}

function resolvePreviewVariantPricing(variant, fallbackOriginalPrice, fallbackSalesPrice = null) {
  const hasVariant = Boolean(variant);
  const rawOriginalPrice = String(variant?.originalPrice ?? "").trim();
  const originalPriceValue = rawOriginalPrice !== "" ? Number(rawOriginalPrice) : NaN;
  const originalPrice =
    Number.isFinite(originalPriceValue) && originalPriceValue >= 0
      ? originalPriceValue
      : fallbackOriginalPrice;
  const rawSalesPrice = String(variant?.salesPrice ?? "").trim();
  const fallbackSalesPriceRaw = String(fallbackSalesPrice ?? "").trim();
  const salesPriceValue =
    rawSalesPrice !== ""
      ? Number(rawSalesPrice)
      : !hasVariant && fallbackSalesPriceRaw !== "" && Number.isFinite(Number(fallbackSalesPriceRaw))
        ? Number(fallbackSalesPriceRaw)
        : null;
  const salesPrice =
    salesPriceValue !== null &&
    Number.isFinite(salesPriceValue) &&
    salesPriceValue >= 0
      ? salesPriceValue
      : null;
  const showOriginalPrice =
    salesPrice !== null && originalPrice > 0 && salesPrice < originalPrice;
  const discountPercent = showOriginalPrice
    ? Math.round(((originalPrice - salesPrice) / originalPrice) * 100)
    : null;

  return {
    originalPrice,
    salesPrice,
    displayPrice: showOriginalPrice ? salesPrice : originalPrice,
    showOriginalPrice,
    discountPercent,
  };
}

function getPreviewAvailableStock(draftProduct, variant = null) {
  if (!variant) {
    return getStock(draftProduct);
  }

  const variantAddOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
  if (!variantAddOns.length) {
    return getStock(draftProduct);
  }

  const catalogProducts = Array.isArray(currentProducts) ? currentProducts : [];
  if (!catalogProducts.length) {
    return 0;
  }

  let availableStock = null;
  for (const addOn of variantAddOns) {
    const addOnId = String(addOn?.id ?? "").trim().toLowerCase();
    const requiredQuantity = Math.max(1, Math.trunc(Number(addOn?.quantity ?? 1) || 1));
    if (!addOnId) {
      return 0;
    }

    const inventoryProduct = catalogProducts.find(
      (product) => String(product?.id ?? "").trim().toLowerCase() === addOnId,
    );
    const inventoryStock = getStock(inventoryProduct);
    if (!inventoryProduct || inventoryStock <= 0) {
      return 0;
    }

    const supportedUnits = Math.trunc(inventoryStock / requiredQuantity);
    if (supportedUnits <= 0) {
      return 0;
    }

    if (availableStock === null || supportedUnits < availableStock) {
      availableStock = supportedUnits;
    }
  }

  return availableStock ?? 0;
}

function getPreviewDraftProduct() {
  const draftCategories = normalizeCategoryValues(selectedProductCategories);
  const primaryDraftCategory = draftCategories[0] ?? "";

  if (!form) {
    return {
      id: "__draft-preview__",
      name: "",
      category: primaryDraftCategory,
      categories: draftCategories,
      deliveryPartnerIds: [],
      paymentPartnerIds: [],
      description: "",
      descriptionImageUrls: [],
      originalPrice: 0,
      salesPrice: null,
      stock: 0,
      inventoryStock: 0,
      sold: 0,
      rating: 0,
      expiryDate: "",
      imageUrl: "",
      imageUrls: [],
      videoUrl: "",
      videoUrls: [],
      videoThumbnailUrl: "",
      videoThumbnailUrls: [],
      mainImageIndex: 0,
      cardImagePositionX: DEFAULT_CARD_IMAGE_POSITION_X,
      cardImagePosition: DEFAULT_CARD_IMAGE_POSITION,
      buyModalImagePositionX: DEFAULT_CARD_IMAGE_POSITION_X,
      buyModalImagePositionY: DEFAULT_CARD_IMAGE_POSITION,
      buyModalImageUrl: "",
      buyModalImageSourceUrl: "",
      variants: [],
      createdAt: new Date().toISOString(),
    };
  }

  const existingProductRecord = editingProductId
    ? currentProducts.find(
        (product) => String(product?.id ?? "") === String(editingProductId),
      ) ?? null
    : null;
  const slotImageUrls = editingImageUrls.map((existingImageUrl, slotIndex) =>
    getImageSlotPreviewUrl(slotIndex, existingImageUrl),
  );
  const imagePayload = buildProductImagePayload(slotImageUrls, selectedMainImageSlot);
  const slotVideoUrls = editingVideoUrls.map((existingVideoUrl, slotIndex) =>
    getVideoSlotPreviewUrl(slotIndex, existingVideoUrl),
  );
  const slotVideoThumbnailUrls = editingVideoThumbnailUrls.map((existingThumbnailUrl, slotIndex) =>
    getVideoThumbnailSlotPreviewUrl(slotIndex, existingThumbnailUrl),
  );
  const videoPayload = buildProductVideoPayload(slotVideoUrls, slotVideoThumbnailUrls);
  const originalPriceInput = Number(form.elements.originalPrice?.value ?? 0);
  const salesPriceRaw = String(form.elements.salesPrice?.value ?? "").trim();
  const salesPriceInput = salesPriceRaw ? Number(salesPriceRaw) : null;

  return {
    id: editingProductId || "__draft-preview__",
    name: String(form.elements.name?.value ?? "").trim(),
    category: primaryDraftCategory,
    categories: draftCategories,
    deliveryPartnerIds: getSelectedActiveProductPartnerIds("delivery"),
    paymentPartnerIds: getSelectedActiveProductPartnerIds("payment"),
    description:
      !isProductDescriptionModeSwitcherAvailable() || getProductDescriptionMode() === "text"
        ? String(form.elements.description?.value ?? "").trim()
        : "",
    descriptionImageUrls:
      !isProductDescriptionModeSwitcherAvailable() || getProductDescriptionMode() === "image"
        ? getProductDescriptionImagePreviewUrls()
        : [],
    originalPrice:
      Number.isFinite(originalPriceInput) && originalPriceInput >= 0 ? originalPriceInput : 0,
    salesPrice:
      salesPriceInput !== null && Number.isFinite(salesPriceInput) && salesPriceInput >= 0
        ? salesPriceInput
        : null,
    stock: getStock({ stock: form.elements.stock?.value ?? 0 }),
    inventoryStock: getStock({ stock: form.elements.stock?.value ?? 0 }),
    sold: 0,
    rating: 0,
    expiryDate: String(form.elements.expiryDate?.value ?? "").trim(),
    imageUrl: imagePayload.imageUrl,
    imageUrls: imagePayload.imageUrls,
    videoUrl: videoPayload.videoUrl,
    videoUrls: videoPayload.videoUrls,
    videoThumbnailUrl: videoPayload.videoThumbnailUrl,
    videoThumbnailUrls: videoPayload.videoThumbnailUrls,
    mainImageIndex: imagePayload.mainImageIndex,
    cardImagePositionX: editingCardImagePositionX,
    cardImagePosition: editingCardImagePosition,
    buyModalImagePositionX: editingBuyModalImagePositionX,
    buyModalImagePositionY: editingBuyModalImagePositionY,
    buyModalImageUrl: previewBuyModalCroppedImageUrl,
    buyModalImageSourceUrl: previewBuyModalCropSourceUrl,
    variants: getPreviewDraftVariants(),
    createdAt: String(existingProductRecord?.createdAt ?? "").trim() || new Date().toISOString(),
  };
}

function buildPreviewTopSellerIdSet(draftProduct, limit = 10) {
  const draftId = String(draftProduct?.id ?? "__draft-preview__");
  const rankedProducts = [];
  let hasReplacedCurrentProduct = false;

  for (const currentProduct of Array.isArray(currentProducts) ? currentProducts : []) {
    const currentProductId = String(currentProduct?.id ?? "");
    if (editingProductId && currentProductId === String(editingProductId)) {
      rankedProducts.push({
        ...currentProduct,
        ...draftProduct,
        id: draftId,
      });
      hasReplacedCurrentProduct = true;
      continue;
    }

    rankedProducts.push(currentProduct);
  }

  if (!hasReplacedCurrentProduct) {
    rankedProducts.push({
      ...draftProduct,
      id: draftId,
    });
  }

  return new Set(
    rankedProducts
      .filter((product) => isActiveProductInApp(product) && getSold(product) > 0)
      .sort((left, right) => {
        const soldCompare = getSold(right) - getSold(left);
        if (soldCompare !== 0) {
          return soldCompare;
        }

        const ratingCompare = getRating(right) - getRating(left);
        if (ratingCompare !== 0) {
          return ratingCompare;
        }

        return String(left?.name ?? "").localeCompare(String(right?.name ?? ""), undefined, {
          sensitivity: "base",
        });
      })
      .slice(0, limit)
      .map((product) => String(product?.id ?? "")),
  );
}

function createPreviewBadge(className, iconName, label) {
  const badge = createPreviewElement("span", className);
  if (iconName) {
    const iconClassName =
      iconName === "star"
        ? "android-preview-material-icon android-preview-material-icon--badge-star"
        : "android-preview-material-icon";
    badge.append(createPreviewMaterialIcon(iconName, iconClassName));
  }
  badge.append(createPreviewElement("span", "", label));
  return badge;
}

function createPreviewStatCard(className, iconName, label, value) {
  const statCard = createPreviewElement("article", className);
  statCard.append(createPreviewMaterialIcon(iconName));
  statCard.append(createPreviewElement("span", "android-preview-details__stat-label", label));
  statCard.append(createPreviewElement("span", "android-preview-details__stat-value", value));
  return statCard;
}

function createAndroidProductCardPreview({
  draftProduct,
  previewName,
  previewCategory,
  previewInitial,
  originalPrice,
  displayPrice,
  showOriginalPrice,
  discountPercent,
  isTopRated,
  showsTopSellerBadge,
}) {
  const previewShell = createPreviewElement("div", "android-preview-card-shell");
  const card = createPreviewElement("article", "android-preview-card");
  const cardImage = createPreviewElement("div", "android-preview-card__image");
  const previewHasVideo =
    editingVideoUrls.some((videoUrl) => String(videoUrl ?? "").trim()) ||
    (Array.isArray(draftProduct?.videoUrls) &&
      draftProduct.videoUrls.some((videoUrl) => String(videoUrl ?? "").trim())) ||
    Boolean(String(draftProduct?.videoUrl ?? "").trim());
  if (previewHasVideo) {
    cardImage.classList.add("has-video");
  }
  const previewImageUrls = getNormalizedProductImageUrls(draftProduct);
  const activePreviewImageIndex = getResolvedProductMainImageIndex(draftProduct, previewImageUrls);
  const mainPreviewImageUrl =
    previewImageUrls[activePreviewImageIndex] ?? String(draftProduct.imageUrl ?? "").trim();
  const currentPreviewCropImageUrl =
    previewCardCropSourceUrl === mainPreviewImageUrl
      ? previewCardCroppedImageUrl
      : getStoredProductCardImageUrl(draftProduct);
  const effectivePreviewImageUrl =
    currentPreviewCropImageUrl
      ? currentPreviewCropImageUrl
      : mainPreviewImageUrl;
  const previewCardImagePositionX = getProductCardImagePositionX(draftProduct);
  const previewCardImagePositionY = getProductCardImagePosition(draftProduct);
  if (draftProduct.imageUrl) {
    const image = document.createElement("img");
    image.src = effectivePreviewImageUrl || draftProduct.imageUrl;
    image.alt = previewName;
    image.style.objectPosition =
      currentPreviewCropImageUrl
        ? "center center"
        : formatCardImageObjectPosition(
            previewCardImagePositionX,
            previewCardImagePositionY,
          );
    cardImage.appendChild(image);
    cardImage.classList.add("is-clickable");
    cardImage.tabIndex = 0;
    cardImage.setAttribute("role", "button");
    cardImage.setAttribute("aria-label", `Open ${previewName} main image preview`);
    cardImage.addEventListener("click", () => {
      openPreviewImageGallery(
        previewName,
        mainPreviewImageUrl ? [mainPreviewImageUrl] : [],
        0,
        {
          showCropGuide: true,
          initialCropState: {
            sourceUrl: mainPreviewImageUrl,
            croppedImageUrl: currentPreviewCropImageUrl,
            positionX: previewCardImagePositionX,
            positionY: previewCardImagePositionY,
          },
          onSave: ({ selection, croppedImageUrl }) => {
            editingCardImagePositionX =
              selection?.positionX ?? DEFAULT_CARD_IMAGE_POSITION_X;
            editingCardImagePosition =
              selection?.positionY ?? DEFAULT_CARD_IMAGE_POSITION;
            if (croppedImageUrl) {
              previewCardCropSourceUrl = mainPreviewImageUrl;
              previewCardCroppedImageUrl = croppedImageUrl;
            } else {
              clearPreviewCardCrop();
            }
            renderAndroidProductPreview();
            syncProductFormSubmitState();
            setHelperText(
              `Card image crop applied to the Android preview card. Click ${
                editingProductId ? "Update Listing" : "Save Listing"
              } to save it to the app.`,
            );
            setStatus(editingProductId ? "Editing" : "Adding", "default");
          },
        },
      );
    });
    cardImage.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPreviewImageGallery(
          previewName,
          mainPreviewImageUrl ? [mainPreviewImageUrl] : [],
          0,
          {
            showCropGuide: true,
            initialCropState: {
              sourceUrl: mainPreviewImageUrl,
              croppedImageUrl: currentPreviewCropImageUrl,
              positionX: previewCardImagePositionX,
              positionY: previewCardImagePositionY,
            },
            onSave: ({ selection, croppedImageUrl }) => {
              editingCardImagePositionX =
                selection?.positionX ?? DEFAULT_CARD_IMAGE_POSITION_X;
              editingCardImagePosition =
                selection?.positionY ?? DEFAULT_CARD_IMAGE_POSITION;
              if (croppedImageUrl) {
                previewCardCropSourceUrl = mainPreviewImageUrl;
                previewCardCroppedImageUrl = croppedImageUrl;
              } else {
                clearPreviewCardCrop();
              }
              renderAndroidProductPreview();
              syncProductFormSubmitState();
              setHelperText(
                `Card image crop applied to the Android preview card. Click ${
                  editingProductId ? "Update Listing" : "Save Listing"
                } to save it to the app.`,
              );
              setStatus(editingProductId ? "Editing" : "Adding", "default");
            },
          },
        );
      }
    });
  } else {
    cardImage.classList.add("is-empty");
    cardImage.appendChild(
      createPreviewElement("div", "android-preview-card__fallback", previewInitial),
    );
  }

  const cardBody = createPreviewElement("div", "android-preview-card__body");
  cardBody.append(createPreviewElement("span", "android-preview-card__category", previewCategory));
  const nameLine = createPreviewElement("p", "android-preview-card__name-line");
  nameLine.append(createPreviewElement("span", "android-preview-card__name-text", previewName));
  if (showsTopSellerBadge) {
    nameLine.append(
      createPreviewElement(
        "span",
        "android-preview-card__badge android-preview-card__badge--inline android-preview-card__badge--top-seller",
        "Top Seller",
      ),
    );
  }
  if (isTopRated) {
    nameLine.append(
      createPreviewElement(
        "span",
        "android-preview-card__badge android-preview-card__badge--inline android-preview-card__badge--top-rating",
        "Top Rating",
      ),
    );
  }
  if (discountPercent !== null) {
    nameLine.append(
      createPreviewElement(
        "span",
        "android-preview-card__badge android-preview-card__badge--inline android-preview-card__badge--discount",
        `-${discountPercent}%`,
      ),
    );
  }
  cardBody.append(nameLine);

  const priceRow = createPreviewElement("div", "android-preview-card__price-row");
  priceRow.append(createPriceElement("span", "android-preview-card__price", displayPrice));
  if (showOriginalPrice) {
    priceRow.append(createPriceElement("span", "android-preview-card__price-original", originalPrice));
  }
  cardBody.append(priceRow);

  card.append(cardImage, cardBody);
  previewShell.append(card);
  return previewShell;
}

function createAndroidProductDetailsPreview({
  draftProduct,
  previewName,
  previewCategory,
  previewInitial,
  previewDescription,
  originalPrice,
  displayPrice,
  showOriginalPrice,
  discountPercent,
  isTopRated,
  showsTopSellerBadge,
  postedDate,
}) {
  const previewShell = createPreviewElement("div", "android-preview-details-shell");
  const details = createPreviewElement("section", "android-preview-details");
  const hero = createPreviewElement("div", "android-preview-details__hero");
  const previewVideoUrls = getNormalizedProductVideoUrls(draftProduct);
  const previewVideoThumbnailUrls = getNormalizedProductVideoThumbnailUrls(
    draftProduct,
    previewVideoUrls,
  );
  const previewImageUrls = getNormalizedProductImageUrls(draftProduct);
  const defaultPreviewImageIndex = getResolvedProductMainImageIndex(draftProduct, previewImageUrls);
  const previewMediaItems = [];
  previewVideoUrls.forEach((videoUrl, videoIndex) => {
    previewMediaItems.push({
      type: "video",
      url: videoUrl,
      thumbnailUrl: String(previewVideoThumbnailUrls[videoIndex] ?? "").trim(),
      label: previewVideoUrls.length > 1 ? `Product video ${videoIndex + 1}` : "Product video",
    });
  });
  previewImageUrls.forEach((imageUrl, imageIndex) => {
    previewMediaItems.push({
      type: "image",
      url: imageUrl,
      imageIndex,
      label:
        previewImageUrls.length > 1 ? `${previewName} image ${imageIndex + 1}` : previewName,
    });
  });
  const defaultPreviewMediaIndex = previewVideoUrls.length ? 0 : defaultPreviewImageIndex;
  const detailsImageStateKey = getPreviewDetailsImageStateKey(
    draftProduct,
    previewImageUrls,
    defaultPreviewImageIndex,
  );
  const activePreviewMediaIndex = syncPreviewDetailsImageState(
    detailsImageStateKey,
    previewMediaItems.length,
    defaultPreviewMediaIndex,
  );
  const resolveDetailsPreviewImageUrl = (imageUrl, imageIndex) =>
    getPreviewDetailsCroppedImageUrl(detailsImageStateKey, imageIndex) || imageUrl;
  const resolveDetailsPreviewCropAspectRatio = () => getProductDetailsPreviewCropAspectRatio(hero);
  const openDetailsPreviewImageViewer = (startIndex = activePreviewMediaIndex) => {
    const normalizedStartIndex = normalizePreviewImageIndex(
      startIndex,
      previewMediaItems.length,
      defaultPreviewMediaIndex,
    );
    const displayPreviewMediaItems = previewMediaItems.map((mediaItem) =>
      mediaItem.type === "video"
        ? mediaItem
        : {
            ...mediaItem,
            url: resolveDetailsPreviewImageUrl(mediaItem.url, mediaItem.imageIndex),
          },
    );
    const modelItem = getProductGalleryModelItem(draftProduct);
    if (modelItem) {
      displayPreviewMediaItems.push(modelItem);
    }

    openPreviewMediaGallery(previewName, displayPreviewMediaItems, normalizedStartIndex, {
      showCancelAction: false,
      primaryActionLabel: "Edit",
      primaryActionMediaType: "image",
      closeBeforeAction: true,
      onSave: ({ itemIndex }) => {
        const targetMediaItem = previewMediaItems[itemIndex] ?? null;
        if (!targetMediaItem || targetMediaItem.type !== "image") {
          return;
        }
        openDetailsPreviewImageCropEditor(itemIndex);
      },
    });
  };
  const openDetailsPreviewImageCropEditor = (startIndex = activePreviewMediaIndex) => {
    const normalizedStartIndex = normalizePreviewImageIndex(
      startIndex,
      previewMediaItems.length,
      defaultPreviewMediaIndex,
    );
    const targetMediaItem = previewMediaItems[normalizedStartIndex] ?? null;
    if (!targetMediaItem || targetMediaItem.type !== "image") {
      return;
    }
    const sourceUrl = String(targetMediaItem.url ?? "").trim();
    if (!sourceUrl) {
      return;
    }

    openPreviewImageGallery(previewName, [sourceUrl], 0, {
      showCancelAction: true,
      showCropGuide: true,
      primaryActionLabel: "Save",
      cropAspectRatio: resolveDetailsPreviewCropAspectRatio(),
      initialCropState: getPreviewDetailsCropState(
        detailsImageStateKey,
        targetMediaItem.imageIndex,
      ),
      onCancelAction: () => {
        openDetailsPreviewImageViewer(normalizedStartIndex);
      },
      onSave: ({ selection, croppedImageUrl }) => {
        setPreviewDetailsCropState(detailsImageStateKey, targetMediaItem.imageIndex, {
          sourceUrl,
          croppedImageUrl,
          positionX: selection?.positionX ?? DEFAULT_CARD_IMAGE_POSITION_X,
          positionY: selection?.positionY ?? DEFAULT_CARD_IMAGE_POSITION,
        });
        previewDetailsImageStateKey = detailsImageStateKey;
        previewDetailsActiveImageIndex = normalizedStartIndex;
        renderAndroidProductPreview();
        syncProductFormSubmitState();
        setHelperText("Product details image crop applied to the Android preview.");
        setStatus(editingProductId ? "Editing" : "Adding", "default");
      },
    });
  };
  if (previewMediaItems.length) {
    hero.classList.add("is-clickable");
    const heroCarousel = createPreviewElement("div", "android-preview-details__hero-carousel");
    const heroTrack = createPreviewElement("div", "android-preview-details__hero-track");
    heroTrack.style.transform = `translateX(-${activePreviewMediaIndex * 100}%)`;

    previewMediaItems.forEach((mediaItem, mediaIndex) => {
      const slide = createPreviewElement("div", "android-preview-details__hero-slide");
      if (mediaItem.type === "video") {
        slide.classList.add("is-video");
        const videoThumbnailUrl = String(mediaItem.thumbnailUrl ?? "").trim();
        if (videoThumbnailUrl) {
          const posterImage = document.createElement("img");
          posterImage.src = videoThumbnailUrl;
          posterImage.alt = `${mediaItem.label} thumbnail`;
          posterImage.draggable = false;
          slide.appendChild(posterImage);
        } else {
          const video = document.createElement("video");
          video.src = mediaItem.url;
          video.muted = true;
          video.loop = false;
          video.playsInline = true;
          video.preload = "metadata";
          video.setAttribute("aria-label", `${previewName} video preview`);
          video.addEventListener(
            "loadeddata",
            () => {
              try {
                video.currentTime = 0.01;
              } catch (_) {}
            },
            { once: true },
          );
          slide.appendChild(video);
        }
        const playOverlay = createPreviewElement(
          "span",
          "android-preview-details__hero-video-play",
        );
        playOverlay.innerHTML = `
          <span class="android-preview-details__hero-video-play-icon" aria-hidden="true">
            <i class="fa-solid fa-play"></i>
          </span>
        `;
        slide.appendChild(playOverlay);
      } else {
        const image = document.createElement("img");
        image.src = resolveDetailsPreviewImageUrl(mediaItem.url, mediaItem.imageIndex);
        image.alt = mediaItem.label;
        image.draggable = false;
        slide.appendChild(image);
      }
      heroTrack.appendChild(slide);
    });

    heroCarousel.appendChild(heroTrack);
    hero.appendChild(heroCarousel);

    let suppressHeroClick = false;

    hero.addEventListener("click", (event) => {
      if (event.target.closest(".android-preview-details__hero-indicator")) {
        return;
      }

      if (suppressHeroClick) {
        suppressHeroClick = false;
        return;
      }

      openDetailsPreviewImageViewer(activePreviewMediaIndex);
    });

    if (previewMediaItems.length > 1) {
      hero.classList.add("is-slideable");
      hero.tabIndex = 0;
      hero.setAttribute("role", "group");
      hero.setAttribute(
        "aria-label",
        `${previewName} preview media, ${activePreviewMediaIndex + 1} of ${previewMediaItems.length}`,
      );

      let pointerStartX = 0;
      let pointerCurrentX = 0;
      let isDraggingHero = false;

      const resetHeroTrackPosition = () => {
        heroTrack.style.transform = `translateX(-${activePreviewMediaIndex * 100}%)`;
      };

      const finishHeroSwipe = (event) => {
        if (!isDraggingHero) {
          return;
        }

        isDraggingHero = false;
        hero.classList.remove("is-dragging");
        const deltaX = pointerCurrentX - pointerStartX;
        const swipeThreshold = Math.max(40, hero.clientWidth * 0.12);

        if (event?.pointerId !== undefined && hero.hasPointerCapture?.(event.pointerId)) {
          hero.releasePointerCapture(event.pointerId);
        }

        if (deltaX <= -swipeThreshold && activePreviewMediaIndex < previewMediaItems.length - 1) {
          updatePreviewDetailsImageIndex(
            activePreviewMediaIndex + 1,
            previewMediaItems.length,
            detailsImageStateKey,
            defaultPreviewMediaIndex,
          );
          return;
        }

        if (deltaX >= swipeThreshold && activePreviewMediaIndex > 0) {
          updatePreviewDetailsImageIndex(
            activePreviewMediaIndex - 1,
            previewMediaItems.length,
            detailsImageStateKey,
            defaultPreviewMediaIndex,
          );
          return;
        }

        resetHeroTrackPosition();
      };

      hero.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        pointerStartX = event.clientX;
        pointerCurrentX = event.clientX;
        isDraggingHero = true;
        hero.classList.add("is-dragging");
        hero.setPointerCapture?.(event.pointerId);
      });

      hero.addEventListener("pointermove", (event) => {
        if (!isDraggingHero) {
          return;
        }

        pointerCurrentX = event.clientX;
        const offsetX = pointerCurrentX - pointerStartX;
        if (Math.abs(offsetX) > 8) {
          suppressHeroClick = true;
        }
        heroTrack.style.transform = `translateX(calc(-${activePreviewMediaIndex * 100}% + ${offsetX}px))`;
        event.preventDefault();
      });

      hero.addEventListener("pointerup", finishHeroSwipe);
      hero.addEventListener("pointercancel", finishHeroSwipe);
      hero.addEventListener("lostpointercapture", finishHeroSwipe);
      hero.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetailsPreviewImageViewer(activePreviewMediaIndex);
          return;
        }

        if (event.key === "ArrowLeft" && activePreviewMediaIndex > 0) {
          event.preventDefault();
          updatePreviewDetailsImageIndex(
            activePreviewMediaIndex - 1,
            previewMediaItems.length,
            detailsImageStateKey,
            defaultPreviewMediaIndex,
          );
        }

        if (event.key === "ArrowRight" && activePreviewMediaIndex < previewMediaItems.length - 1) {
          event.preventDefault();
          updatePreviewDetailsImageIndex(
            activePreviewMediaIndex + 1,
            previewMediaItems.length,
            detailsImageStateKey,
            defaultPreviewMediaIndex,
          );
        }
      });
    }
  } else {
    hero.classList.add("is-empty");
    hero.appendChild(
      createPreviewElement("div", "android-preview-details__hero-fallback", previewInitial),
    );
  }

  if (previewMediaItems.length > 1) {
    const indicatorRail = createPreviewElement("div", "android-preview-details__hero-indicators");
    const indicatorTrack = createPreviewElement("div", "android-preview-details__hero-indicator-track");

    previewMediaItems.forEach((mediaItem, mediaIndex) => {
      const indicator = document.createElement("button");
      indicator.type = "button";
      indicator.className = `android-preview-details__hero-indicator${
        mediaIndex === activePreviewMediaIndex ? " is-active" : ""
      }`;
      indicator.setAttribute(
        "aria-label",
        mediaItem.type === "video" ? "Show video" : `Show image ${mediaItem.imageIndex + 1}`,
      );
      indicator.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      indicator.addEventListener("click", () => {
        updatePreviewDetailsImageIndex(
          mediaIndex,
          previewMediaItems.length,
          detailsImageStateKey,
          defaultPreviewMediaIndex,
        );
      });
      indicatorTrack.append(indicator);
    });

    indicatorRail.append(indicatorTrack);
    hero.append(indicatorRail);
  }

  const body = createPreviewElement("div", "android-preview-details__body");
  const categoryChip = createPreviewElement("span", "android-preview-details__category-chip");
  categoryChip.append(
    createPreviewMaterialIcon("grid_view"),
    createPreviewElement("span", "", previewCategory),
  );
  body.append(categoryChip);

  const titleRow = createPreviewElement("div", "android-preview-details__title-row");
  titleRow.append(createPreviewElement("h3", "android-preview-details__title", previewName));
  const favoriteButton = createPreviewElement("span", "android-preview-details__favorite");
  favoriteButton.append(createPreviewMaterialIcon("favorite_border"));
  titleRow.append(favoriteButton);
  body.append(titleRow);

  const statusChips = createPreviewElement("div", "android-preview-details__status-chips");
  if (discountPercent !== null) {
    statusChips.append(
      createPreviewBadge(
        "android-preview-details__status-chip android-preview-details__status-chip--discount",
        "local_offer",
        `-${discountPercent}%`,
      ),
    );
  }
  if (showsTopSellerBadge) {
    statusChips.append(
      createPreviewBadge(
        "android-preview-details__status-chip android-preview-details__status-chip--top-seller",
        "workspace_premium",
        "Top Selling",
      ),
    );
  }
  if (isTopRated) {
    statusChips.append(
      createPreviewBadge(
        "android-preview-details__status-chip android-preview-details__status-chip--top-rating",
        "star",
        "Top Rating",
      ),
    );
  }
  if (statusChips.childElementCount > 0) {
    body.append(statusChips);
  }

  const priceRow = createPreviewElement("div", "android-preview-details__price-row");
  priceRow.append(createPriceElement("span", "android-preview-details__price", displayPrice));
  if (showOriginalPrice) {
    priceRow.append(
      createPriceElement("span", "android-preview-details__price-original", originalPrice),
    );
  }
  body.append(priceRow);

  const stats = createPreviewElement("div", "android-preview-details__stats");
  stats.append(
    createPreviewStatCard(
      "android-preview-details__stat-card android-preview-details__stat-card--posted",
      "calendar_today",
      "Posted",
      postedDate,
    ),
  );
  body.append(stats);

  const aboutSection = createPreviewElement("section", "android-preview-details__about");
  const descriptionText = String(draftProduct?.description ?? "").trim();
  const descriptionImageUrls = normalizeProductDescriptionImageUrls(
    draftProduct?.descriptionImageUrls,
  );
  aboutSection.append(
    createPreviewElement("h4", "android-preview-details__about-title", "About this product"),
  );
  if (descriptionText || !descriptionImageUrls.length) {
    aboutSection.append(
      createPreviewElement("p", "android-preview-details__about-text", previewDescription),
    );
  }
  if (descriptionImageUrls.length) {
    const descriptionImageList = createPreviewElement(
      "div",
      "android-preview-details__description-images",
    );
    descriptionImageUrls.forEach((imageUrl, imageIndex) => {
      const imageFrame = createPreviewElement(
        "figure",
        "android-preview-details__description-image",
      );
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = `Product description photo ${imageIndex + 1}`;
      image.loading = "lazy";
      image.decoding = "async";
      image.draggable = false;
      imageFrame.appendChild(image);
      descriptionImageList.appendChild(imageFrame);
    });
    aboutSection.appendChild(descriptionImageList);
  }
  body.append(aboutSection);

  details.append(hero, body);
  previewShell.append(details);
  return previewShell;
}

function createAndroidBuyModalPreview({
  draftProduct,
  previewName,
  previewInitial,
  originalPrice,
  salesPrice,
  discountPercent,
  isTopRated,
  showsTopSellerBadge,
}) {
  const previewShell = createPreviewElement("div", "android-preview-buy-shell");
  const modalPreview = createPreviewElement("section", "android-preview-buy");
  const backdrop = createPreviewElement("div", "android-preview-buy__backdrop");

  if (draftProduct.imageUrl) {
    const backdropImage = document.createElement("img");
    backdropImage.src = draftProduct.imageUrl;
    backdropImage.alt = previewName;
    backdrop.appendChild(backdropImage);
  } else {
    backdrop.classList.add("is-empty");
    backdrop.appendChild(
      createPreviewElement("div", "android-preview-buy__backdrop-fallback", previewInitial),
    );
  }

  backdrop.appendChild(createPreviewElement("div", "android-preview-buy__backdrop-scrim"));

  const sheet = createPreviewElement("div", "android-preview-buy__sheet");
  const sheetBody = createPreviewElement("div", "android-preview-buy__sheet-body");
  const previewVariants = Array.isArray(draftProduct?.variants) ? draftProduct.variants : [];
  const selectedVariant = previewVariants[0] ?? null;
  const selectedVariantPricing = resolvePreviewVariantPricing(
    selectedVariant,
    originalPrice,
    salesPrice,
  );
  const resolvedDiscountPercent = selectedVariantPricing.discountPercent ?? discountPercent;
  const availableStock = getPreviewAvailableStock(draftProduct, selectedVariant);
  const hasStock = availableStock > 0;
  const quantity = 1;
  const quantityAdjustedPrice = selectedVariantPricing.displayPrice * quantity;
  const quantityAdjustedOriginalPrice = selectedVariantPricing.originalPrice * quantity;
  const mainPreviewImageUrl = String(draftProduct?.imageUrl ?? "").trim();
  const summaryCropSourceUrl = String(draftProduct?.buyModalImageSourceUrl ?? "").trim();
  const summaryCroppedImageUrl = String(draftProduct?.buyModalImageUrl ?? "").trim();
  const summaryImagePositionX = normalizeCardImagePosition(
    draftProduct?.buyModalImagePositionX,
    DEFAULT_CARD_IMAGE_POSITION_X,
  );
  const summaryImagePositionY = normalizeCardImagePosition(
    draftProduct?.buyModalImagePositionY,
    DEFAULT_CARD_IMAGE_POSITION,
  );
  const effectiveSummaryImageUrl =
    summaryCropSourceUrl &&
    summaryCroppedImageUrl &&
    mainPreviewImageUrl &&
    summaryCropSourceUrl.toLowerCase() === mainPreviewImageUrl.toLowerCase()
      ? summaryCroppedImageUrl
      : mainPreviewImageUrl;
  const summaryImageUrl = effectiveSummaryImageUrl;

  const summary = createPreviewElement("div", "android-preview-buy__summary");
  const summaryImage = createPreviewElement("div", "android-preview-buy__summary-image");
  if (summaryImageUrl) {
    const image = document.createElement("img");
    image.src = summaryImageUrl;
    image.alt = previewName;
    image.style.objectPosition =
      effectiveSummaryImageUrl && effectiveSummaryImageUrl === summaryCroppedImageUrl
        ? "center center"
        : formatCardImageObjectPosition(summaryImagePositionX, summaryImagePositionY);
    summaryImage.appendChild(image);
    if (mainPreviewImageUrl) {
      summaryImage.classList.add("is-clickable");
      summaryImage.tabIndex = 0;
      summaryImage.setAttribute("role", "button");
      summaryImage.setAttribute("aria-label", `Open ${previewName} buy modal image crop editor`);
      const openSummaryImageCrop = () => {
        const cropAspectRatio =
          summaryImage.clientWidth > 0 && summaryImage.clientHeight > 0
            ? summaryImage.clientWidth / summaryImage.clientHeight
            : 112 / 138;
        openPreviewImageGallery(previewName, [mainPreviewImageUrl], 0, {
          showCropGuide: true,
          showCancelAction: true,
          primaryActionLabel: "Save",
          cropAspectRatio,
          initialCropState: {
            sourceUrl: mainPreviewImageUrl,
            croppedImageUrl:
              summaryCropSourceUrl &&
              summaryCroppedImageUrl &&
              summaryCropSourceUrl.toLowerCase() === mainPreviewImageUrl.toLowerCase()
                ? summaryCroppedImageUrl
                : "",
            positionX: summaryImagePositionX,
            positionY: summaryImagePositionY,
          },
          onSave: ({ selection, croppedImageUrl }) => {
            editingBuyModalImagePositionX = normalizeCardImagePosition(
              selection?.positionX,
              DEFAULT_CARD_IMAGE_POSITION_X,
            );
            editingBuyModalImagePositionY = normalizeCardImagePosition(
              selection?.positionY,
              DEFAULT_CARD_IMAGE_POSITION,
            );
            if (croppedImageUrl) {
              previewBuyModalCropSourceUrl = mainPreviewImageUrl;
              previewBuyModalCroppedImageUrl = String(croppedImageUrl ?? "").trim();
            } else {
              clearPreviewBuyModalCrop();
            }
            renderAndroidProductPreview();
            syncProductFormSubmitState();
            setHelperText(
              `Buy modal top image crop applied. Click ${
                editingProductId ? "Update Listing" : "Save Listing"
              } to save it.`,
            );
            setStatus(editingProductId ? "Editing" : "Adding", "default");
          },
        });
      };
      summaryImage.addEventListener("click", openSummaryImageCrop);
      summaryImage.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSummaryImageCrop();
        }
      });
    }
  } else {
    summaryImage.classList.add("is-empty");
    summaryImage.appendChild(
      createPreviewElement("div", "android-preview-buy__summary-image-fallback", previewInitial),
    );
  }

  const summaryCopy = createPreviewElement("div", "android-preview-buy__summary-copy");
  const summaryPriceGroup = createPreviewElement("div", "android-preview-buy__summary-price-group");
  summaryPriceGroup.append(
    createPriceElement("span", "android-preview-buy__summary-price", quantityAdjustedPrice),
  );
  if (selectedVariantPricing.showOriginalPrice) {
    summaryPriceGroup.append(
      createPriceElement(
        "span",
        "android-preview-buy__summary-price-original",
        quantityAdjustedOriginalPrice,
      ),
    );
  }
  summaryCopy.append(summaryPriceGroup);

  const summaryBadges = createPreviewElement("div", "android-preview-buy__summary-badges");
  if (resolvedDiscountPercent !== null) {
    summaryBadges.append(
      createPreviewBadge(
        "android-preview-buy__badge android-preview-buy__badge--discount",
        "local_offer",
        `-${resolvedDiscountPercent}%`,
      ),
    );
  }
  if (showsTopSellerBadge) {
    summaryBadges.append(
      createPreviewBadge(
        "android-preview-buy__badge android-preview-buy__badge--top-seller",
        "workspace_premium",
        "Top Selling",
      ),
    );
  }
  if (isTopRated) {
    summaryBadges.append(
      createPreviewBadge(
        "android-preview-buy__badge android-preview-buy__badge--top-rating",
        "star",
        "Top Rating",
      ),
    );
  }
  if (summaryBadges.childElementCount > 0) {
    summaryCopy.append(summaryBadges);
  }

  const stockRow = createPreviewElement("div", "android-preview-buy__meta-row");
  stockRow.append(
    createPreviewMaterialIcon("inventory_2"),
    createPreviewElement("span", "", hasStock ? `Stock: ${availableStock}` : "Sold out"),
  );
  if (!hasStock) {
    stockRow.classList.add("is-danger");
  }
  summaryCopy.append(stockRow);

  if (hasStock) {
    const deliveryRow = createPreviewElement("div", "android-preview-buy__meta-row");
    deliveryRow.append(
      createPreviewMaterialIcon("local_shipping"),
      createPreviewElement("span", "", "Same Day Delivery"),
    );
    summaryCopy.append(deliveryRow);
  }

  summary.append(summaryImage, summaryCopy);
  sheetBody.append(summary);

  if (previewVariants.length) {
    const variantsSection = createPreviewElement("section", "android-preview-buy__variants");
    variantsSection.append(
      createPreviewElement("h4", "android-preview-buy__section-title", "Variants"),
    );
    const variantsGrid = createPreviewElement("div", "android-preview-buy__variant-grid");

    previewVariants.slice(0, 6).forEach((variant, variantIndex) => {
      const variantAvailableStock = getPreviewAvailableStock(draftProduct, variant);
      const isVariantSoldOut = variantAvailableStock <= 0;
      const variantCard = createPreviewElement(
        "article",
        `android-preview-buy__variant-card${variantIndex === 0 ? " is-selected" : ""}${
          isVariantSoldOut ? " is-sold-out" : ""
        }`,
      );
      const variantImage = createPreviewElement("div", "android-preview-buy__variant-image");
      if (isVariantSoldOut) {
        variantImage.classList.add("is-sold-out");
      }
      if (variant.imageUrl) {
        const image = document.createElement("img");
        image.src = String(variant.displayImageUrl ?? "").trim() || variant.imageUrl;
        image.alt = variant.name || `Variant ${variantIndex + 1}`;
        variantImage.appendChild(image);
        if (!isVariantSoldOut) {
          variantImage.classList.add("is-clickable");
          variantImage.tabIndex = 0;
          variantImage.setAttribute("role", "button");
          variantImage.setAttribute(
            "aria-label",
            `Open ${(variant.name || `Variant ${variantIndex + 1}`).trim()} image preview`,
          );
          const editingVariantIndex = Number.isInteger(Number(variant.editingIndex))
            ? Math.max(0, Number(variant.editingIndex))
            : variantIndex;
          const openVariantPreview = () => {
            const editableVariant = editingVariants[editingVariantIndex] ?? null;
            const sourceImageUrl =
              String(variant.sourceImageUrl ?? "").trim() || getVariantPreviewUrl(editableVariant);
            if (!sourceImageUrl) {
              return;
            }

            const cropAspectRatio =
              variantImage.clientWidth > 0 && variantImage.clientHeight > 0
                ? variantImage.clientWidth / variantImage.clientHeight
                : 1;
            openPreviewImageGallery(
              `${previewName} - ${(variant.name || `Variant ${variantIndex + 1}`).trim()}`,
              [sourceImageUrl],
              0,
              {
                showCropGuide: true,
                showCancelAction: true,
                primaryActionLabel: "Save",
                cropAspectRatio,
                initialCropState: getVariantPreviewCropState(editableVariant),
                onSave: ({ selection, croppedImageUrl }) => {
                  const targetVariant = editingVariants[editingVariantIndex];
                  if (!targetVariant) {
                    return;
                  }

                  const normalizedCroppedImageUrl = String(croppedImageUrl ?? "").trim();
                  if (!normalizedCroppedImageUrl) {
                    clearVariantPreviewCrop(editingVariantIndex);
                  } else {
                    targetVariant.imageSourceUrl = sourceImageUrl;
                    targetVariant.cropSourceUrl = sourceImageUrl;
                    targetVariant.croppedImageUrl = normalizedCroppedImageUrl;
                    targetVariant.imagePositionX = normalizeCardImagePosition(
                      selection?.positionX,
                      DEFAULT_CARD_IMAGE_POSITION_X,
                    );
                    targetVariant.imagePositionY = normalizeCardImagePosition(
                      selection?.positionY,
                      DEFAULT_CARD_IMAGE_POSITION,
                    );
                  }

                  renderProductVariants();
                  renderAndroidProductPreview();
                  syncProductFormSubmitState();
                  setHelperText(
                    `Variant image crop applied. Click ${
                      editingProductId ? "Update Listing" : "Save Listing"
                    } to save it.`,
                  );
                  setStatus(editingProductId ? "Editing" : "Adding", "default");
                },
              },
            );
          };
          variantImage.addEventListener("click", openVariantPreview);
          variantImage.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openVariantPreview();
            }
          });
        }
      } else {
        variantImage.classList.add("is-empty");
        variantImage.appendChild(
          createPreviewElement(
            "div",
            "android-preview-buy__variant-image-fallback",
            (variant.name || previewInitial || "V").trim()[0]?.toUpperCase() ?? "V",
          ),
        );
      }
      if (isVariantSoldOut) {
        const soldOutOverlay = createPreviewElement(
          "div",
          "android-preview-buy__variant-sold-out",
        );
        soldOutOverlay.appendChild(
          createPreviewElement(
            "span",
            "android-preview-buy__variant-sold-out-pill",
            "Sold out",
          ),
        );
        variantImage.appendChild(soldOutOverlay);
      }
      const variantLabel = createPreviewElement("span", "android-preview-buy__variant-name");
      variantLabel.append(
        createPreviewElement(
          "span",
          "android-preview-buy__variant-name-text",
          variant.name || `Variant ${variantIndex + 1}`,
        ),
      );
      variantCard.append(variantImage, variantLabel);
      variantsGrid.appendChild(variantCard);
    });

    variantsSection.append(variantsGrid);
    sheetBody.append(variantsSection);
  }

  const quantityRow = createPreviewElement("div", "android-preview-buy__quantity-row");
  quantityRow.append(
    createPreviewElement("span", "android-preview-buy__quantity-label", "Quantity"),
  );
  const quantityControl = createPreviewElement("div", "android-preview-buy__quantity-control");
  quantityControl.append(
    createPreviewElement("span", "android-preview-buy__quantity-button", "-"),
    createPreviewElement("span", "android-preview-buy__quantity-value", String(quantity)),
    createPreviewElement("span", "android-preview-buy__quantity-button", "+"),
  );
  quantityRow.append(quantityControl);
  sheetBody.append(quantityRow);

  const footer = createPreviewElement("div", "android-preview-buy__footer");
  footer.append(
    createPreviewElement("div", "android-preview-buy__cancel", "Cancel"),
  );

  const submit = createPreviewElement("div", "android-preview-buy__submit");
  if (hasStock) {
    submit.append(
      createPreviewElement(
        "span",
        "android-preview-buy__submit-title",
        `Buy ${quantity} Item${quantity > 1 ? "s" : ""}`,
      ),
      createPriceElement("span", "android-preview-buy__submit-price", quantityAdjustedPrice),
    );
  } else {
    submit.append(
      createPreviewElement("span", "android-preview-buy__submit-title", "Sold out"),
    );
    submit.classList.add("is-disabled");
  }
  footer.append(submit);

  sheet.append(sheetBody, footer);
  modalPreview.append(backdrop, sheet);
  previewShell.append(modalPreview);
  return previewShell;
}

function createAndroidProductPreview() {
  const draftProduct = getPreviewDraftProduct();
  const draftId = String(draftProduct?.id ?? "__draft-preview__");
  const previewName = String(draftProduct?.name ?? "").trim() || "Product Name Preview";
  const previewCategory = getProductCategoryLabel(draftProduct);
  const previewInitial = previewName[0]?.toUpperCase() ?? "P";
  const previewDescription =
    String(draftProduct?.description ?? "").trim() ||
    "No details available about this product yet.";
  const topSellerIds = buildPreviewTopSellerIdSet(draftProduct);
  const originalPrice = getOriginalPrice(draftProduct);
  const salesPrice = getSalesPrice(draftProduct);
  const hasSalesPrice = salesPrice !== null && salesPrice >= 0 && salesPrice < originalPrice;
  const showOriginalPrice = hasSalesPrice;
  const displayPrice = hasSalesPrice ? salesPrice : originalPrice;
  const discountPercent = getDiscountPercent(draftProduct);
  const isTopRated = isTopRatedProduct(draftProduct);
  const showsTopSellerBadge = topSellerIds.has(draftId);
  const postedDate = formatPreviewPostedDate(draftProduct?.createdAt);

  const previewLayout = createPreviewElement("div", "android-preview-layout");
  const mobilePreviewGroup = createPreviewElement("div", "android-preview-mobile-group");
  mobilePreviewGroup.append(
    createAndroidProductDetailsPreview({
      draftProduct,
      previewName,
      previewCategory,
      previewInitial,
      previewDescription,
      originalPrice,
      displayPrice,
      showOriginalPrice,
      discountPercent,
      isTopRated,
      showsTopSellerBadge,
      postedDate,
    }),
    createAndroidBuyModalPreview({
      draftProduct,
      previewName,
      previewInitial,
      originalPrice,
      salesPrice,
      discountPercent,
      isTopRated,
      showsTopSellerBadge,
    }),
  );
  previewLayout.append(
    createAndroidProductCardPreview({
      draftProduct,
      previewName,
      previewCategory,
      previewInitial,
      originalPrice,
      displayPrice,
      showOriginalPrice,
      discountPercent,
      isTopRated,
      showsTopSellerBadge,
    }),
    mobilePreviewGroup,
  );
  return previewLayout;
}

function renderAndroidProductPreview() {
  if (!androidPreviewStage) {
    return;
  }

  androidPreviewStage.innerHTML = "";
  syncAndroidPreviewThemePresentation();
  androidPreviewStage.appendChild(createAndroidProductPreview());
  syncAndroidPreviewVariantNameAutoFit();
}

function normalizeEditableImageSlots(imageUrls) {
  const normalizedImageUrls = Array.isArray(imageUrls)
    ? imageUrls.map((value) => String(value ?? "").trim())
    : [];
  return normalizedImageUrls.length ? normalizedImageUrls : [""];
}

function normalizeEditableVideoSlots(videoUrls) {
  return Array.isArray(videoUrls)
    ? videoUrls.map((value) => String(value ?? "").trim())
    : [];
}

function normalizeEditableVideoThumbnailSlots(thumbnailUrls, slotCount = editingVideoUrls.length) {
  const normalizedSlotCount = Math.max(0, Number(slotCount) || 0);
  const sourceUrls = Array.isArray(thumbnailUrls)
    ? thumbnailUrls.map((value) => String(value ?? "").trim())
    : [];
  const normalizedThumbnailUrls = [];

  for (let slotIndex = 0; slotIndex < normalizedSlotCount; slotIndex += 1) {
    normalizedThumbnailUrls.push(sourceUrls[slotIndex] || "");
  }

  return normalizedThumbnailUrls;
}

function revokePreviewObjectUrl(slotIndex) {
  const previewUrl = imagePreviewObjectUrls[slotIndex];
  if (!previewUrl) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
  imagePreviewObjectUrls[slotIndex] = "";
}

function clearPreviewObjectUrls() {
  for (let slotIndex = 0; slotIndex < imagePreviewObjectUrls.length; slotIndex += 1) {
    revokePreviewObjectUrl(slotIndex);
  }
  clearProductPhotoCropStates();
}

function isProductImageProcessing(slotIndex = null) {
  if (slotIndex === null || slotIndex === undefined) {
    return processingProductImageSlotIndexes.size > 0;
  }

  return processingProductImageSlotIndexes.has(Number(slotIndex));
}

function cancelProductImageProcessingSession() {
  productImageProcessingSessionId += 1;
  processingProductImageSlotIndexes.clear();
}

function waitForProductImageLoadingWheel(minimumDuration = 360) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, Number(minimumDuration) || 0));
  });
}

function revokeVideoPreviewObjectUrl(slotIndex) {
  const previewUrl = videoPreviewObjectUrls[slotIndex];
  if (!previewUrl) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
  videoPreviewObjectUrls[slotIndex] = "";
}

function revokeVideoThumbnailPreviewObjectUrl(slotIndex) {
  const previewUrl = videoThumbnailPreviewObjectUrls[slotIndex];
  if (!previewUrl) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
  videoThumbnailPreviewObjectUrls[slotIndex] = "";
}

function clearVideoPreviewObjectUrls() {
  for (let slotIndex = 0; slotIndex < videoPreviewObjectUrls.length; slotIndex += 1) {
    revokeVideoPreviewObjectUrl(slotIndex);
  }
}

function clearVideoThumbnailPreviewObjectUrls() {
  for (let slotIndex = 0; slotIndex < videoThumbnailPreviewObjectUrls.length; slotIndex += 1) {
    revokeVideoThumbnailPreviewObjectUrl(slotIndex);
  }
}

function revokeVariantPreviewObjectUrl(variantIndex) {
  const previewUrl = editingVariants[variantIndex]?.previewObjectUrl;
  if (!previewUrl) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
  editingVariants[variantIndex].previewObjectUrl = "";
}

function clearVariantPreviewObjectUrls() {
  for (let variantIndex = 0; variantIndex < editingVariants.length; variantIndex += 1) {
    revokeVariantPreviewObjectUrl(variantIndex);
  }
}

function isProductPhotoCropSourceUrlInUse(sourceUrl, exceptSlotIndex = -1) {
  const normalizedSourceUrl = String(sourceUrl || "").trim();
  if (!normalizedSourceUrl) {
    return false;
  }

  if (imagePreviewObjectUrls.some((previewUrl) => previewUrl === normalizedSourceUrl)) {
    return true;
  }

  return productPhotoCropSourceUrls.some(
    (cropSourceUrl, slotIndex) =>
      slotIndex !== exceptSlotIndex && cropSourceUrl === normalizedSourceUrl,
  );
}

function clearProductPhotoCropSourceAt(slotIndex) {
  const sourceUrl = String(productPhotoCropSourceUrls[slotIndex] || "").trim();
  if (slotIndex >= 0 && slotIndex < productPhotoCropSourceUrls.length) {
    productPhotoCropSourceUrls[slotIndex] = "";
  }
  if (slotIndex >= 0 && slotIndex < productPhotoCropStates.length) {
    productPhotoCropStates[slotIndex] = null;
  }
  if (
    sourceUrl.startsWith("blob:") &&
    !isProductPhotoCropSourceUrlInUse(sourceUrl, slotIndex)
  ) {
    URL.revokeObjectURL(sourceUrl);
  }
}

function clearProductPhotoCropStates() {
  productPhotoCropSourceUrls.forEach((sourceUrl, slotIndex) => {
    const normalizedSourceUrl = String(sourceUrl || "").trim();
    if (
      normalizedSourceUrl.startsWith("blob:") &&
      !imagePreviewObjectUrls.includes(normalizedSourceUrl)
    ) {
      URL.revokeObjectURL(normalizedSourceUrl);
    }
    productPhotoCropSourceUrls[slotIndex] = "";
    productPhotoCropStates[slotIndex] = null;
  });
  productPhotoCropSourceUrls = [""];
  productPhotoCropStates = [null];
}

function syncProductPhotoCropStateSlots() {
  while (productPhotoCropSourceUrls.length < editingImageUrls.length) {
    productPhotoCropSourceUrls.push("");
  }
  while (productPhotoCropStates.length < editingImageUrls.length) {
    productPhotoCropStates.push(null);
  }
  while (productPhotoCropSourceUrls.length > editingImageUrls.length) {
    clearProductPhotoCropSourceAt(productPhotoCropSourceUrls.length - 1);
    productPhotoCropSourceUrls.pop();
  }
  while (productPhotoCropStates.length > editingImageUrls.length) {
    productPhotoCropStates.pop();
  }
}

function getProductPhotoCropSourceUrl(slotIndex) {
  return String(productPhotoCropSourceUrls[slotIndex] || "").trim();
}

function applyCroppedProductPhotoPreviewAtSlot(slotIndex, croppedFile) {
  const normalizedSlotIndex = Number(slotIndex);
  const previousPreviewUrl = imagePreviewObjectUrls[normalizedSlotIndex] || "";
  const cropSourceUrl = getProductPhotoCropSourceUrl(normalizedSlotIndex);
  const nextPreviewUrl = URL.createObjectURL(croppedFile);
  pendingImageFiles[normalizedSlotIndex] = croppedFile;
  imagePreviewObjectUrls[normalizedSlotIndex] = nextPreviewUrl;
  if (
    previousPreviewUrl &&
    previousPreviewUrl !== nextPreviewUrl &&
    previousPreviewUrl !== cropSourceUrl
  ) {
    URL.revokeObjectURL(previousPreviewUrl);
  }
  renderProductImageInputs();
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText("Crop applied. The original photo is still available if you crop again.");
}

function syncEditableImageState() {
  editingImageUrls = normalizeEditableImageSlots(editingImageUrls);

  while (pendingImageFiles.length < editingImageUrls.length) {
    pendingImageFiles.push(null);
  }

  while (imagePreviewObjectUrls.length < editingImageUrls.length) {
    imagePreviewObjectUrls.push("");
  }

  while (pendingImageFiles.length > editingImageUrls.length) {
    pendingImageFiles.pop();
  }

  while (imagePreviewObjectUrls.length > editingImageUrls.length) {
    revokePreviewObjectUrl(imagePreviewObjectUrls.length - 1);
    imagePreviewObjectUrls.pop();
  }

  syncProductPhotoCropStateSlots();
}

function compactEditableImageState() {
  syncEditableImageState();

  const compactImageUrls = [];
  const compactPendingFiles = [];
  const compactPreviewUrls = [];
  const compactCropSourceUrls = [];
  const compactCropStates = [];

  editingImageUrls.forEach((existingImageUrl, slotIndex) => {
    const normalizedExistingImageUrl = String(existingImageUrl ?? "").trim();
    const pendingImageFile = pendingImageFiles[slotIndex] ?? null;
    const previewObjectUrl = imagePreviewObjectUrls[slotIndex] || "";

    if (!normalizedExistingImageUrl && !pendingImageFile) {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      clearProductPhotoCropSourceAt(slotIndex);
      return;
    }

    compactImageUrls.push(normalizedExistingImageUrl);
    compactPendingFiles.push(pendingImageFile);
    compactPreviewUrls.push(previewObjectUrl);
    compactCropSourceUrls.push(String(productPhotoCropSourceUrls[slotIndex] || "").trim());
    compactCropStates.push(productPhotoCropStates[slotIndex] ?? null);
  });

  editingImageUrls = compactImageUrls.length ? compactImageUrls : [""];
  pendingImageFiles = compactPendingFiles.length ? compactPendingFiles : [null];
  imagePreviewObjectUrls = compactPreviewUrls.length ? compactPreviewUrls : [""];
  productPhotoCropSourceUrls = compactCropSourceUrls.length ? compactCropSourceUrls : [""];
  productPhotoCropStates = compactCropStates.length ? compactCropStates : [null];
}

function isProductImageSlotPopulated(slotIndex) {
  return Boolean(
    String(editingImageUrls[slotIndex] ?? "").trim() || pendingImageFiles[slotIndex],
  );
}

function getPopulatedProductImageCount() {
  return editingImageUrls.reduce(
    (count, _existingImageUrl, slotIndex) =>
      count + (isProductImageSlotPopulated(slotIndex) ? 1 : 0),
    0,
  );
}

function getProductImageFileValidationMessage(file) {
  if (!(file instanceof File)) {
    return "Choose a valid product image.";
  }

  const normalizedMimeType = String(file.type || "").trim().toLowerCase();
  const hasAcceptedExtension = PRODUCT_IMAGE_ACCEPTED_FILE_PATTERN.test(file.name || "");
  const hasAcceptedMimeType = PRODUCT_IMAGE_ACCEPTED_MIME_TYPES.has(normalizedMimeType);

  if ((normalizedMimeType && !hasAcceptedMimeType) || (!normalizedMimeType && !hasAcceptedExtension)) {
    return `${file.name || "This file"} is not a JPG, PNG, or WEBP image.`;
  }

  if (Number(file.size || 0) > PRODUCT_IMAGE_MAX_FILE_SIZE) {
    return `${file.name || "This image"} is larger than 10MB.`;
  }

  return "";
}

async function inspectProductImageFile(file) {
  const validationMessage = getProductImageFileValidationMessage(file);
  if (validationMessage) {
    return { accepted: false, message: validationMessage, requiresReview: false };
  }

  const safety = await checkProductImageFileSafety(file);
  if (isProductImageSafetyBlocked(safety)) {
    setStatus("Illegal Content", "error");
    openProductIllegalContentModal(safety);
    return {
      accepted: false,
      blocked: true,
      message: `${file.name || "This image"} was rejected and cannot be uploaded.`,
      requiresReview: false,
    };
  }

  return {
    accepted: true,
    blocked: false,
    message: "",
    requiresReview: safety?.requiresReview === true,
  };
}

function isProductDescriptionModeSwitcherAvailable() {
  return Boolean(productDescriptionEditor && productDescriptionModeButtons.length);
}

function normalizeProductDescriptionMode(value) {
  return String(value ?? "").trim().toLowerCase() === "image" ? "image" : "text";
}

function getProductDescriptionMode() {
  return normalizeProductDescriptionMode(productDescriptionMode);
}

function getProductDescriptionFocusControl() {
  if (
    isProductDescriptionModeSwitcherAvailable()
    && getProductDescriptionMode() === "image"
  ) {
    return productDescriptionImageList?.querySelector(".product-description-media__add")
      || productDescriptionModeButtons.find(
        (button) => button.dataset.productDescriptionMode === "image",
      )
      || productDescriptionImageInput;
  }

  return productDescriptionTextarea;
}

function setProductDescriptionMode(mode, { focus = false } = {}) {
  const normalizedMode = normalizeProductDescriptionMode(mode);
  productDescriptionMode = normalizedMode;

  if (productDescriptionEditor instanceof HTMLElement) {
    productDescriptionEditor.dataset.descriptionMode = normalizedMode;
  }

  productDescriptionModeButtons.forEach((button) => {
    const isActive = button.dataset.productDescriptionMode === normalizedMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  productDescriptionModePanels.forEach((panel) => {
    const isActive = panel.dataset.productDescriptionPanel === normalizedMode;
    panel.hidden = !isActive;
    panel.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  if (productDescriptionTextarea instanceof HTMLTextAreaElement) {
    const isTextMode = normalizedMode === "text";
    productDescriptionTextarea.disabled = !isTextMode;
    productDescriptionTextarea.required = isTextMode;
  }

  if (productDescriptionUploadNote) {
    productDescriptionUploadNote.hidden = normalizedMode !== "image";
  }

  renderProductDescriptionImageEditor();
  renderAndroidProductPreview();
  syncProductFormSubmitState();

  if (focus) {
    window.requestAnimationFrame(() => {
      const focusTarget = getProductDescriptionFocusControl();
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus({ preventScroll: true });
      }
    });
  }
}

function normalizeProductDescriptionImageUrls(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalizedUrls = [];

  for (const entry of source) {
    const imageUrl = String(entry ?? "").trim();
    if (!imageUrl || seen.has(imageUrl)) {
      continue;
    }

    seen.add(imageUrl);
    normalizedUrls.push(imageUrl);
    if (normalizedUrls.length >= PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT) {
      break;
    }
  }

  return normalizedUrls;
}

function getProductDescriptionImagePreviewUrl(imageIndex) {
  return String(
    descriptionImagePreviewObjectUrls[imageIndex]
      || editingDescriptionImageUrls[imageIndex]
      || "",
  ).trim();
}

function getProductDescriptionImagePreviewUrls() {
  const imageCount = Math.max(
    editingDescriptionImageUrls.length,
    pendingDescriptionImageFiles.length,
    descriptionImagePreviewObjectUrls.length,
  );
  const previewUrls = [];

  for (let imageIndex = 0; imageIndex < imageCount; imageIndex += 1) {
    const previewUrl = getProductDescriptionImagePreviewUrl(imageIndex);
    if (previewUrl) {
      previewUrls.push(previewUrl);
    }
  }

  return previewUrls.slice(0, PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT);
}

function hasProductDescriptionContent() {
  const descriptionText = String(form?.elements?.description?.value ?? "").trim();
  if (isProductDescriptionModeSwitcherAvailable()) {
    return getProductDescriptionMode() === "image"
      ? getProductDescriptionImagePreviewUrls().length > 0
      : Boolean(descriptionText);
  }
  return Boolean(descriptionText || getProductDescriptionImagePreviewUrls().length);
}

function clearProductDescriptionImagePreviewObjectUrls() {
  descriptionImagePreviewObjectUrls.forEach((previewUrl) => {
    if (String(previewUrl || "").startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  });
  descriptionImagePreviewObjectUrls = [];
}

function readProductDescriptionImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    let isSettled = false;

    const finish = (callback) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      URL.revokeObjectURL(previewUrl);
      callback();
    };

    image.addEventListener("load", () => {
      finish(() => resolve({
        width: Number(image.naturalWidth || 0),
        height: Number(image.naturalHeight || 0),
      }));
    }, { once: true });
    image.addEventListener("error", () => {
      finish(() => reject(new Error(`${file.name || "This image"} could not be opened.`)));
    }, { once: true });
    image.src = previewUrl;
  });
}

async function inspectProductDescriptionImageFile(file) {
  const fileName = String(file?.name ?? "").trim();
  const fileType = String(file?.type ?? "").trim().toLowerCase();
  const hasAcceptedMimeType = PRODUCT_DESCRIPTION_IMAGE_ACCEPTED_MIME_TYPES.has(fileType);
  const hasAcceptedExtension = PRODUCT_DESCRIPTION_IMAGE_ACCEPTED_FILE_PATTERN.test(fileName);
  if ((fileType && !hasAcceptedMimeType) || (!fileType && !hasAcceptedExtension)) {
    return {
      accepted: false,
      message: `${fileName || "This file"} must be a PNG, JPG, or JPEG image.`,
      requiresReview: false,
    };
  }

  const validationMessage = getProductImageFileValidationMessage(file);
  if (validationMessage) {
    return { accepted: false, message: validationMessage, requiresReview: false };
  }

  let dimensions;
  try {
    dimensions = await readProductDescriptionImageDimensions(file);
  } catch (error) {
    return {
      accepted: false,
      message: error instanceof Error ? error.message : "Unable to read this description photo.",
      requiresReview: false,
    };
  }

  if (dimensions.width !== dimensions.height) {
    return {
      accepted: false,
      message: `${file.name || "This image"} must be square (1:1). Its size is ${dimensions.width} x ${dimensions.height}.`,
      requiresReview: false,
    };
  }

  if (
    dimensions.width < PRODUCT_DESCRIPTION_IMAGE_MIN_DIMENSION
    || dimensions.height < PRODUCT_DESCRIPTION_IMAGE_MIN_DIMENSION
  ) {
    return {
      accepted: false,
      message: `${file.name || "This image"} must be at least ${PRODUCT_DESCRIPTION_IMAGE_MIN_DIMENSION} x ${PRODUCT_DESCRIPTION_IMAGE_MIN_DIMENSION}.`,
      requiresReview: false,
    };
  }

  return inspectProductImageFile(file);
}

function clearProductDescriptionImageDragState() {
  draggedDescriptionImageIndex = -1;
  productDescriptionImageList
    ?.querySelectorAll(".product-description-media__item")
    .forEach((item) =>
      item.classList.remove(
        "is-dragging",
        "is-drag-over",
        "is-drag-shift-start",
        "is-drag-shift-end",
      ),
    );
  productDescriptionImageList?.style.removeProperty("--product-media-drag-shift");
}

function getProductComposerWorkspaceElement() {
  if (!(productComposerModal instanceof HTMLElement) || productComposerModal.hidden) {
    return null;
  }

  return productComposerModal.querySelector(".product-composer-modal__workspace");
}

let productComposerScrollSnapshot = null;

function captureProductComposerScrollSnapshot() {
  const workspace = getProductComposerWorkspaceElement();
  productComposerScrollSnapshot = {
    workspace:
      workspace instanceof HTMLElement
        ? {
            scrollTop: workspace.scrollTop,
            scrollLeft: workspace.scrollLeft,
          }
        : null,
    descriptionList:
      productDescriptionImageList instanceof HTMLElement
        ? {
            scrollLeft: productDescriptionImageList.scrollLeft,
          }
        : null,
    windowScrollY: window.scrollY,
  };
}

function restoreProductComposerScrollSnapshot() {
  if (!productComposerScrollSnapshot) {
    return;
  }

  const snapshot = productComposerScrollSnapshot;
  const applyRestore = () => {
    const workspace = getProductComposerWorkspaceElement();
    if (workspace instanceof HTMLElement && snapshot.workspace) {
      workspace.scrollTop = snapshot.workspace.scrollTop;
      workspace.scrollLeft = snapshot.workspace.scrollLeft;
    }
    if (productDescriptionImageList instanceof HTMLElement && snapshot.descriptionList) {
      productDescriptionImageList.scrollLeft = snapshot.descriptionList.scrollLeft;
    }
    if (Math.abs(window.scrollY - snapshot.windowScrollY) > 0.5) {
      window.scrollTo({ top: snapshot.windowScrollY, left: 0, behavior: "auto" });
    }
  };

  applyRestore();
  window.requestAnimationFrame(applyRestore);
  window.requestAnimationFrame(() => window.requestAnimationFrame(applyRestore));
}

function lockProductComposerWorkspaceScroll() {
  captureProductComposerScrollSnapshot();
  restoreProductComposerScrollSnapshot();
}

function unlockProductComposerWorkspaceScroll() {
  restoreProductComposerScrollSnapshot();
  productComposerScrollSnapshot = null;
}

function moveProductDescriptionImage(fromIndex, toIndex) {
  const normalizedFromIndex = Number(fromIndex);
  const normalizedToIndex = Number(toIndex);
  const imageCount = getProductDescriptionImagePreviewUrls().length;
  if (
    !Number.isInteger(normalizedFromIndex)
    || !Number.isInteger(normalizedToIndex)
    || normalizedFromIndex < 0
    || normalizedToIndex < 0
    || normalizedFromIndex >= imageCount
    || normalizedToIndex >= imageCount
    || normalizedFromIndex === normalizedToIndex
  ) {
    return false;
  }

  [
    editingDescriptionImageUrls,
    pendingDescriptionImageFiles,
    descriptionImagePreviewObjectUrls,
  ].forEach((entries) => {
    const [movedEntry] = entries.splice(normalizedFromIndex, 1);
    entries.splice(normalizedToIndex, 0, movedEntry ?? (entries === pendingDescriptionImageFiles ? null : ""));
  });

  return true;
}

function getProductDescriptionImageAnimationKey(imageIndex) {
  const previewObjectUrl = String(descriptionImagePreviewObjectUrls[imageIndex] || "").trim();
  const existingImageUrl = String(editingDescriptionImageUrls[imageIndex] || "").trim();
  const pendingFile = pendingDescriptionImageFiles[imageIndex];
  const fileSignature = pendingFile
    ? [pendingFile.name || "", pendingFile.size || 0, pendingFile.lastModified || 0].join(":")
    : "";
  return previewObjectUrl || existingImageUrl || fileSignature || `description-${imageIndex}`;
}

function captureProductDescriptionImageRects() {
  const rects = new Map();
  productDescriptionImageList
    ?.querySelectorAll(".product-description-media__item")
    .forEach((item) => {
      const animationKey = String(item.dataset.descriptionAnimationKey || "").trim();
      if (animationKey) {
        rects.set(animationKey, item.getBoundingClientRect());
      }
    });
  return rects;
}

function animateProductDescriptionImageReorder(previousRects) {
  if (
    !productDescriptionImageList
    || !(previousRects instanceof Map)
    || !previousRects.size
    || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const items = Array.from(
    productDescriptionImageList.querySelectorAll(".product-description-media__item"),
  );
  window.requestAnimationFrame(() => {
    items.forEach((item) => {
      const animationKey = String(item.dataset.descriptionAnimationKey || "").trim();
      const previousRect = previousRects.get(animationKey);
      if (!previousRect) {
        return;
      }

      const nextRect = item.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      item.style.transition = "none";
      item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      item.style.zIndex = "4";
      window.requestAnimationFrame(() => {
        item.style.transition =
          "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease";
        item.style.transform = "translate(0px, 0px)";
        const cleanup = () => {
          item.style.removeProperty("transition");
          item.style.removeProperty("transform");
          item.style.removeProperty("z-index");
          item.removeEventListener("transitionend", cleanup);
        };
        item.addEventListener("transitionend", cleanup);
      });
    });
  });
}

function removeProductDescriptionImage(imageIndex) {
  const normalizedIndex = Number(imageIndex);
  if (
    !Number.isInteger(normalizedIndex)
    || normalizedIndex < 0
    || normalizedIndex >= getProductDescriptionImagePreviewUrls().length
  ) {
    return false;
  }

  const previewUrl = descriptionImagePreviewObjectUrls[normalizedIndex] || "";
  if (previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
  editingDescriptionImageUrls.splice(normalizedIndex, 1);
  pendingDescriptionImageFiles.splice(normalizedIndex, 1);
  descriptionImagePreviewObjectUrls.splice(normalizedIndex, 1);
  renderProductDescriptionImageEditor();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText("Description photo removed. Save the product to apply the change.");
  return true;
}

function syncProductDescriptionCarouselControls() {
  if (!productDescriptionImageList || !productDescriptionImageCarousel) {
    return;
  }

  const maxScrollLeft = Math.max(
    0,
    productDescriptionImageList.scrollWidth - productDescriptionImageList.clientWidth,
  );
  const scrollLeft = Math.max(0, productDescriptionImageList.scrollLeft);
  const hasOverflow = maxScrollLeft > 2;

  productDescriptionImageCarousel.classList.toggle("has-overflow", hasOverflow);
  productDescriptionImageCarouselButtons.forEach((button) => {
    const direction = String(button.dataset.descriptionImageScroll || "").toLowerCase();
    const isPrevious = direction === "previous" || direction === "prev" || direction === "left";
    const isAtEdge = isPrevious ? scrollLeft <= 1 : scrollLeft >= maxScrollLeft - 1;
    button.disabled = !hasOverflow || isAtEdge;
  });
}

function requestProductDescriptionCarouselControlSync() {
  if (
    !productDescriptionImageList
    || !productDescriptionImageCarousel
    || productDescriptionCarouselControlFrame
  ) {
    return;
  }

  productDescriptionCarouselControlFrame = window.requestAnimationFrame(() => {
    productDescriptionCarouselControlFrame = 0;
    syncProductDescriptionCarouselControls();
  });
}

function scrollProductDescriptionCarousel(direction = "next") {
  if (!productDescriptionImageList) {
    return;
  }

  const normalizedDirection = String(direction || "").toLowerCase();
  const isPrevious = ["previous", "prev", "left"].includes(normalizedDirection);
  const scrollDistance = Math.max(86, productDescriptionImageList.clientWidth - 56);

  productDescriptionImageList.scrollBy({
    left: isPrevious ? -scrollDistance : scrollDistance,
    behavior: "smooth",
  });
  requestProductDescriptionCarouselControlSync();
  window.setTimeout(requestProductDescriptionCarouselControlSync, 320);
}

function scrollProductDescriptionCarouselToEnd() {
  if (!productDescriptionImageList) {
    return;
  }

  window.requestAnimationFrame(() => {
    productDescriptionImageList.scrollTo({
      left: productDescriptionImageList.scrollWidth,
      behavior: "smooth",
    });
    requestProductDescriptionCarouselControlSync();
    window.setTimeout(requestProductDescriptionCarouselControlSync, 320);
  });
}

function scrollProductDescriptionCarouselToStart() {
  if (!productDescriptionImageList) {
    return;
  }

  window.requestAnimationFrame(() => {
    productDescriptionImageList.scrollTo({ left: 0, behavior: "smooth" });
    requestProductDescriptionCarouselControlSync();
    window.setTimeout(requestProductDescriptionCarouselControlSync, 320);
  });
}

function restartProductSnackbarTimerBar(timerBar) {
  if (!(timerBar instanceof HTMLElement)) {
    return;
  }

  timerBar.classList.remove("is-running");
  void timerBar.offsetWidth;
  timerBar.classList.add("is-running");
}

function stopProductSnackbarTimerBar(timerBar) {
  if (!(timerBar instanceof HTMLElement)) {
    return;
  }

  timerBar.classList.remove("is-running");
}

function ensureProductEditorSnackbar() {
  if (productEditorSnackbarElements?.root?.isConnected) {
    return productEditorSnackbarElements;
  }

  const root = document.createElement("div");
  root.className = "product-editor-snackbar";
  root.hidden = true;
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");

  const icon = document.createElement("span");
  icon.className = "product-editor-snackbar__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 8v4"></path>
      <path d="M12 16h.01"></path>
    </svg>
  `;

  const copy = document.createElement("span");
  copy.className = "product-editor-snackbar__copy";
  const title = document.createElement("strong");
  const message = document.createElement("span");
  copy.append(title, message);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-editor-snackbar__close";
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.title = "Dismiss";
  closeButton.innerHTML = PRODUCT_PHOTO_REMOVE_ICON_MARKUP;
  closeButton.addEventListener("click", () => hideProductEditorSnackbar());

  const timer = document.createElement("div");
  timer.className = "product-editor-snackbar__timer";
  timer.setAttribute("aria-hidden", "true");
  const timerBar = document.createElement("span");
  timerBar.className = "product-editor-snackbar__timer-bar";
  timer.appendChild(timerBar);

  root.append(icon, copy, closeButton, timer);
  document.body?.appendChild(root);
  productEditorSnackbarElements = { root, title, message, timerBar };
  return productEditorSnackbarElements;
}

function hideProductEditorSnackbar() {
  const snackbar = productEditorSnackbarElements?.root;
  if (!(snackbar instanceof HTMLElement)) {
    return;
  }
  window.clearTimeout(productEditorSnackbarTimer);
  productEditorSnackbarTimer = 0;
  stopProductSnackbarTimerBar(productEditorSnackbarElements?.timerBar);
  snackbar.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!snackbar.classList.contains("is-visible")) {
      snackbar.hidden = true;
    }
  }, 180);
}

function showProductEditorSnackbar(title, message, mode = "warning") {
  const snackbar = ensureProductEditorSnackbar();
  const normalizedTitle = String(title || "Notice").trim() || "Notice";
  const normalizedMessage = String(message || "").replace(/\s+/g, " ").trim();
  snackbar.title.textContent = normalizedTitle;
  snackbar.message.textContent = normalizedMessage;
  snackbar.root.classList.toggle("is-error", mode === "error");
  snackbar.root.classList.toggle("is-success", mode === "success");
  snackbar.root.hidden = false;
  window.clearTimeout(productEditorSnackbarTimer);
  window.requestAnimationFrame(() => {
    snackbar.root.classList.add("is-visible");
    restartProductSnackbarTimerBar(snackbar.timerBar);
  });
  productEditorSnackbarTimer = window.setTimeout(
    hideProductEditorSnackbar,
    PRODUCT_SNACKBAR_AUTO_DISMISS_MS,
  );
}

function hideProductDescriptionUploadSnackbar() {
  if (!productDescriptionUploadSnackbar) {
    return;
  }

  window.clearTimeout(productDescriptionUploadSnackbarTimer);
  productDescriptionUploadSnackbarTimer = 0;
  stopProductSnackbarTimerBar(
    productDescriptionUploadSnackbar?.querySelector(
      "[data-description-upload-snackbar-timer-bar]",
    ),
  );
  productDescriptionUploadSnackbar.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!productDescriptionUploadSnackbar.classList.contains("is-visible")) {
      productDescriptionUploadSnackbar.hidden = true;
    }
  }, 180);
}

function showProductDescriptionUploadSnackbar(messages) {
  if (!productDescriptionUploadSnackbar || !productDescriptionUploadSnackbarMessage) {
    return;
  }

  const sourceMessages = Array.isArray(messages) ? messages : [messages];
  const normalizedMessages = Array.from(new Set(
    sourceMessages
      .map((message) => String(message ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean),
  ));
  if (!normalizedMessages.length) {
    return;
  }

  window.clearTimeout(productDescriptionUploadSnackbarTimer);
  const snackbarMessage = normalizedMessages.join(" | ");
  productDescriptionUploadSnackbarMessage.textContent = snackbarMessage;
  productDescriptionUploadSnackbarMessage.title = snackbarMessage;
  if (productDescriptionUploadSnackbar.parentElement !== document.body) {
    document.body.appendChild(productDescriptionUploadSnackbar);
  }
  productDescriptionUploadSnackbar.hidden = false;
  const timerBar = productDescriptionUploadSnackbar.querySelector(
    "[data-description-upload-snackbar-timer-bar]",
  );
  window.requestAnimationFrame(() => {
    productDescriptionUploadSnackbar.classList.add("is-visible");
    restartProductSnackbarTimerBar(timerBar);
  });
  productDescriptionUploadSnackbarTimer = window.setTimeout(
    hideProductDescriptionUploadSnackbar,
    PRODUCT_SNACKBAR_AUTO_DISMISS_MS,
  );
}

function getEditableProductDescriptionPhotoGalleryItems() {
  return getProductDescriptionImagePreviewUrls()
    .map((previewUrl, imageIndex) => {
      const url = String(previewUrl || "").trim();
      if (!url) {
        return null;
      }

      return {
        type: "image",
        url,
        label: imageIndex === 0 ? "Description photo" : `Description photo ${imageIndex + 1}`,
        imageIndex,
      };
    })
    .filter(Boolean);
}

function openEditableProductDescriptionPhotoViewer(imageIndex) {
  const galleryItems = getEditableProductDescriptionPhotoGalleryItems();
  if (!galleryItems.length) {
    showProductEditorSnackbar(
      "Image unavailable",
      "This description photo cannot be opened.",
      "error",
    );
    return;
  }

  const normalizedIndex = Number(imageIndex);
  const startIndex = Math.max(
    0,
    galleryItems.findIndex((item) => item.imageIndex === normalizedIndex),
  );
  const currentItem = galleryItems[startIndex] || galleryItems[0];
  captureProductComposerScrollSnapshot();
  openPreviewMediaGallery(currentItem.label, galleryItems, startIndex, {
    showActions: false,
    showModelButton: false,
    showCropGuide: false,
    useItemLabelAsTitle: true,
  });
  restoreProductComposerScrollSnapshot();
}

function renderProductDescriptionImageEditor() {
  if (!productDescriptionImageList) {
    return;
  }

  const previewUrls = getProductDescriptionImagePreviewUrls();
  productDescriptionImageList.replaceChildren();

  previewUrls.forEach((previewUrl, imageIndex) => {
    const item = document.createElement("article");
    item.className = "product-description-media__item";
    item.dataset.descriptionImageIndex = String(imageIndex);
    item.dataset.descriptionAnimationKey = getProductDescriptionImageAnimationKey(imageIndex);
    item.draggable = previewUrls.length > 1 && !isDescriptionImageProcessing;
    item.classList.toggle("is-draggable", item.draggable);
    item.setAttribute("aria-label", `Description photo ${imageIndex + 1}`);

    const stage = document.createElement("div");
    stage.className = "product-description-media__preview";
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = `Product description photo ${imageIndex + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    stage.appendChild(image);
    stage.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
    });
    stage.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (suppressDescriptionImageClick) {
        return;
      }
      if (document.activeElement === productDescriptionImageList) {
        productDescriptionImageList.blur();
      }
      openEditableProductDescriptionPhotoViewer(imageIndex);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className =
      "product-description-media__action product-description-media__remove";
    removeButton.setAttribute("aria-label", `Remove description photo ${imageIndex + 1}`);
    removeButton.title = `Remove description photo ${imageIndex + 1}`;
    removeButton.innerHTML = PRODUCT_PHOTO_REMOVE_ICON_MARKUP;
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeProductDescriptionImage(imageIndex);
    });

    let homeControl;
    if (imageIndex === 0) {
      homeControl = document.createElement("span");
      homeControl.className = "product-description-media__home-badge";
      homeControl.setAttribute("aria-label", "First description photo");
      homeControl.title = "First description photo";
      homeControl.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
    } else {
      homeControl = document.createElement("button");
      homeControl.type = "button";
      homeControl.className =
        "product-description-media__action product-description-media__set-home";
      homeControl.setAttribute(
        "aria-label",
        `Set description photo ${imageIndex + 1} as first photo`,
      );
      homeControl.title = "Set as first description photo";
      homeControl.disabled = isDescriptionImageProcessing;
      homeControl.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
      homeControl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const previousRects = captureProductDescriptionImageRects();
        if (!moveProductDescriptionImage(imageIndex, 0)) {
          return;
        }
        renderProductDescriptionImageEditor();
        animateProductDescriptionImageReorder(previousRects);
        productDescriptionImageList
          ?.querySelector(".product-description-media__home-badge")
          ?.classList.add("is-home-updated");
        renderAndroidProductPreview();
        syncProductFormSubmitState();
        scrollProductDescriptionCarouselToStart();
        setStatus(editingProductId ? "Editing" : "Adding", "default");
        setHelperText("First description photo updated. Save the listing to apply the change.");
      });
    }

    item.addEventListener("dragstart", (event) => {
      draggedDescriptionImageIndex = imageIndex;
      suppressDescriptionImageClick = true;
      item.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(imageIndex));
      }
    });
    item.addEventListener("dragover", (event) => {
      if (draggedDescriptionImageIndex < 0) {
        return;
      }
      event.preventDefault();
      updateProductMediaDragPreview(
        productDescriptionImageList,
        ".product-description-media__item",
        draggedDescriptionImageIndex,
        imageIndex,
        "descriptionImageIndex",
      );
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });
    item.addEventListener("dragleave", (event) => {
      if (!(event.relatedTarget instanceof Node) || !item.contains(event.relatedTarget)) {
        item.classList.remove("is-drag-over");
      }
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const fromIndex = draggedDescriptionImageIndex;
      const previousRects = captureProductDescriptionImageRects();
      clearProductDescriptionImageDragState();
      if (!moveProductDescriptionImage(fromIndex, imageIndex)) {
        return;
      }
      renderProductDescriptionImageEditor();
      animateProductDescriptionImageReorder(previousRects);
      renderAndroidProductPreview();
      syncProductFormSubmitState();
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("Description photos reordered. Save the product to apply the change.");
    });
    item.addEventListener("dragend", () => {
      clearProductDescriptionImageDragState();
      window.setTimeout(() => {
        suppressDescriptionImageClick = false;
      }, 0);
    });

    item.append(stage, homeControl, removeButton);
    productDescriptionImageList.appendChild(item);
  });

  if (previewUrls.length < PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "product-description-media__add product-media-dropzone";
    addButton.disabled = isDescriptionImageProcessing;
    addButton.setAttribute("aria-label", "Add square PNG, JPG, or JPEG description photos");
    addButton.innerHTML = getProductMediaDropzoneMarkup({
      title: "Drag &amp; drop photos here",
      isProcessing: isDescriptionImageProcessing,
    });
    addButton.addEventListener("click", () => {
      if (!productDescriptionImageInput || isDescriptionImageProcessing) {
        return;
      }
      productDescriptionImageInput.value = "";
      productDescriptionImageInput.click();
    });
    productDescriptionImageList.appendChild(addButton);
  }

  if (productDescriptionImageInput instanceof HTMLInputElement) {
    productDescriptionImageInput.disabled =
      isDescriptionImageProcessing
      || previewUrls.length >= PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT
      || (
        isProductDescriptionModeSwitcherAvailable()
        && getProductDescriptionMode() !== "image"
      );
  }
  if (productDescriptionImageCount) {
    productDescriptionImageCount.textContent = `${previewUrls.length} / ${PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT}`;
  }
  requestProductDescriptionCarouselControlSync();
}

async function appendProductDescriptionImageFiles(files) {
  const selectedFiles = Array.from(files || []).filter((file) => file instanceof File);
  if (
    !selectedFiles.length
  ) {
    return 0;
  }
  if (isDescriptionImageProcessing) {
    const message = "Please wait for the current description photos to finish checking.";
    setHelperText(message);
    showProductDescriptionUploadSnackbar(message);
    return 0;
  }
  if (
    isProductDescriptionModeSwitcherAvailable()
    && getProductDescriptionMode() !== "image"
  ) {
    const message = "Switch the Description field to Photos before uploading an image.";
    setHelperText(message);
    showProductDescriptionUploadSnackbar(message);
    return 0;
  }

  const availableSlots = Math.max(
    0,
    PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT - getProductDescriptionImagePreviewUrls().length,
  );
  if (!availableSlots) {
    const message = `You can upload up to ${PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT} description photos.`;
    setHelperText(message);
    showProductDescriptionUploadSnackbar(message);
    return 0;
  }

  hideProductDescriptionUploadSnackbar();
  isDescriptionImageProcessing = true;
  renderProductDescriptionImageEditor();
  setHelperText(selectedFiles.length === 1 ? "Checking description photo..." : "Checking description photos...");

  let acceptedImageCount = 0;
  let requiresReview = false;
  const rejectedMessages = [];

  try {
    for (const [fileIndex, file] of selectedFiles.entries()) {
      if (acceptedImageCount >= availableSlots) {
        const skippedCount = selectedFiles.length - fileIndex;
        rejectedMessages.push(
          `${skippedCount} ${skippedCount === 1 ? "photo was" : "photos were"} skipped because the ${PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT}-photo limit was reached.`,
        );
        break;
      }

      const inspection = await inspectProductDescriptionImageFile(file);
      if (!inspection.accepted) {
        if (inspection.message) {
          rejectedMessages.push(inspection.message);
        }
        continue;
      }

      editingDescriptionImageUrls.push("");
      pendingDescriptionImageFiles.push(file);
      descriptionImagePreviewObjectUrls.push(URL.createObjectURL(file));
      acceptedImageCount += 1;
      requiresReview = requiresReview || inspection.requiresReview;
      // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
    }
  } finally {
    isDescriptionImageProcessing = false;
    renderProductDescriptionImageEditor();
    renderAndroidProductPreview();
    syncProductFormSubmitState();
  }

  if (acceptedImageCount) {
    const readyMessage = `${acceptedImageCount} ${acceptedImageCount === 1 ? "description photo is" : "description photos are"} ready to upload.`;
    const reviewMessage = requiresReview ? " Photos requiring review will be checked by Super Admin." : "";
    const rejectedMessage = rejectedMessages.length ? ` ${rejectedMessages[0]}` : "";
    setStatus(editingProductId ? "Editing" : "Adding", "default");
    setHelperText(`${readyMessage}${reviewMessage}${rejectedMessage}`);
    scrollProductDescriptionCarouselToEnd();
  } else if (rejectedMessages.length) {
    setHelperText(rejectedMessages[0]);
  }
  if (rejectedMessages.length) {
    showProductDescriptionUploadSnackbar(rejectedMessages);
  }

  return acceptedImageCount;
}

async function appendProductImageFiles(files) {
  const selectedFiles = Array.from(files || []).filter((file) => file instanceof File);
  if (!selectedFiles.length) {
    return 0;
  }

  if (isProductImageProcessing()) {
    setHelperText("Please wait for the current image to finish processing.");
    return 0;
  }

  compactEditableImageState();
  const processingSessionId = productImageProcessingSessionId;
  let populatedImageCount = getPopulatedProductImageCount();
  let acceptedImageCount = 0;
  let firstAcceptedSlotIndex = -1;
  let latestAcceptedSlotIndex = -1;
  let requiresReview = false;
  let blockedImageCount = 0;
  const rejectedMessages = [];

  setHelperText(
    selectedFiles.length === 1 ? "Checking selected image..." : "Checking selected images...",
  );

  for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
    if (populatedImageCount >= PRODUCT_IMAGE_MAX_COUNT) {
      const remainingFileCount = selectedFiles.length - fileIndex;
      rejectedMessages.push(
        `${remainingFileCount} ${remainingFileCount === 1 ? "image was" : "images were"} skipped because the 10-image limit was reached.`,
      );
      break;
    }

    const nextImageFile = selectedFiles[fileIndex];
    const validationMessage = getProductImageFileValidationMessage(nextImageFile);
    if (validationMessage) {
      rejectedMessages.push(validationMessage);
      continue;
    }

    let targetSlotIndex = editingImageUrls.findIndex(
      (_existingImageUrl, slotIndex) => !isProductImageSlotPopulated(slotIndex),
    );
    if (targetSlotIndex < 0) {
      targetSlotIndex = editingImageUrls.length;
      editingImageUrls.push("");
      pendingImageFiles.push(null);
      imagePreviewObjectUrls.push("");
      productPhotoCropSourceUrls.push("");
      productPhotoCropStates.push(null);
    }

    revokePreviewObjectUrl(targetSlotIndex);
    editingImageUrls[targetSlotIndex] = "";
    pendingImageFiles[targetSlotIndex] = nextImageFile;
    imagePreviewObjectUrls[targetSlotIndex] = URL.createObjectURL(nextImageFile);
    processingProductImageSlotIndexes.add(targetSlotIndex);
    populatedImageCount += 1;
    renderProductImageInputs();
    scrollProductPhotoCarouselToSlot(targetSlotIndex);
    setHelperText(
      `Processing ${nextImageFile.name || `image ${fileIndex + 1}`}...`,
    );

    const [inspection] = await Promise.all([
      inspectProductImageFile(nextImageFile),
      waitForProductImageLoadingWheel(),
    ]);
    if (processingSessionId !== productImageProcessingSessionId) {
      processingProductImageSlotIndexes.clear();
      renderProductImageInputs();
      return acceptedImageCount;
    }

    processingProductImageSlotIndexes.delete(targetSlotIndex);
    if (!inspection.accepted) {
      blockedImageCount += inspection.blocked ? 1 : 0;
      if (inspection.message) {
        rejectedMessages.push(inspection.message);
      }
      revokePreviewObjectUrl(targetSlotIndex);
      editingImageUrls[targetSlotIndex] = "";
      pendingImageFiles[targetSlotIndex] = null;
      populatedImageCount = Math.max(0, populatedImageCount - 1);
      compactEditableImageState();
      renderProductImageInputs();
      continue;
    }

    acceptedImageCount += 1;
    requiresReview = requiresReview || inspection.requiresReview;
    if (firstAcceptedSlotIndex < 0) {
      firstAcceptedSlotIndex = targetSlotIndex;
    }
    latestAcceptedSlotIndex = targetSlotIndex;
    renderProductImageInputs();
    scrollProductPhotoCarouselToSlot(targetSlotIndex);
  }

  processingProductImageSlotIndexes.clear();
  compactEditableImageState();
  renderProductImageInputs();
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
  if (firstAcceptedSlotIndex >= 0) {
    focusPreviewDetailsImageSlot(firstAcceptedSlotIndex);
  }
  if (latestAcceptedSlotIndex >= 0) {
    scrollProductPhotoCarouselToSlot(latestAcceptedSlotIndex);
  }

  if (acceptedImageCount > 0) {
    const acceptedMessage = `${acceptedImageCount} ${acceptedImageCount === 1 ? "image is" : "images are"} ready to upload.`;
    const reviewMessage = requiresReview
      ? " Selected images that require review will be checked by Super Admin."
      : "";
    const rejectedMessage = rejectedMessages.length ? ` ${rejectedMessages[0]}` : "";
    setHelperText(`${acceptedMessage}${reviewMessage}${rejectedMessage}`);
    if (!blockedImageCount) {
      setStatus(editingProductId ? "Editing" : "Adding", "default");
    }
  } else if (rejectedMessages.length) {
    setHelperText(rejectedMessages[0]);
  }

  return acceptedImageCount;
}

async function replaceProductImageFileAtSlot(slotIndex, file) {
  const normalizedSlotIndex = Number(slotIndex);
  if (
    !Number.isInteger(normalizedSlotIndex) ||
    normalizedSlotIndex < 0 ||
    normalizedSlotIndex >= editingImageUrls.length
  ) {
    return false;
  }

  if (isProductImageProcessing()) {
    setHelperText("Please wait for the current image to finish processing.");
    return false;
  }

  const validationMessage = getProductImageFileValidationMessage(file);
  if (validationMessage) {
    setHelperText(validationMessage);
    return false;
  }

  const processingSessionId = productImageProcessingSessionId;
  const previousExistingImageUrl = editingImageUrls[normalizedSlotIndex] || "";
  const previousPendingImageFile = pendingImageFiles[normalizedSlotIndex] ?? null;
  const previousPreviewObjectUrl = imagePreviewObjectUrls[normalizedSlotIndex] || "";
  const nextPreviewObjectUrl = URL.createObjectURL(file);
  pendingImageFiles[normalizedSlotIndex] = file;
  imagePreviewObjectUrls[normalizedSlotIndex] = nextPreviewObjectUrl;
  processingProductImageSlotIndexes.add(normalizedSlotIndex);
  renderProductImageInputs();
  setHelperText(`Processing ${file.name || "replacement image"}...`);

  const [inspection] = await Promise.all([
    inspectProductImageFile(file),
    waitForProductImageLoadingWheel(),
  ]);
  if (processingSessionId !== productImageProcessingSessionId) {
    processingProductImageSlotIndexes.clear();
    renderProductImageInputs();
    return false;
  }

  processingProductImageSlotIndexes.delete(normalizedSlotIndex);
  if (!inspection.accepted) {
    URL.revokeObjectURL(nextPreviewObjectUrl);
    pendingImageFiles[normalizedSlotIndex] = previousPendingImageFile;
    imagePreviewObjectUrls[normalizedSlotIndex] = previousPreviewObjectUrl;
    renderProductImageInputs();
    setHelperText(inspection.message || "This image cannot be uploaded.");
    return false;
  }

  if (previousPreviewObjectUrl && previousPreviewObjectUrl !== nextPreviewObjectUrl) {
    URL.revokeObjectURL(previousPreviewObjectUrl);
  }
  invalidateProductImageCropState(normalizedSlotIndex, {
    sourceUrls: [previousExistingImageUrl, previousPreviewObjectUrl],
  });
  clearProductPhotoCropSourceAt(normalizedSlotIndex);
  focusPreviewDetailsImageSlot(normalizedSlotIndex);
  renderProductImageInputs();
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText(
    inspection.requiresReview
      ? "This product image will be reviewed by Super Admin before listing."
      : "The replacement image is ready to upload.",
  );
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
  return true;
}

function removeEditableProductImageSlot(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (
    !Number.isInteger(normalizedSlotIndex) ||
    normalizedSlotIndex < 0 ||
    normalizedSlotIndex >= editingImageUrls.length ||
    !isProductImageSlotPopulated(normalizedSlotIndex)
  ) {
    return false;
  }

  const removedExistingImageUrl = editingImageUrls[normalizedSlotIndex] || "";
  const removedPreviewObjectUrl = imagePreviewObjectUrls[normalizedSlotIndex] || "";
  revokePreviewObjectUrl(normalizedSlotIndex);
  clearProductPhotoCropSourceAt(normalizedSlotIndex);
  editingImageUrls.splice(normalizedSlotIndex, 1);
  pendingImageFiles.splice(normalizedSlotIndex, 1);
  imagePreviewObjectUrls.splice(normalizedSlotIndex, 1);
  productPhotoCropSourceUrls.splice(normalizedSlotIndex, 1);
  productPhotoCropStates.splice(normalizedSlotIndex, 1);

  if (!editingImageUrls.length) {
    editingImageUrls = [""];
    pendingImageFiles = [null];
    imagePreviewObjectUrls = [""];
    productPhotoCropSourceUrls = [""];
    productPhotoCropStates = [null];
  }

  selectedMainImageSlot = 0;
  invalidateProductImageCropState(normalizedSlotIndex, {
    sourceUrls: [removedExistingImageUrl, removedPreviewObjectUrl],
    coverChanged: normalizedSlotIndex === 0,
  });
  preservePreviewDetailsMediaPosition();
  renderProductImageInputs();
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText("Image removed. The first remaining image is the cover.");
  return true;
}

function getPendingProductVideoUploadTask(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return null;
  }

  return pendingVideoUploadTasks[normalizedSlotIndex] ?? null;
}

function cancelPendingProductVideoUploadTask(task) {
  if (!task || typeof task !== "object") {
    return;
  }

  task.cancelled = true;
  if (task.status === "uploading" && task.xhr instanceof XMLHttpRequest) {
    try {
      task.xhr.abort();
    } catch (_) {
      // The request may already have completed between the state check and abort.
    }
  }
}

function cancelAllPendingProductVideoUploads() {
  pendingVideoUploadTasks.forEach(cancelPendingProductVideoUploadTask);
  pendingVideoUploadTasks = [];
}

function updateProductVideoUploadTaskUi(task) {
  if (!task || !productVideoInputList) {
    return;
  }

  const slotIndex = pendingVideoUploadTasks.indexOf(task);
  if (slotIndex < 0) {
    return;
  }

  const row = productVideoInputList.querySelector(
    `.product-video-upload-card[data-slot-index="${slotIndex}"]`,
  );
  if (!(row instanceof HTMLElement)) {
    return;
  }

  const uploadStatus = String(task.status || "").trim().toLowerCase();
  const progressValue = Math.max(0, Math.min(100, Number(task.progress) || 0));
  row.classList.toggle("is-uploading", uploadStatus === "uploading");
  row.classList.toggle("is-upload-complete", uploadStatus === "complete");
  row.classList.toggle("is-upload-error", uploadStatus === "error");

  const preview = row.querySelector(".product-video-upload-card__preview");
  if (preview instanceof HTMLElement) {
    preview.dataset.uploadStatus = uploadStatus;
  }

  const progressFill = row.querySelector(".product-video-upload-card__progress-fill");
  if (progressFill instanceof HTMLElement) {
    progressFill.style.width = `${progressValue}%`;
  }

  const progressLabel = row.querySelector(".product-video-upload-card__progress-label");
  if (progressLabel) {
    progressLabel.textContent = uploadStatus === "error"
      ? "Failed"
      : `${Math.round(progressValue)}%`;
  }

  const uploadState = row.querySelector("[data-product-video-upload-state]");
  if (uploadState instanceof HTMLElement) {
    const shouldShowUploadState = uploadStatus === "uploading" || uploadStatus === "error";
    uploadState.hidden = !shouldShowUploadState;
    uploadState.classList.toggle("is-error", uploadStatus === "error");

    const uploadStateCopy = uploadState.querySelector("[data-product-video-upload-state-copy]");
    if (uploadStateCopy) {
      uploadStateCopy.textContent = uploadStatus === "error" ? "Upload failed" : "Uploading";
    }

    const uploadDots = uploadState.querySelector(".product-video-upload-card__upload-dots");
    if (uploadDots instanceof HTMLElement) {
      uploadDots.hidden = uploadStatus !== "uploading";
    }
  }
}

function startPendingProductVideoUpload(slotIndex, file, { force = false } = {}) {
  const normalizedSlotIndex = Number(slotIndex);
  if (
    !Number.isInteger(normalizedSlotIndex)
    || normalizedSlotIndex < 0
    || !(file instanceof File)
  ) {
    return null;
  }

  const currentTask = getPendingProductVideoUploadTask(normalizedSlotIndex);
  if (
    !force
    && currentTask?.file === file
    && (currentTask.status === "uploading" || currentTask.status === "complete")
  ) {
    return currentTask;
  }

  cancelPendingProductVideoUploadTask(currentTask);
  const task = {
    file,
    xhr: null,
    promise: null,
    status: "uploading",
    progress: 0,
    url: "",
    error: null,
    cancelled: false,
  };
  pendingVideoUploadTasks[normalizedSlotIndex] = task;

  task.promise = uploadMediaFileWithProgress(file, {
    onRequest: (xhr) => {
      task.xhr = xhr;
    },
    onProgress: (progress) => {
      if (task.cancelled) {
        return;
      }
      task.progress = Math.max(0, Math.min(100, Number(progress) || 0));
      updateProductVideoUploadTaskUi(task);
    },
  })
    .then((uploadedUrl) => {
      if (task.cancelled) {
        return "";
      }
      if (!uploadedUrl) {
        throw new Error("The video upload completed without a saved media URL.");
      }

      task.status = "complete";
      task.progress = 100;
      task.url = uploadedUrl;
      task.error = null;
      updateProductVideoUploadTaskUi(task);
      return uploadedUrl;
    })
    .catch((error) => {
      if (task.cancelled) {
        return "";
      }

      task.status = "error";
      task.error = error instanceof Error ? error : new Error("Unable to upload product video.");
      updateProductVideoUploadTaskUi(task);
      showProductVideoUploadRejectedSnackbar(
        task.error.message || `${file.name || "This video"} could not be uploaded.`,
      );
      return "";
    });

  updateProductVideoUploadTaskUi(task);
  return task;
}

async function resolvePendingProductVideoUpload(slotIndex, file) {
  let task = getPendingProductVideoUploadTask(slotIndex);
  if (
    !task
    || task.file !== file
    || task.status === "error"
    || task.cancelled
  ) {
    task = startPendingProductVideoUpload(slotIndex, file, { force: true });
  }

  if (!task) {
    throw new Error(`Unable to prepare product video ${Number(slotIndex) + 1} for upload.`);
  }

  const uploadedUrl = task.url || await task.promise;
  if (!uploadedUrl) {
    throw task.error || new Error(`Unable to upload product video ${Number(slotIndex) + 1}.`);
  }

  return uploadedUrl;
}

function requestRemoveEditableProductVideoSlot(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (
    !Number.isInteger(normalizedSlotIndex)
    || normalizedSlotIndex < 0
    || normalizedSlotIndex >= editingVideoUrls.length
  ) {
    return false;
  }

  openProductDeleteConfirmationModal(`product video ${normalizedSlotIndex + 1}`, () => {
    cancelPendingProductVideoUploadTask(pendingVideoUploadTasks[normalizedSlotIndex]);
    revokeVideoPreviewObjectUrl(normalizedSlotIndex);
    revokeVideoThumbnailPreviewObjectUrl(normalizedSlotIndex);
    editingVideoUrls.splice(normalizedSlotIndex, 1);
    editingVideoThumbnailUrls.splice(normalizedSlotIndex, 1);
    pendingVideoFiles.splice(normalizedSlotIndex, 1);
    pendingVideoUploadTasks.splice(normalizedSlotIndex, 1);
    pendingVideoThumbnailFiles.splice(normalizedSlotIndex, 1);
    videoPreviewObjectUrls.splice(normalizedSlotIndex, 1);
    videoThumbnailPreviewObjectUrls.splice(normalizedSlotIndex, 1);
    productVideoCropSourceUrls.splice(normalizedSlotIndex, 1);
    productVideoCropStates.splice(normalizedSlotIndex, 1);

    renderProductVideoInputs();
    openProductDeleteSuccessFeedbackModal(
      `Product video ${normalizedSlotIndex + 1} deleted successfully.`,
    );
  });
  return true;
}

function setPrimaryProductVideoSlot(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex <= 0) {
    return false;
  }

  const previousPreviewRects = captureProductVideoPreviewRects();
  if (!moveEditableVideoSlot(normalizedSlotIndex, 0)) {
    return false;
  }

  renderProductVideoInputs();
  animateProductVideoPreviewReorder(previousPreviewRects);
  scrollProductVideoCarouselToStart();
  setHelperText("The selected video is now the primary video.");
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  return true;
}

function syncEditableVideoState() {
  editingVideoUrls = normalizeEditableVideoSlots(editingVideoUrls);
  editingVideoThumbnailUrls = normalizeEditableVideoThumbnailSlots(
    editingVideoThumbnailUrls,
    editingVideoUrls.length,
  );

  while (pendingVideoFiles.length < editingVideoUrls.length) {
    pendingVideoFiles.push(null);
  }

  while (pendingVideoUploadTasks.length < editingVideoUrls.length) {
    pendingVideoUploadTasks.push(null);
  }

  while (videoPreviewObjectUrls.length < editingVideoUrls.length) {
    videoPreviewObjectUrls.push("");
  }

  while (pendingVideoThumbnailFiles.length < editingVideoUrls.length) {
    pendingVideoThumbnailFiles.push(null);
  }

  while (videoThumbnailPreviewObjectUrls.length < editingVideoUrls.length) {
    videoThumbnailPreviewObjectUrls.push("");
  }

  while (productVideoCropSourceUrls.length < editingVideoUrls.length) {
    productVideoCropSourceUrls.push("");
  }

  while (productVideoCropStates.length < editingVideoUrls.length) {
    productVideoCropStates.push(null);
  }

  while (pendingVideoFiles.length > editingVideoUrls.length) {
    pendingVideoFiles.pop();
  }

  while (pendingVideoUploadTasks.length > editingVideoUrls.length) {
    cancelPendingProductVideoUploadTask(pendingVideoUploadTasks.pop());
  }

  while (videoPreviewObjectUrls.length > editingVideoUrls.length) {
    revokeVideoPreviewObjectUrl(videoPreviewObjectUrls.length - 1);
    videoPreviewObjectUrls.pop();
  }

  while (pendingVideoThumbnailFiles.length > editingVideoUrls.length) {
    pendingVideoThumbnailFiles.pop();
  }

  while (videoThumbnailPreviewObjectUrls.length > editingVideoUrls.length) {
    revokeVideoThumbnailPreviewObjectUrl(videoThumbnailPreviewObjectUrls.length - 1);
    videoThumbnailPreviewObjectUrls.pop();
  }

  while (productVideoCropSourceUrls.length > editingVideoUrls.length) {
    productVideoCropSourceUrls.pop();
  }

  while (productVideoCropStates.length > editingVideoUrls.length) {
    productVideoCropStates.pop();
  }
}

function focusProductImageSlotPicker(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return false;
  }

  const slotPicker = productImageInputList?.querySelector(
    `input[data-product-image-file="true"][data-slot-index="${normalizedSlotIndex}"]`,
  );
  if (!(slotPicker instanceof HTMLInputElement)) {
    return false;
  }

  slotPicker.value = "";
  slotPicker.click();
  return true;
}

function focusProductVideoSlotPicker(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return false;
  }

  const slotPicker = productVideoInputList?.querySelector(
    `input[data-product-video-file="true"][data-slot-index="${normalizedSlotIndex}"]`,
  );
  if (!(slotPicker instanceof HTMLInputElement)) {
    return false;
  }

  slotPicker.value = "";
  slotPicker.click();
  return true;
}

function focusProductVideoThumbnailSlotPicker(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return false;
  }

  const slotPicker = productVideoInputList?.querySelector(
    `input[data-product-video-thumbnail-file="true"][data-slot-index="${normalizedSlotIndex}"]`,
  );
  if (!(slotPicker instanceof HTMLInputElement)) {
    return false;
  }

  slotPicker.value = "";
  slotPicker.click();
  return true;
}

function handleQuickAddProductImageSelection() {
  if (!quickAddProductImageInput) {
    return;
  }

  const selectedImageFiles = Array.from(quickAddProductImageInput.files || []);
  quickAddProductImageInput.value = "";
  if (!selectedImageFiles.length) {
    return;
  }

  void appendProductImageFiles(selectedImageFiles);
}

function getQuickAddProductImageInput() {
  if (quickAddProductImageInput) {
    return quickAddProductImageInput;
  }

  quickAddProductImageInput = productPhotoFileInput;
  if (!quickAddProductImageInput) {
    quickAddProductImageInput = document.createElement("input");
    quickAddProductImageInput.type = "file";
    quickAddProductImageInput.accept = "image/jpeg,image/png,image/webp";
    quickAddProductImageInput.multiple = true;
    quickAddProductImageInput.hidden = true;
    quickAddProductImageInput.tabIndex = -1;
    quickAddProductImageInput.setAttribute("aria-hidden", "true");
    document.body?.appendChild(quickAddProductImageInput);
  }

  quickAddProductImageInput.addEventListener("change", handleQuickAddProductImageSelection);
  return quickAddProductImageInput;
}

function showProductVideoUploadRejectedSnackbar(messages) {
  const normalizedMessages = Array.from(
    new Set(
      (Array.isArray(messages) ? messages : [messages])
        .map((message) => String(message ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  );
  if (!normalizedMessages.length) {
    return;
  }

  const extraCount = normalizedMessages.length - 1;
  showProductEditorSnackbar(
    extraCount > 0 ? "Some videos could not be uploaded" : "Video could not be uploaded",
    extraCount > 0
      ? `${normalizedMessages[0]} ${extraCount} more ${extraCount === 1 ? "file was" : "files were"} also skipped.`
      : normalizedMessages[0],
    "error",
  );
}

function getProductVideoFileValidationError(file) {
  if (!file) {
    return "Select a valid product video.";
  }

  const normalizedMimeType = String(file.type || "").trim().toLowerCase();
  const hasAcceptedMimeType = PRODUCT_VIDEO_ACCEPTED_MIME_TYPES.has(normalizedMimeType);
  const hasAcceptedExtension = PRODUCT_VIDEO_ACCEPTED_FILE_PATTERN.test(
    String(file.name || "").trim(),
  );

  if (!hasAcceptedMimeType && !hasAcceptedExtension) {
    return `${file.name || "This file"} is not an MP4, MOV, or WebM video.`;
  }

  if (!hasAcceptedExtension) {
    return `${file.name || "This file"} must use an .mp4, .mov, or .webm filename.`;
  }

  if (Number(file.size || 0) > PRODUCT_VIDEO_MAX_FILE_SIZE) {
    return `${file.name || "This video"} is larger than 100MB.`;
  }

  return "";
}

function appendProductVideoFiles(files = []) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) {
    return false;
  }

  syncEditableVideoState();
  if (getPopulatedProductVideoCount() >= PRODUCT_VIDEO_MAX_COUNT) {
    const limitMessage = "You can upload only 1 product video.";
    setHelperText(limitMessage);
    showProductVideoUploadRejectedSnackbar(limitMessage);
    return false;
  }

  const acceptedFiles = [];
  const rejectedMessages = [];

  selectedFiles.slice(0, 1).forEach((file) => {
    const validationError = getProductVideoFileValidationError(file);
    if (validationError) {
      rejectedMessages.push(validationError);
      return;
    }

    acceptedFiles.push(file);
    const slotIndex = editingVideoUrls.length;
    editingVideoUrls.push("");
    editingVideoThumbnailUrls.push("");
    pendingVideoFiles.push(file);
    pendingVideoUploadTasks.push(null);
    pendingVideoThumbnailFiles.push(null);
    videoPreviewObjectUrls.push(URL.createObjectURL(file));
    videoThumbnailPreviewObjectUrls.push("");
    productVideoCropSourceUrls.push("");
    productVideoCropStates.push(null);
    startPendingProductVideoUpload(slotIndex, file);
  });

  if (selectedFiles.length > 1 && !rejectedMessages.length) {
    rejectedMessages.push("Only 1 product video can be uploaded. Extra files were skipped.");
  }

  if (acceptedFiles.length) {
    renderProductVideoInputs();
    scrollProductVideoCarouselToStart();
    setStatus(editingProductId ? "Editing" : "Adding", "default");
    // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
  }

  if (rejectedMessages.length) {
    setHelperText(rejectedMessages[0]);
    showProductVideoUploadRejectedSnackbar(rejectedMessages);
  } else if (acceptedFiles.length === 1) {
    setHelperText("The selected video is uploading now so Publish will finish faster.");
  }

  return acceptedFiles.length > 0;
}

function handleQuickAddProductVideoSelection() {
  if (!quickAddProductVideoInput) {
    return;
  }

  const selectedVideoFiles = Array.from(quickAddProductVideoInput.files || []);
  quickAddProductVideoInput.value = "";
  if (!selectedVideoFiles.length) {
    return;
  }

  appendProductVideoFiles(selectedVideoFiles);
}

function getQuickAddProductVideoInput() {
  if (quickAddProductVideoInput) {
    return quickAddProductVideoInput;
  }

  quickAddProductVideoInput = productVideoFileInput;
  if (!quickAddProductVideoInput) {
    quickAddProductVideoInput = document.createElement("input");
    quickAddProductVideoInput.type = "file";
    quickAddProductVideoInput.accept = ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm";
    quickAddProductVideoInput.hidden = true;
    quickAddProductVideoInput.tabIndex = -1;
    quickAddProductVideoInput.setAttribute("aria-hidden", "true");
    document.body?.appendChild(quickAddProductVideoInput);
  }

  quickAddProductVideoInput.addEventListener("change", handleQuickAddProductVideoSelection);
  return quickAddProductVideoInput;
}

function getImageSlotPreviewUrl(slotIndex, existingImageUrl = "") {
  return imagePreviewObjectUrls[slotIndex] || String(existingImageUrl ?? "").trim();
}

function getVideoSlotPreviewUrl(slotIndex, existingVideoUrl = "") {
  return videoPreviewObjectUrls[slotIndex] || String(existingVideoUrl ?? "").trim();
}

function getVideoThumbnailSlotPreviewUrl(slotIndex, existingThumbnailUrl = "") {
  return videoThumbnailPreviewObjectUrls[slotIndex] || String(existingThumbnailUrl ?? "").trim();
}

function getMediaFileName(sourceValue, fallbackLabel = "Image file") {
  const rawValue = String(sourceValue ?? "").trim();
  if (!rawValue) {
    return fallbackLabel;
  }

  const tryDecode = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  if (!rawValue.startsWith("blob:")) {
    try {
      const candidatePath = new URL(rawValue, window.location.origin).pathname;
      const fileName = candidatePath.split("/").filter(Boolean).pop();
      if (fileName) {
        return tryDecode(fileName);
      }
    } catch {
      // Fall back to loose parsing below when the value is not a valid URL.
    }
  }

  const looseFileName = rawValue.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  return tryDecode(looseFileName || fallbackLabel);
}

function createMediaNameSummary(
  titleText,
  metaText,
  iconClass = "fa-regular fa-image",
  showDragHandle = false,
  options = {},
) {
  const summary = document.createElement("div");
  summary.className = "product-image-input-row__file-summary";

  if (showDragHandle) {
    summary.classList.add("has-drag-handle");
    const dragHandle = document.createElement("span");
    dragHandle.className = "product-image-input-row__drag-handle";
    dragHandle.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 6; index += 1) {
      const dot = document.createElement("span");
      dot.className = "product-image-input-row__drag-dot";
      dragHandle.appendChild(dot);
    }

    summary.appendChild(dragHandle);
  }

  const customIconElement = options?.iconElement ?? null;
  const icon = customIconElement instanceof HTMLElement
    ? customIconElement
    : document.createElement("span");
  if (!(customIconElement instanceof HTMLElement)) {
    icon.className = "product-image-input-row__preview-icon";
    icon.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
  }

  const copy = document.createElement("span");
  copy.className = "product-image-input-row__file-summary-copy";

  const title = document.createElement("span");
  title.className = "product-image-input-row__preview-title";
  title.textContent = titleText;

  const meta = document.createElement("span");
  meta.className = "product-image-input-row__preview-meta";
  meta.textContent = metaText;

  copy.append(title);
  if (String(metaText ?? "").trim()) {
    copy.append(meta);
  }
  const customMetaElement = options?.metaElement ?? null;
  if (customMetaElement instanceof HTMLElement) {
    copy.append(customMetaElement);
  }
  summary.append(icon, copy);
  return summary;
}

function createImageNameSummary(titleText, metaText) {
  return createMediaNameSummary(titleText, metaText, "fa-regular fa-image", true);
}

function createVideoThumbnailPickerControl({
  slotIndex,
  thumbnailUrl = "",
  hasPendingThumbnail = false,
  onActivate = null,
} = {}) {
  const control = document.createElement("button");
  const hasThumbnail =
    hasPendingThumbnail || Boolean(String(thumbnailUrl ?? "").trim());
  control.type = "button";
  control.className = "product-image-input-row__preview-meta-action";
  control.title = hasThumbnail
    ? `Change cover for video ${slotIndex + 1}`
    : `Set cover for video ${slotIndex + 1}`;
  control.setAttribute(
    "aria-label",
    hasThumbnail
      ? `Change cover for video ${slotIndex + 1}`
      : `Set cover for video ${slotIndex + 1}`,
  );
  control.textContent = hasThumbnail ? "Change cover" : "Set cover";

  if (typeof onActivate === "function") {
    const handleActivate = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onActivate();
    };

    control.addEventListener("click", handleActivate);
    control.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        handleActivate(event);
      }
    });
  }

  return control;
}

function createVideoThumbnailPreviewIcon(thumbnailUrl = "", onActivate = null, slotIndex = 0) {
  const previewUrl = String(thumbnailUrl ?? "").trim();
  if (!previewUrl) {
    return null;
  }

  const icon = document.createElement("span");
  icon.className =
    "product-image-input-row__preview-icon product-image-input-row__preview-icon--thumbnail-preview";

  const image = document.createElement("img");
  image.src = previewUrl;
  image.alt = "";
  image.loading = "lazy";
  icon.appendChild(image);
  if (typeof onActivate === "function") {
    const handleActivate = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onActivate();
    };

    icon.setAttribute("role", "button");
    icon.tabIndex = 0;
    icon.title = `Edit cover for video ${slotIndex + 1}`;
    icon.setAttribute("aria-label", `Edit cover for video ${slotIndex + 1}`);
    icon.addEventListener("click", handleActivate);
    icon.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        handleActivate(event);
      }
    });
  }
  return icon;
}

function createVideoNameSummary(titleText, metaText, options = {}) {
  const shouldUseThumbnailControl = Boolean(options?.useThumbnailControl);
  if (!shouldUseThumbnailControl) {
    return createMediaNameSummary(titleText, metaText, "fa-solid fa-film", true);
  }

  const slotIndex = Math.max(0, Number(options?.slotIndex) || 0);
  const thumbnailUrl = String(options?.thumbnailUrl ?? "").trim();
  const hasPendingThumbnail = Boolean(options?.hasPendingThumbnail);
  const hasThumbnail = hasPendingThumbnail || Boolean(thumbnailUrl);
  const onThumbnailActivate =
    typeof options?.onThumbnailActivate === "function" ? options.onThumbnailActivate : null;
  const onThumbnailPreviewActivate =
    typeof options?.onThumbnailPreviewActivate === "function"
      ? options.onThumbnailPreviewActivate
      : null;

  return createMediaNameSummary(titleText, metaText, "fa-solid fa-film", true, {
    iconElement: hasThumbnail
      ? createVideoThumbnailPreviewIcon(
          thumbnailUrl,
          onThumbnailPreviewActivate,
          slotIndex,
        )
      : null,
    metaElement: createVideoThumbnailPickerControl({
      slotIndex,
      thumbnailUrl,
      hasPendingThumbnail,
      onActivate: onThumbnailActivate,
    }),
  });
}

function renderImagePreview(
  previewContainer,
  previewUrl,
  slotIndex,
  hasPendingFile = false,
  fileLabel = "",
) {
  previewContainer.innerHTML = "";
  previewContainer.classList.remove("is-empty", "has-image");
  const isNameOnlyPreview = previewContainer.classList.contains(
    "product-image-input-row__preview--filename-only",
  );

  if (!previewUrl) {
    previewContainer.classList.add("is-empty");

    if (isNameOnlyPreview) {
      previewContainer.appendChild(
        createImageNameSummary("No image selected", `Tap to upload image ${slotIndex + 1}`),
      );
      previewContainer.title = `Add image ${slotIndex + 1}`;
      return;
    }

    const placeholder = document.createElement("div");
    placeholder.className = "product-image-input-row__preview-placeholder";

    const icon = document.createElement("span");
    icon.className = "product-image-input-row__preview-icon";
    icon.innerHTML = `<i class="fa-regular fa-image" aria-hidden="true"></i>`;

    const title = document.createElement("span");
    title.className = "product-image-input-row__preview-title";
    title.textContent = "Add image";

    const meta = document.createElement("span");
    meta.className = "product-image-input-row__preview-meta";
    meta.textContent = `Tap to upload image ${slotIndex + 1}`;

    placeholder.append(icon, title, meta);
    previewContainer.appendChild(placeholder);
    previewContainer.title = `Add image ${slotIndex + 1}`;
    return;
  }

  previewContainer.classList.add("has-image");
  previewContainer.classList.remove("is-empty");

  if (isNameOnlyPreview) {
    previewContainer.appendChild(
      createImageNameSummary(
        fileLabel || `Image ${slotIndex + 1}`,
        hasPendingFile ? "Selected file ready to upload. Tap to replace." : "Saved image file. Tap to replace.",
      ),
    );
    previewContainer.title = `Change image ${slotIndex + 1}`;
    return;
  }

  const previewImage = document.createElement("img");
  previewImage.src = previewUrl;
  previewImage.alt = `Preview for image ${slotIndex + 1}`;
  previewContainer.appendChild(previewImage);

  const overlay = document.createElement("div");
  overlay.className = "product-image-input-row__preview-overlay";

  const overlayText = document.createElement("span");
  overlayText.textContent = hasPendingFile ? "Ready to upload" : "Change image";
  overlay.appendChild(overlayText);
  previewContainer.appendChild(overlay);
  previewContainer.title = `Change image ${slotIndex + 1}`;
}

function formatProductVideoFileSize(bytes = 0) {
  const normalizedBytes = Math.max(0, Number(bytes) || 0);
  if (!normalizedBytes) {
    return "Saved video";
  }

  const megabytes = normalizedBytes / (1024 * 1024);
  if (megabytes >= 0.1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(normalizedBytes / 1024))} KB`;
}

function formatProductVideoDuration(seconds = 0) {
  const normalizedSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const remainingSeconds = normalizedSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function renderProductVideoUploadCardPreview(
  previewContainer,
  previewUrl,
  slotIndex,
  fileLabel = "",
  thumbnailUrl = "",
) {
  previewContainer.innerHTML = "";
  previewContainer.classList.toggle("is-empty", !previewUrl);
  previewContainer.classList.toggle("has-image", Boolean(previewUrl));

  const pendingVideoFile = pendingVideoFiles[slotIndex] ?? null;
  const uploadTask = getPendingProductVideoUploadTask(slotIndex);
  const uploadStatus = pendingVideoFile
    ? String(uploadTask?.status || "uploading").trim().toLowerCase()
    : "complete";
  const uploadProgress = pendingVideoFile
    ? Math.max(0, Math.min(100, Number(uploadTask?.progress) || 0))
    : 100;
  previewContainer.dataset.uploadStatus = uploadStatus;
  const mediaShell = document.createElement("span");
  mediaShell.className = "product-video-upload-card__media-shell";
  const media = document.createElement("span");
  media.className = "product-video-upload-card__media";
  mediaShell.appendChild(media);

  const fallback = document.createElement("span");
  fallback.className = "product-video-upload-card__media-fallback";
  fallback.innerHTML = `<i class="fa-solid fa-film" aria-hidden="true"></i>`;
  media.appendChild(fallback);

  if (previewUrl) {
    const video = document.createElement("video");
    video.src = previewUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.tabIndex = -1;
    video.setAttribute("aria-hidden", "true");
    const normalizedThumbnailUrl = String(thumbnailUrl ?? "").trim();
    if (normalizedThumbnailUrl) {
      video.poster = normalizedThumbnailUrl;
      const cropPreview = document.createElement("img");
      cropPreview.className = "product-video-upload-card__crop-preview";
      cropPreview.src = normalizedThumbnailUrl;
      cropPreview.alt = "";
      cropPreview.setAttribute("aria-hidden", "true");
      media.appendChild(cropPreview);
      media.classList.add("has-crop-preview");
    }
    media.appendChild(video);

    const playBadge = document.createElement("span");
    playBadge.className = "product-video-upload-card__play";
    playBadge.setAttribute("aria-hidden", "true");
    media.appendChild(playBadge);

    const openVideoViewer = (event) => {
      event.preventDefault();
      event.stopPropagation();
      video.pause();
      openEditableProductVideoViewer(slotIndex);
    };

    mediaShell.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      openVideoViewer(event);
    });
    previewContainer.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      if (event.target !== previewContainer) {
        return;
      }
      openVideoViewer(event);
    });

    video.addEventListener("loadeddata", () => {
      media.classList.add("has-video-frame");
    });
    video.addEventListener("error", () => {
      media.classList.add("has-load-error");
    });
  }

  const uploadState = document.createElement("span");
  uploadState.className = "product-video-upload-card__upload-state";
  uploadState.dataset.productVideoUploadState = "true";
  uploadState.setAttribute("role", "status");
  uploadState.setAttribute("aria-live", "polite");
  uploadState.hidden = uploadStatus !== "uploading" && uploadStatus !== "error";
  uploadState.classList.toggle("is-error", uploadStatus === "error");

  const uploadStateCopy = document.createElement("span");
  uploadStateCopy.dataset.productVideoUploadStateCopy = "true";
  uploadStateCopy.textContent = uploadStatus === "error" ? "Upload failed" : "Uploading";

  const uploadDots = document.createElement("span");
  uploadDots.className = "product-video-upload-card__upload-dots";
  uploadDots.hidden = uploadStatus !== "uploading";
  uploadDots.setAttribute("aria-hidden", "true");
  uploadDots.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
  uploadState.append(uploadStateCopy, uploadDots);
  media.appendChild(uploadState);

  const hasVideoCover = Boolean(String(thumbnailUrl ?? "").trim());
  const videoReady =
    Boolean(String(editingVideoUrls[slotIndex] ?? "").trim()) || Boolean(pendingVideoFile);

  if (hasVideoCover) {
    const coverBadge = document.createElement("span");
    coverBadge.className = "product-video-thumbnail__cover-badge";
    coverBadge.setAttribute("aria-label", "Video cover set");
    coverBadge.title = "Video cover — shown on the app listing card";
    coverBadge.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
    previewContainer.appendChild(coverBadge);
  } else if (slotIndex === 0) {
    // Keep primary marker only when no cover badge is showing.
    const homeControl = document.createElement("span");
    homeControl.className = "product-video-thumbnail__home is-active";
    homeControl.title = "Primary product video";
    homeControl.setAttribute("aria-hidden", "true");
    homeControl.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
    previewContainer.appendChild(homeControl);
  } else {
    const homeControl = document.createElement("button");
    homeControl.type = "button";
    homeControl.className = "product-video-thumbnail__home";
    homeControl.title = `Set product video ${slotIndex + 1} as primary`;
    homeControl.setAttribute(
      "aria-label",
      `Set product video ${slotIndex + 1} as primary`,
    );
    homeControl.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
    homeControl.draggable = false;
    homeControl.addEventListener("dragstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    homeControl.addEventListener("pointerdown", (event) => event.stopPropagation());
    homeControl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setPrimaryProductVideoSlot(slotIndex);
    });
    previewContainer.appendChild(homeControl);
  }

  const setCoverControl = document.createElement("button");
  setCoverControl.type = "button";
  setCoverControl.className = "product-video-thumbnail__set-cover";
  setCoverControl.title = hasVideoCover
    ? `Change video cover ${slotIndex + 1}`
    : `Set video cover ${slotIndex + 1}`;
  setCoverControl.setAttribute(
    "aria-label",
    hasVideoCover
      ? `Change video cover ${slotIndex + 1}`
      : `Set video cover ${slotIndex + 1}`,
  );
  setCoverControl.draggable = false;
  setCoverControl.disabled = !videoReady;
  setCoverControl.innerHTML = hasVideoCover
    ? PRODUCT_PHOTO_REPLACE_ICON_MARKUP
    : PRODUCT_PHOTO_COVER_ICON_MARKUP;
  setCoverControl.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  setCoverControl.addEventListener("pointerdown", (event) => event.stopPropagation());
  setCoverControl.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    media.querySelector("video")?.pause();
    if (!videoReady) {
      setHelperText("Add a video first before setting its cover.");
      return;
    }
    focusProductVideoThumbnailSlotPicker(slotIndex);
  });
  mediaShell.appendChild(setCoverControl);

  const cropControl = document.createElement("button");
  cropControl.type = "button";
  cropControl.className = "product-video-thumbnail__crop";
  cropControl.title = `Crop cover from video ${slotIndex + 1}`;
  cropControl.setAttribute(
    "aria-label",
    `Crop cover from video ${slotIndex + 1}`,
  );
  cropControl.draggable = false;
  cropControl.disabled = !videoReady;
  cropControl.innerHTML = PRODUCT_PHOTO_CROP_ICON_MARKUP;
  cropControl.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  cropControl.addEventListener("pointerdown", (event) => event.stopPropagation());
  cropControl.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    media.querySelector("video")?.pause();
    openEditableProductVideoCropEditor(slotIndex);
  });
  mediaShell.appendChild(cropControl);

  const replaceControl = document.createElement("button");
  replaceControl.type = "button";
  replaceControl.className = "product-video-thumbnail__replace";
  replaceControl.title = `Change product video ${slotIndex + 1}`;
  replaceControl.setAttribute("aria-label", `Change product video ${slotIndex + 1}`);
  replaceControl.draggable = false;
  replaceControl.innerHTML = PRODUCT_PHOTO_REPLACE_ICON_MARKUP;
  replaceControl.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  replaceControl.addEventListener("pointerdown", (event) => event.stopPropagation());
  replaceControl.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    media.querySelector("video")?.pause();
    const fileInput = previewContainer
      .closest(".product-video-upload-card")
      ?.querySelector('input[data-product-video-file="true"]');
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = "";
      fileInput.click();
    }
  });
  mediaShell.appendChild(replaceControl);

  const removeControl = document.createElement("button");
  removeControl.type = "button";
  removeControl.className = "product-video-thumbnail__remove";
  removeControl.title = `Remove product video ${slotIndex + 1}`;
  removeControl.setAttribute("aria-label", `Remove product video ${slotIndex + 1}`);
  removeControl.draggable = false;
  removeControl.disabled = !String(editingVideoUrls[slotIndex] ?? "").trim() && !pendingVideoFile;
  removeControl.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 7 17 17"></path>
      <path d="M17 7 7 17"></path>
    </svg>
  `;
  removeControl.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  removeControl.addEventListener("pointerdown", (event) => event.stopPropagation());
  removeControl.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestRemoveEditableProductVideoSlot(slotIndex);
  });
  previewContainer.appendChild(removeControl);

  const details = document.createElement("span");
  details.className = "product-video-upload-card__details";

  const title = document.createElement("strong");
  title.className = "product-video-upload-card__name";
  title.textContent = fileLabel || `Product video ${slotIndex + 1}`;

  const meta = document.createElement("span");
  meta.className = "product-video-upload-card__meta";

  const size = document.createElement("span");
  size.textContent = formatProductVideoFileSize(pendingVideoFile?.size);

  const separator = document.createElement("span");
  separator.className = "product-video-upload-card__meta-separator";
  separator.textContent = "•";

  const duration = document.createElement("span");
  duration.textContent = "--:--";
  meta.append(size, separator, duration);

  const progress = document.createElement("span");
  progress.className = "product-video-upload-card__progress";

  const progressTrack = document.createElement("span");
  progressTrack.className = "product-video-upload-card__progress-track";
  const progressFill = document.createElement("span");
  progressFill.className = "product-video-upload-card__progress-fill";
  progressFill.style.width = `${uploadProgress}%`;
  progressTrack.appendChild(progressFill);

  const progressLabel = document.createElement("span");
  progressLabel.className = "product-video-upload-card__progress-label";
  progressLabel.textContent = uploadStatus === "error"
    ? "Failed"
    : `${Math.round(uploadProgress)}%`;
  progress.append(progressTrack, progressLabel);

  details.append(title, meta, progress);
  previewContainer.append(mediaShell, details);
  previewContainer.title = previewUrl
    ? `Play product video ${slotIndex + 1}`
    : `Add product video ${slotIndex + 1}`;
  previewContainer.setAttribute(
    "aria-label",
    previewUrl ? `Play product video ${slotIndex + 1}` : `Add product video ${slotIndex + 1}`,
  );

  const previewVideo = media.querySelector("video");
  previewVideo?.addEventListener("loadedmetadata", () => {
    duration.textContent = formatProductVideoDuration(previewVideo.duration);
    if (!String(previewVideo.poster || "").trim() && Number(previewVideo.duration || 0) > 0) {
      try {
        previewVideo.currentTime = Math.min(0.1, previewVideo.duration / 2);
      } catch (_) {}
    }
  });
}

function renderVideoPreview(
  previewContainer,
  previewUrl,
  slotIndex,
  hasPendingFile = false,
  fileLabel = "",
  thumbnailUrl = "",
  hasPendingThumbnail = false,
  onThumbnailActivate = null,
  onThumbnailPreviewActivate = null,
) {
  previewContainer.innerHTML = "";
  previewContainer.classList.remove("is-empty", "has-image");
  const isNameOnlyPreview = previewContainer.classList.contains(
    "product-image-input-row__preview--filename-only",
  );

  if (previewContainer.classList.contains("product-video-upload-card__preview")) {
    renderProductVideoUploadCardPreview(
      previewContainer,
      previewUrl,
      slotIndex,
      fileLabel,
      thumbnailUrl,
    );
    return;
  }

  if (!previewUrl) {
    previewContainer.classList.add("is-empty");

    if (isNameOnlyPreview) {
      previewContainer.appendChild(
        createVideoNameSummary("No video selected", `Tap to upload video ${slotIndex + 1}`),
      );
      previewContainer.title = `Add video ${slotIndex + 1}`;
      return;
    }

    const placeholder = document.createElement("div");
    placeholder.className = "product-image-input-row__preview-placeholder";

    const icon = document.createElement("span");
    icon.className = "product-image-input-row__preview-icon";
    icon.innerHTML = `<i class="fa-solid fa-film" aria-hidden="true"></i>`;

    const title = document.createElement("span");
    title.className = "product-image-input-row__preview-title";
    title.textContent = "Add product video";

    const meta = document.createElement("span");
    meta.className = "product-image-input-row__preview-meta";
    meta.textContent = `Tap to upload video ${slotIndex + 1}`;

    placeholder.append(icon, title, meta);
    previewContainer.appendChild(placeholder);
    previewContainer.title = `Add video ${slotIndex + 1}`;
    return;
  }

  previewContainer.classList.add("has-image");
  previewContainer.classList.remove("is-empty");

  if (isNameOnlyPreview) {
    previewContainer.appendChild(
      createVideoNameSummary(
        fileLabel || `Video ${slotIndex + 1}`,
        hasPendingFile ? "Selected video is ready to upload." : "",
        {
          slotIndex,
          thumbnailUrl,
          hasPendingThumbnail,
          useThumbnailControl: true,
          onThumbnailActivate,
          onThumbnailPreviewActivate,
        },
      ),
    );
    previewContainer.title = `Change video ${slotIndex + 1}`;
    return;
  }

  const previewVideo = document.createElement("video");
  previewVideo.src = previewUrl;
  previewVideo.muted = true;
  previewVideo.loop = true;
  previewVideo.autoplay = true;
  previewVideo.playsInline = true;
  previewVideo.preload = "metadata";
  previewContainer.appendChild(previewVideo);

  const overlay = document.createElement("div");
  overlay.className = "product-image-input-row__preview-overlay";

  const overlayText = document.createElement("span");
  overlayText.textContent = hasPendingFile ? "Ready to upload" : "Change video";
  overlay.appendChild(overlayText);
  previewContainer.appendChild(overlay);
  previewContainer.title = `Change video ${slotIndex + 1}`;
}

function bindImagePreviewPicker(previewContainer, fileInput) {
  const openPicker = (event = null) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    fileInput.click();
  };

  previewContainer.addEventListener("click", openPicker);
  previewContainer.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      openPicker(event);
    }
  });
}

function renderImagePreviewState(
  previewContainer,
  statusElement,
  removeButton,
  slotIndex,
  existingImageUrl,
) {
  const pendingImageFile = pendingImageFiles[slotIndex];
  const displayFileName = pendingImageFile?.name?.trim()
    || (existingImageUrl ? getMediaFileName(existingImageUrl, `Image ${slotIndex + 1}`) : "");
  renderImagePreview(
    previewContainer,
    getImageSlotPreviewUrl(slotIndex, existingImageUrl),
    slotIndex,
    Boolean(pendingImageFile),
    displayFileName,
  );
  statusElement.textContent = pendingImageFile
    ? "Selected file will upload when you save this product."
    : existingImageUrl
      ? ""
      : "";
  removeButton.disabled = editingImageUrls.length === 1 && !existingImageUrl && !pendingImageFile;
}

function renderVideoPreviewState(
  previewContainer,
  statusElement,
  removeButton,
  slotIndex,
  existingVideoUrl,
) {
  const pendingVideoFile = pendingVideoFiles[slotIndex];
  const existingVideoThumbnailUrl = String(editingVideoThumbnailUrls[slotIndex] ?? "").trim();
  const pendingVideoThumbnailFile = pendingVideoThumbnailFiles[slotIndex];
  const displayFileName = pendingVideoFile?.name?.trim()
    || (existingVideoUrl ? getMediaFileName(existingVideoUrl, `Video ${slotIndex + 1}`) : "");
  renderVideoPreview(
    previewContainer,
    getVideoSlotPreviewUrl(slotIndex, existingVideoUrl),
    slotIndex,
    Boolean(pendingVideoFile),
    displayFileName,
    getVideoThumbnailSlotPreviewUrl(slotIndex, existingVideoThumbnailUrl),
    Boolean(pendingVideoThumbnailFile),
    () => {
      if (!getVideoSlotPreviewUrl(slotIndex, existingVideoUrl)) {
        setHelperText("Add a video first before setting its cover.");
        return;
      }

      focusProductVideoThumbnailSlotPicker(slotIndex);
    },
    () => {
      openExistingProductVideoThumbnailCropEditor({
        slotIndex,
        existingVideoUrl,
        existingThumbnailUrl: existingVideoThumbnailUrl,
        previewElement: previewContainer,
        statusElement,
        removeButton,
      });
    },
  );
  const statusMessages = [];
  if (pendingVideoFile) {
    const uploadTask = getPendingProductVideoUploadTask(slotIndex);
    if (uploadTask?.status === "complete") {
      statusMessages.push("Video upload complete. Publish will reuse the uploaded file.");
    } else if (uploadTask?.status === "error") {
      statusMessages.push("Video upload failed. Publish will retry the upload.");
    } else {
      statusMessages.push(
        `Video is uploading now (${Math.round(Number(uploadTask?.progress) || 0)}%).`,
      );
    }
  }
  if (pendingVideoThumbnailFile) {
    statusMessages.push("Selected video cover will upload when you save this product.");
  } else if (
    !existingVideoThumbnailUrl &&
    (existingVideoUrl || pendingVideoFile)
  ) {
    statusMessages.push(
      "No cover yet — use Set cover (upload photo) or Crop cover from a video frame (4:5).",
    );
  } else if (existingVideoThumbnailUrl) {
    statusMessages.push("Cover set — this is what buyers see on the listing card.");
  }
  statusElement.textContent = statusMessages.join(" ");
  removeButton.disabled = !existingVideoUrl && !pendingVideoFile;
}

function getEditableImagePreviewAnimationKey(slotIndex, existingImageUrl = "") {
  const pendingImageFile = pendingImageFiles[slotIndex];
  const previewObjectUrl = imagePreviewObjectUrls[slotIndex] || "";
  const normalizedExistingImageUrl = String(existingImageUrl ?? "").trim();
  const fileSignature = pendingImageFile
    ? [
        pendingImageFile.name || "",
        pendingImageFile.size || 0,
        pendingImageFile.lastModified || 0,
      ].join(":")
    : "";

  return (
    [normalizedExistingImageUrl, previewObjectUrl, fileSignature]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|")
    || `slot-${slotIndex}`
  );
}

function captureProductImagePreviewRects() {
  const rects = new Map();
  if (!productImageInputList) {
    return rects;
  }

  productImageInputList
    .querySelectorAll(".product-photo-thumbnail")
    .forEach((thumbnail) => {
      const animationKey = String(thumbnail.dataset.animationKey ?? "").trim();
      if (!animationKey) {
        return;
      }

      rects.set(animationKey, thumbnail.getBoundingClientRect());
    });

  return rects;
}

function clearProductImageReorderAnimationStyles() {
  productImageReorderAnimationElements.forEach((thumbnail) => {
    thumbnail.classList.remove("is-cover-promoting");
    thumbnail.style.removeProperty("transition");
    thumbnail.style.removeProperty("transform");
    thumbnail.style.removeProperty("will-change");
    thumbnail.style.removeProperty("z-index");
  });
  productImageReorderAnimationElements = [];
  productImageInputList?.classList.remove("is-camera-following");
}

function cancelProductImageReorderAnimation() {
  if (productImageReorderAnimationFrame) {
    window.cancelAnimationFrame(productImageReorderAnimationFrame);
    productImageReorderAnimationFrame = 0;
  }
  clearProductImageReorderAnimationStyles();
}

function animateProductImagePreviewReorder(previousRects, options = {}) {
  if (!productImageInputList || !(previousRects instanceof Map) || !previousRects.size) {
    return;
  }

  const thumbnails = Array.from(
    productImageInputList.querySelectorAll(".product-photo-thumbnail"),
  );
  if (!thumbnails.length) {
    return;
  }

  const promotedAnimationKey = String(options?.promotedAnimationKey ?? "").trim();
  const shouldFollowPromotedImage = Boolean(
    options?.followPromotedImage && promotedAnimationKey,
  );
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    if (shouldFollowPromotedImage) {
      productImageInputList.scrollLeft = 0;
      requestProductPhotoCarouselControlSync();
    }
    return;
  }

  cancelProductImageReorderAnimation();
  productImageReorderAnimationFrame = window.requestAnimationFrame(() => {
    productImageReorderAnimationFrame = 0;
    const movements = [];

    thumbnails.forEach((thumbnail) => {
      const animationKey = String(thumbnail.dataset.animationKey ?? "").trim();
      if (!animationKey || !previousRects.has(animationKey)) {
        return;
      }

      const previousRect = previousRects.get(animationKey);
      const nextRect = thumbnail.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      const isPromotedImage = Boolean(
        promotedAnimationKey && animationKey === promotedAnimationKey,
      );
      thumbnail.classList.toggle("is-cover-promoting", isPromotedImage);
      thumbnail.style.willChange = "transform";
      thumbnail.style.zIndex = isPromotedImage ? "4" : "3";
      thumbnail.style.transition = "none";
      thumbnail.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      movements.push({
        thumbnail,
        deltaX,
        deltaY,
      });
    });

    const startingScrollLeft = shouldFollowPromotedImage
      ? Math.max(0, productImageInputList.scrollLeft)
      : 0;
    productImageInputList.classList.toggle(
      "is-camera-following",
      shouldFollowPromotedImage,
    );
    if (!movements.length && startingScrollLeft <= 1) {
      clearProductImageReorderAnimationStyles();
      return;
    }

    const duration = 560;
    let startedAt = 0;
    productImageReorderAnimationElements = movements.map(({ thumbnail }) => thumbnail);

    const runCameraFollowFrame = (timestamp) => {
      if (!startedAt) {
        startedAt = timestamp;
      }

      const elapsed = Math.max(0, timestamp - startedAt);
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const remainingProgress = 1 - easedProgress;

      movements.forEach(({ thumbnail, deltaX, deltaY }) => {
        thumbnail.style.transform =
          `translate3d(${deltaX * remainingProgress}px, ${deltaY * remainingProgress}px, 0)`;
      });

      if (shouldFollowPromotedImage) {
        productImageInputList.scrollLeft = startingScrollLeft * remainingProgress;
      }

      if (progress < 1) {
        productImageReorderAnimationFrame = window.requestAnimationFrame(
          runCameraFollowFrame,
        );
        return;
      }

      productImageReorderAnimationFrame = 0;
      if (shouldFollowPromotedImage) {
        productImageInputList.scrollLeft = 0;
      }
      clearProductImageReorderAnimationStyles();
      requestProductPhotoCarouselControlSync();
    };

    productImageReorderAnimationFrame = window.requestAnimationFrame(
      runCameraFollowFrame,
    );
  });
}

function clearProductImageDragState() {
  draggedProductImageSlotIndex = -1;
  if (!productImageInputList) {
    return;
  }

  productImageInputList
    .querySelectorAll(".product-photo-thumbnail")
    .forEach((thumbnail) =>
      thumbnail.classList.remove(
        "is-dragging",
        "is-drag-over",
        "is-drag-shift-start",
        "is-drag-shift-end",
      ),
    );
  productImageInputList.style.removeProperty("--product-media-drag-shift");
}

function updateProductMediaDragPreview(
  container,
  itemSelector,
  draggedSlotIndex,
  targetSlotIndex,
  indexDatasetKey = "slotIndex",
) {
  if (!container) {
    return;
  }

  const normalizedDraggedSlotIndex = Number(draggedSlotIndex);
  const normalizedTargetSlotIndex = Number(targetSlotIndex);
  const items = Array.from(container.querySelectorAll(itemSelector));
  const getItemIndex = (item) => Number(item.dataset[indexDatasetKey]);
  items.forEach((item) =>
    item.classList.remove(
      "is-drag-over",
      "is-drag-shift-start",
      "is-drag-shift-end",
    ),
  );

  if (
    !Number.isInteger(normalizedDraggedSlotIndex)
    || !Number.isInteger(normalizedTargetSlotIndex)
    || normalizedDraggedSlotIndex < 0
    || normalizedTargetSlotIndex < 0
    || normalizedDraggedSlotIndex === normalizedTargetSlotIndex
  ) {
    container.style.removeProperty("--product-media-drag-shift");
    return;
  }

  const draggedItem = items.find(
    (item) => getItemIndex(item) === normalizedDraggedSlotIndex,
  );
  const targetItem = items.find(
    (item) => getItemIndex(item) === normalizedTargetSlotIndex,
  );
  if (!draggedItem || !targetItem) {
    return;
  }

  const containerStyles = window.getComputedStyle(container);
  const itemGap = Number.parseFloat(containerStyles.columnGap || containerStyles.gap) || 0;
  const shiftDistance = Math.max(0, draggedItem.getBoundingClientRect().width + itemGap);
  container.style.setProperty("--product-media-drag-shift", `${shiftDistance}px`);
  targetItem.classList.add("is-drag-over");

  items.forEach((item) => {
    const itemSlotIndex = getItemIndex(item);
    if (
      normalizedDraggedSlotIndex < normalizedTargetSlotIndex
      && itemSlotIndex > normalizedDraggedSlotIndex
      && itemSlotIndex <= normalizedTargetSlotIndex
    ) {
      item.classList.add("is-drag-shift-start");
    } else if (
      normalizedDraggedSlotIndex > normalizedTargetSlotIndex
      && itemSlotIndex >= normalizedTargetSlotIndex
      && itemSlotIndex < normalizedDraggedSlotIndex
    ) {
      item.classList.add("is-drag-shift-end");
    }
  });
}

function moveEditableImageSlot(fromIndex, toIndex) {
  syncEditableImageState();
  const maxIndex = editingImageUrls.length - 1;
  const normalizedFromIndex = Math.max(0, Math.min(Number(fromIndex) || 0, maxIndex));
  const normalizedToIndex = Math.max(0, Math.min(Number(toIndex) || 0, maxIndex));

  if (
    normalizedFromIndex === normalizedToIndex ||
    normalizedFromIndex < 0 ||
    normalizedToIndex < 0 ||
    !editingImageUrls.length
  ) {
    return false;
  }

  invalidateProductImageCropState(-1, {
    coverChanged: normalizedFromIndex === 0 || normalizedToIndex === 0,
  });

  const movedImageUrl = editingImageUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedPendingFile = pendingImageFiles.splice(normalizedFromIndex, 1)[0] ?? null;
  const movedPreviewObjectUrl = imagePreviewObjectUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedCropSourceUrl = productPhotoCropSourceUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedCropState = productPhotoCropStates.splice(normalizedFromIndex, 1)[0] ?? null;

  editingImageUrls.splice(normalizedToIndex, 0, movedImageUrl);
  pendingImageFiles.splice(normalizedToIndex, 0, movedPendingFile);
  imagePreviewObjectUrls.splice(normalizedToIndex, 0, movedPreviewObjectUrl);
  productPhotoCropSourceUrls.splice(normalizedToIndex, 0, movedCropSourceUrl);
  productPhotoCropStates.splice(normalizedToIndex, 0, movedCropState);
  selectedMainImageSlot = 0;
  preservePreviewDetailsMediaPosition();
  return true;
}

function clearProductVideoDragState() {
  draggedProductVideoSlotIndex = -1;
  if (!productVideoInputList) {
    return;
  }

  productVideoInputList
    .querySelectorAll(".product-video-upload-card")
    .forEach((row) =>
      row.classList.remove(
        "is-dragging",
        "is-drag-over",
        "is-drag-shift-start",
        "is-drag-shift-end",
      ),
    );
  productVideoInputList.style.removeProperty("--product-media-drag-shift");
}

function getEditableVideoPreviewAnimationKey(slotIndex, existingVideoUrl = "") {
  const pendingVideoFile = pendingVideoFiles[slotIndex];
  const previewObjectUrl = videoPreviewObjectUrls[slotIndex] || "";
  const normalizedExistingVideoUrl = String(existingVideoUrl ?? "").trim();
  const fileSignature = pendingVideoFile
    ? [
        pendingVideoFile.name || "",
        pendingVideoFile.size || 0,
        pendingVideoFile.lastModified || 0,
      ].join(":")
    : "";

  return (
    [normalizedExistingVideoUrl, previewObjectUrl, fileSignature]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|")
    || `video-slot-${slotIndex}`
  );
}

function captureProductVideoPreviewRects() {
  const rects = new Map();
  if (!productVideoInputList) {
    return rects;
  }

  productVideoInputList
    .querySelectorAll(".product-video-upload-card")
    .forEach((card) => {
      const animationKey = String(card.dataset.animationKey ?? "").trim();
      if (!animationKey) {
        return;
      }

      rects.set(animationKey, card.getBoundingClientRect());
    });

  return rects;
}

function animateProductVideoPreviewReorder(previousRects) {
  if (!productVideoInputList || !(previousRects instanceof Map) || !previousRects.size) {
    return;
  }

  const cards = Array.from(
    productVideoInputList.querySelectorAll(".product-video-upload-card"),
  );
  if (!cards.length) {
    return;
  }

  window.requestAnimationFrame(() => {
    cards.forEach((card) => {
      const animationKey = String(card.dataset.animationKey ?? "").trim();
      if (!animationKey || !previousRects.has(animationKey)) {
        return;
      }

      const previousRect = previousRects.get(animationKey);
      const nextRect = card.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      card.style.transition = "none";
      card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      card.style.zIndex = "4";

      window.requestAnimationFrame(() => {
        card.style.transition =
          "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease";
        card.style.transform = "translate(0px, 0px)";

        const cleanup = () => {
          card.style.removeProperty("transition");
          card.style.removeProperty("transform");
          card.style.removeProperty("z-index");
          card.removeEventListener("transitionend", cleanup);
        };

        card.addEventListener("transitionend", cleanup);
      });
    });
  });
}

function moveEditableVideoSlot(fromIndex, toIndex) {
  syncEditableVideoState();
  const maxIndex = editingVideoUrls.length - 1;
  const normalizedFromIndex = Math.max(0, Math.min(Number(fromIndex) || 0, maxIndex));
  const normalizedToIndex = Math.max(0, Math.min(Number(toIndex) || 0, maxIndex));

  if (
    normalizedFromIndex === normalizedToIndex ||
    normalizedFromIndex < 0 ||
    normalizedToIndex < 0 ||
    !editingVideoUrls.length
  ) {
    return false;
  }

  const movedVideoUrl = editingVideoUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedThumbnailUrl = editingVideoThumbnailUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedPendingFile = pendingVideoFiles.splice(normalizedFromIndex, 1)[0] ?? null;
  const movedPendingUploadTask =
    pendingVideoUploadTasks.splice(normalizedFromIndex, 1)[0] ?? null;
  const movedPendingThumbnailFile =
    pendingVideoThumbnailFiles.splice(normalizedFromIndex, 1)[0] ?? null;
  const movedPreviewObjectUrl = videoPreviewObjectUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedThumbnailPreviewObjectUrl =
    videoThumbnailPreviewObjectUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedVideoCropSourceUrl = productVideoCropSourceUrls.splice(normalizedFromIndex, 1)[0] ?? "";
  const movedVideoCropState = productVideoCropStates.splice(normalizedFromIndex, 1)[0] ?? null;

  editingVideoUrls.splice(normalizedToIndex, 0, movedVideoUrl);
  editingVideoThumbnailUrls.splice(normalizedToIndex, 0, movedThumbnailUrl);
  pendingVideoFiles.splice(normalizedToIndex, 0, movedPendingFile);
  pendingVideoUploadTasks.splice(normalizedToIndex, 0, movedPendingUploadTask);
  pendingVideoThumbnailFiles.splice(normalizedToIndex, 0, movedPendingThumbnailFile);
  videoPreviewObjectUrls.splice(normalizedToIndex, 0, movedPreviewObjectUrl);
  videoThumbnailPreviewObjectUrls.splice(normalizedToIndex, 0, movedThumbnailPreviewObjectUrl);
  productVideoCropSourceUrls.splice(normalizedToIndex, 0, movedVideoCropSourceUrl);
  productVideoCropStates.splice(normalizedToIndex, 0, movedVideoCropState);
  return true;
}

function syncProductPhotoCarouselControls() {
  if (!productImageInputList) {
    return;
  }

  const maxScrollLeft = Math.max(
    0,
    productImageInputList.scrollWidth - productImageInputList.clientWidth,
  );
  const scrollLeft = Math.max(0, productImageInputList.scrollLeft);
  const hasOverflow = maxScrollLeft > 2;

  productPhotoCarousel?.classList.toggle("has-overflow", hasOverflow);
  productPhotoCarouselButtons.forEach((button) => {
    const direction = String(button.dataset.productPhotoScroll || "").toLowerCase();
    const isPrevious = direction === "previous" || direction === "prev" || direction === "left";
    const isAtEdge = isPrevious ? scrollLeft <= 1 : scrollLeft >= maxScrollLeft - 1;
    button.disabled = !hasOverflow || isAtEdge;
  });
}

function requestProductPhotoCarouselControlSync() {
  if (!productImageInputList || !productPhotoCarousel || productPhotoCarouselControlFrame) {
    return;
  }

  productPhotoCarouselControlFrame = window.requestAnimationFrame(() => {
    productPhotoCarouselControlFrame = 0;
    syncProductPhotoCarouselControls();
  });
}

function scrollProductPhotoCarousel(direction = "next") {
  if (!productImageInputList) {
    return;
  }

  const normalizedDirection = String(direction || "").toLowerCase();
  const isPrevious =
    normalizedDirection === "previous" ||
    normalizedDirection === "prev" ||
    normalizedDirection === "left";
  const scrollDistance = Math.max(92, productImageInputList.clientWidth - 18);

  productImageInputList.scrollBy({
    left: isPrevious ? -scrollDistance : scrollDistance,
    behavior: "smooth",
  });
  requestProductPhotoCarouselControlSync();
  window.setTimeout(requestProductPhotoCarouselControlSync, 260);
}

function scrollProductPhotoCarouselToSlot(slotIndex, options = {}) {
  if (!productImageInputList) {
    return false;
  }

  const normalizedSlotIndex = Number(slotIndex);
  if (!Number.isInteger(normalizedSlotIndex) || normalizedSlotIndex < 0) {
    return false;
  }

  const behavior = options.behavior === "auto" ? "auto" : "smooth";
  window.requestAnimationFrame(() => {
    const thumbnail = productImageInputList.querySelector(
      `.product-photo-thumbnail[data-slot-index="${normalizedSlotIndex}"]`,
    );
    if (!(thumbnail instanceof HTMLElement)) {
      return;
    }

    const listRect = productImageInputList.getBoundingClientRect();
    const thumbnailRect = thumbnail.getBoundingClientRect();
    const maxScrollLeft = Math.max(
      0,
      productImageInputList.scrollWidth - productImageInputList.clientWidth,
    );
    const targetScrollLeft = Math.min(
      maxScrollLeft,
      Math.max(
        0,
        productImageInputList.scrollLeft + thumbnailRect.right - listRect.right + 2,
      ),
    );

    productImageInputList.scrollTo({ left: targetScrollLeft, behavior });
    requestProductPhotoCarouselControlSync();
    window.setTimeout(requestProductPhotoCarouselControlSync, behavior === "smooth" ? 320 : 0);
  });
  return true;
}

function scrollProductPhotoCarouselToStart(options = {}) {
  if (!productImageInputList) {
    return false;
  }

  const behavior = options.behavior === "auto" ? "auto" : "smooth";
  window.requestAnimationFrame(() => {
    productImageInputList.scrollTo({ left: 0, behavior });
    requestProductPhotoCarouselControlSync();
    window.setTimeout(requestProductPhotoCarouselControlSync, behavior === "smooth" ? 320 : 0);
  });
  return true;
}

function syncProductVideoCarouselControls() {
  if (!productVideoInputList) {
    return;
  }

  const maxScrollLeft = Math.max(
    0,
    productVideoInputList.scrollWidth - productVideoInputList.clientWidth,
  );
  const scrollLeft = Math.max(0, productVideoInputList.scrollLeft);
  const hasOverflow = maxScrollLeft > 2;

  productVideoCarousel?.classList.toggle("has-overflow", hasOverflow);
  productVideoCarouselButtons.forEach((button) => {
    const direction = String(button.dataset.productVideoScroll || "").toLowerCase();
    const isPrevious = direction === "previous" || direction === "prev" || direction === "left";
    const isAtEdge = isPrevious ? scrollLeft <= 1 : scrollLeft >= maxScrollLeft - 1;
    button.disabled = !hasOverflow || isAtEdge;
  });
}

function requestProductVideoCarouselControlSync() {
  if (!productVideoInputList || !productVideoCarousel || productVideoCarouselControlFrame) {
    return;
  }

  productVideoCarouselControlFrame = window.requestAnimationFrame(() => {
    productVideoCarouselControlFrame = 0;
    syncProductVideoCarouselControls();
  });
}

function scrollProductVideoCarouselToStart(options = {}) {
  if (!productVideoInputList) {
    return false;
  }

  const behavior = options.behavior === "auto" ? "auto" : "smooth";
  window.requestAnimationFrame(() => {
    productVideoInputList.scrollTo({ left: 0, behavior });
    requestProductVideoCarouselControlSync();
    window.setTimeout(requestProductVideoCarouselControlSync, behavior === "smooth" ? 320 : 0);
  });
  return true;
}

function scrollProductVideoCarousel(direction = "next") {
  if (!productVideoInputList) {
    return;
  }

  const normalizedDirection = String(direction || "").toLowerCase();
  const isPrevious =
    normalizedDirection === "previous"
    || normalizedDirection === "prev"
    || normalizedDirection === "left";
  const scrollDistance = Math.max(180, productVideoInputList.clientWidth);

  productVideoInputList.scrollBy({
    left: isPrevious ? -scrollDistance : scrollDistance,
    behavior: "smooth",
  });
  requestProductVideoCarouselControlSync();
  window.setTimeout(requestProductVideoCarouselControlSync, 320);
}

function scrollProductVideoCarouselToEnd(options = {}) {
  if (!productVideoInputList) {
    return false;
  }

  const behavior = options.behavior === "auto" ? "auto" : "smooth";
  window.requestAnimationFrame(() => {
    const maxScrollLeft = Math.max(
      0,
      productVideoInputList.scrollWidth - productVideoInputList.clientWidth,
    );
    productVideoInputList.scrollTo({ left: maxScrollLeft, behavior });
    requestProductVideoCarouselControlSync();
    window.setTimeout(requestProductVideoCarouselControlSync, behavior === "smooth" ? 320 : 0);
  });
  return true;
}

function invalidateProductImageCropState(slotIndex, options = {}) {
  const sourceUrls = Array.isArray(options.sourceUrls)
    ? options.sourceUrls
    : [options.sourceUrl];
  sourceUrls
    .map((sourceUrl) => String(sourceUrl || "").trim().toLowerCase())
    .filter(Boolean)
    .forEach((sourceUrl) => previewDetailsCropEntriesBySourceUrl.delete(sourceUrl));

  // Index-based detail crop keys become stale after any image change. Keep the
  // unaffected source-URL entries so crops for the other photos survive.
  previewDetailsCropStates = new Map();
  previewDetailsImageStateKey = "";

  const coverChanged = Object.prototype.hasOwnProperty.call(options, "coverChanged")
    ? options.coverChanged === true
    : Number(slotIndex) === 0;
  if (coverChanged) {
    clearPreviewCardCrop();
    editingCardImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
    editingCardImagePosition = DEFAULT_CARD_IMAGE_POSITION;
    clearPreviewBuyModalCrop();
  }
}

function getEditableProductPhotoPreviewUrls() {
  return editingImageUrls
    .map((existingImageUrl, slotIndex) =>
      getImageSlotPreviewUrl(slotIndex, existingImageUrl),
    )
    .map((imageUrl) => String(imageUrl || "").trim())
    .filter(Boolean);
}

function getEditableProductPhotoFileName(slotIndex) {
  const savedCropFileName = String(
    productPhotoCropStates[slotIndex]?.sourceFileName ?? "",
  ).trim();
  if (savedCropFileName) {
    return savedCropFileName;
  }

  const pendingFile = pendingImageFiles[slotIndex];
  if (pendingFile instanceof File && String(pendingFile.name || "").trim()) {
    return String(pendingFile.name).trim();
  }

  const previewUrl = String(
    getImageSlotPreviewUrl(slotIndex, editingImageUrls[slotIndex] || ""),
  ).trim();
  const existingUrl = String(editingImageUrls[slotIndex] || "").trim();
  const cropSourceUrl = getProductPhotoCropSourceUrl(slotIndex);
  return getMediaFileName(
    previewUrl || existingUrl || cropSourceUrl,
    `photo-${Number(slotIndex) + 1}`,
  );
}

function getEditableProductPhotoGalleryItems() {
  return editingImageUrls
    .map((existingImageUrl, slotIndex) => {
      const url = String(getImageSlotPreviewUrl(slotIndex, existingImageUrl) || "").trim();
      if (!url) {
        return null;
      }

      return {
        type: "image",
        url,
        label: getEditableProductPhotoFileName(slotIndex),
        slotIndex,
      };
    })
    .filter(Boolean);
}

function openEditableProductPhotoViewer(slotIndex) {
  const galleryItems = getEditableProductPhotoGalleryItems();
  if (!galleryItems.length) {
    showProductEditorSnackbar("Image unavailable", "This product image cannot be opened.", "error");
    return;
  }
  const normalizedSlotIndex = Number(slotIndex);
  const startIndex = Math.max(
    0,
    galleryItems.findIndex((item) => item.slotIndex === normalizedSlotIndex),
  );
  const currentItem = galleryItems[startIndex] || galleryItems[0];
  openPreviewMediaGallery(currentItem.label, galleryItems, startIndex, {
    showActions: false,
    showModelButton: false,
    useItemLabelAsTitle: true,
  });
}

function openEditableProductPhotoCropEditor(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  const currentPreviewUrl = String(
    getImageSlotPreviewUrl(
      normalizedSlotIndex,
      editingImageUrls[normalizedSlotIndex] || "",
    ),
  ).trim();
  const sourceUrl = getProductPhotoCropSourceUrl(normalizedSlotIndex) || currentPreviewUrl;
  if (!sourceUrl) {
    showProductEditorSnackbar("Image unavailable", "Add a product image before cropping.", "error");
    return;
  }
  const fileName = getEditableProductPhotoFileName(normalizedSlotIndex);
  const existingCropState = productPhotoCropStates[normalizedSlotIndex];
  openPreviewMediaGallery("Crop Image", [{ type: "image", url: sourceUrl, label: "Crop Image" }], 0, {
    showCropGuide: true,
    showCancelAction: true,
    showModelButton: false,
    useItemLabelAsTitle: true,
    primaryActionLabel: "Apply Crop",
    cropAspectRatio: 1,
    initialCropState: existingCropState
      ? { ...existingCropState, sourceUrl }
      : null,
    onSave: ({ croppedImageUrl, selection }) => {
      const croppedFile = createCardCropUploadFile(
        croppedImageUrl,
        fileName,
        `photo-${normalizedSlotIndex + 1}-crop`,
      );
      if (!(croppedFile instanceof File)) {
        showProductEditorSnackbar(
          "Crop failed",
          "The cropped photo could not be prepared. Please try again.",
          "error",
        );
        return;
      }
      if (!getProductPhotoCropSourceUrl(normalizedSlotIndex)) {
        productPhotoCropSourceUrls[normalizedSlotIndex] = sourceUrl;
      }
      productPhotoCropStates[normalizedSlotIndex] = {
        sourceUrl: getProductPhotoCropSourceUrl(normalizedSlotIndex) || sourceUrl,
        sourceFileName: fileName,
        croppedImageUrl,
        positionX: selection?.positionX ?? DEFAULT_CARD_IMAGE_POSITION_X,
        positionY: selection?.positionY ?? DEFAULT_CARD_IMAGE_POSITION,
        zoomPercent: selection?.zoomPercent ?? 0,
        visibleWidthFraction: selection?.visibleWidthFraction ?? 0,
        visibleHeightFraction: selection?.visibleHeightFraction ?? 0,
      };
      applyCroppedProductPhotoPreviewAtSlot(normalizedSlotIndex, croppedFile);
    },
  });
}

async function loadImageEnhancementAvailability({ force = false } = {}) {
  if (!force && imageEnhancementAvailability) {
    return imageEnhancementAvailability;
  }
  if (imageEnhancementAvailabilityPromise) {
    return imageEnhancementAvailabilityPromise;
  }

  imageEnhancementAvailabilityPromise = (async () => {
    const response = await fetch("/api/ai-image-enhancement/status", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to check the AI image API status.");
    }
    imageEnhancementAvailability = {
      configured: Boolean(data.configured),
      launched: Boolean(data.launched),
      available: Boolean(data.available),
      supported: Boolean(data.supported),
      enabled: Boolean(data.enabled),
      provider: String(data.provider || "").trim(),
      providerLabel: String(data.providerLabel || data.provider || "").trim(),
      model: String(data.model || "").trim(),
    };
    return imageEnhancementAvailability;
  })();

  try {
    return await imageEnhancementAvailabilityPromise;
  } finally {
    imageEnhancementAvailabilityPromise = null;
  }
}

async function getEditableProductPhotoSourceFile(slotIndex) {
  const pendingFile = pendingImageFiles[slotIndex];
  if (pendingFile instanceof File) {
    return pendingFile;
  }
  const sourceUrl = String(
    getImageSlotPreviewUrl(slotIndex, editingImageUrls[slotIndex] || ""),
  ).trim();
  if (!sourceUrl) {
    throw new Error("This product image is unavailable.");
  }
  const sourceResponse = await fetch(sourceUrl, { cache: "no-store" });
  if (!sourceResponse.ok) {
    throw new Error("Unable to read the selected product image.");
  }
  const sourceBlob = await sourceResponse.blob();
  if (!String(sourceBlob.type || "").toLowerCase().startsWith("image/")) {
    throw new Error("The selected file is not a supported product image.");
  }
  return new File(
    [sourceBlob],
    getMediaFileName(sourceUrl, `product-image-${slotIndex + 1}.png`),
    { type: sourceBlob.type || "image/png" },
  );
}

async function enhanceEditableProductPhoto(slotIndex) {
  const normalizedSlotIndex = Number(slotIndex);
  compactEditableImageState();
  if (
    !Number.isInteger(normalizedSlotIndex)
    || normalizedSlotIndex < 0
    || !isProductImageSlotPopulated(normalizedSlotIndex)
  ) {
    return false;
  }
  if (isProductImageProcessing()) {
    showProductEditorSnackbar(
      "Please wait",
      "Another product image is still processing.",
    );
    return false;
  }

  const processingSessionId = productImageProcessingSessionId;
  const targetExistingImageUrl = editingImageUrls[normalizedSlotIndex] || "";
  const targetPendingImageFile = pendingImageFiles[normalizedSlotIndex] ?? null;
  const targetPreviewObjectUrl = imagePreviewObjectUrls[normalizedSlotIndex] || "";
  const isTargetImageUnchanged = () => (
    processingSessionId === productImageProcessingSessionId
    && editingImageUrls[normalizedSlotIndex] === targetExistingImageUrl
    && pendingImageFiles[normalizedSlotIndex] === targetPendingImageFile
    && imagePreviewObjectUrls[normalizedSlotIndex] === targetPreviewObjectUrl
  );

  // Lock all image actions before the first await so a double-click, reorder, or
  // delete cannot make the asynchronous result replace a different photo slot.
  processingProductImageSlotIndexes.add(normalizedSlotIndex);
  renderProductImageInputs();
  setStatus("Checking AI", "default");
  setHelperText("Checking whether the AI image API is configured and launched...");

  try {
    let availability;
    try {
      availability = await loadImageEnhancementAvailability({ force: true });
    } catch (error) {
      showProductEditorSnackbar(
        "AI service unavailable",
        error instanceof Error ? error.message : "Unable to check the AI image service.",
        "error",
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("The AI image service status could not be checked. The original image was kept.");
      return false;
    }
    if (!availability.configured || !availability.launched) {
      showProductEditorSnackbar(
        "API required",
        "Configure and launch the AI API in Super Admin > Services > AI Integration.",
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("AI enhancement requires a configured and launched API.");
      return false;
    }
    if (!availability.supported) {
      showProductEditorSnackbar(
        "Photo enhancement unavailable",
        `${availability.providerLabel || "The detected provider"} has no compatible photo editing model. Use an OpenAI or Gemini key with an available image model in Super Admin > Services > AI Integration.`,
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("The active AI provider supports chat but not seller photo enhancement.");
      return false;
    }
    if (!availability.enabled || !availability.available) {
      showProductEditorSnackbar(
        "Photo enhancement disabled",
        "Enable Seller Photo Enhancement in Super Admin > Services > AI Integration.",
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("Seller photo enhancement is disabled in the shared AI Integration.");
      return false;
    }

    let sourceFile;
    try {
      sourceFile = await getEditableProductPhotoSourceFile(normalizedSlotIndex);
    } catch (error) {
      showProductEditorSnackbar(
        "Image unavailable",
        error instanceof Error ? error.message : "Unable to read this product image.",
        "error",
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("The selected image could not be read. The original image was kept.");
      return false;
    }
    if (!isTargetImageUnchanged()) {
      showProductEditorSnackbar(
        "Image changed",
        "The selected image changed before enhancement started. Please try again.",
        "error",
      );
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("No image was replaced because the selected photo changed.");
      return false;
    }

    setStatus("Enhancing", "default");
    setHelperText(`AI is enhancing product image ${normalizedSlotIndex + 1}...`);

    try {
      const response = await fetch("/api/ai-image-enhancement/enhance", {
        method: "POST",
        headers: withProductPanelAdminScopeHeaders({
          Accept: "image/webp, application/json",
          "Content-Type": sourceFile.type || "application/octet-stream",
          "X-File-Name": sourceFile.name || `product-image-${normalizedSlotIndex + 1}.png`,
        }),
        body: sourceFile,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const requestError = new Error(data.message || "Unable to enhance the product photo.");
        requestError.code = String(data.code || "").trim();
        requestError.yoloSafety = data.yoloSafety || null;
        requestError.status = response.status;
        throw requestError;
      }
      const enhancedBlob = await response.blob();
      if (!isTargetImageUnchanged()) {
        return false;
      }
      if (
        !enhancedBlob.size
        || String(enhancedBlob.type || "").split(";")[0].trim().toLowerCase() !== "image/webp"
      ) {
        throw new Error("AI image service returned no enhanced photo.");
      }
      const enhancedFile = new File(
        [enhancedBlob],
        `ai-enhanced-product-image-${normalizedSlotIndex + 1}.webp`,
        { type: "image/webp", lastModified: Date.now() },
      );
      const validationMessage = getProductImageFileValidationMessage(enhancedFile);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      revokePreviewObjectUrl(normalizedSlotIndex);
      clearProductPhotoCropSourceAt(normalizedSlotIndex);
      pendingImageFiles[normalizedSlotIndex] = enhancedFile;
      imagePreviewObjectUrls[normalizedSlotIndex] = URL.createObjectURL(enhancedFile);
      invalidateProductImageCropState(normalizedSlotIndex, {
        sourceUrls: [targetExistingImageUrl, targetPreviewObjectUrl],
      });
      focusPreviewDetailsImageSlot(normalizedSlotIndex);
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText(`Product image ${normalizedSlotIndex + 1} was enhanced and replaced.`);
      showProductEditorSnackbar(
        "Photo enhanced",
        "The AI result replaced this photo. Publish or update the listing to save the change.",
        "success",
      );
      return true;
    } catch (error) {
      const errorCode = String(error?.code || "").trim();
      if (errorCode === "IMAGE_ENHANCEMENT_API_REQUIRED") {
        imageEnhancementAvailability = null;
        showProductEditorSnackbar(
          "API required",
          "Configure and launch the AI API in Super Admin > Services > AI Integration.",
        );
      } else if (errorCode === "IMAGE_ENHANCEMENT_AUTH_REQUIRED") {
        showProductEditorSnackbar(
          "Sign in required",
          "Please sign in again before using AI photo enhancement.",
          "error",
        );
      } else if (errorCode === PRODUCT_ILLEGAL_CONTENT_ERROR_CODE) {
        openProductIllegalContentModal(error?.yoloSafety || null);
      } else {
        showProductEditorSnackbar(
          "Enhancement failed",
          error instanceof Error ? error.message : "Unable to enhance this photo.",
          "error",
        );
      }
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("The original product image was kept unchanged.");
      return false;
    }
  } finally {
    processingProductImageSlotIndexes.delete(normalizedSlotIndex);
    if (processingSessionId === productImageProcessingSessionId) {
      renderProductImageInputs();
    }
  }
}

function setEditableProductPhotoAsCover(slotIndex, thumbnail) {
  if (Number(slotIndex) === 0) {
    return false;
  }
  const promotedAnimationKey = String(thumbnail?.dataset?.animationKey || "").trim();
  const previousPreviewRects = captureProductImagePreviewRects();
  if (!moveEditableImageSlot(slotIndex, 0)) {
    return false;
  }
  focusPreviewDetailsImageSlot(0);
  renderProductImageInputs();
  animateProductImagePreviewReorder(previousPreviewRects, {
    promotedAnimationKey,
    followPromotedImage: true,
  });
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText("Main image updated in the listing and app preview.");
  return true;
}

function createProductPhotoCornerAction({
  label,
  iconMarkup,
  actionName,
  disabled = false,
  modifierClass = "",
  onClick,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `product-photo-thumbnail__action ${modifierClass}`.trim();
  button.dataset.productPhotoAction = String(actionName || "").trim();
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", label);
  button.title = label;
  button.draggable = false;
  button.innerHTML = iconMarkup;
  button.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!button.disabled && typeof onClick === "function") {
      onClick(event);
    }
  });
  return button;
}

function createProductPhotoMenuAction({
  label,
  iconMarkup,
  actionName,
  disabled = false,
  danger = false,
  active = false,
  onClick,
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "product-photo-thumbnail__menu-action";
  button.classList.toggle("is-danger", danger);
  button.classList.toggle("is-active", active);
  button.dataset.productPhotoAction = String(actionName || "").trim();
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", label);
  button.title = label;
  button.draggable = false;
  button.innerHTML = iconMarkup;
  button.addEventListener("dragstart", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!button.disabled && typeof onClick === "function") {
      onClick(event);
    }
  });
  return button;
}

function getPopulatedProductVideoCount() {
  syncEditableVideoState();
  return editingVideoUrls.reduce((count, existingVideoUrl, slotIndex) => {
    const hasExistingVideo = Boolean(String(existingVideoUrl ?? "").trim());
    const hasPendingVideo = Boolean(pendingVideoFiles[slotIndex]);
    return count + (hasExistingVideo || hasPendingVideo ? 1 : 0);
  }, 0);
}

function createProductPhotoAddButton({ disabled = false, isProcessing = false } = {}) {
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "product-description-media__add product-media-dropzone";
  addButton.dataset.productPhotoAdd = "true";
  addButton.disabled = disabled;
  addButton.setAttribute(
    "aria-label",
    disabled
      ? "Maximum of 10 product images reached"
      : isProcessing
        ? "Processing selected product image"
        : "Click or drag to add product photos",
  );
  addButton.innerHTML = getProductMediaDropzoneMarkup({
    title: "Drag &amp; drop photos here",
    isProcessing,
  });
  addButton.addEventListener("click", () => {
    handleAddImageInput();
  });
  return addButton;
}

function createProductVideoAddButton({ disabled = false } = {}) {
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "product-description-media__add product-media-dropzone";
  addButton.dataset.productVideoAdd = "true";
  addButton.disabled = disabled;
  addButton.setAttribute(
    "aria-label",
    disabled ? "Product video limit reached" : "Click or drag to add product video",
  );
  addButton.innerHTML = getProductMediaDropzoneMarkup({
    title: "Drag &amp; drop video here",
  });
  addButton.addEventListener("click", () => {
    handleAddVideoInput();
  });
  return addButton;
}

function renderProductImageInputs() {
  if (!productImageInputList) {
    return;
  }

  cancelProductImageReorderAnimation();
  if (!isProductImageProcessing()) {
    compactEditableImageState();
  }
  productImageInputList.innerHTML = "";
  const populatedImageCount = getPopulatedProductImageCount();
  const hasProcessingImages = isProductImageProcessing();
  const hasReachedImageLimit = populatedImageCount >= PRODUCT_IMAGE_MAX_COUNT;
  const isAddImageDisabled = hasReachedImageLimit || hasProcessingImages;

  if (productPhotoFileInput instanceof HTMLInputElement) {
    productPhotoFileInput.disabled = isAddImageDisabled;
  }

  if (!hasReachedImageLimit) {
    productImageInputList.appendChild(
      createProductPhotoAddButton({
        disabled: isAddImageDisabled,
        isProcessing: hasProcessingImages,
      }),
    );
  }

  if (productPhotoCount) {
    productPhotoCount.textContent = `${populatedImageCount} / ${PRODUCT_IMAGE_MAX_COUNT}`;
  }

  for (const [slotIndex, existingImageUrl] of editingImageUrls.entries()) {
    const pendingImageFile = pendingImageFiles[slotIndex];
    const isSlotProcessing = isProductImageProcessing(slotIndex);
    if (!existingImageUrl && !pendingImageFile) {
      continue;
    }

    const thumbnail = document.createElement("div");
    thumbnail.className = "product-photo-thumbnail";
    thumbnail.classList.toggle("is-processing", isSlotProcessing);
    thumbnail.dataset.slotIndex = String(slotIndex);
    thumbnail.dataset.animationKey = getEditableImagePreviewAnimationKey(
      slotIndex,
      existingImageUrl,
    );
    thumbnail.draggable = !hasProcessingImages && populatedImageCount > 1;
    thumbnail.setAttribute("aria-busy", isSlotProcessing ? "true" : "false");
    thumbnail.setAttribute(
      "aria-label",
      slotIndex === 0 ? "Cover product image" : `Product image ${slotIndex + 1}`,
    );
    if (thumbnail.draggable) {
      thumbnail.classList.add("is-draggable");
    }

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "product-photo-thumbnail__preview";
    preview.setAttribute("aria-label", `View image ${slotIndex + 1}`);
    preview.title = `View image ${slotIndex + 1}`;
    preview.disabled = hasProcessingImages;

    const fallback = document.createElement("span");
    fallback.className = "product-photo-thumbnail__fallback";
    fallback.innerHTML = `<i class="fa-regular fa-image" aria-hidden="true"></i>`;

    const previewImage = document.createElement("img");
    previewImage.alt = slotIndex === 0 ? "Cover product image" : `Product image ${slotIndex + 1}`;
    previewImage.loading = "lazy";
    previewImage.decoding = "async";
    previewImage.draggable = false;
    previewImage.addEventListener("load", () => {
      thumbnail.classList.remove("has-load-error");
      if (!isProductImageProcessing(slotIndex)) {
        thumbnail.querySelector(".product-photo-thumbnail__loading")?.remove();
      }
    });
    previewImage.addEventListener("error", () => {
      thumbnail.classList.add("has-load-error");
      if (!isProductImageProcessing(slotIndex)) {
        thumbnail.querySelector(".product-photo-thumbnail__loading")?.remove();
      }
    });
    preview.append(fallback, previewImage);

    if (isSlotProcessing) {
      const loadingSpinner = document.createElement("div");
      loadingSpinner.className = "product-photo-thumbnail__loading";
      loadingSpinner.innerHTML = `
        <div class="loading-spinner" aria-hidden="true"></div>
        <span>Processing...</span>
      `;
      loadingSpinner.setAttribute("role", "status");
      loadingSpinner.setAttribute("aria-label", "Processing selected image");
      preview.appendChild(loadingSpinner);
    }
    previewImage.src = getImageSlotPreviewUrl(slotIndex, existingImageUrl);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.className = "product-photo-thumbnail__file-input";
    fileInput.accept = "image/jpeg,image/png,image/webp";
    fileInput.dataset.productImageFile = "true";
    fileInput.dataset.slotIndex = String(slotIndex);
    fileInput.hidden = true;
    fileInput.tabIndex = -1;
    fileInput.disabled = hasProcessingImages;
    fileInput.setAttribute("aria-label", `Replace image ${slotIndex + 1}`);

    preview.addEventListener("click", (event) => {
      event.preventDefault();
      openEditableProductPhotoViewer(slotIndex);
    });

    fileInput.addEventListener("change", () => {
      const nextImageFile = fileInput.files?.[0] ?? null;
      fileInput.value = "";
      if (nextImageFile) {
        void replaceProductImageFileAtSlot(slotIndex, nextImageFile);
      }
    });

    if (slotIndex === 0) {
      const coverBadge = document.createElement("span");
      coverBadge.className = "product-photo-thumbnail__cover-badge";
      coverBadge.setAttribute("aria-label", "Cover product image");
      coverBadge.title = "Cover image";
      coverBadge.innerHTML = PRODUCT_PHOTO_COVER_ICON_MARKUP;
      thumbnail.appendChild(coverBadge);
    } else {
      thumbnail.appendChild(
        createProductPhotoCornerAction({
          label: `Set image ${slotIndex + 1} as cover`,
          actionName: "cover",
          modifierClass: "product-photo-thumbnail__set-cover",
          iconMarkup: PRODUCT_PHOTO_COVER_ICON_MARKUP,
          disabled: hasProcessingImages,
          onClick: () => setEditableProductPhotoAsCover(slotIndex, thumbnail),
        }),
      );
    }

    thumbnail.appendChild(
      createProductPhotoCornerAction({
        label: `Delete image ${slotIndex + 1}`,
        actionName: "delete",
        modifierClass: "product-photo-thumbnail__remove",
        iconMarkup: PRODUCT_PHOTO_REMOVE_ICON_MARKUP,
        disabled: hasProcessingImages,
        onClick: () => removeEditableProductImageSlot(slotIndex),
      }),
    );

    const actionMenu = document.createElement("div");
    actionMenu.className = "product-photo-thumbnail__actions";
    actionMenu.setAttribute("role", "toolbar");
    actionMenu.setAttribute("aria-label", `Actions for product image ${slotIndex + 1}`);
    actionMenu.addEventListener("pointerdown", (event) => event.stopPropagation());
    actionMenu.append(
      createProductPhotoMenuAction({
        label: `View image ${slotIndex + 1}`,
        actionName: "view",
        iconMarkup: PRODUCT_PHOTO_VIEW_ICON_MARKUP,
        disabled: hasProcessingImages,
        onClick: () => openEditableProductPhotoViewer(slotIndex),
      }),
      createProductPhotoMenuAction({
        label: `Enhance image ${slotIndex + 1}`,
        actionName: "enhance",
        iconMarkup: PRODUCT_PHOTO_ENHANCE_ICON_MARKUP,
        disabled: hasProcessingImages,
        onClick: () => void enhanceEditableProductPhoto(slotIndex),
      }),
      createProductPhotoMenuAction({
        label: `Crop image ${slotIndex + 1}`,
        actionName: "crop",
        iconMarkup: PRODUCT_PHOTO_CROP_ICON_MARKUP,
        disabled: hasProcessingImages,
        onClick: () => openEditableProductPhotoCropEditor(slotIndex),
      }),
      createProductPhotoMenuAction({
        label: `Replace image ${slotIndex + 1}`,
        actionName: "replace",
        iconMarkup: PRODUCT_PHOTO_REPLACE_ICON_MARKUP,
        disabled: hasProcessingImages,
        onClick: () => {
          fileInput.value = "";
          fileInput.click();
        },
      }),
    );

    thumbnail.addEventListener("dragstart", (event) => {
      if (!thumbnail.draggable) {
        return;
      }

      draggedProductImageSlotIndex = slotIndex;
      thumbnail.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(slotIndex));
      }
    });

    thumbnail.addEventListener("dragover", (event) => {
      if (draggedProductImageSlotIndex < 0) {
        return;
      }

      event.preventDefault();
      updateProductMediaDragPreview(
        productImageInputList,
        ".product-photo-thumbnail",
        draggedProductImageSlotIndex,
        slotIndex,
      );
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    thumbnail.addEventListener("dragleave", (event) => {
      if (event.relatedTarget instanceof Node && thumbnail.contains(event.relatedTarget)) {
        return;
      }
      thumbnail.classList.remove("is-drag-over");
    });

    thumbnail.addEventListener("drop", (event) => {
      event.preventDefault();
      thumbnail.classList.remove("is-drag-over");
      const fromIndex = draggedProductImageSlotIndex;
      const previousPreviewRects = captureProductImagePreviewRects();
      clearProductImageDragState();
      if (!moveEditableImageSlot(fromIndex, slotIndex)) {
        return;
      }

      renderProductImageInputs();
      animateProductImagePreviewReorder(previousPreviewRects);
      setHelperText("Drag images to reorder them. The first slot is your main image.");
      setStatus(editingProductId ? "Editing" : "Adding", "default");
    });

    thumbnail.addEventListener("dragend", () => {
      clearProductImageDragState();
    });

    thumbnail.append(preview, fileInput, actionMenu);
    productImageInputList.appendChild(thumbnail);
  }

  requestProductPhotoCarouselControlSync();
  renderProductVariants();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
}

function handleAddImageInput() {
  compactEditableImageState();
  if (getPopulatedProductImageCount() >= PRODUCT_IMAGE_MAX_COUNT) {
    setHelperText("You can upload up to 10 product images.");
    return;
  }

  const quickAddInput = getQuickAddProductImageInput();
  quickAddInput.value = "";
  quickAddInput.click();
}

function hasProductImageFilesInDragEvent(event) {
  return Array.from(event?.dataTransfer?.types || []).includes("Files");
}

function isProductPhotoUploadDisabled() {
  return Boolean(
    productPhotoFileInput?.disabled ||
      getPopulatedProductImageCount() >= PRODUCT_IMAGE_MAX_COUNT ||
      isProductImageProcessing(),
  );
}

function getProductPhotoDropTarget() {
  return productPhotoCarousel || productImageInputList || addImageInputButton;
}

function getProductVideoDropTarget() {
  return productVideoCarousel || productVideoInputList || addVideoInputButton;
}

function getProductDescriptionDropTarget() {
  return productDescriptionImageCarousel || productDescriptionImageList;
}

function isProductDescriptionUploadDisabled() {
  return Boolean(
    isDescriptionImageProcessing
    || getProductDescriptionImagePreviewUrls().length >= PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT
    || (
      isProductDescriptionModeSwitcherAvailable()
      && getProductDescriptionMode() !== "image"
    ),
  );
}

function isProductDescriptionFileDrag(event) {
  return hasProductImageFilesInDragEvent(event) && draggedDescriptionImageIndex < 0;
}

function handleProductDescriptionDragEnter(event) {
  if (!isProductDescriptionFileDrag(event) || isProductDescriptionUploadDisabled()) {
    return;
  }

  event.preventDefault();
  getProductDescriptionDropTarget()?.classList.add("is-drag-over");
}

function handleProductDescriptionDragOver(event) {
  if (!isProductDescriptionFileDrag(event) || isProductDescriptionUploadDisabled()) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  getProductDescriptionDropTarget()?.classList.add("is-drag-over");
}

function handleProductDescriptionDragLeave(event) {
  const dropTarget = getProductDescriptionDropTarget();
  if (
    event.relatedTarget instanceof Node &&
    dropTarget?.contains(event.relatedTarget)
  ) {
    return;
  }

  dropTarget?.classList.remove("is-drag-over");
}

function handleProductDescriptionDrop(event) {
  if (!isProductDescriptionFileDrag(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  getProductDescriptionDropTarget()?.classList.remove("is-drag-over");

  if (isProductDescriptionUploadDisabled()) {
    const message = `You can upload up to ${PRODUCT_DESCRIPTION_IMAGE_MAX_COUNT} description photos.`;
    setHelperText(message);
    showProductDescriptionUploadSnackbar(message);
    return;
  }

  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  if (droppedFiles.length) {
    void appendProductDescriptionImageFiles(droppedFiles);
  }
}

function handleProductPhotoDragEnter(event) {
  if (!hasProductImageFilesInDragEvent(event) || isProductPhotoUploadDisabled()) {
    return;
  }

  event.preventDefault();
  getProductPhotoDropTarget()?.classList.add("is-drag-over");
}

function handleProductPhotoDragOver(event) {
  if (!hasProductImageFilesInDragEvent(event) || isProductPhotoUploadDisabled()) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  getProductPhotoDropTarget()?.classList.add("is-drag-over");
}

function handleProductPhotoDragLeave(event) {
  const dropTarget = getProductPhotoDropTarget();
  if (
    event.relatedTarget instanceof Node &&
    dropTarget?.contains(event.relatedTarget)
  ) {
    return;
  }

  dropTarget?.classList.remove("is-drag-over");
}

function handleProductPhotoDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  getProductPhotoDropTarget()?.classList.remove("is-drag-over");

  if (isProductPhotoUploadDisabled()) {
    setHelperText("You can upload up to 10 product images.");
    return;
  }

  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  if (droppedFiles.length) {
    void appendProductImageFiles(droppedFiles);
  }
}

function handleAddVideoInput() {
  syncEditableVideoState();

  if (getPopulatedProductVideoCount() >= PRODUCT_VIDEO_MAX_COUNT) {
    const limitMessage = "You can upload only 1 product video.";
    setHelperText(limitMessage);
    showProductVideoUploadRejectedSnackbar(limitMessage);
    return;
  }

  const emptySlotIndex = editingVideoUrls.findIndex((existingVideoUrl, slotIndex) => {
    const hasExistingVideo = Boolean(String(existingVideoUrl ?? "").trim());
    return !hasExistingVideo && !pendingVideoFiles[slotIndex];
  });

  if (emptySlotIndex >= 0 && focusProductVideoSlotPicker(emptySlotIndex)) {
    return;
  }

  const quickAddInput = getQuickAddProductVideoInput();
  quickAddInput.value = "";
  quickAddInput.click();
}

function isProductVideoUploadDisabled() {
  return getPopulatedProductVideoCount() >= PRODUCT_VIDEO_MAX_COUNT;
}

function handleProductVideoDragEnter(event) {
  if (!hasProductImageFilesInDragEvent(event) || isProductVideoUploadDisabled()) {
    return;
  }

  event.preventDefault();
  getProductVideoDropTarget()?.classList.add("is-drag-over");
}

function handleProductVideoDragOver(event) {
  if (!hasProductImageFilesInDragEvent(event) || isProductVideoUploadDisabled()) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  getProductVideoDropTarget()?.classList.add("is-drag-over");
}

function handleProductVideoDragLeave(event) {
  const dropTarget = getProductVideoDropTarget();
  if (
    event.relatedTarget instanceof Node &&
    dropTarget?.contains(event.relatedTarget)
  ) {
    return;
  }

  dropTarget?.classList.remove("is-drag-over");
}

function handleProductVideoDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  getProductVideoDropTarget()?.classList.remove("is-drag-over");

  if (isProductVideoUploadDisabled()) {
    const limitMessage = "You can upload only 1 product video.";
    setHelperText(limitMessage);
    showProductVideoUploadRejectedSnackbar(limitMessage);
    return;
  }

  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  if (droppedFiles.length) {
    appendProductVideoFiles(droppedFiles);
  }
}

function getProductVideoThumbnailFileStem(slotIndex, sourceValue = "") {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : 0;
  const pendingThumbnailFile = pendingVideoThumbnailFiles[normalizedSlotIndex];
  const pendingFileName = String(pendingThumbnailFile?.name ?? "").trim();
  if (pendingFileName) {
    return pendingFileName.replace(/\.[^.]+$/, "").trim() || `product-video-${normalizedSlotIndex + 1}`;
  }

  return (
    getMediaFileName(sourceValue, `product-video-${normalizedSlotIndex + 1}`)
      .replace(/\.[^.]+$/, "")
      .trim() || `product-video-${normalizedSlotIndex + 1}`
  );
}

function getProductVideoCropSourceUrl(slotIndex) {
  return String(productVideoCropSourceUrls[slotIndex] || "").trim();
}

function applyProductVideoThumbnailCrop({
  slotIndex,
  cropSourceUrl = "",
  existingVideoUrl = "",
  previewElement = null,
  statusElement = null,
  removeButton = null,
  thumbnailFileStem = "",
  onCancelAction = null,
  onSaveAction = null,
} = {}) {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  const callerSourceUrl = String(cropSourceUrl ?? "").trim();
  const originalSourceUrl = getProductVideoCropSourceUrl(normalizedSlotIndex) || callerSourceUrl;
  if (normalizedSlotIndex < 0 || !originalSourceUrl) {
    return;
  }

  const resolvedVideoUrl = getVideoSlotPreviewUrl(normalizedSlotIndex, existingVideoUrl);
  if (!resolvedVideoUrl) {
    setHelperText("Add a video first before choosing and cropping its cover.");
    return;
  }

  const fileName =
    String(thumbnailFileStem ?? "").trim() ||
    getProductVideoThumbnailFileStem(normalizedSlotIndex, originalSourceUrl);
  const existingCropState = productVideoCropStates[normalizedSlotIndex];

  openPreviewMediaGallery("Crop Video Cover", [{ type: "image", url: originalSourceUrl, label: "Crop Video Cover" }], 0, {
    showCancelAction: true,
    showCropGuide: true,
    showModelButton: false,
    useItemLabelAsTitle: true,
    primaryActionLabel: "Apply Cover",
    cropAspectRatio: PRODUCT_VIDEO_CARD_ASPECT_RATIO,
    initialCropState: existingCropState
      ? { ...existingCropState, sourceUrl: originalSourceUrl }
      : null,
    onCancelAction: () => {
      onCancelAction?.();
    },
    onSave: ({ croppedImageUrl, selection }) => {
      onSaveAction?.();
      const normalizedCroppedImageUrl = String(croppedImageUrl ?? "").trim();
      if (!normalizedCroppedImageUrl) {
        setHelperText("Cover crop was not applied. Please try again.");
        return;
      }

      const croppedThumbnailFile = createCardCropUploadFile(
        normalizedCroppedImageUrl,
        fileName,
        `video-thumbnail-${normalizedSlotIndex + 1}`,
      );
      if (!croppedThumbnailFile) {
        setStatus("Unable to crop cover.", "danger");
        setHelperText("We couldn't prepare the cropped video cover. Please try again.");
        return;
      }

      if (!getProductVideoCropSourceUrl(normalizedSlotIndex)) {
        productVideoCropSourceUrls[normalizedSlotIndex] = originalSourceUrl;
      }
      productVideoCropStates[normalizedSlotIndex] = {
        sourceUrl: getProductVideoCropSourceUrl(normalizedSlotIndex) || originalSourceUrl,
        sourceFileName: fileName,
        croppedImageUrl: normalizedCroppedImageUrl,
        positionX: selection?.positionX ?? DEFAULT_CARD_IMAGE_POSITION_X,
        positionY: selection?.positionY ?? DEFAULT_CARD_IMAGE_POSITION,
        zoomPercent: selection?.zoomPercent ?? 0,
        visibleWidthFraction: selection?.visibleWidthFraction ?? 0,
        visibleHeightFraction: selection?.visibleHeightFraction ?? 0,
      };

      revokeVideoThumbnailPreviewObjectUrl(normalizedSlotIndex);
      pendingVideoThumbnailFiles[normalizedSlotIndex] = croppedThumbnailFile;
      videoThumbnailPreviewObjectUrls[normalizedSlotIndex] =
        URL.createObjectURL(croppedThumbnailFile);

      if (previewElement && statusElement && removeButton) {
        renderVideoPreviewState(
          previewElement,
          statusElement,
          removeButton,
          normalizedSlotIndex,
          existingVideoUrl,
        );
      } else {
        renderProductVideoInputs();
      }
      renderAndroidProductPreview();
      setHelperText("Cover applied. You can crop again from the same video frame anytime.");
      setStatus(editingProductId ? "Editing" : "Adding", "default");
    },
  });
}

function openProductVideoThumbnailCropEditor({
  slotIndex,
  selectedFile = null,
  existingVideoUrl = "",
  previewElement = null,
  statusElement = null,
  removeButton = null,
} = {}) {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  if (normalizedSlotIndex < 0 || !(selectedFile instanceof File)) {
    return;
  }

  const cropSourceUrl = URL.createObjectURL(selectedFile);
  const cleanupCropSourceUrl = () => {
    try {
      URL.revokeObjectURL(cropSourceUrl);
    } catch (_) {}
  };
  applyProductVideoThumbnailCrop({
    slotIndex: normalizedSlotIndex,
    cropSourceUrl,
    existingVideoUrl,
    previewElement,
    statusElement,
    removeButton,
    thumbnailFileStem:
      String(selectedFile.name || "").replace(/\.[^.]+$/, "").trim() ||
      `product-video-${normalizedSlotIndex + 1}`,
    onCancelAction: cleanupCropSourceUrl,
    onSaveAction: cleanupCropSourceUrl,
  });
}

function openExistingProductVideoThumbnailCropEditor({
  slotIndex,
  existingVideoUrl = "",
  existingThumbnailUrl = "",
  previewElement = null,
  statusElement = null,
  removeButton = null,
} = {}) {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  if (normalizedSlotIndex < 0) {
    return;
  }

  const cropSourceUrl = getVideoThumbnailSlotPreviewUrl(
    normalizedSlotIndex,
    existingThumbnailUrl,
  );
  if (!cropSourceUrl) {
    setHelperText("Add a video cover first before editing its crop.");
    return;
  }

  applyProductVideoThumbnailCrop({
    slotIndex: normalizedSlotIndex,
    cropSourceUrl,
    existingVideoUrl,
    previewElement,
    statusElement,
    removeButton,
    thumbnailFileStem: getProductVideoThumbnailFileStem(
      normalizedSlotIndex,
      cropSourceUrl,
    ),
  });
}

function captureProductVideoFrameUrl(slotIndex) {
  const row = productVideoInputList?.querySelector(
    `.product-video-upload-card[data-slot-index="${slotIndex}"]`,
  );
  const video = row?.querySelector(".product-video-upload-card__media video");
  if (!(video instanceof HTMLVideoElement) || video.readyState < 2 || !video.videoWidth) {
    return "";
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (_) {
    return "";
  }
}

function openEditableProductVideoViewer(slotIndex) {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  const existingVideoUrl = String(editingVideoUrls[normalizedSlotIndex] ?? "").trim();
  const previewUrl = String(
    getVideoSlotPreviewUrl(normalizedSlotIndex, existingVideoUrl),
  ).trim();
  if (!previewUrl) {
    showProductEditorSnackbar(
      "Video unavailable",
      "This product video cannot be opened.",
      "error",
    );
    return;
  }

  const pendingFileName = String(pendingVideoFiles[normalizedSlotIndex]?.name ?? "").trim();
  const fileName =
    pendingFileName ||
    getMediaFileName(previewUrl || existingVideoUrl, `video-${normalizedSlotIndex + 1}`);
  const thumbnailUrl = String(
    getVideoThumbnailSlotPreviewUrl(
      normalizedSlotIndex,
      editingVideoThumbnailUrls[normalizedSlotIndex] || "",
    ),
  ).trim();

  const playbackCropState = productVideoCropStates[normalizedSlotIndex];
  openPreviewMediaGallery(
    fileName,
    [
      {
        type: "video",
        url: previewUrl,
        thumbnailUrl,
        label: fileName,
      },
    ],
    0,
    {
      showActions: false,
      showModelButton: false,
      useItemLabelAsTitle: true,
      showZoom: false,
      autoplay: true,
      cropAspectRatio: PRODUCT_VIDEO_CARD_ASPECT_RATIO,
      initialCropState: playbackCropState
        ? {
            ...playbackCropState,
            sourceUrl: previewUrl,
          }
        : null,
    },
  );
}

function openEditableProductVideoCropEditor(slotIndex) {
  const normalizedSlotIndex = Number.isFinite(Number(slotIndex))
    ? Math.max(0, Math.round(Number(slotIndex)))
    : -1;
  if (normalizedSlotIndex < 0) {
    return;
  }

  const existingVideoUrl = String(editingVideoUrls[normalizedSlotIndex] ?? "").trim();
  const previewUrl = getVideoSlotPreviewUrl(normalizedSlotIndex, existingVideoUrl);
  if (!previewUrl) {
    showProductEditorSnackbar(
      "Video unavailable",
      "Add a product video before cropping.",
      "error",
    );
    return;
  }

  const cropSourceUrl =
    getProductVideoCropSourceUrl(normalizedSlotIndex) ||
    captureProductVideoFrameUrl(normalizedSlotIndex);
  if (!cropSourceUrl) {
    showProductEditorSnackbar(
      "Crop unavailable",
      "Wait for the video preview to load, then try cropping again.",
      "error",
    );
    return;
  }

  applyProductVideoThumbnailCrop({
    slotIndex: normalizedSlotIndex,
    cropSourceUrl,
    existingVideoUrl,
    thumbnailFileStem: getProductVideoThumbnailFileStem(
      normalizedSlotIndex,
      cropSourceUrl,
    ),
  });
}

function renderProductVideoInputs() {
  if (!productVideoInputList) {
    return;
  }

  syncEditableVideoState();
  productVideoInputList.innerHTML = "";
  const usesVideoUploadCardLayout = productVideoInputList.classList.contains(
    "product-video-file-list",
  );
  const populatedVideoCount = getPopulatedProductVideoCount();
  const hasReachedVideoLimit = populatedVideoCount >= PRODUCT_VIDEO_MAX_COUNT;

  if (productVideoFileInput instanceof HTMLInputElement) {
    productVideoFileInput.disabled = hasReachedVideoLimit;
  }

  if (!hasReachedVideoLimit) {
    productVideoInputList.appendChild(
      createProductVideoAddButton({ disabled: hasReachedVideoLimit }),
    );
  }

  if (productVideoCount) {
    productVideoCount.textContent = `${populatedVideoCount} / ${PRODUCT_VIDEO_MAX_COUNT}`;
  }

  if (!populatedVideoCount) {
    requestProductVideoCarouselControlSync();
    renderAndroidProductPreview();
    syncProductFormSubmitState();
    return;
  }

  for (const [slotIndex, existingVideoUrl] of editingVideoUrls.entries()) {
    const pendingVideoFile = pendingVideoFiles[slotIndex];
    const hasExistingVideo = Boolean(String(existingVideoUrl ?? "").trim());
    if (!hasExistingVideo && !pendingVideoFile) {
      continue;
    }

    const row = document.createElement("div");
    row.className = "product-image-input-row";
    if (usesVideoUploadCardLayout) {
      row.classList.add("product-video-upload-card");
      row.dataset.animationKey = getEditableVideoPreviewAnimationKey(
        slotIndex,
        existingVideoUrl,
      );
    }
    row.dataset.slotIndex = String(slotIndex);
    row.draggable = false;

    const field = document.createElement(usesVideoUploadCardLayout ? "div" : "label");
    field.className = "product-image-input-row__field";

    const fieldLabel = document.createElement("span");
    fieldLabel.textContent = `Product video ${slotIndex + 1}`;
    if (usesVideoUploadCardLayout) {
      fieldLabel.className = "product-video-upload-card__slot-label";
    }

    const preview = document.createElement("div");
    preview.className = "product-image-input-row__preview product-image-input-row__preview--filename-only";
    if (usesVideoUploadCardLayout) {
      preview.classList.add("product-video-upload-card__preview");
    }
    preview.setAttribute("role", "button");
    preview.tabIndex = 0;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.className = "product-image-input-row__file-input";
    fileInput.accept = ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm";
    fileInput.dataset.productVideoFile = "true";
    fileInput.dataset.slotIndex = String(slotIndex);
    fileInput.setAttribute("aria-label", `Upload product video ${slotIndex + 1}`);
    if (!usesVideoUploadCardLayout) {
      bindImagePreviewPicker(preview, fileInput);
    }

    const thumbnailInput = document.createElement("input");
    thumbnailInput.type = "file";
    thumbnailInput.className = "product-image-input-row__file-input";
    thumbnailInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    thumbnailInput.dataset.productVideoThumbnailFile = "true";
    thumbnailInput.dataset.slotIndex = String(slotIndex);
    thumbnailInput.setAttribute("aria-label", `Upload cover photo for product video ${slotIndex + 1}`);

    const status = document.createElement("span");
    status.className = "product-image-input-row__status";

    const actions = document.createElement("div");
    actions.className = "product-image-input-row__actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className =
      "ghost-button icon-action-button icon-action-button--danger product-image-input-row__remove";
    removeButton.setAttribute("aria-label", `Remove product video ${slotIndex + 1}`);
    removeButton.title = `Remove product video ${slotIndex + 1}`;
    removeButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;

    fileInput.addEventListener("change", () => {
      const nextVideoFile = fileInput.files?.[0] ?? null;
      fileInput.value = "";
      if (!nextVideoFile) {
        return;
      }

      const validationError = getProductVideoFileValidationError(nextVideoFile);
      if (validationError) {
        setHelperText(validationError);
        showProductVideoUploadRejectedSnackbar(validationError);
        return;
      }

      revokeVideoPreviewObjectUrl(slotIndex);
      pendingVideoFiles[slotIndex] = nextVideoFile;
      videoPreviewObjectUrls[slotIndex] = URL.createObjectURL(nextVideoFile);
      startPendingProductVideoUpload(slotIndex, nextVideoFile, { force: true });

      renderVideoPreviewState(
        preview,
        status,
        removeButton,
        slotIndex,
        existingVideoUrl,
      );
      renderAndroidProductPreview();
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setHelperText("The replacement video is uploading now so Publish will finish faster.");
    });

    thumbnailInput.addEventListener("change", () => {
      const nextThumbnailFile = thumbnailInput.files?.[0] ?? null;
      thumbnailInput.value = "";
      if (!nextThumbnailFile) {
        return;
      }

      openProductVideoThumbnailCropEditor({
        slotIndex,
        selectedFile: nextThumbnailFile,
        existingVideoUrl,
        previewElement: preview,
        statusElement: status,
        removeButton,
      });
    });

    removeButton.addEventListener("click", () => {
      requestRemoveEditableProductVideoSlot(slotIndex);
    });

    row.addEventListener("dragstart", (event) => {
      if (!row.draggable) {
        return;
      }

      draggedProductVideoSlotIndex = slotIndex;
      row.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(slotIndex));
      }
    });

    row.addEventListener("dragover", (event) => {
      if (draggedProductVideoSlotIndex < 0) {
        return;
      }

      event.preventDefault();
      updateProductMediaDragPreview(
        productVideoInputList,
        ".product-video-upload-card",
        draggedProductVideoSlotIndex,
        slotIndex,
      );
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    row.addEventListener("dragleave", (event) => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }
      row.classList.remove("is-drag-over");
    });

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drag-over");
      const fromIndex = draggedProductVideoSlotIndex;
      const previousPreviewRects = captureProductVideoPreviewRects();
      clearProductVideoDragState();
      if (!moveEditableVideoSlot(fromIndex, slotIndex)) {
        return;
      }

      renderProductVideoInputs();
      animateProductVideoPreviewReorder(previousPreviewRects);
      setHelperText("Drag videos to reorder them.");
      setStatus(editingProductId ? "Editing" : "Adding", "default");
    });

    row.addEventListener("dragend", () => {
      clearProductVideoDragState();
    });

    renderVideoPreviewState(
      preview,
      status,
      removeButton,
      slotIndex,
      existingVideoUrl,
    );
    field.append(fieldLabel, preview, fileInput, thumbnailInput, status);
    if (usesVideoUploadCardLayout) {
      row.append(field);
    } else {
      actions.append(removeButton);
      row.append(field, actions);
    }
    productVideoInputList.appendChild(row);
    updateProductVideoUploadTaskUi(getPendingProductVideoUploadTask(slotIndex));
  }

  requestProductVideoCarouselControlSync();
  renderAndroidProductPreview();
  syncProductFormSubmitState();
}

function createEditableVariantEditorKey() {
  nextEditableVariantEditorKey += 1;
  return `editable-variant-${nextEditableVariantEditorKey}`;
}

function createEmptyEditableVariant() {
  return {
    editorKey: createEditableVariantEditorKey(),
    id: "",
    name: "",
    imageUrl: "",
    imageSourceUrl: "",
    pendingImageFile: null,
    previewObjectUrl: "",
    cropSourceUrl: "",
    croppedImageUrl: "",
    imagePositionX: DEFAULT_CARD_IMAGE_POSITION_X,
    imagePositionY: DEFAULT_CARD_IMAGE_POSITION,
    addOns: [],
    addOnSearchTerm: "",
    isAddOnPickerOpen: false,
    isExpanded: true,
    originalPrice: "",
    salesPrice: "",
  };
}

function normalizeEditableVariants(variants = []) {
  if (!Array.isArray(variants) || !variants.length) {
    return [];
  }

  return variants.map((variant) => ({
    editorKey: String(variant?.editorKey ?? "").trim() || createEditableVariantEditorKey(),
    id: String(variant?.id ?? ""),
    name: String(variant?.name ?? "").trim(),
    imageUrl: String(variant?.imageUrl ?? "").trim(),
    imageSourceUrl: String(variant?.imageSourceUrl ?? "").trim(),
    pendingImageFile: null,
    previewObjectUrl: "",
    cropSourceUrl:
      String(variant?.imageSourceUrl ?? "").trim() || String(variant?.imageUrl ?? "").trim(),
    croppedImageUrl:
      String(variant?.imageSourceUrl ?? "").trim() &&
      String(variant?.imageUrl ?? "").trim() &&
      String(variant?.imageSourceUrl ?? "").trim().toLowerCase() !==
        String(variant?.imageUrl ?? "").trim().toLowerCase()
        ? String(variant?.imageUrl ?? "").trim()
        : "",
    imagePositionX: normalizeCardImagePosition(
      variant?.imagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    imagePositionY: normalizeCardImagePosition(
      variant?.imagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    ),
    addOns: Array.isArray(variant?.addOns)
      ? variant.addOns
          .map((addOn) => ({
            id: String(addOn?.id ?? "").trim(),
            name: String(addOn?.name ?? "").trim(),
            quantity:
              Number.isInteger(Number(addOn?.quantity)) && Number(addOn?.quantity) > 0
                ? Number(addOn.quantity)
                : 1,
          }))
          .filter((addOn) => addOn.id && addOn.name)
      : [],
    addOnSearchTerm: "",
    isAddOnPickerOpen: false,
    isExpanded: false,
    originalPrice:
      variant?.originalPrice === null || variant?.originalPrice === undefined
        ? ""
        : String(variant.originalPrice),
    salesPrice:
      variant?.salesPrice === null || variant?.salesPrice === undefined
        ? ""
        : String(variant.salesPrice),
  }));
}

function syncEditableVariants() {
  editingVariants = (Array.isArray(editingVariants) ? editingVariants : []).map((variant) => ({
    ...createEmptyEditableVariant(),
    ...variant,
  }));
}

function getVariantPreviewUrl(variant) {
  return (
    String(variant?.previewObjectUrl ?? "").trim() ||
    String(variant?.cropSourceUrl ?? "").trim() ||
    String(variant?.imageSourceUrl ?? "").trim() ||
    String(variant?.imageUrl ?? "").trim()
  );
}

function getVariantPreviewCroppedImageUrl(variant) {
  const sourceImageUrl = getVariantPreviewUrl(variant);
  const cropSourceUrl = String(variant?.cropSourceUrl ?? "").trim();
  const croppedImageUrl = String(variant?.croppedImageUrl ?? "").trim();
  if (!sourceImageUrl || !cropSourceUrl || !croppedImageUrl) {
    return "";
  }

  return sourceImageUrl.toLowerCase() === cropSourceUrl.toLowerCase() ? croppedImageUrl : "";
}

function getVariantDisplayPreviewUrl(variant) {
  return (
    getVariantPreviewCroppedImageUrl(variant) ||
    String(variant?.previewObjectUrl ?? "").trim() ||
    String(variant?.imageUrl ?? "").trim()
  );
}

function getEditableVariantSummaryStatus(variant) {
  const hasName = Boolean(String(variant?.name ?? "").trim());
  const hasSalesPrice = Boolean(String(variant?.salesPrice ?? "").trim());
  if (hasName && hasSalesPrice) {
    return { label: "Ready", tone: "ready" };
  }
  if (hasName || hasSalesPrice || getVariantDisplayPreviewUrl(variant)) {
    return { label: "Draft", tone: "draft" };
  }
  return { label: "Incomplete", tone: "incomplete" };
}

function formatEditableVariantPriceLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || String(value ?? "").trim() === "") {
    return "—";
  }
  return formatPrice(amount);
}

function createVariantSummaryFact(iconMarkup, label, valueNode) {
  const fact = document.createElement("span");
  fact.className = "product-variant-row__fact";

  const icon = document.createElement("span");
  icon.className = "product-variant-row__fact-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = iconMarkup;

  const copy = document.createElement("span");
  copy.className = "product-variant-row__fact-copy";

  const labelEl = document.createElement("span");
  labelEl.className = "product-variant-row__fact-label";
  labelEl.textContent = `${label}:`;

  const valueEl = document.createElement("span");
  valueEl.className = "product-variant-row__fact-value";
  if (typeof valueNode === "string") {
    valueEl.textContent = valueNode;
  } else if (valueNode instanceof Node) {
    valueEl.appendChild(valueNode);
  }

  copy.append(labelEl, valueEl);
  fact.append(icon, copy);
  return fact;
}

function buildProductVariantSummaryCard(variant, variantIndex) {
  const card = document.createElement("span");
  card.className = "product-variant-row__card";

  const thumb = document.createElement("span");
  thumb.className = "product-variant-row__thumb";
  const previewUrl = getVariantDisplayPreviewUrl(variant);
  if (previewUrl) {
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = "";
    image.loading = "lazy";
    thumb.appendChild(image);
  } else {
    thumb.classList.add("is-empty");
    thumb.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    `;
  }

  const body = document.createElement("span");
  body.className = "product-variant-row__card-body";

  const title = document.createElement("span");
  title.className = "product-variant-row__summary-title";
  title.textContent = String(variant?.name ?? "").trim() || `Variant ${variantIndex + 1}`;

  const meta = document.createElement("span");
  meta.className = "product-variant-row__summary-meta";
  const variantId = String(variant?.id ?? "").trim();
  meta.textContent = variantId
    ? `SKU: ${variantId}`
    : `Variant ${variantIndex + 1}`;

  const facts = document.createElement("span");
  facts.className = "product-variant-row__facts";

  const priceIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-5a2.5 2.5 0 0 0 0 5h2a2.5 2.5 0 0 1 0 5H8"/><path d="M12 6v2m0 8v2"/></svg>`;
  const addOnIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>`;
  const statusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

  const addOnCount = Array.isArray(variant?.addOns) ? variant.addOns.length : 0;
  const status = getEditableVariantSummaryStatus(variant);
  const statusBadge = document.createElement("span");
  statusBadge.className = `product-variant-row__status product-variant-row__status--${status.tone}`;
  statusBadge.textContent = status.label;

  facts.append(
    createVariantSummaryFact(
      priceIcon,
      "Price",
      `${formatEditableVariantPriceLabel(variant?.salesPrice || variant?.originalPrice)}`,
    ),
    createVariantSummaryFact(
      addOnIcon,
      "Add-ons",
      addOnCount > 0 ? `${addOnCount} selected` : "None",
    ),
    createVariantSummaryFact(statusIcon, "Status", statusBadge),
  );

  body.append(title, meta, facts);
  card.append(thumb, body);
  return card;
}

function getVariantPreviewCropState(variant) {
  const sourceUrl = getVariantPreviewUrl(variant);
  if (!sourceUrl) {
    return null;
  }

  const croppedImageUrl = getVariantPreviewCroppedImageUrl(variant);
  if (!croppedImageUrl) {
    return {
      sourceUrl,
      croppedImageUrl: "",
      positionX: normalizeCardImagePosition(
        variant?.imagePositionX,
        DEFAULT_CARD_IMAGE_POSITION_X,
      ),
      positionY: normalizeCardImagePosition(
        variant?.imagePositionY,
        DEFAULT_CARD_IMAGE_POSITION,
      ),
    };
  }

  return {
    sourceUrl,
    croppedImageUrl,
    positionX: normalizeCardImagePosition(
      variant?.imagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    positionY: normalizeCardImagePosition(
      variant?.imagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    ),
  };
}

function clearVariantPreviewCrop(variantIndex) {
  if (
    !Number.isInteger(Number(variantIndex)) ||
    variantIndex < 0 ||
    variantIndex >= editingVariants.length
  ) {
    return;
  }

  editingVariants[variantIndex].cropSourceUrl = "";
  editingVariants[variantIndex].croppedImageUrl = "";
  editingVariants[variantIndex].imagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
  editingVariants[variantIndex].imagePositionY = DEFAULT_CARD_IMAGE_POSITION;
}

function isVariantAddOnInventoryProduct(product) {
  const productId = String(product?.id ?? "").trim();
  const approvalStatus = String(product?.approvalStatus ?? "").trim().toLowerCase();
  return Boolean(productId) && (approvalStatus === "approved" || approvalStatus === "accepted");
}

function getVariantAddOnCandidates() {
  const editingProductKey = String(editingProductId ?? "").trim().toLowerCase();
  return (Array.isArray(currentProducts) ? currentProducts : []).filter((product) => {
    const productId = String(product?.id ?? "").trim();
    return (
      isVariantAddOnInventoryProduct(product)
      && productId.toLowerCase() !== editingProductKey
    );
  });
}

function filterVariantAddOnsToCurrentInventory(addOns = []) {
  const inventoryProductsById = new Map(
    getVariantAddOnCandidates().map((product) => [
      String(product?.id ?? "").trim().toLowerCase(),
      product,
    ]),
  );
  const seenProductIds = new Set();

  return (Array.isArray(addOns) ? addOns : []).reduce((filteredAddOns, addOn) => {
    const addOnId = String(addOn?.id ?? "").trim().toLowerCase();
    const inventoryProduct = inventoryProductsById.get(addOnId);
    if (!addOnId || !inventoryProduct || seenProductIds.has(addOnId)) {
      return filteredAddOns;
    }

    seenProductIds.add(addOnId);
    filteredAddOns.push({
      id: String(inventoryProduct.id ?? "").trim(),
      name: String(inventoryProduct.name ?? "").trim() || "Unnamed Product",
      quantity:
        Number.isInteger(Number(addOn?.quantity)) && Number(addOn.quantity) > 0
          ? Number(addOn.quantity)
          : 1,
    });
    return filteredAddOns;
  }, []);
}

function syncEditableVariantAddOnsWithInventory() {
  editingVariants = (Array.isArray(editingVariants) ? editingVariants : []).map((variant) => ({
    ...variant,
    addOns: filterVariantAddOnsToCurrentInventory(variant?.addOns),
  }));
}

function renderVariantImagePreviewState(
  dropzone,
  statusElement,
  removeButton,
  variantIndex,
) {
  const variant = editingVariants[variantIndex] ?? createEmptyEditableVariant();
  const pendingImageFile = variant.pendingImageFile;
  const existingImageUrl = String(variant.imageUrl ?? "").trim();
  const previewUrl = getVariantDisplayPreviewUrl(variant);
  const hasImage = Boolean(previewUrl);

  dropzone.classList.toggle("has-image", hasImage);
  dropzone.classList.remove("is-drag-over");

  const emptyState = dropzone.querySelector("[data-variant-image-empty]");
  const previewShell = dropzone.querySelector("[data-variant-image-preview]");
  const previewImage = dropzone.querySelector("[data-variant-image-preview-img]");

  if (emptyState instanceof HTMLElement) {
    emptyState.hidden = hasImage;
  }
  if (previewShell instanceof HTMLElement) {
    previewShell.hidden = !hasImage;
  }
  if (previewImage instanceof HTMLImageElement) {
    if (hasImage) {
      previewImage.src = previewUrl;
      previewImage.alt = String(variant.name ?? "").trim() || `Variant ${variantIndex + 1} image`;
    } else {
      previewImage.removeAttribute("src");
      previewImage.alt = "";
    }
  }

  if (statusElement instanceof HTMLElement) {
    statusElement.textContent = pendingImageFile
      ? "Selected file will upload when you save this product."
      : "";
    statusElement.hidden = !pendingImageFile;
  }
  if (removeButton instanceof HTMLButtonElement) {
    removeButton.hidden = !existingImageUrl && !pendingImageFile;
    removeButton.disabled = !existingImageUrl && !pendingImageFile;
  }
}

async function applyVariantImageFile(variantIndex, nextImageFile, ui = {}) {
  const {
    dropzone = null,
    statusElement = null,
    removeButton = null,
    imageInput = null,
  } = ui;

  revokeVariantPreviewObjectUrl(variantIndex);
  clearVariantPreviewCrop(variantIndex);

  if (nextImageFile) {
    if (statusElement instanceof HTMLElement) {
      statusElement.hidden = false;
      statusElement.textContent = "Checking image safety...";
    }
    const safety = await checkProductImageFileSafety(nextImageFile);
    if (isProductImageSafetyBlocked(safety)) {
      if (imageInput instanceof HTMLInputElement) {
        imageInput.value = "";
      }
      editingVariants[variantIndex].pendingImageFile = null;
      editingVariants[variantIndex].imageSourceUrl = "";
      editingVariants[variantIndex].previewObjectUrl = "";
      renderVariantImagePreviewState(dropzone, statusElement, removeButton, variantIndex);
      renderAndroidProductPreview();
      syncProductFormSubmitState();
      setStatus("Illegal Content", "error");
      setHelperText("This variant image was rejected by YOLO and cannot be uploaded.");
      openProductIllegalContentModal(safety);
      return false;
    }
    if (safety?.requiresReview === true) {
      setHelperText("This variant image will be reviewed by Super Admin before listing.");
    }
  }

  editingVariants[variantIndex].pendingImageFile = nextImageFile;
  editingVariants[variantIndex].imageSourceUrl = "";
  if (nextImageFile) {
    editingVariants[variantIndex].previewObjectUrl = URL.createObjectURL(nextImageFile);
  } else {
    editingVariants[variantIndex].previewObjectUrl = "";
  }

  renderVariantImagePreviewState(dropzone, statusElement, removeButton, variantIndex);
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  return true;
}

function buildVariantImageDropzone(variantIndex) {
  const field = document.createElement("div");
  field.className = "product-variant-row__field product-variant-row__image-field";

  const labelText = document.createElement("span");
  labelText.textContent = "Variant Image";

  const dropzone = document.createElement("label");
  dropzone.className = "product-photo-dropzone product-variant-image-dropzone";
  dropzone.dataset.variantIndex = String(variantIndex);
  dropzone.dataset.variantField = "image";

  const emptyState = document.createElement("span");
  emptyState.className = "product-variant-image-dropzone__empty";
  emptyState.dataset.variantImageEmpty = "true";
  emptyState.innerHTML = `
    <span class="product-photo-dropzone__icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
        <path d="M12 13v8" />
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
        <path d="m8 17 4-4 4 4" />
      </svg>
    </span>
    <strong>Drag &amp; drop photos here</strong>
    <span class="product-photo-dropzone__or">or</span>
    <span class="product-photo-dropzone__browse">Browse Files</span>
  `;

  const previewShell = document.createElement("span");
  previewShell.className = "product-variant-image-dropzone__preview";
  previewShell.dataset.variantImagePreview = "true";
  previewShell.hidden = true;

  const previewImage = document.createElement("img");
  previewImage.dataset.variantImagePreviewImg = "true";
  previewImage.alt = "";
  previewShell.appendChild(previewImage);

  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.className = "product-photo-dropzone__native-input";
  imageInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  imageInput.setAttribute("aria-label", `Upload variant image ${variantIndex + 1}`);

  const statusElement = document.createElement("span");
  statusElement.className = "product-variant-image-dropzone__status";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "product-variant-image-dropzone__remove";
  removeButton.setAttribute("aria-label", `Remove variant image ${variantIndex + 1}`);
  removeButton.title = `Remove variant image ${variantIndex + 1}`;
  removeButton.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `;
  removeButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProductDeleteConfirmationModal(`variant image ${variantIndex + 1}`, () => {
      revokeVariantPreviewObjectUrl(variantIndex);
      clearVariantPreviewCrop(variantIndex);
      editingVariants[variantIndex].pendingImageFile = null;
      editingVariants[variantIndex].imageUrl = "";
      editingVariants[variantIndex].imageSourceUrl = "";
      if (imageInput instanceof HTMLInputElement) {
        imageInput.value = "";
      }
      renderVariantImagePreviewState(dropzone, statusElement, removeButton, variantIndex);
      renderAndroidProductPreview();
      syncProductFormSubmitState();
    });
  });

  const preventDefaults = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, preventDefaults);
  });
  dropzone.addEventListener("dragenter", () => {
    dropzone.classList.add("is-drag-over");
  });
  dropzone.addEventListener("dragover", () => {
    dropzone.classList.add("is-drag-over");
  });
  dropzone.addEventListener("dragleave", (event) => {
    if (event.relatedTarget instanceof Node && dropzone.contains(event.relatedTarget)) {
      return;
    }
    dropzone.classList.remove("is-drag-over");
  });
  dropzone.addEventListener("drop", (event) => {
    dropzone.classList.remove("is-drag-over");
    const nextImageFile = Array.from(event.dataTransfer?.files || []).find((file) =>
      String(file?.type || "").startsWith("image/"),
    ) ?? null;
    if (!nextImageFile) {
      return;
    }
    void applyVariantImageFile(variantIndex, nextImageFile, {
      dropzone,
      statusElement,
      removeButton,
      imageInput,
    });
  });

  imageInput.addEventListener("change", () => {
    void applyVariantImageFile(variantIndex, imageInput.files?.[0] ?? null, {
      dropzone,
      statusElement,
      removeButton,
      imageInput,
    });
  });

  dropzone.append(emptyState, previewShell, imageInput, removeButton);
  field.append(labelText, dropzone, statusElement);
  renderVariantImagePreviewState(dropzone, statusElement, removeButton, variantIndex);
  return field;
}

function getEditableVariantAnimationKey(variant) {
  return String(variant?.editorKey ?? "").trim();
}

function captureProductVariantRowRects() {
  if (!productVariantList) {
    return new Map();
  }

  const rects = new Map();
  productVariantList
    .querySelectorAll(".product-variant-row")
    .forEach((row) => {
      const animationKey = String(row.dataset.animationKey ?? "").trim();
      if (!animationKey) {
        return;
      }

      rects.set(animationKey, row.getBoundingClientRect());
    });
  return rects;
}

function animateProductVariantReorder(previousRects) {
  if (!productVariantList || !(previousRects instanceof Map) || !previousRects.size) {
    return;
  }

  const rows = Array.from(productVariantList.querySelectorAll(".product-variant-row"));
  if (!rows.length) {
    return;
  }

  window.requestAnimationFrame(() => {
    rows.forEach((row) => {
      const animationKey = String(row.dataset.animationKey ?? "").trim();
      if (!animationKey || !previousRects.has(animationKey)) {
        return;
      }

      const previousRect = previousRects.get(animationKey);
      const nextRect = row.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      row.style.transition = "none";
      row.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      row.style.zIndex = "3";

      window.requestAnimationFrame(() => {
        row.style.transition =
          "transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease";
        row.style.transform = "translate(0px, 0px)";

        const cleanup = () => {
          row.style.removeProperty("transition");
          row.style.removeProperty("transform");
          row.style.removeProperty("z-index");
          row.removeEventListener("transitionend", cleanup);
        };

        row.addEventListener("transitionend", cleanup);
      });
    });
  });
}

function clearProductVariantDragState() {
  draggedProductVariantIndex = -1;
  if (!productVariantList) {
    return;
  }

  productVariantList
    .querySelectorAll(".product-variant-row.is-dragging, .product-variant-row.is-drag-over")
    .forEach((row) => row.classList.remove("is-dragging", "is-drag-over"));
}

function moveEditableVariant(fromIndex, toIndex) {
  syncEditableVariants();
  const maxIndex = editingVariants.length - 1;
  const normalizedFromIndex = Math.max(0, Math.min(Number(fromIndex) || 0, maxIndex));
  const normalizedToIndex = Math.max(0, Math.min(Number(toIndex) || 0, maxIndex));

  if (
    normalizedFromIndex === normalizedToIndex ||
    normalizedFromIndex < 0 ||
    normalizedToIndex < 0 ||
    !editingVariants.length
  ) {
    return false;
  }

  const [movedVariant] = editingVariants.splice(normalizedFromIndex, 1);
  editingVariants.splice(normalizedToIndex, 0, movedVariant);
  return true;
}

function renderProductVariants() {
  if (!productVariantList) {
    return;
  }

  syncEditableVariants();
  productVariantList.innerHTML = "";

  if (!editingVariants.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state product-media-empty-state";

    const optionalLabel = document.createElement("span");
    optionalLabel.className = "product-media-empty-state__optional";
    optionalLabel.textContent = "Optional";

    const emptyTitle = document.createElement("strong");
    emptyTitle.textContent = "No variants added yet.";

    const emptyCopy = document.createElement("span");
    emptyCopy.textContent = "Tap Add Variant if you want to include product variants.";

    emptyState.append(optionalLabel, emptyTitle, emptyCopy);
    productVariantList.appendChild(emptyState);
    syncProductDetailsVariantsToggleState();
    return;
  }

  for (const [variantIndex, variant] of editingVariants.entries()) {
    const row = document.createElement("div");
    row.className = "product-variant-row";
    row.classList.toggle("is-collapsed", !variant.isExpanded);
    row.dataset.animationKey = getEditableVariantAnimationKey(variant);
    row.dataset.variantIndex = String(variantIndex);
    row.dataset.variantId = String(variant.id ?? "").trim();
    row.dataset.variantName = String(variant.name ?? "").trim();

    const header = document.createElement("div");
    header.className = "product-variant-row__header";

    const canMoveVariant = !variant.isExpanded && editingVariants.length > 1;
    row.classList.toggle("is-draggable", canMoveVariant);

    const dragHandle = document.createElement("span");
    dragHandle.className = "product-variant-row__drag-handle product-image-input-row__drag-handle";
    dragHandle.hidden = !canMoveVariant;
    dragHandle.draggable = canMoveVariant;
    dragHandle.setAttribute("aria-hidden", "true");
    dragHandle.title = canMoveVariant ? `Move variant ${variantIndex + 1}` : "";
    for (let dotIndex = 0; dotIndex < 6; dotIndex += 1) {
      const dot = document.createElement("span");
      dot.className = "product-image-input-row__drag-dot";
      dragHandle.appendChild(dot);
    }
    dragHandle.addEventListener("dragstart", (event) => {
      if (!canMoveVariant) {
        event.preventDefault();
        return;
      }

      draggedProductVariantIndex = variantIndex;
      row.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(variantIndex));
      }
    });
    dragHandle.addEventListener("dragend", () => {
      clearProductVariantDragState();
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "product-variant-row__toggle";
    toggleButton.classList.toggle("is-expanded", Boolean(variant.isExpanded));
    toggleButton.setAttribute("aria-expanded", variant.isExpanded ? "true" : "false");
    toggleButton.setAttribute("aria-controls", `product-variant-fields-${variantIndex}`);
    toggleButton.setAttribute(
      "aria-label",
      variant.isExpanded
        ? `Collapse variant ${variantIndex + 1}`
        : `Expand variant ${variantIndex + 1}`,
    );

    if (variant.isExpanded) {
      const toggleCopy = document.createElement("span");
      toggleCopy.className = "product-variant-row__summary";

      const toggleTitle = document.createElement("span");
      toggleTitle.className = "product-variant-row__summary-title";
      toggleTitle.textContent = variant.name.trim() || `Variant ${variantIndex + 1}`;

      const toggleMeta = document.createElement("span");
      toggleMeta.className = "product-variant-row__summary-meta";
      toggleMeta.textContent = "Editing variant details";

      toggleCopy.append(toggleTitle, toggleMeta);
      toggleButton.appendChild(toggleCopy);
    } else {
      toggleButton.appendChild(buildProductVariantSummaryCard(variant, variantIndex));
    }

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "product-variant-row__toggle-icon";
    toggleIcon.setAttribute("aria-hidden", "true");
    toggleIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    `;
    toggleButton.appendChild(toggleIcon);

    toggleButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      editingVariants[variantIndex].isExpanded = !Boolean(editingVariants[variantIndex].isExpanded);
      renderProductVariants();
    });

    row.addEventListener("dragover", (event) => {
      if (
        draggedProductVariantIndex < 0 ||
        draggedProductVariantIndex === variantIndex
      ) {
        return;
      }

      event.preventDefault();
      row.classList.add("is-drag-over");
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    row.addEventListener("dragleave", (event) => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }

      row.classList.remove("is-drag-over");
    });

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drag-over");
      const fromIndex = draggedProductVariantIndex;
      const previousRowRects = captureProductVariantRowRects();
      clearProductVariantDragState();
      if (!moveEditableVariant(fromIndex, variantIndex)) {
        return;
      }

      renderProductVariants();
      renderAndroidProductPreview();
      animateProductVariantReorder(previousRowRects);
      syncProductFormSubmitState();
      setHelperText("Collapsed variants can be dragged to reorder them.");
      setStatus(editingProductId ? "Editing" : "Adding", "default");
    });

    header.append(dragHandle, toggleButton);

    const fields = document.createElement("div");
    fields.className = "product-variant-row__fields";
    fields.id = `product-variant-fields-${variantIndex}`;
    fields.hidden = !variant.isExpanded;

    const nameLabel = document.createElement("label");
    nameLabel.className = "product-variant-row__field";
    const nameLabelText = document.createElement("span");
    nameLabelText.textContent = "Variant Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Enter variant name";
    nameInput.value = variant.name;
    nameInput.dataset.variantIndex = String(variantIndex);
    nameInput.dataset.variantField = "name";
    nameInput.addEventListener("input", () => {
      editingVariants[variantIndex].name = nameInput.value;
      const liveTitle = nameInput
        .closest(".product-variant-row")
        ?.querySelector(".product-variant-row__summary-title");
      if (liveTitle instanceof HTMLElement) {
        liveTitle.textContent = nameInput.value.trim() || `Variant ${variantIndex + 1}`;
      }
    });
    nameLabel.append(nameLabelText, nameInput);

    const imageField = buildVariantImageDropzone(variantIndex);

    const addOnLabel = document.createElement("div");
    addOnLabel.className = "product-variant-row__field product-variant-row__addon-field";
    const addOnLabelText = document.createElement("span");
    addOnLabelText.textContent = "Add-ons";

    const addOnPicker = document.createElement("div");
    addOnPicker.className = "product-variant-addon-picker product-variant-addon-picker--overlay";
    addOnPicker.dataset.variantAddonPicker = String(variantIndex);

    const addOnTrigger = document.createElement("button");
    addOnTrigger.type = "button";
    addOnTrigger.className = "product-variant-addon-picker__trigger";
    addOnTrigger.dataset.variantIndex = String(variantIndex);
    addOnTrigger.dataset.variantField = "addOns";
    addOnTrigger.setAttribute("aria-expanded", "false");
    addOnTrigger.setAttribute("aria-haspopup", "listbox");

    const addOnSummaryLabel = document.createElement("span");
    addOnSummaryLabel.className = "product-variant-addon-picker__trigger-label";
    addOnSummaryLabel.textContent = "Select from current inventory";

    const addOnSummaryCount = document.createElement("span");
    addOnSummaryCount.className = "product-variant-addon-picker__count";

    const addOnSummaryToggleIcon = document.createElement("span");
    addOnSummaryToggleIcon.className = "product-variant-addon-picker__chevron";
    addOnSummaryToggleIcon.setAttribute("aria-hidden", "true");
    addOnSummaryToggleIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    `;

    const addOnPanel = document.createElement("div");
    addOnPanel.className = "product-variant-addon-picker__panel";
    addOnPanel.dataset.variantAddonPanel = String(variantIndex);
    addOnPanel.hidden = true;

    const addOnDialog = document.createElement("div");
    addOnDialog.className = "product-variant-addon-picker__dialog";

    const addOnHeader = document.createElement("header");
    addOnHeader.className = "product-variant-addon-picker__header";

    const addOnHeaderIcon = document.createElement("span");
    addOnHeaderIcon.className = "product-variant-addon-picker__header-icon";
    addOnHeaderIcon.setAttribute("aria-hidden", "true");
    addOnHeaderIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
        <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/>
        <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>
      </svg>
    `;

    const addOnHeaderCopy = document.createElement("div");
    const addOnHeaderTitle = document.createElement("h3");
    addOnHeaderTitle.textContent = "Add-ons";
    const addOnHeaderSubtitle = document.createElement("p");
    addOnHeaderSubtitle.textContent = "Select from current inventory.";
    addOnHeaderCopy.append(addOnHeaderTitle, addOnHeaderSubtitle);

    const addOnCloseButton = document.createElement("button");
    addOnCloseButton.type = "button";
    addOnCloseButton.className = "product-variant-addon-picker__close";
    addOnCloseButton.setAttribute("aria-label", "Close add-ons");
    addOnCloseButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false">
        <path d="M7 7 17 17" stroke-linecap="round" />
        <path d="M17 7 7 17" stroke-linecap="round" />
      </svg>
    `;
    addOnHeader.append(addOnHeaderIcon, addOnHeaderCopy, addOnCloseButton);

    const addOnBody = document.createElement("div");
    addOnBody.className = "product-variant-addon-picker__body";

    const addOnSearchShell = document.createElement("div");
    addOnSearchShell.className = "product-variant-addon-picker__search-shell";

    const addOnSearchInput = document.createElement("input");
    addOnSearchInput.type = "search";
    addOnSearchInput.className = "product-variant-addon-picker__search";
    addOnSearchInput.placeholder = "Search current inventory";
    addOnSearchInput.value = editingVariants[variantIndex].addOnSearchTerm;
    addOnSearchShell.appendChild(addOnSearchInput);

    const selectedAddOnChips = document.createElement("div");
    selectedAddOnChips.className = "product-variant-addon-picker__chips";

    const selectedAddOnCarousel = document.createElement("div");
    selectedAddOnCarousel.className = "product-variant-addon-picker__chip-carousel";

    const createChipNavButton = (direction, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `product-variant-addon-picker__chip-nav is-${direction}`;
      button.setAttribute("aria-label", label);
      button.hidden = true;
      button.innerHTML = direction === "prev"
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>`;
      return button;
    };

    const selectedAddOnPrevButton = createChipNavButton("prev", "Show previous selected add-ons");
    const selectedAddOnNextButton = createChipNavButton("next", "Show next selected add-ons");
    selectedAddOnCarousel.append(
      selectedAddOnPrevButton,
      selectedAddOnChips,
      selectedAddOnNextButton,
    );

    const addOnOptionList = document.createElement("div");
    addOnOptionList.className = "product-variant-addon-picker__list";

    const addOnConfirmRow = document.createElement("footer");
    addOnConfirmRow.className = "product-variant-addon-picker__actions";

    const addOnConfirmButton = document.createElement("button");
    addOnConfirmButton.type = "button";
    addOnConfirmButton.className = "product-variant-addon-picker__confirm";
    addOnConfirmButton.textContent = "Save";
    addOnConfirmRow.appendChild(addOnConfirmButton);

    addOnBody.append(addOnSearchShell, selectedAddOnCarousel, addOnOptionList);
    addOnDialog.append(addOnHeader, addOnBody, addOnConfirmRow);
    addOnPanel.appendChild(addOnDialog);

    const normalizeDraftAddOns = (addOns = []) =>
      filterVariantAddOnsToCurrentInventory(addOns);

    let draftAddOns = normalizeDraftAddOns(variant.addOns);
    let draftSearchTerm = String(variant.addOnSearchTerm ?? "");

    const resetDraftAddOns = () => {
      draftAddOns = normalizeDraftAddOns(editingVariants[variantIndex].addOns);
      draftSearchTerm = String(editingVariants[variantIndex].addOnSearchTerm ?? "");
      addOnSearchInput.value = draftSearchTerm;
    };

    const clearAddOnOverlayPosition = () => {
      addOnPanel.classList.remove("is-portal-open", "is-above");
      addOnPanel.style.removeProperty("position");
      addOnPanel.style.removeProperty("top");
      addOnPanel.style.removeProperty("left");
      addOnPanel.style.removeProperty("width");
      addOnPanel.style.removeProperty("height");
      addOnPanel.style.removeProperty("max-height");
      addOnPanel.style.removeProperty("right");
      addOnPanel.style.removeProperty("bottom");
      addOnPanel.style.removeProperty("z-index");
      addOnPanel.style.removeProperty("--product-variant-addon-arrow-left");
      if (addOnPanel.parentElement !== addOnPicker) {
        addOnPicker.appendChild(addOnPanel);
      }
    };

    const positionAddOnOverlay = () => {
      if (addOnPanel.hidden) {
        clearAddOnOverlayPosition();
        return;
      }

      const triggerRect = addOnTrigger.getBoundingClientRect();
      const width = Math.max(300, Math.round(triggerRect.width));
      const left = Math.min(
        Math.max(12, Math.round(triggerRect.left)),
        Math.max(12, window.innerWidth - width - 12),
      );
      const gap = 10;
      let top = Math.round(triggerRect.bottom + gap);
      let arrowLeft = triggerRect.left + triggerRect.width / 2 - left;
      arrowLeft = Math.min(Math.max(arrowLeft, 18), width - 18);

      if (addOnPanel.parentElement !== document.body) {
        document.body.appendChild(addOnPanel);
      }
      addOnPanel.classList.add("is-portal-open");
      addOnPanel.classList.remove("is-above");
      addOnPanel.style.position = "fixed";
      addOnPanel.style.left = `${left}px`;
      addOnPanel.style.top = `${top}px`;
      addOnPanel.style.width = `${width}px`;
      addOnPanel.style.height = "auto";
      addOnPanel.style.maxHeight = `${Math.min(420, window.innerHeight - 24)}px`;
      addOnPanel.style.right = "auto";
      addOnPanel.style.bottom = "auto";
      addOnPanel.style.zIndex = "2500";
      addOnPanel.style.setProperty(
        "--product-variant-addon-arrow-left",
        `${Math.round(arrowLeft)}px`,
      );

      window.requestAnimationFrame(() => {
        if (addOnPanel.hidden) {
          return;
        }
        const height = addOnPanel.getBoundingClientRect().height;
        if (top + height + 12 > window.innerHeight) {
          const above = Math.round(triggerRect.top - height - gap);
          if (above >= 12) {
            addOnPanel.style.top = `${above}px`;
            addOnPanel.classList.add("is-above");
          }
        }
      });
    };

    const setAddOnPickerOpen = (isOpen) => {
      const nextIsOpen = Boolean(isOpen);
      if (nextIsOpen) {
        document.querySelectorAll("[data-variant-addon-picker].is-open").forEach((picker) => {
          if (picker !== addOnPicker) {
            picker.classList.remove("is-open");
            const otherTrigger = picker.querySelector(".product-variant-addon-picker__trigger");
            const pickerKey = picker.getAttribute("data-variant-addon-picker");
            const otherPanel =
              picker.querySelector(".product-variant-addon-picker__panel")
              || document.querySelector(
                `.product-variant-addon-picker__panel[data-variant-addon-panel="${pickerKey}"]`,
              );
            if (otherTrigger instanceof HTMLButtonElement) {
              otherTrigger.setAttribute("aria-expanded", "false");
            }
            if (otherPanel instanceof HTMLElement) {
              otherPanel.hidden = true;
              otherPanel.classList.remove("is-portal-open", "is-above");
              otherPanel.style.removeProperty("position");
              otherPanel.style.removeProperty("top");
              otherPanel.style.removeProperty("left");
              otherPanel.style.removeProperty("width");
              otherPanel.style.removeProperty("height");
              otherPanel.style.removeProperty("max-height");
              otherPanel.style.removeProperty("right");
              otherPanel.style.removeProperty("bottom");
              otherPanel.style.removeProperty("z-index");
              otherPanel.style.removeProperty("--product-variant-addon-arrow-left");
              if (otherPanel.parentElement !== picker) {
                picker.appendChild(otherPanel);
              }
            }
          }
        });
      }

      addOnPicker.classList.toggle("is-open", nextIsOpen);
      addOnTrigger.setAttribute("aria-expanded", nextIsOpen ? "true" : "false");
      addOnPanel.hidden = !nextIsOpen;
      editingVariants[variantIndex].isAddOnPickerOpen = nextIsOpen;
      if (nextIsOpen) {
        positionAddOnOverlay();
        window.requestAnimationFrame(() => {
          syncSelectedAddOnChipCarousel();
          addOnSearchInput.focus({ preventScroll: true });
        });
      } else {
        clearAddOnOverlayPosition();
        resetDraftAddOns();
        renderSelectedAddOnChips();
        renderAddOnOptions();
      }
    };

    const syncSelectedAddOnChipCarousel = () => {
      const hasChips = Boolean(selectedAddOnChips.querySelector(".product-variant-addon-chip"));
      const maxScroll = Math.max(0, selectedAddOnChips.scrollWidth - selectedAddOnChips.clientWidth);
      const hasOverflow = hasChips && maxScroll > 2;
      selectedAddOnCarousel.classList.toggle("has-overflow", hasOverflow);
      selectedAddOnPrevButton.hidden = !hasOverflow;
      selectedAddOnNextButton.hidden = !hasOverflow;
      selectedAddOnPrevButton.disabled = selectedAddOnChips.scrollLeft <= 1;
      selectedAddOnNextButton.disabled = selectedAddOnChips.scrollLeft >= maxScroll - 1;
    };

    const scrollSelectedAddOnChips = (direction) => {
      const amount = Math.max(120, Math.round(selectedAddOnChips.clientWidth * 0.72));
      selectedAddOnChips.scrollBy({
        left: direction === "prev" ? -amount : amount,
        behavior: "smooth",
      });
    };

    selectedAddOnPrevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scrollSelectedAddOnChips("prev");
    });
    selectedAddOnNextButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scrollSelectedAddOnChips("next");
    });
    selectedAddOnChips.addEventListener("scroll", syncSelectedAddOnChipCarousel, { passive: true });

    const renderSelectedAddOnChips = () => {
      selectedAddOnChips.innerHTML = "";
      const selectedAddOns = draftAddOns;

      addOnSummaryCount.textContent = selectedAddOns.length
        ? `${selectedAddOns.length} selected`
        : "Optional";

      if (!selectedAddOns.length) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No add-ons selected yet.";
        selectedAddOnChips.appendChild(emptyState);
        syncSelectedAddOnChipCarousel();
        return;
      }

      for (const addOn of selectedAddOns) {
        const chip = document.createElement("span");
        chip.className = "product-variant-addon-chip";

        const chipLabel = document.createElement("span");
        chipLabel.className = "product-variant-addon-chip__label";
        chipLabel.textContent = `${addOn.name} x${Number(addOn.quantity ?? 1)}`;

        const removeChipButton = document.createElement("button");
        removeChipButton.type = "button";
        removeChipButton.className = "product-variant-addon-chip__remove";
        removeChipButton.setAttribute("aria-label", `Remove ${addOn.name}`);
        removeChipButton.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true" focusable="false">
            <path d="M7 7 17 17" stroke-linecap="round" />
            <path d="M17 7 7 17" stroke-linecap="round" />
          </svg>
        `;
        removeChipButton.addEventListener("click", () => {
          draftAddOns = selectedAddOns.filter(
            (selectedAddOn) => selectedAddOn.id !== addOn.id,
          );
          renderSelectedAddOnChips();
          renderAddOnOptions();
        });

        chip.append(chipLabel, removeChipButton);
        selectedAddOnChips.appendChild(chip);
      }
      window.requestAnimationFrame(syncSelectedAddOnChipCarousel);
    };

    const renderAddOnOptions = () => {
      addOnOptionList.innerHTML = "";
      const selectedAddOns = draftAddOns;
      const normalizedSearchTerm = draftSearchTerm.trim().toLowerCase();
      const candidates = getVariantAddOnCandidates().filter((product) => {
        if (!normalizedSearchTerm) {
          return true;
        }

        const productName = String(product?.name ?? "").toLowerCase();
        const productCategory = getProductCategoryLabel(product, "").toLowerCase();
        return productName.includes(normalizedSearchTerm) || productCategory.includes(normalizedSearchTerm);
      });

      if (!candidates.length) {
        if (normalizedSearchTerm && window.GMS_ADMIN_SEARCH_NOT_FOUND) {
          addOnOptionList.appendChild(
            window.GMS_ADMIN_SEARCH_NOT_FOUND.create({ compact: true }),
          );
          return;
        }

        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No inventory items available.";
        addOnOptionList.appendChild(emptyState);
        return;
      }

      for (const product of candidates) {
        const option = document.createElement("label");
        option.className = "product-variant-addon-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedAddOns.some(
          (selectedAddOn) => selectedAddOn.id === String(product.id ?? ""),
        );
        checkbox.addEventListener("change", () => {
          const nextSelectedAddOns = checkbox.checked
            ? [
                ...selectedAddOns,
                {
                  id: String(product.id ?? ""),
                  name: String(product.name ?? "").trim() || "Unnamed Product",
                  quantity: 1,
                },
              ]
            : selectedAddOns.filter(
                (selectedAddOn) => selectedAddOn.id !== String(product.id ?? ""),
              );

          draftAddOns = nextSelectedAddOns.filter(
            (addOn, addOnIndex, addOnList) =>
              addOn.id &&
              addOn.name &&
              addOnList.findIndex((candidate) => candidate.id === addOn.id) === addOnIndex,
          );
          renderSelectedAddOnChips();
          renderAddOnOptions();
        });

        const { imageUrl: optionImageUrl, objectPosition: optionImagePosition } =
          getProductCardDisplayImageData(product);
        if (optionImageUrl) {
          const optionImage = document.createElement("button");
          optionImage.type = "button";
          optionImage.className =
            "product-variant-addon-option__image product-image--zoomable";
          optionImage.setAttribute(
            "aria-label",
            `Zoom ${String(product.name ?? "").trim() || "product"} image`,
          );
          optionImage.title = "Zoom image";
          optionImage.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openPreviewImageGallery(
              String(product.name ?? "").trim() || "Product image",
              [optionImageUrl],
              0,
              { showActions: false },
            );
          });

          const image = document.createElement("img");
          image.src = optionImageUrl;
          image.alt = String(product.name ?? "").trim() || "Product image";
          image.style.objectPosition = optionImagePosition;
          optionImage.appendChild(image);
          option.appendChild(optionImage);
        } else {
          const optionImage = document.createElement("div");
          optionImage.className = "product-variant-addon-option__image is-empty";
          optionImage.classList.add("is-empty");
          optionImage.innerHTML = '<i class="fa-regular fa-image" aria-hidden="true"></i>';
          option.appendChild(optionImage);
        }

        const optionCopy = document.createElement("div");
        optionCopy.className = "product-variant-addon-option__copy";

        const optionTitle = document.createElement("span");
        optionTitle.className = "product-variant-addon-option__title";
        optionTitle.textContent = String(product.name ?? "").trim() || "Unnamed Product";

        const optionMeta = document.createElement("span");
        optionMeta.className = "product-variant-addon-option__meta";
        optionMeta.textContent = getProductCategoryLabel(product);

        const quantityInput = document.createElement("input");
        quantityInput.type = "number";
        quantityInput.min = "1";
        quantityInput.step = "1";
        quantityInput.placeholder = "Qty";
        quantityInput.className = "product-variant-addon-option__quantity";
        const selectedAddOn =
          selectedAddOns.find(
            (candidate) => candidate.id === String(product.id ?? ""),
          ) ?? null;
        quantityInput.value = String(
          selectedAddOn?.quantity && Number(selectedAddOn.quantity) > 0
            ? Number(selectedAddOn.quantity)
            : 1,
        );
        quantityInput.disabled = !checkbox.checked;
        quantityInput.hidden = !checkbox.checked;
        quantityInput.addEventListener("input", () => {
          const nextQuantity = Number.parseInt(quantityInput.value, 10);
          const currentSelectedAddOns = draftAddOns;
          draftAddOns = currentSelectedAddOns.map(
            (candidate) =>
              candidate.id === String(product.id ?? "")
                ? {
                    ...candidate,
                    quantity:
                      Number.isInteger(nextQuantity) && nextQuantity > 0
                        ? nextQuantity
                        : 1,
                  }
                : candidate,
          );
          renderSelectedAddOnChips();
        });
        quantityInput.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        optionCopy.append(optionTitle, optionMeta);
        option.prepend(checkbox);
        option.append(optionCopy, quantityInput);
        addOnOptionList.appendChild(option);
      }
    };

    let addOnSearchTimer = 0;
    addOnSearchInput.addEventListener("input", () => {
      window.clearTimeout(addOnSearchTimer);
      addOnSearchTimer = window.setTimeout(() => {
        draftSearchTerm = addOnSearchInput.value;
        renderAddOnOptions();
      }, 500);
    });

    addOnTrigger.addEventListener("click", () => {
      setAddOnPickerOpen(!addOnPicker.classList.contains("is-open"));
    });

    addOnConfirmButton.addEventListener("click", () => {
      editingVariants[variantIndex].addOns = normalizeDraftAddOns(draftAddOns);
      editingVariants[variantIndex].addOnSearchTerm = draftSearchTerm;
      setAddOnPickerOpen(false);
      renderAndroidProductPreview();
      syncProductFormSubmitState();
    });

    addOnCloseButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setAddOnPickerOpen(false);
    });

    renderSelectedAddOnChips();
    renderAddOnOptions();

    addOnTrigger.append(addOnSummaryLabel, addOnSummaryCount, addOnSummaryToggleIcon);
    addOnPicker.append(addOnTrigger, addOnPanel);
    addOnLabel.append(addOnLabelText, addOnPicker);

    if (editingVariants[variantIndex].isAddOnPickerOpen) {
      window.requestAnimationFrame(() => setAddOnPickerOpen(true));
    }

    const priceGrid = document.createElement("div");
    priceGrid.className = "product-variant-row__grid";

    const originalPriceLabel = document.createElement("label");
    originalPriceLabel.className = "product-variant-row__field";
    const originalPriceText = document.createElement("span");
    originalPriceText.textContent = "Original Price";
    const originalPriceInput = document.createElement("input");
    originalPriceInput.type = "number";
    originalPriceInput.min = "0";
    originalPriceInput.max = String(PRODUCT_PRICE_MAX);
    originalPriceInput.step = "0.01";
    originalPriceInput.placeholder = "0.00";
    originalPriceInput.value = variant.originalPrice;
    originalPriceInput.dataset.variantIndex = String(variantIndex);
    originalPriceInput.dataset.variantField = "originalPrice";
    originalPriceInput.addEventListener("input", () => {
      editingVariants[variantIndex].originalPrice = originalPriceInput.value;
    });
    originalPriceLabel.append(originalPriceText, originalPriceInput);

    const salesPriceLabel = document.createElement("label");
    salesPriceLabel.className = "product-variant-row__field";
    const salesPriceText = document.createElement("span");
    salesPriceText.textContent = "Sales Price";
    const salesPriceInput = document.createElement("input");
    salesPriceInput.type = "number";
    salesPriceInput.min = "0";
    salesPriceInput.max = String(PRODUCT_PRICE_MAX);
    salesPriceInput.step = "0.01";
    salesPriceInput.placeholder = "0.00";
    salesPriceInput.value = variant.salesPrice;
    salesPriceInput.dataset.variantIndex = String(variantIndex);
    salesPriceInput.dataset.variantField = "salesPrice";
    salesPriceInput.addEventListener("input", () => {
      editingVariants[variantIndex].salesPrice = salesPriceInput.value;
    });
    salesPriceLabel.append(salesPriceText, salesPriceInput);
    priceGrid.append(originalPriceLabel, salesPriceLabel);

    const footer = document.createElement("div");
    footer.className = "product-variant-row__footer";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "product-variant-row__remove";
    removeButton.setAttribute("aria-label", `Delete variant ${variantIndex + 1}`);
    removeButton.title = `Delete variant ${variantIndex + 1}`;
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      <span>Delete</span>
    `;
    removeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProductDeleteConfirmationModal(`variant ${variantIndex + 1}`, () => {
        revokeVariantPreviewObjectUrl(variantIndex);
        editingVariants.splice(variantIndex, 1);
        renderProductVariants();
        renderAndroidProductPreview();
        syncProductFormSubmitState();
        openProductDeleteSuccessFeedbackModal(`Variant ${variantIndex + 1} deleted successfully.`);
      });
    });
    footer.appendChild(removeButton);

    fields.append(nameLabel, imageField, addOnLabel, priceGrid);
    row.append(header, fields, footer);
    productVariantList.appendChild(row);
  }
  syncProductDetailsVariantsToggleState();
}

function handleAddVariant() {
  editingVariants.push(createEmptyEditableVariant());
  renderProductVariants();
  syncProductFormSubmitState();
}

function buildBarcodeImageDataUrl(value) {
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
  const startCodeB = 104;
  const stopCode = 106;
  const codes = [startCodeB];

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
  codes.push(checksum, stopCode);

  const moduleWidth = 2;
  const quietZone = 24;
  const barHeight = 92;
  const topPadding = 10;
  const gapHeight = 14;
  const textHeight = 22;
  const bottomPadding = 12;
  const totalModules = codes.reduce((sum, code) => {
    const pattern = code128Patterns[code] || "";
    return sum + pattern.split("").reduce((patternSum, digit) => patternSum + Number(digit), 0);
  }, 0);
  const width = Math.max(240, totalModules * moduleWidth + quietZone * 2);
  const height = topPadding + barHeight + gapHeight + textHeight + bottomPadding;
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

  let x = quietZone;
  for (const code of codes) {
    const pattern = code128Patterns[code] || "";
    for (let index = 0; index < pattern.length; index += 1) {
      const stripeWidth = Number(pattern[index]) * moduleWidth;
      if (index % 2 === 0) {
        context.fillRect(x, topPadding, stripeWidth, barHeight);
      }
      x += stripeWidth;
    }
  }

  context.fillStyle = "#000000";
  context.font = "16px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(barcodeValue, width / 2, topPadding + barHeight + gapHeight);

  return canvas.toDataURL("image/png");
}

function syncBarcodePackingCheckbox(isVisible) {
  if (!barcodePackingCheckbox) {
    return;
  }

  const shouldShow = Boolean(isVisible);
  barcodePackingCheckbox.hidden = !shouldShow;
  if (!shouldShow && barcodePackingCheckboxInput instanceof HTMLInputElement) {
    barcodePackingCheckboxInput.checked = false;
  }
}

async function fetchProductsForValidation() {
  if (Array.isArray(currentProducts) && currentProducts.length > 0) {
    return currentProducts;
  }

  try {
    const response = await fetch("/api/products", {
      cache: "no-store",
      headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch (error) {
    console.error("Failed to fetch products for barcode validation:", error);
    return [];
  }
}

function checkBarcodeDuplicate(barcodeValue, excludeProductId = null) {
  if (!barcodeValue) {
    return null;
  }

  const normalizedBarcode = String(barcodeValue).trim();
  if (!normalizedBarcode) {
    return null;
  }

  // Use currentProducts if available, otherwise return null (will trigger fetch)
  if (!Array.isArray(currentProducts) || currentProducts.length === 0) {
    return null;
  }

  const duplicate = currentProducts.find((product) => {
    if (excludeProductId && String(product?.id ?? "") === String(excludeProductId)) {
      return false;
    }
    return String(product?.barcode ?? "").trim() === normalizedBarcode;
  });

  return duplicate ? {
    exists: true,
    productName: duplicate.name,
  } : null;
}

function showBarcodeDuplicateError(duplicateProductName) {
  if (shouldUseProductValidationModal()) {
    openProductValidationModal({
      title: "Barcode Already Exists",
      copy: `This barcode is already registered to "${duplicateProductName}". Please use a different barcode.`,
      actionLabel: "OK",
    });
  } else {
    alert(`Barcode already exists! This barcode is already registered to "${duplicateProductName}". Please use a different barcode.`);
  }
}

function syncBarcodePreview() {
  if (!barcodePreviewContainer || !barcodeInput) {
    return;
  }

  const barcodeValue = String(barcodeInput.value ?? "").trim();
  if (productBarcodeScanFocusButton instanceof HTMLButtonElement) {
    productBarcodeScanFocusButton.hidden = Boolean(barcodeValue);
  }
  syncProductDetailsBarcodeToggleState();
  barcodePreviewContainer.innerHTML = "";
  barcodePreviewContainer.hidden = !barcodeValue;
  syncProductBarcodeModalSaveState();
  syncBarcodeScanFocusState();

  if (!barcodeValue) {
    syncProductDetailsBarcodeHeaderPreview();
    syncBarcodePackingCheckbox(false);
    syncProductBarcodeModalSaveState();
    return;
  }

  // Check for duplicate barcode in real-time
  // If products not loaded yet, try to load them first
  if (
    !hasLoadedProductsForBarcodeValidation
    && !isValidatingBarcode
    && (!Array.isArray(currentProducts) || currentProducts.length === 0)
  ) {
    // Products not loaded - fetch them first before validating
    isValidatingBarcode = true;
    fetch("/api/products", {
      cache: "no-store",
      headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          currentProducts = data.products;
        }
        // Now check for duplicate after products are loaded
        hasLoadedProductsForBarcodeValidation = true;
        isValidatingBarcode = false;
        syncBarcodePreview();
      })
      .catch(() => {
        // If fetch fails, just show the barcode (validation will happen on submit)
        hasLoadedProductsForBarcodeValidation = true;
        isValidatingBarcode = false;
        syncBarcodePreview();
      });
    // Show loading state temporarily
    return;
  }

  const duplicateInfo = checkBarcodeDuplicate(barcodeValue, editingProductId);
  if (duplicateInfo && duplicateInfo.exists) {
    // Don't show barcode image if duplicate, show error instead
    syncBarcodePackingCheckbox(false);
    showBarcodeDuplicateError(duplicateInfo.productName);
    // Clear the barcode input since it's a duplicate
    barcodeInput.value = "";
    if (productBarcodeScanFocusButton instanceof HTMLButtonElement) {
      productBarcodeScanFocusButton.hidden = false;
    }
    syncProductDetailsBarcodeToggleState();
    syncProductDetailsBarcodeHeaderPreview();
    barcodePreviewContainer.hidden = true;
    syncBarcodeScanFocusState();
    setHelperText("Barcode already exists. Please use a different barcode.");
    setStatus("Duplicate Barcode", "error");
    syncProductBarcodeModalSaveState();
    return;
  }

  const barcodeImageUrl = buildBarcodeImageDataUrl(barcodeValue);
  if (!barcodeImageUrl) {
    syncProductDetailsBarcodeHeaderPreview();
    syncBarcodePackingCheckbox(false);
    syncProductBarcodeModalSaveState();
    return;
  }
  syncBarcodePackingCheckbox(true);
  syncProductDetailsBarcodeHeaderPreview(barcodeValue, barcodeImageUrl);

  const imageShell = document.createElement("div");
  imageShell.className = "barcode-preview-image-shell";

  const image = document.createElement("img");
  image.src = barcodeImageUrl;
  image.alt = `Barcode for ${barcodeValue}`;
  image.className = "barcode-preview-image";
  imageShell.appendChild(image);
  barcodePreviewContainer.appendChild(imageShell);
  syncProductBarcodeModalSaveState();
}

function createVisualSearchImageSlotMap(defaultValue = "") {
  return VISUAL_SEARCH_IMAGE_ANGLE_SLOTS.reduce((map, slot) => {
    map[slot.key] = defaultValue;
    return map;
  }, {});
}

function isVisualSearchOtherSlotKey(value) {
  return new RegExp(`^${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}\\d+$`).test(
    String(value ?? "").trim().toLowerCase(),
  );
}

function createVisualSearchOtherSlotKey(index) {
  return `${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}${Math.max(1, Number(index) || 1)}`;
}

function getVisualSearchOtherSlotIndex(slotKey) {
  const match = String(slotKey ?? "")
    .trim()
    .toLowerCase()
    .match(new RegExp(`^${VISUAL_SEARCH_OTHER_IMAGE_PREFIX}(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

function isVisualSearchBaseSlotKey(value) {
  const requestedKey = String(value ?? "").trim().toLowerCase();
  return VISUAL_SEARCH_IMAGE_ANGLE_SLOTS.some((slot) => slot.key === requestedKey);
}

function normalizeVisualSearchImageSlotKey(value) {
  const requestedKey = String(value ?? "").trim().toLowerCase();
  if (isVisualSearchBaseSlotKey(requestedKey) || isVisualSearchOtherSlotKey(requestedKey)) {
    return requestedKey;
  }

  return VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE;
}

function getVisualSearchImageSlotLabel(slotKey) {
  if (isVisualSearchOtherSlotKey(slotKey)) {
    return "Other";
  }

  return (
    VISUAL_SEARCH_IMAGE_ANGLE_SLOTS.find((slot) => slot.key === slotKey)?.label ??
    "Image"
  );
}

function hasVisualSearchSlotValue(value) {
  return value instanceof File || String(value ?? "").trim() !== "";
}

function getVisualSearchOrderedSlotKeys(sourceMaps = [], includeBaseSlots = true) {
  const keys = includeBaseSlots
    ? VISUAL_SEARCH_IMAGE_ANGLE_SLOTS.map((slot) => slot.key)
    : [];
  const otherKeys = new Set();
  const extraKeys = new Set();

  for (const sourceMap of sourceMaps) {
    if (!sourceMap || typeof sourceMap !== "object") {
      continue;
    }

    for (const rawKey of Object.keys(sourceMap)) {
      if (!hasVisualSearchSlotValue(sourceMap[rawKey])) {
        continue;
      }

      const normalizedKey = String(rawKey ?? "").trim().toLowerCase();
      if (isVisualSearchBaseSlotKey(normalizedKey)) {
        if (!keys.includes(normalizedKey)) {
          keys.push(normalizedKey);
        }
      } else if (isVisualSearchOtherSlotKey(normalizedKey)) {
        otherKeys.add(normalizedKey);
      } else if (normalizedKey) {
        extraKeys.add(normalizedKey);
      }
    }
  }

  const sortedOtherKeys = [...otherKeys].sort(
    (first, second) =>
      getVisualSearchOtherSlotIndex(first) - getVisualSearchOtherSlotIndex(second),
  );
  const sortedExtraKeys = [...extraKeys].sort();

  return [...keys, ...sortedOtherKeys, ...sortedExtraKeys];
}

function hasVisualSearchImageForSlot(slotKey) {
  const normalizedSlotKey = normalizeVisualSearchImageSlotKey(slotKey);
  return (
    hasVisualSearchSlotValue(visualSearchPreviewObjectUrls[normalizedSlotKey]) ||
    hasVisualSearchSlotValue(pendingVisualSearchImageFiles[normalizedSlotKey]) ||
    hasVisualSearchSlotValue(editingVisualSearchImageAngles[normalizedSlotKey])
  );
}

function getVisualSearchPreviewSlots() {
  const slots = [...VISUAL_SEARCH_IMAGE_ANGLE_SLOTS];
  const existingOtherKeys = getVisualSearchOrderedSlotKeys(
    [
      editingVisualSearchImageAngles,
      pendingVisualSearchImageFiles,
      visualSearchPreviewObjectUrls,
    ],
    false,
  ).filter(isVisualSearchOtherSlotKey);

  for (const key of existingOtherKeys) {
    slots.push({ key, label: "Other" });
  }

  if (hasVisualSearchImageForSlot("down")) {
    const nextOtherIndex =
      existingOtherKeys.reduce(
        (maxIndex, key) => Math.max(maxIndex, getVisualSearchOtherSlotIndex(key)),
        0,
      ) + 1;
    slots.push({
      key: createVisualSearchOtherSlotKey(nextOtherIndex),
      label: "Other",
    });
  }

  return slots;
}

function normalizeEditableVisualSearchImageAngles(product = {}) {
  const nextAngles = createVisualSearchImageSlotMap();
  const rawAngles = product?.visualSearchImageAngles;
  if (rawAngles && typeof rawAngles === "object" && !Array.isArray(rawAngles)) {
    for (const [rawKey, rawUrl] of Object.entries(rawAngles)) {
      const normalizedKey = normalizeVisualSearchImageSlotKey(rawKey);
      nextAngles[normalizedKey] = String(rawUrl ?? "").trim();
    }
  }

  const rawUrls = Array.isArray(product?.visualSearchImageUrls)
    ? product.visualSearchImageUrls
    : [];
  rawUrls.forEach((url, index) => {
    const slot = VISUAL_SEARCH_IMAGE_ANGLE_SLOTS[index];
    const slotKey = slot?.key ?? createVisualSearchOtherSlotKey(
      index - VISUAL_SEARCH_IMAGE_ANGLE_SLOTS.length + 1,
    );
    if (!nextAngles[slotKey]) {
      nextAngles[slotKey] = String(url ?? "").trim();
    }
  });

  const legacyUrl = String(product?.visualSearchImageUrl ?? "").trim();
  if (legacyUrl && !nextAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE]) {
    nextAngles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] = legacyUrl;
  }

  return nextAngles;
}

function getVisualSearchImageUrlsFromAngles(angles = editingVisualSearchImageAngles) {
  const urls = [];
  const seen = new Set();
  for (const slotKey of getVisualSearchOrderedSlotKeys([angles])) {
    const url = String(angles?.[slotKey] ?? "").trim();
    const key = url.toLowerCase();
    if (!url || seen.has(key)) {
      continue;
    }

    seen.add(key);
    urls.push(url);
  }
  return urls;
}

function getPrimaryVisualSearchImageUrl(angles = editingVisualSearchImageAngles) {
  const primaryUrl = String(angles?.[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? "").trim();
  return primaryUrl || getVisualSearchImageUrlsFromAngles(angles)[0] || "";
}

function getVisualSearchImageAnglesPayload(angles = editingVisualSearchImageAngles) {
  const payload = {};
  for (const slotKey of getVisualSearchOrderedSlotKeys([angles])) {
    const url = String(angles?.[slotKey] ?? "").trim();
    if (url) {
      payload[slotKey] = url;
    }
  }
  return payload;
}

function syncLegacyVisualSearchImageState() {
  editingVisualSearchImageUrl = getPrimaryVisualSearchImageUrl();
  pendingVisualSearchImageFile =
    pendingVisualSearchImageFiles[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? null;
  visualSearchPreviewObjectUrl =
    visualSearchPreviewObjectUrls[VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE] ?? "";
}

function clearVisualSearchPreviewObjectUrl(slotKey = null) {
  if (slotKey) {
    const normalizedSlotKey = normalizeVisualSearchImageSlotKey(slotKey);
    if (visualSearchPreviewObjectUrls[normalizedSlotKey]) {
      URL.revokeObjectURL(visualSearchPreviewObjectUrls[normalizedSlotKey]);
      visualSearchPreviewObjectUrls[normalizedSlotKey] = "";
    }
    syncLegacyVisualSearchImageState();
    return;
  }

  for (const slotKey of getVisualSearchOrderedSlotKeys(
    [
      editingVisualSearchImageAngles,
      pendingVisualSearchImageFiles,
      visualSearchPreviewObjectUrls,
    ],
  )) {
    clearVisualSearchPreviewObjectUrl(slotKey);
  }
}

function resetVisualSearchImageState(slotKey = null) {
  if (slotKey) {
    const normalizedSlotKey = normalizeVisualSearchImageSlotKey(slotKey);
    clearVisualSearchPreviewObjectUrl(normalizedSlotKey);
    if (isVisualSearchOtherSlotKey(normalizedSlotKey)) {
      delete editingVisualSearchImageAngles[normalizedSlotKey];
      delete pendingVisualSearchImageFiles[normalizedSlotKey];
      delete visualSearchPreviewObjectUrls[normalizedSlotKey];
    } else {
      editingVisualSearchImageAngles[normalizedSlotKey] = "";
      pendingVisualSearchImageFiles[normalizedSlotKey] = null;
    }
  } else {
    clearVisualSearchPreviewObjectUrl();
    editingVisualSearchImageAngles = createVisualSearchImageSlotMap();
    pendingVisualSearchImageFiles = createVisualSearchImageSlotMap(null);
  }
  syncLegacyVisualSearchImageState();
  syncVisualSearchPreview();
}

function syncVisualSearchPreview() {
  if (!visualSearchPreviewContainer) {
    return;
  }

  visualSearchPreviewContainer.innerHTML = "";
  visualSearchPreviewContainer.hidden = false;

  for (const slot of getVisualSearchPreviewSlots()) {
    const previewUrl =
      String(visualSearchPreviewObjectUrls[slot.key] ?? "").trim() ||
      String(editingVisualSearchImageAngles[slot.key] ?? "").trim();
    const slotCard = document.createElement("div");
    slotCard.className = `visual-search-angle-card${previewUrl ? " has-image" : ""}`;
    slotCard.setAttribute("data-ui-tooltip", slot.label);

    if (previewUrl) {
      const previewButton = document.createElement("button");
      previewButton.type = "button";
      previewButton.className = "visual-search-angle-card__preview-button";
      previewButton.setAttribute("aria-label", `Preview ${slot.label} image`);
      previewButton.addEventListener("click", () => {
        openPreviewImageGallery("Image search photo", [previewUrl], 0, {
          showActions: false,
        });
      });

      const image = document.createElement("img");
      image.src = previewUrl;
      image.alt = `${slot.label} visual search reference`;
      image.className = "visual-search-preview-image";
      previewButton.appendChild(image);
      slotCard.appendChild(previewButton);
    }

    const actionGroup = document.createElement("div");
    actionGroup.className = previewUrl
      ? "visual-search-angle-card__floating-actions"
      : "visual-search-angle-card__source-actions";
    actionGroup.append(
      createVisualSearchSlotActionButton(slot, Boolean(previewUrl)),
    );
    slotCard.appendChild(actionGroup);

    if (previewUrl) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "visual-search-preview-delete-button";
      deleteButton.setAttribute("aria-label", `Delete ${slot.label} visual search image`);
      deleteButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;
      deleteButton.addEventListener("click", () => {
        resetVisualSearchImageState(slot.key);
        syncProductFormSubmitState();
      });
      slotCard.appendChild(deleteButton);
    }

    visualSearchPreviewContainer.appendChild(slotCard);
  }
}

function createVisualSearchSlotActionButton(slot, hasPreview) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = hasPreview
    ? "visual-search-angle-card__icon-button"
    : "visual-search-angle-card__source-button";
  button.setAttribute(
    "aria-label",
    `Open camera for ${slot.label} image`,
  );
  button.title = `Camera ${slot.label} image`;
  button.addEventListener("click", () => {
    openVisualSearchCamera(slot.key);
  });

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-camera";
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);

  return button;
}

function setPendingVisualSearchImage(file, slotKey = VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE) {
  const normalizedSlotKey = normalizeVisualSearchImageSlotKey(slotKey);
  clearVisualSearchPreviewObjectUrl(normalizedSlotKey);
  pendingVisualSearchImageFiles[normalizedSlotKey] = file instanceof File ? file : null;
  editingVisualSearchImageAngles[normalizedSlotKey] =
    file instanceof File ? "" : String(editingVisualSearchImageAngles[normalizedSlotKey] ?? "");

  if (pendingVisualSearchImageFiles[normalizedSlotKey]) {
    visualSearchPreviewObjectUrls[normalizedSlotKey] = URL.createObjectURL(
      pendingVisualSearchImageFiles[normalizedSlotKey],
    );
  }

  syncLegacyVisualSearchImageState();
  syncVisualSearchPreview();
}

function normalizeProductModelUrl(product = {}) {
  return String(
    product?.model3dUrl ??
      product?.model3DUrl ??
      product?.threeDModelUrl ??
      product?.modelUrl ??
      "",
  ).trim();
}

function normalizeProductModelScanImageUrls(value = []) {
  const sourceValues = Array.isArray(value) ? value : [];
  const urls = [];
  const seen = new Set();

  for (const candidate of sourceValues) {
    const url = String(candidate ?? "").trim();
    const key = url.toLowerCase();
    if (!url || seen.has(key)) {
      continue;
    }

    seen.add(key);
    urls.push(url);
  }

  return urls;
}

function getProductModelFileExtension(value) {
  const normalizedValue = String(value ?? "").trim().split(/[?#]/)[0].toLowerCase();
  const dotIndex = normalizedValue.lastIndexOf(".");
  return dotIndex >= 0 ? normalizedValue.slice(dotIndex) : "";
}

function isSupportedProductModelFile(file) {
  if (!(file instanceof File)) {
    return false;
  }

  const extension = getProductModelFileExtension(file.name);
  const contentType = String(file.type ?? "").toLowerCase();
  return (
    PRODUCT_MODEL_SUPPORTED_EXTENSIONS.includes(extension) ||
    contentType === "model/gltf-binary"
  );
}

function clearProductModelObjectUrl() {
  if (pendingProductModelObjectUrl) {
    URL.revokeObjectURL(pendingProductModelObjectUrl);
    pendingProductModelObjectUrl = "";
  }
}

function clearPendingProductModelScanObjectUrls() {
  for (const previewUrl of pendingProductModelScanObjectUrls) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }
  pendingProductModelScanObjectUrls = [];
}

function getPendingProductModelScanObjectUrls() {
  if (!pendingProductModelScanFiles.length) {
    clearPendingProductModelScanObjectUrls();
    return [];
  }

  while (pendingProductModelScanObjectUrls.length < pendingProductModelScanFiles.length) {
    const file = pendingProductModelScanFiles[pendingProductModelScanObjectUrls.length];
    pendingProductModelScanObjectUrls.push(
      file instanceof File ? URL.createObjectURL(file) : "",
    );
  }

  while (pendingProductModelScanObjectUrls.length > pendingProductModelScanFiles.length) {
    const previewUrl = pendingProductModelScanObjectUrls.pop();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  return [...pendingProductModelScanObjectUrls];
}

function getProductModelFramePreviewUrls() {
  if (pendingProductModelScanFiles.length) {
    return getPendingProductModelScanObjectUrls();
  }

  return [...editingProductModelScanImageUrls];
}

function getProductModelScanFrameCount() {
  return pendingProductModelScanFiles.length || editingProductModelScanImageUrls.length;
}

function getProductModelSourceLabel() {
  if (pendingProductModelFile) {
    return pendingProductModelFile.name || "Pending 3D model";
  }

  const modelUrl = String(editingProductModelUrl ?? "").trim();
  if (!modelUrl) {
    return "";
  }

  const rawFileName = modelUrl.split("/").pop() || modelUrl;
  try {
    return decodeURIComponent(rawFileName);
  } catch (_) {
    return rawFileName;
  }
}

function getProductModelPreviewUrl() {
  return (
    String(pendingProductModelObjectUrl ?? "").trim() ||
    String(editingProductModelUrl ?? "").trim()
  );
}

function canPreviewProductModelInBrowser(previewUrl, label = "") {
  const sourceValue = String(label || previewUrl || "").trim();
  const extension = getProductModelFileExtension(sourceValue);
  return extension === ".glb";
}

function ensureProductModelViewerScript() {
  if (window.customElements?.get?.("model-viewer")) {
    return Promise.resolve();
  }

  if (productModelViewerScriptPromise) {
    return productModelViewerScriptPromise;
  }

  productModelViewerScriptPromise = new Promise((resolve, reject) => {
    if (!window.customElements || !document.head) {
      reject(new Error("3D model viewer is unavailable in this browser."));
      return;
    }

    const existingScript = Array.from(document.scripts).find(
      (script) =>
        script.src === PRODUCT_MODEL_VIEWER_SCRIPT_URL ||
        script.getAttribute("src") === PRODUCT_MODEL_VIEWER_SCRIPT_URL,
    );
    const script = existingScript ?? document.createElement("script");

    script.addEventListener(
      "load",
      () => {
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        productModelViewerScriptPromise = null;
        reject(new Error("Unable to load the 3D model viewer."));
      },
      { once: true },
    );

    if (!existingScript) {
      script.type = "module";
      script.src = PRODUCT_MODEL_VIEWER_SCRIPT_URL;
      script.dataset.productModelViewer = "true";
      document.head.appendChild(script);
    }
  });

  return productModelViewerScriptPromise;
}

function renderProductModelViewerSurface(surface, previewUrl, modelLabel) {
  if (!surface) {
    return false;
  }

  surface
    .querySelectorAll(
      ".product-model-registration__model-viewer, .product-model-registration__unity-frame",
    )
    .forEach((element) => element.remove());
  surface.classList.remove(
    "is-model-viewer-ready",
    "is-unity-viewer-ready",
    "has-real-model",
  );
  delete surface.dataset.modelViewerSrc;
  delete surface.dataset.unityViewerSrc;

  if (!previewUrl || !canPreviewProductModelInBrowser(previewUrl, modelLabel)) {
    return false;
  }

  const viewerElement = document.createElement("model-viewer");
  viewerElement.className = "product-model-registration__model-viewer";
  viewerElement.setAttribute("src", previewUrl);
  viewerElement.setAttribute("camera-controls", "");
  viewerElement.setAttribute("interaction-prompt", "none");
  viewerElement.setAttribute("shadow-intensity", "0.72");
  viewerElement.setAttribute("exposure", "1");
  viewerElement.setAttribute("alt", modelLabel || "Product 3D model");

  surface.prepend(viewerElement);
  surface.classList.add("has-real-model");
  surface.dataset.modelViewerSrc = previewUrl;

  ensureProductModelViewerScript()
    .then(() => {
      if (surface?.dataset?.modelViewerSrc === previewUrl) {
        surface.classList.add("is-model-viewer-ready");
      }
    })
    .catch(() => {
      if (surface?.dataset?.modelViewerSrc === previewUrl) {
        viewerElement.remove();
        surface.classList.remove("is-model-viewer-ready", "has-real-model");
        delete surface.dataset.modelViewerSrc;
      }
    });

  return true;
}

function getProductModelUnityViewerUrl(previewUrl, frameUrls = []) {
  const url = new URL(PRODUCT_MODEL_UNITY_VIEWER_URL, window.location.origin);
  const normalizedPreviewUrl = String(previewUrl ?? "").trim();
  const normalizedFrameUrls = Array.isArray(frameUrls)
    ? frameUrls.map((frameUrl) => String(frameUrl ?? "").trim()).filter(Boolean)
    : [];

  if (normalizedPreviewUrl) {
    url.searchParams.set("modelUrl", normalizedPreviewUrl);
  }

  if (normalizedFrameUrls.length) {
    url.searchParams.set("frames", JSON.stringify(normalizedFrameUrls));
  }

  return `${url.pathname}${url.search}`;
}

function renderProductModelUnityViewerSurface(surface, previewUrl, frameUrls, modelLabel) {
  if (!surface) {
    return false;
  }

  const normalizedPreviewUrl = String(previewUrl ?? "").trim();
  const normalizedFrameUrls = Array.isArray(frameUrls)
    ? frameUrls.map((frameUrl) => String(frameUrl ?? "").trim()).filter(Boolean)
    : [];
  if (!normalizedPreviewUrl && !normalizedFrameUrls.length) {
    return false;
  }

  surface
    .querySelectorAll(".product-model-registration__model-viewer, .product-model-registration__unity-frame")
    .forEach((element) => element.remove());
  surface.classList.remove("is-model-viewer-ready");
  delete surface.dataset.modelViewerSrc;

  const unityFrame = document.createElement("iframe");
  unityFrame.className = "product-model-registration__unity-frame";
  unityFrame.title = modelLabel || "Unity 3D product viewer";
  unityFrame.src = getProductModelUnityViewerUrl(normalizedPreviewUrl, normalizedFrameUrls);
  unityFrame.setAttribute("allow", "fullscreen; autoplay");
  unityFrame.setAttribute("loading", "lazy");

  surface.prepend(unityFrame);
  surface.classList.add("has-real-model", "is-unity-viewer-ready");
  surface.dataset.unityViewerSrc = unityFrame.src;
  return true;
}

function renderProductModelInlineViewer(previewUrl, modelLabel) {
  return renderProductModelViewerSurface(productModelViewer, previewUrl, modelLabel);
}

function getProductModelFrameUrlMap(frameUrls = getProductModelFramePreviewUrls()) {
  const frameUrlMap = {};
  PRODUCT_MODEL_SCAN_STEPS.forEach((step, index) => {
    frameUrlMap[step.key] = String(frameUrls[index] ?? "").trim();
  });
  return frameUrlMap;
}

function setProductModelCubeTexture(cube, frameUrls = getProductModelFramePreviewUrls()) {
  if (!cube) {
    return false;
  }

  const frameUrlMap = getProductModelFrameUrlMap(frameUrls);
  const faceKeyByName = {
    front: "front",
    back: "back",
    right: "right",
    left: "left",
    top: "top",
    bottom: "bottom",
  };
  let texturedFaceCount = 0;

  for (const [faceName, frameKey] of Object.entries(faceKeyByName)) {
    const face = cube.querySelector(`.product-model-registration__cube-face--${faceName}`);
    const frameUrl = frameUrlMap[frameKey] || "";
    if (!face) {
      continue;
    }

    if (frameUrl) {
      face.style.backgroundImage = `url("${frameUrl.replace(/"/g, '\\"')}")`;
      face.classList.add("has-frame-texture");
      texturedFaceCount += 1;
    } else {
      face.style.backgroundImage = "";
      face.classList.remove("has-frame-texture");
    }
  }

  cube.classList.toggle(
    "has-frame-textures",
    texturedFaceCount === PRODUCT_MODEL_SCAN_STEPS.length,
  );
  return texturedFaceCount === PRODUCT_MODEL_SCAN_STEPS.length;
}

function syncProductModelRotation(cube = productModelCube) {
  if (!cube) {
    return;
  }

  cube.style.setProperty("--model-rotate-x", `${productModelRotationX}deg`);
  cube.style.setProperty("--model-rotate-y", `${productModelRotationY}deg`);
}

function bindProductModelRotationSurface(surface, cube = productModelCube) {
  if (!surface || !cube || surface.dataset.productModelRotationBound === "true") {
    return;
  }

  surface.dataset.productModelRotationBound = "true";
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRotationX = productModelRotationX;
  let startRotationY = productModelRotationY;
  const isRealModelViewerInteraction = (event) =>
    Boolean(event?.target?.closest?.("model-viewer"));

  surface.addEventListener("pointerdown", (event) => {
    if (isRealModelViewerInteraction(event)) {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startRotationX = productModelRotationX;
    startRotationY = productModelRotationY;
    surface.classList.add("is-dragging");
    surface.setPointerCapture?.(event.pointerId);
  });

  surface.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    event.preventDefault();
    productModelRotationX = Math.max(
      -70,
      Math.min(70, startRotationX - (event.clientY - startY) * 0.35),
    );
    productModelRotationY = startRotationY + (event.clientX - startX) * 0.45;
    syncProductModelRotation(productModelCube);
    syncProductModelRotation(cube);
  });

  const stopDragging = (event) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    surface.classList.remove("is-dragging");
    surface.releasePointerCapture?.(event.pointerId);
  };

  surface.addEventListener("pointerup", stopDragging);
  surface.addEventListener("pointercancel", stopDragging);
  surface.addEventListener("keydown", (event) => {
    if (surface.classList.contains("is-model-viewer-ready")) {
      return;
    }

    const rotationStep = event.shiftKey ? 12 : 6;
    if (event.key === "ArrowLeft") {
      productModelRotationY -= rotationStep;
    } else if (event.key === "ArrowRight") {
      productModelRotationY += rotationStep;
    } else if (event.key === "ArrowUp") {
      productModelRotationX = Math.max(-70, productModelRotationX - rotationStep);
    } else if (event.key === "ArrowDown") {
      productModelRotationX = Math.min(70, productModelRotationX + rotationStep);
    } else {
      return;
    }

    event.preventDefault();
    syncProductModelRotation(productModelCube);
    syncProductModelRotation(cube);
  });
}

function updateProductModelScanModalPreview() {
  if (!productModelScanPreviewStage) {
    return;
  }

  const hasModel = Boolean(pendingProductModelFile || editingProductModelUrl);
  const modelLabel = getProductModelSourceLabel();
  const previewUrl = getProductModelPreviewUrl();
  const scanFrameCount = getProductModelScanFrameCount();
  const previewCube = productModelScanPreviewStage.querySelector(
    ".product-model-registration__cube",
  );
  const frameUrls = getProductModelFramePreviewUrls();
  const hasBrowserPreview =
    renderProductModelUnityViewerSurface(
      productModelScanPreviewStage,
      previewUrl,
      frameUrls,
      modelLabel,
    ) ||
    renderProductModelViewerSurface(
      productModelScanPreviewStage,
      previewUrl,
      modelLabel,
    );
  if (!hasBrowserPreview) {
    setProductModelCubeTexture(previewCube);
  }

  productModelScanPreviewStage.classList.toggle(
    "has-model",
    hasModel || scanFrameCount > 0,
  );
  productModelScanPreviewStage.setAttribute(
    "aria-label",
    hasModel
      ? `3D model preview for ${modelLabel || "product"}`
      : "Empty 3D model preview",
  );

  syncProductModelRotation(previewCube);
  bindProductModelRotationSurface(productModelScanPreviewStage, previewCube);

  if (!productModelScanPreviewStatus) {
    return;
  }

  if (hasBrowserPreview) {
    productModelScanPreviewStatus.textContent =
      `Previewing ${modelLabel || "3D product"} in the Unity viewer.`;
  } else if (hasModel) {
    productModelScanPreviewStatus.textContent =
      `${modelLabel || "3D model"} is selected. Browser preview supports GLB and GLTF files.`;
  } else if (pendingProductModelScanFiles.length) {
    productModelScanPreviewStatus.textContent =
      `${pendingProductModelScanFiles.length} uploaded frame${pendingProductModelScanFiles.length === 1 ? "" : "s"} ready. Save to generate the 3D model.`;
  } else if (editingProductModelScanImageUrls.length) {
    productModelScanPreviewStatus.textContent =
      `${editingProductModelScanImageUrls.length} uploaded frame${editingProductModelScanImageUrls.length === 1 ? "" : "s"} registered.`;
  } else {
    productModelScanPreviewStatus.textContent =
      "Upload all 6 JPG frames, then save to generate the 3D model.";
  }
}

function renderProductModelRegistration() {
  const hasModel = Boolean(pendingProductModelFile || editingProductModelUrl);
  const modelLabel = getProductModelSourceLabel();
  const previewUrl = getProductModelPreviewUrl();
  const hasRegisteredData = hasModel;

  productModelViewer?.classList.toggle("has-model", hasRegisteredData);
  productModelRemoveButton?.toggleAttribute("hidden", !hasRegisteredData);

  if (productModelStatus) {
    if (hasModel) {
      productModelStatus.textContent = `GLB selected: ${modelLabel || "3D model"}`;
    } else {
      productModelStatus.textContent =
        "Upload one .glb file. The file preview will appear here before saving.";
    }
  }

  if (productModelViewer) {
    productModelViewer.setAttribute(
      "aria-label",
      hasModel ? `3D model preview for ${modelLabel || "product"}` : "Empty 3D model preview",
    );
  }

  syncProductModelRotation();
  bindProductModelRotationSurface(productModelViewer, productModelCube);
  const hasBrowserPreview = renderProductModelInlineViewer(previewUrl, modelLabel);
  if (!hasBrowserPreview) {
    setProductModelCubeTexture(productModelCube, []);
  }
  updateProductModelScanModalPreview();
  syncProductDetailsModelToggleState();
}

function setPendingProductModelFile(file) {
  if (!(file instanceof File)) {
    return;
  }

  if (!isSupportedProductModelFile(file)) {
    setStatus("Invalid 3D Model", "error");
    setHelperText("Upload a .glb 3D model file.");
    if (productModelFileInput) {
      productModelFileInput.value = "";
    }
    return;
  }

  clearProductModelObjectUrl();
  pendingProductModelFile = file;
  pendingProductModelObjectUrl = URL.createObjectURL(file);
  editingProductModelUrl = "";
  clearPendingProductModelScanObjectUrls();
  pendingProductModelScanFiles = [];
  editingProductModelScanImageUrls = [];
  renderProductModelRegistration();
  syncProductFormSubmitState();
  setStatus("3D Model Ready", "success");
  setHelperText(`${file.name} is ready. Save the product to register it.`);
}

function resetProductModelRegistration() {
  clearProductModelObjectUrl();
  clearPendingProductModelScanObjectUrls();
  pendingProductModelFile = null;
  editingProductModelUrl = "";
  pendingProductModelScanFiles = [];
  editingProductModelScanImageUrls = [];
  if (productModelFileInput) {
    productModelFileInput.value = "";
  }
  renderProductModelRegistration();
}

function stopProductModelScanCamera() {
  if (productModelScanStream) {
    for (const track of productModelScanStream.getTracks()) {
      track.stop();
    }
  }
  productModelScanStream = null;
}

function closeProductModelScanModal() {
  if (productModelScanCarouselTimer) {
    window.clearInterval(productModelScanCarouselTimer);
    productModelScanCarouselTimer = null;
  }
  stopProductModelScanCamera();
  if (productModelScanEscapeHandler) {
    document.removeEventListener("keydown", productModelScanEscapeHandler);
    productModelScanEscapeHandler = null;
  }
  if (productModelScanOverlay) {
    productModelScanOverlay.remove();
    productModelScanOverlay = null;
  }
  if (typeof productModelScanFramePreviewCleanup === "function") {
    productModelScanFramePreviewCleanup();
    productModelScanFramePreviewCleanup = null;
  }
  productModelScanPreviewStage = null;
  productModelScanPreviewStatus = null;
}

function createProductModelCubeElement() {
  const cube = document.createElement("div");
  cube.className = "product-model-registration__cube";
  cube.setAttribute("aria-hidden", "true");

  for (const faceName of ["front", "back", "right", "left", "top", "bottom"]) {
    const face = document.createElement("span");
    face.className = `product-model-registration__cube-face product-model-registration__cube-face--${faceName}`;
    cube.appendChild(face);
  }

  return cube;
}

function createProductModelScanFileName(step, index) {
  const productName = form?.elements?.name?.value || "product";
  const safeStem =
    String(productName ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "product";
  const safeStep =
    String(step?.key ?? `scan-${index + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `scan-${index + 1}`;

  return `${safeStem}-3d-scan-${safeStep}.jpg`;
}

function captureProductModelScanFrame(video, step, index) {
  return new Promise((resolve, reject) => {
    const width = Number(video?.videoWidth || 0);
    const height = Number(video?.videoHeight || 0);
    if (!video || width <= 0 || height <= 0) {
      reject(new Error("Camera preview is not ready yet."));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Unable to prepare camera scan frame."));
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to capture camera scan frame."));
          return;
        }

        resolve(
          new File([blob], createProductModelScanFileName(step, index), {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.9,
    );
  });
}

function setPendingProductModelScanFiles(files) {
  const scanFiles = Array.isArray(files) ? files.filter((file) => file instanceof File) : [];

  if (scanFiles.length !== PRODUCT_MODEL_SCAN_STEPS.length) {
    setStatus("6 Frames Required", "error");
    setHelperText(
      `Upload all ${PRODUCT_MODEL_SCAN_STEPS.length} JPG frames before generating the 3D model.`,
    );
    return;
  }

  clearProductModelObjectUrl();
  clearPendingProductModelScanObjectUrls();
  pendingProductModelFile = null;
  editingProductModelUrl = "";
  pendingProductModelScanFiles = scanFiles;
  editingProductModelScanImageUrls = [];
  if (productModelFileInput) {
    productModelFileInput.value = "";
  }
  renderProductModelRegistration();
  syncProductFormSubmitState();
  setStatus("6 Frames Ready", "success");
  setHelperText(
    `Six JPG frames are ready. Save the product to generate the 3D model.`,
  );
}

function openProductModelScanModal() {
  closeProductModelScanModal();

  const overlay = document.createElement("div");
  overlay.className = "product-model-scan-overlay";

  const modal = document.createElement("div");
  modal.className = "product-model-scan-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "product-model-scan-title");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "product-model-scan-modal__close";
  closeButton.setAttribute("aria-label", "Close 3D frame uploader");
  closeButton.innerHTML = `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`;
  closeButton.addEventListener("click", closeProductModelScanModal);

  const stage = document.createElement("div");
  stage.className = "product-model-scan-modal__stage product-model-scan-modal__stage--frames";
  stage.setAttribute("aria-label", "Upload 6 product frames");

  const progressTrack = document.createElement("div");
  progressTrack.className = "product-model-scan-modal__progress";
  const progressBar = document.createElement("span");
  progressTrack.appendChild(progressBar);

  const frameGrid = document.createElement("div");
  frameGrid.className = "product-model-scan-modal__frame-grid";
  stage.append(frameGrid, progressTrack);

  const content = document.createElement("div");
  content.className = "product-model-scan-modal__content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "product-model-registration__eyebrow";
  eyebrow.textContent = "6-frame generator";

  const title = document.createElement("h2");
  title.id = "product-model-scan-title";
  title.className = "product-model-scan-modal__title";
  title.textContent = "Upload 6 product frames";

  const scanCopy = document.createElement("p");
  scanCopy.className = "product-model-scan-modal__copy";
  scanCopy.textContent =
    "Add JPG photos for each side. When you save the product, the system will generate a textured 3D model.";

  const stepStatus = document.createElement("p");
  stepStatus.className = "product-model-scan-modal__step-status";
  stepStatus.setAttribute("aria-live", "polite");
  stepStatus.textContent = `0/${PRODUCT_MODEL_SCAN_STEPS.length} frames selected.`;

  const previewPanel = document.createElement("div");
  previewPanel.className = "product-model-scan-modal__preview";

  const previewLabel = document.createElement("p");
  previewLabel.className = "product-model-scan-modal__preview-label";
  previewLabel.textContent = "3D model preview";

  const previewStage = document.createElement("div");
  previewStage.className =
    "product-model-registration__viewer product-model-scan-modal__preview-stage";
  previewStage.setAttribute("role", "img");
  previewStage.setAttribute("aria-label", "3D model preview");
  previewStage.tabIndex = 0;

  const previewCube = createProductModelCubeElement();
  const previewScanRing = document.createElement("div");
  previewScanRing.className = "product-model-registration__scan-ring";
  previewScanRing.setAttribute("aria-hidden", "true");
  previewStage.append(previewCube, previewScanRing);

  const previewStatus = document.createElement("p");
  previewStatus.className = "product-model-scan-modal__preview-status";
  previewStatus.setAttribute("aria-live", "polite");

  previewPanel.append(previewLabel, previewStage, previewStatus);
  productModelScanPreviewStage = previewStage;
  productModelScanPreviewStatus = previewStatus;

  const actionRow = document.createElement("div");
  actionRow.className = "product-model-scan-modal__actions";

  const chooseAllButton = document.createElement("button");
  chooseAllButton.type = "button";
  chooseAllButton.className =
    "product-model-registration__action product-model-registration__action--primary";
  chooseAllButton.innerHTML = `<i class="fa-solid fa-images" aria-hidden="true"></i><span>Choose 6 Images</span>`;

  const doneButton = document.createElement("button");
  doneButton.type = "button";
  doneButton.className = "product-model-registration__action";
  doneButton.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i><span>Done</span>`;
  doneButton.disabled = true;

  const frameInputAll = document.createElement("input");
  frameInputAll.type = "file";
  frameInputAll.accept = "image/jpeg,image/jpg,image/png,image/webp";
  frameInputAll.multiple = true;
  frameInputAll.hidden = true;

  const selectedFrameFiles = PRODUCT_MODEL_SCAN_STEPS.map(
    (_, index) => pendingProductModelScanFiles[index] ?? null,
  );
  const framePreviewUrls = PRODUCT_MODEL_SCAN_STEPS.map((_, index) =>
    selectedFrameFiles[index] ? URL.createObjectURL(selectedFrameFiles[index]) : "",
  );

  const clearFramePreviewUrl = (index) => {
    const previewUrl = framePreviewUrls[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      framePreviewUrls[index] = "";
    }
  };
  productModelScanFramePreviewCleanup = () => {
    framePreviewUrls.forEach((_, index) => {
      clearFramePreviewUrl(index);
    });
  };

  const updateProgress = () => {
    const totalSteps = PRODUCT_MODEL_SCAN_STEPS.length;
    const completedSteps = selectedFrameFiles.filter((file) => file instanceof File).length;
    progressBar.style.width = `${(completedSteps / totalSteps) * 100}%`;
    stepStatus.textContent =
      completedSteps === totalSteps
        ? "All 6 frames are ready. Save to generate the 3D model."
        : `${completedSteps}/${totalSteps} frames selected.`;
    doneButton.disabled = completedSteps !== totalSteps;
    setProductModelCubeTexture(previewCube, framePreviewUrls);
    if (productModelScanPreviewStatus) {
      productModelScanPreviewStatus.textContent =
        completedSteps === totalSteps
          ? "Previewing the 6 uploaded frames on the 3D product cube."
          : `${completedSteps}/${totalSteps} frames are mapped to the preview cube.`;
    }
  };

  const renderFrameGrid = () => {
    frameGrid.innerHTML = "";
    PRODUCT_MODEL_SCAN_STEPS.forEach((step, index) => {
      const frameCard = document.createElement("label");
      frameCard.className = "product-model-scan-modal__frame-card";
      frameCard.classList.toggle("has-image", selectedFrameFiles[index] instanceof File);

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/jpg,image/png,image/webp";
      input.hidden = true;
      input.addEventListener("change", () => {
        const selectedFile = input.files?.[0] ?? null;
        if (!(selectedFile instanceof File)) {
          return;
        }

        clearFramePreviewUrl(index);
        selectedFrameFiles[index] = selectedFile;
        framePreviewUrls[index] = URL.createObjectURL(selectedFile);
        renderFrameGrid();
        updateProgress();
      });

      const preview = document.createElement("span");
      preview.className = "product-model-scan-modal__frame-preview";
      if (framePreviewUrls[index]) {
        preview.style.backgroundImage = `url("${framePreviewUrls[index]}")`;
      } else {
        preview.innerHTML = `<i class="fa-solid fa-image" aria-hidden="true"></i>`;
      }

      const label = document.createElement("span");
      label.className = "product-model-scan-modal__frame-label";
      label.textContent = step.label;

      const hint = document.createElement("span");
      hint.className = "product-model-scan-modal__frame-hint";
      hint.textContent = selectedFrameFiles[index] instanceof File ? "Ready" : "Upload JPG";

      frameCard.append(input, preview, label, hint);
      frameGrid.appendChild(frameCard);
    });
  };

  chooseAllButton.addEventListener("click", () => {
    frameInputAll.click();
  });
  frameInputAll.addEventListener("change", () => {
    const selectedFiles = Array.from(frameInputAll.files ?? [])
      .filter((file) => file instanceof File)
      .slice(0, PRODUCT_MODEL_SCAN_STEPS.length);
    selectedFiles.forEach((file, index) => {
      clearFramePreviewUrl(index);
      selectedFrameFiles[index] = file;
      framePreviewUrls[index] = URL.createObjectURL(file);
    });
    renderFrameGrid();
    updateProgress();
  });
  doneButton.addEventListener("click", () => {
    setPendingProductModelScanFiles(selectedFrameFiles);
    closeProductModelScanModal();
  });

  actionRow.append(chooseAllButton, doneButton, frameInputAll);
  content.append(eyebrow, title, scanCopy, stepStatus, previewPanel, actionRow);
  modal.append(closeButton, stage, content);
  overlay.appendChild(modal);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeProductModelScanModal();
    }
  });
  productModelScanEscapeHandler = (event) => {
    if (event.key === "Escape") {
      closeProductModelScanModal();
    }
  };
  document.addEventListener("keydown", productModelScanEscapeHandler);

  document.body.appendChild(overlay);
  productModelScanOverlay = overlay;
  renderFrameGrid();
  updateProgress();
  updateProductModelScanModalPreview();
}

function stopVisualSearchCamera() {
  if (visualSearchCameraStream) {
    for (const track of visualSearchCameraStream.getTracks()) {
      track.stop();
    }
  }
  visualSearchCameraStream = null;
}

function closeVisualSearchCamera() {
  visualSearchDetectionSessionId += 1;
  stopVisualSearchCamera();
  if (visualSearchCameraEscapeHandler) {
    document.removeEventListener("keydown", visualSearchCameraEscapeHandler);
    visualSearchCameraEscapeHandler = null;
  }
  if (visualSearchCameraOverlay) {
    visualSearchCameraOverlay.remove();
    visualSearchCameraOverlay = null;
  }
}

function createVisualSearchCameraButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function clampVisualSearchValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function loadVisualSearchExternalScript(src) {
  if (visualSearchDetectorScriptPromises.has(src)) {
    return visualSearchDetectorScriptPromises.get(src);
  }

  const scriptPromise = new Promise((resolve, reject) => {
    const existingScript = Array.from(document.scripts).find(
      (script) => script.src === src || script.getAttribute("src") === src,
    );
    const script = existingScript ?? document.createElement("script");

    if (script.dataset.visualSearchLoaded === "true") {
      resolve();
      return;
    }

    script.addEventListener(
      "load",
      () => {
        script.dataset.visualSearchLoaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        reject(new Error(`Unable to load ${src}`));
      },
      { once: true },
    );

    if (!existingScript) {
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.visualSearchDetector = "true";
      document.head.appendChild(script);
    }
  });

  visualSearchDetectorScriptPromises.set(src, scriptPromise);
  return scriptPromise;
}

async function ensureVisualSearchDetectorModel(updateStatus) {
  if (visualSearchDetectorModel) {
    return visualSearchDetectorModel;
  }

  if (!visualSearchDetectorModelPromise) {
    visualSearchDetectorModelPromise = (async () => {
      updateStatus?.("Loading TensorFlow detector...");
      if (!window.tf) {
        await loadVisualSearchExternalScript(VISUAL_SEARCH_TFJS_SCRIPT_URL);
      }
      if (window.tf?.ready) {
        await window.tf.ready();
      }

      updateStatus?.("Loading product detector...");
      if (!window.cocoSsd) {
        await loadVisualSearchExternalScript(VISUAL_SEARCH_COCO_SSD_SCRIPT_URL);
      }
      if (!window.cocoSsd?.load) {
        throw new Error("TensorFlow COCO-SSD detector did not load.");
      }

      updateStatus?.("Preparing detector...");
      const model = await window.cocoSsd.load({ base: "lite_mobilenet_v2" });
      visualSearchDetectorModel = model;
      return model;
    })().catch((error) => {
      visualSearchDetectorModelPromise = null;
      throw error;
    });
  }

  return visualSearchDetectorModelPromise;
}

function getVisualSearchSourceDimensions(source) {
  const width = Number(
    source?.videoWidth ||
      source?.naturalWidth ||
      source?.width ||
      source?.clientWidth ||
      0,
  );
  const height = Number(
    source?.videoHeight ||
      source?.naturalHeight ||
      source?.height ||
      source?.clientHeight ||
      0,
  );

  return {
    width: Number.isFinite(width) && width > 0 ? width : 1,
    height: Number.isFinite(height) && height > 0 ? height : 1,
  };
}

function chooseVisualSearchDetection(predictions, source) {
  const sourceDimensions = getVisualSearchSourceDimensions(source);
  const sourceWidth = sourceDimensions.width;
  const sourceHeight = sourceDimensions.height;
  const sourceArea = sourceWidth * sourceHeight;
  const centerX = sourceWidth / 2;
  const centerY = sourceHeight / 2;
  let bestDetection = null;

  for (const prediction of Array.isArray(predictions) ? predictions : []) {
    const bbox = Array.isArray(prediction?.bbox) ? prediction.bbox : [];
    const [x, y, width, height] = bbox.map((value) => Number(value));
    const score = Number(prediction?.score ?? 0);
    const className = String(prediction?.class ?? "").trim().toLowerCase();

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 20 ||
      height < 20 ||
      VISUAL_SEARCH_NON_PRODUCT_DETECTION_CLASSES.has(className)
    ) {
      continue;
    }

    const areaRatio = (width * height) / sourceArea;
    if (areaRatio < 0.015) {
      continue;
    }

    const detectionCenterX = x + width / 2;
    const detectionCenterY = y + height / 2;
    const centerDistance = Math.hypot(
      (detectionCenterX - centerX) / sourceWidth,
      (detectionCenterY - centerY) / sourceHeight,
    );
    const isCenteredDetection =
      centerDistance <= VISUAL_SEARCH_DETECTION_CENTER_DISTANCE_LIMIT;
    const passesScore =
      score >= VISUAL_SEARCH_DETECTION_MIN_SCORE ||
      (isCenteredDetection && score >= VISUAL_SEARCH_DETECTION_CENTER_MIN_SCORE);
    if (!passesScore) {
      continue;
    }

    const rankScore = score + Math.min(areaRatio, 0.45) * 0.55 - centerDistance * 0.18;

    if (!bestDetection || rankScore > bestDetection.rankScore) {
      bestDetection = {
        bbox: [x, y, width, height],
        className,
        score,
        rankScore,
        detectedAt: Date.now(),
      };
    }
  }

  return bestDetection;
}

function getVisualSearchStageBox(source, stage, detection) {
  const sourceDimensions = getVisualSearchSourceDimensions(source);
  if (!detection?.bbox || sourceDimensions.width <= 1 || sourceDimensions.height <= 1) {
    return null;
  }

  const [x, y, width, height] = detection.bbox;
  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  const scale = Math.max(stageWidth / sourceDimensions.width, stageHeight / sourceDimensions.height);
  const renderedWidth = sourceDimensions.width * scale;
  const renderedHeight = sourceDimensions.height * scale;
  const offsetX = (stageWidth - renderedWidth) / 2;
  const offsetY = (stageHeight - renderedHeight) / 2;
  const left = clampVisualSearchValue(offsetX + x * scale, 0, stageWidth);
  const top = clampVisualSearchValue(offsetY + y * scale, 0, stageHeight);
  const right = clampVisualSearchValue(offsetX + (x + width) * scale, 0, stageWidth);
  const bottom = clampVisualSearchValue(offsetY + (y + height) * scale, 0, stageHeight);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function syncVisualSearchDetectionOverlay({
  video,
  stage,
  detection,
  detectionBox,
  detectionLabel,
  detectorStatus,
}) {
  const stageBox = getVisualSearchStageBox(video, stage, detection);
  if (!stageBox || stageBox.width < 8 || stageBox.height < 8) {
    detectionBox.hidden = true;
    detectorStatus.textContent = "Point camera at the product item";
    return;
  }

  detectionBox.hidden = false;
  detectionBox.style.left = `${stageBox.left}px`;
  detectionBox.style.top = `${stageBox.top}px`;
  detectionBox.style.width = `${stageBox.width}px`;
  detectionBox.style.height = `${stageBox.height}px`;

  const scoreLabel = `${Math.round(detection.score * 100)}%`;
  detectionLabel.textContent = `Product item ${scoreLabel}`;
  detectorStatus.textContent = "Product item detected";
}

function getVisualSearchCaptureCrop(detection, frameWidth, frameHeight) {
  if (!detection?.bbox || Date.now() - detection.detectedAt > VISUAL_SEARCH_DETECTION_MAX_AGE_MS) {
    return null;
  }

  const [x, y, width, height] = detection.bbox;
  const padding = Math.max(width, height) * VISUAL_SEARCH_CAPTURE_PADDING_RATIO;
  const left = clampVisualSearchValue(x - padding, 0, frameWidth - 1);
  const top = clampVisualSearchValue(y - padding, 0, frameHeight - 1);
  const right = clampVisualSearchValue(x + width + padding, left + 1, frameWidth);
  const bottom = clampVisualSearchValue(y + height + padding, top + 1, frameHeight);
  const cropX = Math.floor(left);
  const cropY = Math.floor(top);
  const cropRight = Math.ceil(right);
  const cropBottom = Math.ceil(bottom);

  return {
    x: cropX,
    y: cropY,
    width: cropRight - cropX,
    height: cropBottom - cropY,
    className: detection.className,
  };
}

async function runVisualSearchDetectorLoop({
  video,
  stage,
  detectionBox,
  detectionLabel,
  detectorStatus,
  sessionId,
  setLatestDetection,
}) {
  const updateStatus = (text) => {
    if (sessionId === visualSearchDetectionSessionId) {
      detectorStatus.textContent = text;
    }
  };

  try {
    const model = await ensureVisualSearchDetectorModel(updateStatus);
    updateStatus("Point camera at the product item");

    while (sessionId === visualSearchDetectionSessionId && visualSearchCameraOverlay) {
      if (video.videoWidth && video.videoHeight && video.readyState >= 2) {
        const predictions = await model.detect(video);
        const detection = chooseVisualSearchDetection(predictions, video);
        setLatestDetection(detection);
        syncVisualSearchDetectionOverlay({
          video,
          stage,
          detection,
          detectionBox,
          detectionLabel,
          detectorStatus,
        });
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, VISUAL_SEARCH_DETECTION_INTERVAL_MS);
      });
    }
  } catch (error) {
    if (sessionId === visualSearchDetectionSessionId) {
      setLatestDetection(null);
      detectionBox.hidden = true;
      detectorStatus.textContent = "Detector unavailable. Capture still works.";
    }
  }
}

async function openVisualSearchCamera(slotKey = VISUAL_SEARCH_PRIMARY_IMAGE_ANGLE) {
  const normalizedSlotKey = normalizeVisualSearchImageSlotKey(slotKey);
  const slotLabel = getVisualSearchImageSlotLabel(normalizedSlotKey);
  closeVisualSearchCamera();

  const overlay = document.createElement("div");
  overlay.className = "visual-search-camera-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${slotLabel} product image search camera`);

  const modal = document.createElement("section");
  modal.className = "visual-search-camera";

  const stage = document.createElement("div");
  stage.className = "visual-search-camera__stage";

  const video = document.createElement("video");
  video.className = "visual-search-camera__preview";
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.hidden = true;

  const message = document.createElement("p");
  message.className = "visual-search-camera__message";
  message.textContent = "Opening camera...";

  const detectionBox = document.createElement("div");
  detectionBox.className = "visual-search-camera__detection-box";
  detectionBox.hidden = true;

  const detectionLabel = document.createElement("span");
  detectionLabel.className = "visual-search-camera__detection-label";
  detectionBox.appendChild(detectionLabel);

  const detectorStatus = document.createElement("p");
  detectorStatus.className = "visual-search-camera__detector-status";
  detectorStatus.textContent = "Detector waiting for camera...";

  const actions = document.createElement("div");
  actions.className = "visual-search-camera__actions";

  const cancelButton = createVisualSearchCameraButton(
    "Cancel",
    "ghost-button visual-search-camera__action",
  );
  const captureButton = createVisualSearchCameraButton(
    "Capture",
    "visual-search-camera__action visual-search-camera__action--primary",
  );
  captureButton.disabled = true;

  actions.append(cancelButton, captureButton);
  stage.append(video, detectionBox, message, detectorStatus);
  modal.append(stage, actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  visualSearchCameraOverlay = overlay;
  const visualSearchCameraSessionId = visualSearchDetectionSessionId;
  let latestVisualSearchDetection = null;

  visualSearchCameraEscapeHandler = (event) => {
    if (event.key === "Escape") {
      closeVisualSearchCamera();
    }
  };
  document.addEventListener("keydown", visualSearchCameraEscapeHandler);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeVisualSearchCamera();
    }
  });
  cancelButton.addEventListener("click", closeVisualSearchCamera);

  const showCameraError = (helperText, statusText) => {
    message.textContent = helperText;
    message.hidden = false;
    video.hidden = true;
    detectionBox.hidden = true;
    detectorStatus.hidden = true;
    captureButton.disabled = true;
    setHelperText(helperText);
    setStatus(statusText, "error");
  };

  if (!window.isSecureContext) {
    showCameraError(
      "Camera needs HTTPS or localhost. Open this admin page on localhost, or deploy it with HTTPS.",
      "Camera Needs HTTPS",
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError("Camera is not available in this browser.", "Camera Unavailable");
    return;
  }

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch (error) {
    showCameraError(
      "Camera permission is blocked or this page is not allowed to use the camera.",
      "Camera Blocked",
    );
    return;
  }

  visualSearchCameraStream = stream;
  video.srcObject = stream;
  video.hidden = false;
  message.hidden = true;
  detectorStatus.hidden = false;
  detectorStatus.textContent = "Starting product detector...";
  captureButton.disabled = false;

  captureButton.addEventListener("click", () => {
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 1280;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setHelperText("Unable to capture the camera image.");
      setStatus("Capture Failed", "error");
      return;
    }

    const crop = getVisualSearchCaptureCrop(latestVisualSearchDetection, width, height);
    if (crop) {
      canvas.width = crop.width;
      canvas.height = crop.height;
      context.drawImage(
        video,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
    } else {
      context.drawImage(video, 0, 0, width, height);
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setHelperText("Unable to capture the camera image.");
        setStatus("Capture Failed", "error");
        return;
      }

      const imageFile = new File(
        [blob],
        `visual-search-${normalizedSlotKey}-${Date.now()}.jpg`,
        { type: "image/jpeg" },
      );
      setPendingVisualSearchImage(imageFile, normalizedSlotKey);
      syncProductFormSubmitState();
      setHelperText(
        crop
          ? `${slotLabel} product item reference photo is ready.`
          : `${slotLabel} image search reference photo is ready.`,
      );
      setStatus(crop ? "Product Item Detected" : "Image Ready", "success");
      closeVisualSearchCamera();
    }, "image/jpeg", 0.9);
  });

  try {
    await video.play();
    runVisualSearchDetectorLoop({
      video,
      stage,
      detectionBox,
      detectionLabel,
      detectorStatus,
      sessionId: visualSearchCameraSessionId,
      setLatestDetection: (detection) => {
        latestVisualSearchDetection = detection;
      },
    });
  } catch (error) {
    message.textContent = "Tap the camera preview if the video does not start.";
    message.hidden = false;
  }
}

function hasGeneratedBarcode() {
  return Boolean(String(barcodeInput?.value || "").trim());
}

function showSingleBarcodeValidation() {
  openProductValidationModal({
    mode: "notice",
    title: "Important notice",
    copy: "Only one barcode is allowed per product.",
    actionLabel: "Go Back",
    iconHtml: "fa-solid fa-triangle-exclamation",
  });
}

function buildVariantsPayload(variants = editingVariants) {
  return variants
    .filter((variant) => {
      const name = String(variant?.name ?? "").trim();
      const imageUrl = String(variant?.imageUrl ?? "").trim();
      const addOns = Array.isArray(variant?.addOns) ? variant.addOns : [];
      const originalPrice = String(variant?.originalPrice ?? "").trim();
      const salesPrice = String(variant?.salesPrice ?? "").trim();
      return Boolean(name || imageUrl || addOns.length || originalPrice || salesPrice);
    })
    .map((variant, index) => {
      const normalizedImageUrl = String(variant?.imageUrl ?? "").trim();
      const normalizedImageSourceUrl =
        String(variant?.imageSourceUrl ?? "").trim() || normalizedImageUrl;
      const normalizedImagePositionX = normalizeCardImagePosition(
        variant?.imagePositionX,
        DEFAULT_CARD_IMAGE_POSITION_X,
      );
      const normalizedImagePositionY = normalizeCardImagePosition(
        variant?.imagePositionY,
        DEFAULT_CARD_IMAGE_POSITION,
      );
      return {
        id: String(variant?.id ?? "").trim() || undefined,
        name: String(variant?.name ?? "").trim(),
        imageUrl: normalizedImageUrl,
        imageSourceUrl: normalizedImageSourceUrl,
        imagePositionX: normalizedImagePositionX,
        imagePositionY: normalizedImagePositionY,
        addOns: Array.isArray(variant?.addOns)
          ? variant.addOns
              .map((addOn) => ({
                id: String(addOn?.id ?? "").trim(),
                name: String(addOn?.name ?? "").trim(),
                quantity:
                  Number.isInteger(Number(addOn?.quantity)) && Number(addOn?.quantity) > 0
                    ? Number(addOn.quantity)
                    : 1,
              }))
              .filter((addOn) => addOn.id && addOn.name)
          : [],
        originalPrice: String(variant?.originalPrice ?? "").trim(),
        salesPrice: String(variant?.salesPrice ?? "").trim() || null,
        position: index,
      };
    });
}

function getUniqueCategories(categories) {
  const seen = new Map();

  for (const categoryGroup of categories) {
    for (const normalizedCategory of normalizeCategoryValues(categoryGroup)) {
      const key = normalizedCategory.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, normalizedCategory);
      }
    }
  }

  return [...seen.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

function syncCategoryFieldValue() {
  if (categorySelect) {
    categorySelect.value = selectedProductCategories[0] ?? "";
  }
}

function syncCategoryMultiSelectSummary() {
  if (!categorySummary) {
    return;
  }

  const selectedCount = selectedProductCategories.length;
  if (selectedCount === 0) {
    categorySummary.textContent = "Select categories";
  } else if (selectedCount <= 2) {
    categorySummary.textContent = selectedProductCategories.join(", ");
  } else {
    categorySummary.textContent = `${selectedCount} categories selected`;
  }
}

function syncSelectedCategoryCarouselControls() {
  if (!selectedCategoryCarousel || !selectedCategoryChips) {
    return;
  }

  const hasCategories = Boolean(
    selectedCategoryChips.querySelector(".product-category-choice-badge"),
  );
  const carouselWidth = Math.max(0, selectedCategoryCarousel.clientWidth);
  const contentWidth = Math.max(0, selectedCategoryChips.scrollWidth);
  const hasOverflow =
    hasCategories && carouselWidth > 0 && contentWidth > carouselWidth + 2;

  selectedCategoryCarousel.classList.toggle("has-overflow", hasOverflow);
  selectedCategoryChips.tabIndex = hasOverflow ? 0 : -1;
  selectedCategoryCarouselButtons.forEach((button) => {
    button.hidden = !hasOverflow;
  });

  const maxScrollLeft = Math.max(
    0,
    selectedCategoryChips.scrollWidth - selectedCategoryChips.clientWidth,
  );
  const scrollLeft = Math.max(0, selectedCategoryChips.scrollLeft);
  selectedCategoryCarouselButtons.forEach((button) => {
    const direction = String(button.dataset.productCategoryScroll || "").toLowerCase();
    const isPrevious =
      direction === "previous" || direction === "prev" || direction === "left";
    const isAtEdge = isPrevious ? scrollLeft <= 1 : scrollLeft >= maxScrollLeft - 1;
    button.disabled = !hasOverflow || isAtEdge;
  });
}

function requestSelectedCategoryCarouselControlSync() {
  if (
    !selectedCategoryCarousel ||
    !selectedCategoryChips ||
    selectedCategoryCarouselControlFrame
  ) {
    return;
  }

  selectedCategoryCarouselControlFrame = window.requestAnimationFrame(() => {
    selectedCategoryCarouselControlFrame = 0;
    syncSelectedCategoryCarouselControls();
  });
}

function scrollSelectedCategoryCarousel(direction = "next") {
  if (!selectedCategoryChips) {
    return;
  }

  const normalizedDirection = String(direction || "").toLowerCase();
  const isPrevious =
    normalizedDirection === "previous" ||
    normalizedDirection === "prev" ||
    normalizedDirection === "left";
  const scrollDistance = Math.max(96, selectedCategoryChips.clientWidth * 0.72);

  selectedCategoryChips.scrollBy({
    left: isPrevious ? -scrollDistance : scrollDistance,
    behavior: "smooth",
  });
  requestSelectedCategoryCarouselControlSync();
  window.setTimeout(requestSelectedCategoryCarouselControlSync, 320);
}

function getSelectedCategoryChipAnimationKey(categoryName = "") {
  return normalizeCategoryName(categoryName).toLowerCase();
}

function captureSelectedCategoryChipRects() {
  if (!selectedCategoryChips) {
    return new Map();
  }

  const rects = new Map();
  selectedCategoryChips
    .querySelectorAll(".product-category-selected-chip")
    .forEach((chip) => {
      const animationKey = String(chip.dataset.animationKey ?? "").trim();
      if (!animationKey) {
        return;
      }

      rects.set(animationKey, chip.getBoundingClientRect());
    });
  return rects;
}

function animateSelectedCategoryChipReorder(previousRects) {
  if (!selectedCategoryChips || !(previousRects instanceof Map) || !previousRects.size) {
    return;
  }

  const chips = Array.from(
    selectedCategoryChips.querySelectorAll(".product-category-selected-chip"),
  );
  if (!chips.length) {
    return;
  }

  window.requestAnimationFrame(() => {
    chips.forEach((chip) => {
      const animationKey = String(chip.dataset.animationKey ?? "").trim();
      if (!animationKey || !previousRects.has(animationKey)) {
        return;
      }

      const previousRect = previousRects.get(animationKey);
      const nextRect = chip.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }

      chip.style.transition = "none";
      chip.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      chip.style.zIndex = "3";

      window.requestAnimationFrame(() => {
        chip.style.transition =
          "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease";
        chip.style.transform = "translate(0px, 0px)";

        const cleanup = () => {
          chip.style.removeProperty("transition");
          chip.style.removeProperty("transform");
          chip.style.removeProperty("z-index");
          chip.removeEventListener("transitionend", cleanup);
        };

        chip.addEventListener("transitionend", cleanup);
      });
    });
  });
}

function clearSelectedCategoryChipDragState() {
  draggedSelectedCategoryIndex = -1;
  if (!selectedCategoryChips) {
    return;
  }

  selectedCategoryChips
    .querySelectorAll(".product-category-selected-chip.is-dragging, .product-category-selected-chip.is-drag-over")
    .forEach((chip) => chip.classList.remove("is-dragging", "is-drag-over"));
}

function moveSelectedProductCategory(fromIndex, toIndex) {
  const maxIndex = selectedProductCategories.length - 1;
  const normalizedFromIndex = Math.max(0, Math.min(Number(fromIndex) || 0, maxIndex));
  const normalizedToIndex = Math.max(0, Math.min(Number(toIndex) || 0, maxIndex));

  if (
    normalizedFromIndex === normalizedToIndex ||
    normalizedFromIndex < 0 ||
    normalizedToIndex < 0 ||
    !selectedProductCategories.length
  ) {
    return false;
  }

  const nextSelectedCategories = [...selectedProductCategories];
  const [movedCategory] = nextSelectedCategories.splice(normalizedFromIndex, 1);
  nextSelectedCategories.splice(normalizedToIndex, 0, movedCategory);
  setSelectedProductCategories(nextSelectedCategories);
  return true;
}

function renderSelectedCategoryChips() {
  if (!selectedCategoryChips) {
    return;
  }

  selectedCategoryChips.innerHTML = "";
  selectedCategoryChips.hidden = false;
  const categoryChoices = getUniqueCategories([availableCategories]);
  const hasCategoryChoices = categoryChoices.length > 0;
  selectedCategoryChips.classList.toggle("has-categories", hasCategoryChoices);
  if (selectedCategoryCarousel) {
    selectedCategoryCarousel.hidden = !hasCategoryChoices;
  }

  for (const category of categoryChoices) {
    const isSelected = selectedProductCategories.some((selectedCategory) =>
      isSameCategoryName(selectedCategory, category),
    );
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "product-category-choice-badge";
    badge.classList.toggle("is-selected", isSelected);
    badge.dataset.category = category;
    badge.setAttribute("aria-pressed", isSelected ? "true" : "false");
    badge.setAttribute(
      "aria-label",
      isSelected ? `Remove ${category}` : `Select ${category}`,
    );
    badge.title = isSelected ? `Remove ${category}` : `Select ${category}`;

    const badgeLabel = document.createElement("span");
    badgeLabel.className = "product-category-choice-badge__label";
    badgeLabel.textContent = category;

    const selectedIndicator = document.createElement("span");
    selectedIndicator.className = "product-category-choice-badge__selected-indicator";
    selectedIndicator.setAttribute("aria-hidden", "true");
    selectedIndicator.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x" focusable="false">
        <path d="M18 6 6 18"></path>
        <path d="m6 6 12 12"></path>
      </svg>
    `;

    badge.append(badgeLabel, selectedIndicator);
    badge.addEventListener("click", () => {
      const nextSelectedCategories = isSelected
        ? selectedProductCategories.filter(
            (selectedCategory) => !isSameCategoryName(selectedCategory, category),
          )
        : [...selectedProductCategories, category];
      setSelectedProductCategories(nextSelectedCategories);
    });
    selectedCategoryChips.appendChild(badge);
  }

  requestSelectedCategoryCarouselControlSync();
}

function setCategoryMultiSelectOpen(isOpen) {
  if (!categoryMultiSelect || !categoryTriggerButton || !categoryMenu) {
    return;
  }

  const wasOpen = !categoryMenu.hidden;

  if (!isOpen && categorySearchTerm) {
    categorySearchTerm = "";
    renderCategoryMultiSelectOptions();
  }

  categoryMultiSelect.classList.toggle("is-open", Boolean(isOpen));
  categoryTriggerButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  categoryMenu.hidden = !isOpen;

  if (isOpen) {
    window.requestAnimationFrame(() => {
      const searchInput = categoryMenu.querySelector(".product-category-multiselect__search");
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus();
        if (wasOpen) {
          const cursorPosition = searchInput.value.length;
          searchInput.setSelectionRange(cursorPosition, cursorPosition);
        } else {
          searchInput.select();
        }
      }
    });
  }
}

function renderCategoryMultiSelectOptions() {
  if (!categoryMenu) {
    return;
  }

  categoryMenu.innerHTML = "";
  const nextCategories = getUniqueCategories([
    ...availableCategories,
    ...selectedProductCategories,
  ]);
  const normalizedCategorySearchTerm = String(categorySearchTerm ?? "").trim().toLowerCase();
  const filteredCategories = normalizedCategorySearchTerm
    ? nextCategories.filter((category) =>
        String(category ?? "").trim().toLowerCase().includes(normalizedCategorySearchTerm),
      )
    : nextCategories;

  const searchShell = document.createElement("div");
  searchShell.className = "product-category-multiselect__search-shell";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "product-category-multiselect__search";
  searchInput.placeholder = "Quick search categories";
  searchInput.value = categorySearchTerm;
  searchInput.autocomplete = "off";
  searchInput.setAttribute("aria-label", "Quick search categories");
  searchInput.addEventListener("input", () => {
    window.clearTimeout(categorySearchTimer);
    categorySearchTimer = window.setTimeout(() => {
      categorySearchTerm = searchInput.value;
      renderCategoryMultiSelectOptions();
      setCategoryMultiSelectOpen(true);
    }, 500);
  });
  searchShell.appendChild(searchInput);
  categoryMenu.appendChild(searchShell);

  if (!nextCategories.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "product-category-multiselect__empty";
    emptyState.textContent = "No categories available yet.";
    categoryMenu.appendChild(emptyState);
    return;
  }

  if (!filteredCategories.length) {
    if (window.GMS_ADMIN_SEARCH_NOT_FOUND) {
      categoryMenu.appendChild(
        window.GMS_ADMIN_SEARCH_NOT_FOUND.create({ compact: true }),
      );
    } else {
      const emptyState = document.createElement("div");
      emptyState.className = "product-category-multiselect__empty";
      emptyState.textContent = "Not Found";
      categoryMenu.appendChild(emptyState);
    }
    return;
  }

  for (const category of filteredCategories) {
    const option = document.createElement("label");
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");
    option.setAttribute(
      "aria-selected",
      selectedProductCategories.some((selectedCategory) => isSameCategoryName(selectedCategory, category))
        ? "true"
        : "false",
    );

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedProductCategories.some((selectedCategory) =>
      isSameCategoryName(selectedCategory, category),
    );
    checkbox.addEventListener("change", () => {
      const nextSelectedCategories = checkbox.checked
        ? [...selectedProductCategories, category]
        : selectedProductCategories.filter(
            (selectedCategory) => !isSameCategoryName(selectedCategory, category),
          );
      setSelectedProductCategories(nextSelectedCategories);
      setCategoryMultiSelectOpen(true);
    });

    const label = document.createElement("span");
    label.textContent = category;

    option.append(checkbox, label);
    categoryMenu.appendChild(option);
  }
}

function getAllowedSelectedProductCategories(nextCategories) {
  const allowedCategoriesByKey = new Map(
    availableCategories.map((category) => [category.toLowerCase(), category]),
  );
  return normalizeCategoryValues(nextCategories)
    .map((category) => allowedCategoriesByKey.get(category.toLowerCase()))
    .filter(Boolean);
}

function setSelectedProductCategories(nextCategories, { syncPreview = true } = {}) {
  selectedProductCategories = getAllowedSelectedProductCategories(nextCategories);
  syncCategoryFieldValue();
  syncCategoryMultiSelectSummary();
  renderSelectedCategoryChips();
  renderCategoryMultiSelectOptions();
  syncProductFormSubmitState();
  if (syncPreview) {
    renderAndroidProductPreview();
  }
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
}

function setCategoryOptions(categories, selectedValues = selectedProductCategories) {
  availableCategories = getUniqueCategories([categories]);
  selectedProductCategories = getAllowedSelectedProductCategories(selectedValues);
  syncCategoryFieldValue();
  syncCategoryMultiSelectSummary();
  renderSelectedCategoryChips();
  renderCategoryMultiSelectOptions();
  renderInventoryCategoryFilterOptions(availableCategories);
  renderInventoryStatusFilterOptions();
  syncProductFormSubmitState();
  if (form) {
    renderAndroidProductPreview();
  }
}

function getCategoryUsageCount(categoryName) {
  const normalizedCategoryName = normalizeCategoryName(categoryName).toLowerCase();

  if (!normalizedCategoryName) {
    return 0;
  }

  return currentProducts.reduce((count, product) => {
    return getProductCategoryList(product).some(
      (productCategoryName) => productCategoryName.toLowerCase() === normalizedCategoryName,
    )
      ? count + 1
      : count;
  }, 0);
}

async function loadCategories(selectedValue = selectedProductCategories, options = {}) {
  const quiet = options?.quiet === true;
  try {
    const response = await fetch("/api/categories", {
      cache: "no-store",
      headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load categories.");
    }

    const categories = Array.isArray(data.categories) ? data.categories : [];
    const businessType = String(data.businessType ?? "").trim();
    if (selectedCategoryCarousel) {
      selectedCategoryCarousel.dataset.businessType = businessType;
      selectedCategoryCarousel.setAttribute(
        "aria-label",
        businessType
          ? `${businessType} product categories`
          : "Categories available for this seller Business Type",
      );
    }
    setCategoryOptions(categories, selectedValue);
  } catch (error) {
    console.error(error);
    if (quiet) {
      return;
    }
    if (selectedCategoryCarousel) {
      delete selectedCategoryCarousel.dataset.businessType;
    }
    setCategoryOptions([], []);
  }
}

async function checkProductImageFileSafety(file) {
  if (!(file instanceof File) || !String(file.type || "").toLowerCase().startsWith("image/")) {
    return { blocked: false, requiresReview: false };
  }

  const requestBody = file.slice(0, file.size, file.type || "application/octet-stream");
  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = window.setTimeout(() => {
    abortController?.abort();
  }, 8000);

  let response;
  try {
    response = await fetch("/api/products/illegal-content-check", {
      method: "POST",
      headers: withProductPanelAdminScopeHeaders({
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name || "product-image",
        Accept: "application/json",
      }),
      body: requestBody,
      signal: abortController?.signal,
    });
  } catch (_) {
    return { blocked: false, requiresReview: false };
  } finally {
    window.clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      data = {};
    }
  }

  if (!response.ok) {
    return { blocked: false, requiresReview: false };
  }

  return data && typeof data === "object"
    ? data
    : { blocked: false, requiresReview: false };
}

function isProductImageSafetyBlocked(safety = {}) {
  const normalizedAction = String(
    safety?.yoloSafety?.action ?? safety?.action ?? "",
  ).trim().toLowerCase();
  return safety?.blocked === true || normalizedAction === "auto-reject";
}

function getProductVariantRevisionAlertMessage(product = {}) {
  const revision = product?.yoloRevision || product?.revisionSignal || null;
  if (!revision || typeof revision !== "object") {
    return "";
  }

  const matchType = String(revision.matchType || "").trim().toLowerCase();
  const fields = Array.isArray(revision.fields)
    ? revision.fields.map((field) => String(field || "").trim().toLowerCase())
    : [];
  const images = Array.isArray(revision.images) ? revision.images : [];
  const hasVariantEvidence =
    matchType === "yolo-variant" ||
    fields.includes("variant") ||
    images.some((entry) =>
      String(entry?.matchType || "").trim().toLowerCase() === "yolo-variant" ||
      String(entry?.variantName || "").trim()
    );

  if (!hasVariantEvidence) {
    return "";
  }

  return String(revision.message || "").trim() ||
    "YOLO flagged a variant image/name mismatch. Please revise the variant name or replace the variant image.";
}

async function uploadMediaFile(file) {
  let response;

  try {
    response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      body: file,
    });
  } catch (_) {
    throw new Error(
      "Upload failed before the server could respond. Check if the video is too large, then try again.",
    );
  }

  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      if (!response.ok) {
        throw new Error(responseText.trim() || "Unable to upload media.");
      }
    }
  }

  if (!response.ok) {
    const uploadError = new Error(data.message || "Unable to upload media.");
    uploadError.code = data.code || "";
    uploadError.yoloSafety = data.yoloSafety || data.sellerSafety || null;
    throw uploadError;
  }

  return data.imageUrl || "";
}

function uploadMediaFileWithProgress(file, { onProgress = null, onRequest = null } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onRequest?.(xhr);
    xhr.open("POST", "/api/uploads", true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", file.name);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      onProgress?.((event.loaded / event.total) * 100);
    });

    xhr.addEventListener("load", () => {
      const responseText = String(xhr.responseText || "");
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (_) {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(responseText.trim() || "Unable to upload media."));
            return;
          }
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const uploadError = new Error(data.message || "Unable to upload media.");
        uploadError.code = data.code || "";
        uploadError.yoloSafety = data.yoloSafety || data.sellerSafety || null;
        reject(uploadError);
        return;
      }

      onProgress?.(100);
      resolve(data.imageUrl || "");
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error(
          "Upload failed before the server could respond. Check your connection, then try again.",
        ),
      );
    });

    xhr.addEventListener("abort", () => {
      const abortError = new Error("Video upload was cancelled.");
      abortError.name = "AbortError";
      reject(abortError);
    });

    xhr.send(file);
  });
}

async function uploadProductModelFile(file) {
  let response;

  try {
    response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
      body: file,
    });
  } catch (_) {
    throw new Error("Unable to upload the 3D model. Check the file, then try again.");
  }

  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      if (!response.ok) {
        throw new Error(responseText.trim() || "Unable to upload 3D model.");
      }
    }
  }

  if (!response.ok) {
    throw new Error(data.message || "Unable to upload 3D model.");
  }

  return data.modelUrl || data.imageUrl || "";
}

async function generateProductModelFromScanImageUrls(imageUrls) {
  const normalizedImageUrls = Array.isArray(imageUrls)
    ? imageUrls.map((imageUrl) => String(imageUrl ?? "").trim()).filter(Boolean)
    : [];
  if (normalizedImageUrls.length !== PRODUCT_MODEL_SCAN_STEPS.length) {
    throw new Error(
      `Upload all ${PRODUCT_MODEL_SCAN_STEPS.length} frames before generating the 3D model.`,
    );
  }

  let response;
  try {
    response = await fetch("/api/product-models/from-frames", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form?.elements?.name?.value || "product-model",
        frames: PRODUCT_MODEL_SCAN_STEPS.map((step, index) => ({
          key: step.key,
          imageUrl: normalizedImageUrls[index],
        })),
      }),
    });
  } catch (_) {
    throw new Error("Unable to generate the 3D model from uploaded frames.");
  }

  const responseText = await response.text();
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      if (!response.ok) {
        throw new Error(responseText.trim() || "Unable to generate 3D model.");
      }
    }
  }

  if (!response.ok) {
    throw new Error(data.message || "Unable to generate 3D model.");
  }

  const modelUrl = String(data.modelUrl ?? "").trim();
  if (!modelUrl) {
    throw new Error("The 3D model generator did not return a model file.");
  }

  return modelUrl;
}

function populateForm(product) {
  if (!form) {
    return;
  }

  cancelProductImageProcessingSession();
  revealProductEditorSection(defaultProductEditorSectionId, { shouldScroll: false });
  setProductDetailsBarcodeModalOpen(false, { focusInput: false });
  setProductDetailsModelModalOpen(false);
  setProductDetailsVariantsModalOpen(false);
  setProductDetailsPartnerModalOpen("delivery", false);
  setProductDetailsPartnerModalOpen("payment", false);
  clearPreviewCardCrop();
  clearPreviewBuyModalCrop();
  clearPreviewDetailsCrops();
  previewCardCroppedImageUrl = getStoredProductCardImageUrl(product);
  previewCardCropSourceUrl = getProductCardCropSourceUrl(product);
  previewBuyModalCroppedImageUrl = getStoredProductBuyModalImageUrl(product);
  previewBuyModalCropSourceUrl = getProductBuyModalCropSourceUrl(product);
  restorePreviewDetailsCropsFromProduct(product);
  const storedProductImageUrls = getNormalizedProductImageUrls(product);
  const storedMainImageIndex = getResolvedProductMainImageIndex(
    product,
    storedProductImageUrls,
  );
  const productImageUrls = storedProductImageUrls.length
    ? [
        storedProductImageUrls[storedMainImageIndex],
        ...storedProductImageUrls.filter((_, index) => index !== storedMainImageIndex),
      ]
    : [];
  const productDescriptionImageUrls = normalizeProductDescriptionImageUrls(
    product?.descriptionImageUrls,
  );
  clearVariantPreviewObjectUrls();
  clearProductDescriptionImagePreviewObjectUrls();
  editingDescriptionImageUrls = [...productDescriptionImageUrls];
  pendingDescriptionImageFiles = Array(productDescriptionImageUrls.length).fill(null);
  descriptionImagePreviewObjectUrls = Array(productDescriptionImageUrls.length).fill("");
  editingVariants = normalizeEditableVariants(product?.variants);
  syncEditableVariantAddOnsWithInventory();

  form.elements.name.value = product.name ?? "";
  form.elements.barcode.value = product.barcode ?? "";
  clearVisualSearchPreviewObjectUrl();
  pendingVisualSearchImageFiles = createVisualSearchImageSlotMap(null);
  editingVisualSearchImageAngles = normalizeEditableVisualSearchImageAngles(product);
  syncLegacyVisualSearchImageState();
  clearProductModelObjectUrl();
  clearPendingProductModelScanObjectUrls();
  pendingProductModelFile = null;
  editingProductModelUrl = normalizeProductModelUrl(product);
  pendingProductModelScanFiles = [];
  editingProductModelScanImageUrls = [];
  if (form.elements.moveBarcodeToPackingDashboard) {
    form.elements.moveBarcodeToPackingDashboard.checked = Boolean(
      product.moveBarcodeToPackingDashboard,
    );
  }
  form.elements.originalPrice.value = getOriginalPrice(product) || "";
  form.elements.salesPrice.value =
    product.salesPrice === null || product.salesPrice === undefined
      ? ""
      : product.salesPrice;
  setSelectedProductPartnerIds("delivery", product.deliveryPartnerIds);
  setSelectedProductPartnerIds("payment", product.paymentPartnerIds);
  renderProductPartnerSelections();
  syncBarcodePreview();
  setCategoryOptions(availableCategories, getProductCategoryList(product));
  // Listing stock stays as inventory total; expiry follows current sell priority
  // (or the next available batch once priority stock is depleted).
  editingListingActiveSourceBatch = getListingActiveSourceBatch(product);
  form.elements.stock.value = getStock(product);
  syncListingStockInputLimits(product);
  if (form.elements.expiryDate) {
    form.elements.expiryDate.value = formatProductDateInputValue(
      getListingActiveExpiryDate(product),
    );
    syncProductExpiryDateTrigger();
  }
  clearPreviewObjectUrls();
  clearVideoPreviewObjectUrls();
  clearVideoThumbnailPreviewObjectUrls();
  cancelAllPendingProductVideoUploads();
  editingImageUrls = normalizeEditableImageSlots(productImageUrls);
  pendingImageFiles = Array(editingImageUrls.length).fill(null);
  imagePreviewObjectUrls = Array(editingImageUrls.length).fill("");
  productPhotoCropSourceUrls = Array(editingImageUrls.length).fill("");
  productPhotoCropStates = Array(editingImageUrls.length).fill(null);
  editingVideoUrls = getNormalizedProductVideoUrls(product);
  editingVideoThumbnailUrls = getNormalizedProductVideoThumbnailUrls(product, editingVideoUrls);
  pendingVideoFiles = Array(editingVideoUrls.length).fill(null);
  pendingVideoUploadTasks = Array(editingVideoUrls.length).fill(null);
  videoPreviewObjectUrls = Array(editingVideoUrls.length).fill("");
  pendingVideoThumbnailFiles = Array(editingVideoUrls.length).fill(null);
  videoThumbnailPreviewObjectUrls = Array(editingVideoUrls.length).fill("");
  productVideoCropSourceUrls = Array(editingVideoUrls.length).fill("");
  productVideoCropStates = Array(editingVideoUrls.length).fill(null);
  selectedMainImageSlot = 0;
  editingCardImagePositionX = getProductCardImagePositionX(product);
  editingCardImagePosition = getProductCardImagePosition(product);
  editingBuyModalImagePositionX = normalizeCardImagePosition(
    product?.buyModalImagePositionX,
    DEFAULT_CARD_IMAGE_POSITION_X,
  );
  editingBuyModalImagePositionY = normalizeCardImagePosition(
    product?.buyModalImagePositionY,
    DEFAULT_CARD_IMAGE_POSITION,
  );
  renderProductImageInputs();
  renderProductVideoInputs();
  form.elements.description.value = product.description ?? "";
  if (isProductDescriptionModeSwitcherAvailable()) {
    setProductDescriptionMode(productDescriptionImageUrls.length ? "image" : "text");
  } else {
    renderProductDescriptionImageEditor();
  }
  syncVisualSearchPreview();
  renderProductModelRegistration();
  renderAndroidProductPreview();
  captureProductEditBaselineSnapshot();
  syncProductFormSubmitState();
}

function resetFormMode() {
  if (!form) {
    return;
  }

  cancelProductImageProcessingSession();
  revealProductEditorSection(defaultProductEditorSectionId, { shouldScroll: false });
  setProductDetailsBarcodeModalOpen(false, { focusInput: false });
  setProductDetailsModelModalOpen(false);
  setProductDetailsVariantsModalOpen(false);
  setProductDetailsPartnerModalOpen("delivery", false);
  setProductDetailsPartnerModalOpen("payment", false);
  if (usesProductComposerOverviewLayout()) {
    resetProductComposerCanvasScroll();
  }
  editingProductId = null;
  editingListingActiveSourceBatch = "";
  listingStockDeductReasonDraft = null;
  shouldBypassListingStockDeductReason = false;
  syncListingStockInputLimits(null);
  clearProductEditBaselineSnapshot();
  clearPreviewObjectUrls();
  clearVideoPreviewObjectUrls();
  clearVideoThumbnailPreviewObjectUrls();
  clearProductDescriptionImagePreviewObjectUrls();
  cancelAllPendingProductVideoUploads();
  clearVariantPreviewObjectUrls();
  clearPreviewCardCrop();
  clearPreviewBuyModalCrop();
  clearPreviewDetailsCrops();
  editingImageUrls = [""];
  pendingImageFiles = [null];
  imagePreviewObjectUrls = [""];
  productPhotoCropSourceUrls = [""];
  productPhotoCropStates = [null];
  editingDescriptionImageUrls = [];
  pendingDescriptionImageFiles = [];
  descriptionImagePreviewObjectUrls = [];
  editingVideoUrls = [];
  editingVideoThumbnailUrls = [];
  pendingVideoFiles = [];
  pendingVideoUploadTasks = [];
  videoPreviewObjectUrls = [];
  pendingVideoThumbnailFiles = [];
  videoThumbnailPreviewObjectUrls = [];
  productVideoCropSourceUrls = [];
  productVideoCropStates = [];
  selectedMainImageSlot = 0;
  editingCardImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
  editingCardImagePosition = DEFAULT_CARD_IMAGE_POSITION;
  editingBuyModalImagePositionX = DEFAULT_CARD_IMAGE_POSITION_X;
  editingBuyModalImagePositionY = DEFAULT_CARD_IMAGE_POSITION;
  resetVisualSearchImageState();
  resetProductModelRegistration();
  requestedEditProductId = "";
  setEditQueryParam("");
  form.reset();
  if (isProductDescriptionModeSwitcherAvailable()) {
    setProductDescriptionMode("text");
  }
  setProductExpiryDateCalendarOpen(false);
  syncProductExpiryDateTrigger();
  setCategoryOptions(availableCategories, []);
  editingVariants = [];
  selectedDeliveryPartnerIds = [];
  selectedPaymentPartnerIds = [];
  openProductPartnerDropdownType = "";
  collapsedProductPartnerTypes.clear();
  renderProductImageInputs();
  renderProductVideoInputs();
  renderProductDescriptionImageEditor();
  renderProductPartnerSelections();
  syncBarcodePreview();
  setProductSubmitButtonLabel(
    isStandaloneProductEditorPage ? "Save Listing" : "Publish Listing",
  );
  if (formSectionLabel) {
    formSectionLabel.textContent = "Create Listing";
  }
  if (formTitle) {
    formTitle.textContent = isStandaloneProductEditorPage ? "Edit Listing" : "Add Listing";
  }
  if (productComposerSubtitle) {
    productComposerSubtitle.textContent =
      "Create a new listing and manage all the essential information.";
  }
  if (productComposerBrandIcon) {
    productComposerBrandIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
  }
  if (productComposerCloseButton) {
    productComposerCloseButton.setAttribute("aria-label", "Close Add Listing");
  }
  setHelperText(
    isStandaloneProductEditorPage
      ? 'Products are saved in backend/data/products.json.'
      : '* Required fields',
  );
  setStatus("Adding", "default");
  renderAndroidProductPreview();
  syncProductFormSubmitState();
}

function setProductSubmitButtonLabel(label) {
  if (!submitButton) {
    return;
  }

  const labelElement = submitButton.querySelector("[data-product-submit-label]");
  if (labelElement) {
    labelElement.textContent = label;
    return;
  }

  submitButton.textContent = label;
}

function setProductFormSubmitting(isSubmitting) {
  isProductFormSubmitting = Boolean(isSubmitting);

  if (submitButton) {
    submitButton.classList.toggle("is-loading", isProductFormSubmitting);
    submitButton.setAttribute("aria-busy", isProductFormSubmitting ? "true" : "false");
    if (isProductFormSubmitting) {
      submitButton.disabled = true;
      setProductSubmitButtonLabel(
        editingProductId ? "Updating..." : "Publishing...",
      );
    } else {
      setProductSubmitButtonLabel(
        editingProductId
          ? "Update Listing"
          : (isStandaloneProductEditorPage ? "Save Listing" : "Publish Listing"),
      );
    }
  }

  syncProductFormSubmitState();
}

function focusProductComposerPrimaryField() {
  if (usesProductComposerOverviewLayout()) {
    const dialog = productComposerModal?.querySelector('[role="dialog"]');
    if (dialog instanceof HTMLElement) {
      window.requestAnimationFrame(() => {
        dialog.focus({ preventScroll: true });
      });
    }
    return;
  }

  const nameField = form?.elements?.name;
  if (nameField && typeof nameField.focus === "function") {
    window.requestAnimationFrame(() => {
      nameField.focus();
    });
  }
}

function setProductComposerOpen(isOpen) {
  if (isStandaloneProductEditorPage && productFormPanel) {
    productFormPanel.hidden = false;
    syncModalOpenClass();
    return;
  }

  if (productComposerModal) {
    if (productComposerCloseTimer) {
      window.clearTimeout(productComposerCloseTimer);
      productComposerCloseTimer = 0;
    }

    if (isOpen) {
      productComposerModal.hidden = false;
      productComposerModal.setAttribute("aria-hidden", "false");
      productComposerOpenButton?.setAttribute("aria-expanded", "true");
      window.requestAnimationFrame(() => {
        if (!productComposerModal.hidden) {
          productComposerModal.classList.add("is-open");
        }
      });
    } else {
      hideProductDescriptionUploadSnackbar();
      productComposerModal.classList.remove("is-open");
      productComposerModal.setAttribute("aria-hidden", "true");
      productComposerOpenButton?.setAttribute("aria-expanded", "false");
      productComposerCloseTimer = window.setTimeout(() => {
        productComposerModal.hidden = true;
        productComposerCloseTimer = 0;
        syncModalOpenClass();
        notifyParentProductComposerState(false);
        syncListingDraftFab();
      }, PRODUCT_COMPOSER_CLOSE_ANIMATION_MS);
    }
  } else if (productFormPanel) {
    productFormPanel.hidden = !isOpen;
  }

  if (!productComposerModal || isOpen) {
    syncModalOpenClass();
    notifyParentProductComposerState(isOpen);
  }

  if (isOpen) {
    requestProductPhotoCarouselControlSync();
    requestSelectedCategoryCarouselControlSync();
    window.requestAnimationFrame(() => {
      requestProductPhotoCarouselControlSync();
      requestSelectedCategoryCarouselControlSync();
      notifyParentProductComposerState(Boolean(
        productComposerModal
        && !productComposerModal.hidden
        && productComposerModal.classList.contains("is-open")
      ));
    });
    [120, 320, 700].forEach((delay) => {
      window.setTimeout(() => {
        requestProductPhotoCarouselControlSync();
        requestSelectedCategoryCarouselControlSync();
        notifyParentProductComposerState(Boolean(
          productComposerModal
          && !productComposerModal.hidden
          && productComposerModal.classList.contains("is-open")
        ));
      }, delay);
    });
  }
}

function notifyParentProductComposerState(isOpen) {
  try {
    const localPortalSetter = window.__gmsSetProductListingComposerPortalOpen;
    if (typeof localPortalSetter === "function") {
      localPortalSetter(Boolean(isOpen));
    }
  } catch (error) {
    // The composer still opens normally if the Main shell bridge is unavailable.
  }

  if (window.parent === window) {
    return;
  }

  try {
    const parentPortalSetter = window.parent.__gmsSetProductListingComposerPortalOpen;
    if (typeof parentPortalSetter === "function") {
      parentPortalSetter(Boolean(isOpen));
    }
  } catch (error) {
    // Cross-origin parents can still receive the postMessage fallback below.
  }

  try {
    window.parent.postMessage(
      {
        type: "gms-product-composer-state",
        isOpen: Boolean(isOpen),
      },
      window.location.origin,
    );
  } catch (error) {
    // The embedded editor remains usable if the parent shell is unavailable.
  }
}

function closeProductComposer({ reset = true, saveDraft = true } = {}) {
  if (isStandaloneProductEditorPage) {
    if (reset) {
      resetFormMode();
    }

    window.location.href = getProductPanelUrl();
    return;
  }

  if (reset && saveDraft && LISTING_DRAFT_FEATURE_ENABLED && !editingProductId && hasListingDraftContent()) {
    window.clearTimeout(listingDraftAutoSaveTimer);
    persistListingDraftToStorageNow({ includeProcessing: true });
  }

  if (reset) {
    resetFormMode();
  }

  setProductComposerOpen(false);
}

function revealProductComposer({ reset = false } = {}) {
  if (reset) {
    resetFormMode();
    /* LISTING_DRAFT: restore saved draft when re-opening Add Listing
    const draft = !editingProductId ? readListingDraftFromStorage() : null;
    if (draft?.snapshot) {
      applyListingDraftSnapshot(draft.snapshot);
    }
    */
  }

  setProductComposerOpen(true);
  syncListingDraftFab();
  if (usesProductComposerOverviewLayout()) {
    resetProductComposerCanvasScroll();
  }
  focusProductComposerPrimaryField();
}

function enterEditMode(product) {
  if (!form) {
    window.location.href = getStandaloneProductEditorUrl(product?.id);
    return;
  }

  revealProductComposer({ reset: false });
  editingProductId = product.id;
  requestedEditProductId = product.id;
  setEditQueryParam(product.id);
  populateForm(product);
  setProductSubmitButtonLabel("Update Listing");
  if (formSectionLabel) {
    formSectionLabel.textContent = "Edit Listing";
  }
  if (formTitle) {
    formTitle.textContent = "Edit Listing";
  }
  if (productComposerSubtitle) {
    productComposerSubtitle.textContent =
      product?.name
        ? `Update "${product.name}" in the listing workspace.`
        : "Update this listing in the same workspace.";
  }
  if (productComposerBrandIcon) {
    productComposerBrandIcon.innerHTML = productListingSquarePenIconMarkup;
  }
  if (productComposerCloseButton) {
    productComposerCloseButton.setAttribute("aria-label", "Close Edit Listing");
  }
  setHelperText("");
  setStatus("Editing", "default");
  syncProductFormSubmitState();
  syncListingDraftFab();
  if (requestedProductEditorFocusSectionId) {
    window.setTimeout(applyRequestedProductEditorFocus, 80);
  } else {
    focusProductComposerPrimaryField();
  }
}

function createProductCard(product) {
  const sourceProduct = getDisplayProductSourceProduct(product);
  const wrapper = document.createElement("article");
  const productStock = getListingSellableStock(product);
  const hasStockAvailable = productStock > 0;
  const isExpiredBatchCard = isExpiredProductDisplayEntry(product);
  const isPendingRequest = isProductPendingApproval(sourceProduct);
  const needsRevision = isProductRevisionRequested(sourceProduct);
  const canManageProduct = !isExpiredBatchCard;
  const canToggleVisibility = !isExpiredBatchCard && !isPendingRequest;
  const canOpenProductDetails = true;
  const isActiveInApp = !isExpiredBatchCard && !isPendingRequest && isActiveProductInApp(product);
  const productCategoryLabel = getProductCategoryLabel(sourceProduct);
  const statusLabel = isPendingRequest
    ? "In review"
    : isExpiredBatchCard
      ? "Expired"
      : (isActiveInApp ? "Active" : "Not Active");
  const originalPrice = getOriginalPrice(sourceProduct);
  const salesPrice = getSalesPrice(sourceProduct);
  const hasRootSalePrice =
    salesPrice !== null && originalPrice > 0 && salesPrice < originalPrice;
  // Zap is a listing-card affordance for every card (not discount-gated).
  // Hidden while Super Admin review is still pending.
  const showZapBadge = !isPendingRequest && !isExpiredBatchCard;

  wrapper.className =
    `product-card${isActiveInApp ? "" : " is-inactive"}${isExpiredBatchCard ? " product-card--expired-batch" : ""}${isPendingRequest ? " product-card--pending-request" : ""}${needsRevision ? " product-card--needs-revision" : ""}${showZapBadge ? " product-card--has-zap" : ""}`;
  wrapper.classList.add("product-card--overview-trigger");
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "button");
  wrapper.setAttribute("aria-label", `Open listing details for ${sourceProduct.name || "product"}`);
  wrapper.setAttribute("aria-haspopup", "dialog");
  wrapper.dataset.productId = String(sourceProduct.id ?? "").trim();
  if (needsRevision) {
    wrapper.dataset.needsRevision = "true";
  }
  const visibilityToggleLabel = isExpiredBatchCard
    ? "Expired stock stays offline"
    : isPendingRequest
      ? "In review"
      : getProductVisibilityToggleLabel(
          isActiveInApp,
          hasStockAvailable,
        );

  const galleryItems = getProductGalleryItems(sourceProduct);
  const imageCount = galleryItems.filter((item) => item.type !== "video").length;
  const { imageUrl: cardDisplayImageUrl, objectPosition: imageObjectPosition } =
    getProductCardDisplayImageData(sourceProduct);
  const videoCount = getNormalizedProductVideoUrls(sourceProduct).length;
  const image = cardDisplayImageUrl
    ? `<img src="${cardDisplayImageUrl}" alt="${sourceProduct.name}" style="object-position:${imageObjectPosition};" />`
    : "";
  const imageCountIndicator = imageCount
    ? `
        <span class="product-image__count" aria-label="${imageCount} product image${
          imageCount === 1 ? "" : "s"
        }">
          <i class="fa-regular fa-images" aria-hidden="true"></i>
          <span>${imageCount}</span>
        </span>
      `
    : "";
  const videoCountIndicator = videoCount
    ? `
        <span class="product-image__count product-image__count--video" aria-label="${videoCount} product video${
          videoCount === 1 ? "" : "s"
        }">
          <i class="fa-regular fa-circle-play" aria-hidden="true"></i>
          <span>${videoCount}</span>
        </span>
      `
    : "";
  const mediaCountIndicators = imageCountIndicator || videoCountIndicator
    ? `
        <span class="product-image__meta">
          ${imageCountIndicator}${videoCountIndicator}
        </span>
      `
    : "";
  const productStateBadge = isExpiredBatchCard
    ? `<span class="product-card__highlight-badge product-card__highlight-badge--expired">Expired</span>`
    : "";
  const flashDealForCard = getFlashDealForProduct(sourceProduct.id);
  const flashStatusText = flashDealStatusLabel(flashDealForCard);
  const flashStatusBadge = flashStatusText
    ? `<span class="product-card__flash-status ${flashDealStatusToneClass(
        flashDealForCard,
      )}" title="Flash Deal">${flashStatusText}</span>`
    : "";
  const productHighlightBadges =
    productStateBadge || flashStatusBadge
      ? `<div class="product-card__highlights">${productStateBadge}${flashStatusBadge}</div>`
      : "";
  const batchNote = isExpiredBatchCard
    ? `<p class="product-meta product-card__batch-note">Expired batch only. Offline in product list.</p>`
    : "";
  const displayPrice = hasRootSalePrice ? salesPrice : originalPrice;
  const originalPriceMarkup = hasRootSalePrice
    ? `<span class="product-card__original-price">${formatPrice(originalPrice)}</span>`
    : "";

  // Flash Deal setup entry stays next to Edit (no image ribbon on seller admin).
  const zapBadgeMarkup = showZapBadge
    ? `<button
          type="button"
          class="product-card__zap-badge${flashStatusText ? " has-flash-status" : ""}"
          data-flash-deal-open="${sourceProduct.id}"
          aria-label="Set up Flash Deal"
          title="Flash Deal${flashStatusText ? ` · ${flashStatusText}` : ""}"
        >${productListingFlashDealZapIconMarkup}</button>`
    : "";

  wrapper.innerHTML = `
    <button
      type="button"
      class="product-image product-card__photo-button"
      aria-label="Open listing details for ${sourceProduct.name}"
      title="Open listing details"
    >
      ${image}${mediaCountIndicators}
    </button>
    <div class="product-card__body">
      <div class="product-card__status-row">
        <span
          class="product-card__badge product-card__badge--status${isActiveInApp ? "" : " is-inactive"}"
          data-approval-status="${isPendingRequest ? "pending" : "approved"}"
          title="${statusLabel}"
        >
          <span class="visually-hidden">${statusLabel}</span>
        </span>
        <button
          type="button"
          class="product-card__visibility-toggle${isActiveInApp ? " is-active" : ""}"
          data-product-id="${sourceProduct.id}"
          aria-pressed="${isActiveInApp ? "true" : "false"}"
          aria-label="${visibilityToggleLabel}"
          title="${visibilityToggleLabel}"
          ${canToggleVisibility ? "" : "disabled"}
        >
          <span class="product-card__visibility-toggle-track" aria-hidden="true">
            <span class="product-card__visibility-toggle-thumb"></span>
          </span>
        </button>
      </div>
      <h3 class="product-name">${sourceProduct.name}</h3>
      <span class="product-card__category">${productCategoryLabel}</span>
      <span class="product-card__price-row">
        <span class="product-card__price">${formatPrice(displayPrice)}</span>
        ${originalPriceMarkup}
      </span>
      ${productHighlightBadges}
      ${batchNote}
    </div>
    <div class="product-card__footer">
      <div class="product-actions">
        <div class="product-card__edit-cluster">
          ${zapBadgeMarkup}
          <button
            type="button"
            class="edit-button product-card__edit-button icon-action-button${needsRevision ? " has-revision-dot" : ""}"
            data-product-id="${sourceProduct.id}"
            aria-label="${canManageProduct
              ? (needsRevision ? "Edit product. Super Admin requested revision." : "Edit product")
              : "Expired batch is read-only"}"
            title="${canManageProduct
              ? (needsRevision ? "Needs revision" : "Edit product")
              : "Expired batch is read-only"}"
            ${canManageProduct ? "" : "disabled"}
          >
            <span class="product-card__edit-icon" aria-hidden="true">
              ${productListingSquarePenIconMarkup}
              ${needsRevision ? '<span class="product-card__revision-badge"></span>' : ""}
            </span>
            <span>Edit</span>
          </button>
        </div>
        <button
          type="button"
          class="delete-button icon-action-button icon-action-button--danger"
          data-product-id="${sourceProduct.id}"
          aria-label="${canManageProduct ? "Delete product" : "Expired batch cannot be deleted here"}"
          title="${canManageProduct ? "Delete product" : "Expired batch cannot be deleted here"}"
          ${canManageProduct ? "" : "disabled"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;

  const productImageButton = wrapper.querySelector(".product-card__photo-button");
  if (productImageButton && canOpenProductDetails) {
    productImageButton.addEventListener("click", () => {
      openDescriptionModal(product, productImageButton);
    });
  }

  if (canOpenProductDetails) {
    wrapper.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("button, a, input, select, textarea, label")) {
        return;
      }
      openDescriptionModal(product, wrapper);
    });

    wrapper.addEventListener("keydown", (event) => {
      if (event.target !== wrapper || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }
      event.preventDefault();
      openDescriptionModal(product, wrapper);
    });
  }

  const editButton = wrapper.querySelector(".edit-button");
  if (editButton && canManageProduct) {
    editButton.addEventListener("click", () => {
      enterEditMode(sourceProduct);
    });
  }

  const flashDealButton = wrapper.querySelector("[data-flash-deal-open]");
  if (flashDealButton instanceof HTMLButtonElement) {
    flashDealButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opener = window.SwitchSellerFlashDeals?.openForProduct;
      if (typeof opener === "function") {
        void opener(sourceProduct);
        return;
      }
      window.alert("Flash Deal setup is still loading. Refresh the page and try again.");
    });
  }

  const deleteButton = wrapper.querySelector(".delete-button");
  if (deleteButton && canManageProduct) {
    deleteButton.addEventListener("click", () => {
      openProductDeleteConfirmationModal(`product "${sourceProduct.name}"`, () => {
        void handleDeleteProduct(sourceProduct, { skipConfirmation: true });
      });
    });
  }

  const visibilityToggleButton = wrapper.querySelector(".product-card__visibility-toggle");
  if (visibilityToggleButton && canToggleVisibility) {
    visibilityToggleButton.addEventListener("click", () => {
      void handleProductVisibilityToggle(sourceProduct, !isActiveInApp, visibilityToggleButton);
    });
  }

  return wrapper;
}

function syncProductCardVisibilityState(toggleButton, isActive, hasStockAvailable = true) {
  if (!(toggleButton instanceof HTMLButtonElement)) {
    return;
  }

  const normalizedIsActive = Boolean(isActive);
  toggleButton.classList.toggle("is-active", normalizedIsActive);
  toggleButton.setAttribute("aria-pressed", normalizedIsActive ? "true" : "false");

  const label = getProductVisibilityToggleLabel(normalizedIsActive, hasStockAvailable);
  toggleButton.setAttribute("aria-label", label);
  toggleButton.title = label;

  const card = toggleButton.closest(".product-card");
  if (!(card instanceof HTMLElement)) {
    return;
  }

  card.classList.toggle("is-inactive", !normalizedIsActive);

  const statusBadge = card.querySelector(".product-card__badge--status");
  if (statusBadge instanceof HTMLElement) {
    const statusLabel = normalizedIsActive ? "Active" : "Not Active";
    statusBadge.classList.toggle("is-inactive", !normalizedIsActive);
    statusBadge.title = statusLabel;

    const hiddenStatusLabel = statusBadge.querySelector(".visually-hidden");
    if (hiddenStatusLabel instanceof HTMLElement) {
      hiddenStatusLabel.textContent = statusLabel;
    }
  }
}

function getListingSellableStock(product) {
  const sourceProduct = getDisplayProductSourceProduct(product);
  if (hasProductRestockDetails(sourceProduct)) {
    const { oldStock, newStock } = getProductStockBreakdown(sourceProduct);
    const sellableOldStock = isExpiryDateUnlistedFromApp(getProductOldStockExpiryDate(sourceProduct))
      ? 0
      : oldStock;
    const sellableNewStock = isExpiryDateUnlistedFromApp(
      getProductNewStockDate(sourceProduct) ?? getProductExpiryDate(sourceProduct),
    )
      ? 0
      : newStock;
    return sellableOldStock + sellableNewStock;
  }

  if (isSplitProductDisplayEntry(product)) {
    return isExpiryDateUnlistedFromApp(getProductExpiryDate(product))
      ? 0
      : Math.max(0, Number(product?.stock ?? 0) || 0);
  }

  return isExpiryDateUnlistedFromApp(getProductExpiryDate(sourceProduct))
    ? 0
    : getStock(sourceProduct);
}

function isActiveProductInApp(product) {
  const productName = String(product?.name ?? "").trim();
  return (
    productName.length > 0
    && isProductApprovedForApp(product)
    && getListingSellableStock(product) > 0
    && normalizeProductActiveState(product?.isActive, true)
    && !isProductListingRestricted(product)
  );
}

function isProductListingRestricted(product) {
  const restriction =
    product?.listingRestriction && typeof product.listingRestriction === "object"
      ? product.listingRestriction
      : {};
  const isStoredAsRestricted =
    normalizeProductActiveState(restriction.active, false)
    || normalizeProductActiveState(product?.isListingRestricted, false);
  if (!isStoredAsRestricted) {
    return false;
  }

  const expiresAtValue =
    restriction.expiresAt
    ?? product?.listingRestrictionExpiresAt
    ?? "";
  const expiresAtTime = Date.parse(String(expiresAtValue ?? "").trim());
  return !Number.isFinite(expiresAtTime) || expiresAtTime > Date.now();
}

function renderProductListingSummary(products = currentProducts) {
  const normalizedProducts = Array.isArray(products) ? products : [];
  let activeCount = 0;
  let restrictedCount = 0;
  let revisionCount = 0;
  let reviewCount = 0;

  normalizedProducts.forEach((product) => {
    if (isProductListingRestricted(product)) {
      restrictedCount += 1;
      return;
    }

    if (isProductInRevision(product)) {
      revisionCount += 1;
      return;
    }

    if (isProductInReview(product)) {
      reviewCount += 1;
      return;
    }

    if (isActiveProductInApp(product)) {
      activeCount += 1;
    }
  });

  const summary = {
    total: normalizedProducts.length,
    active: activeCount,
    restricted: restrictedCount,
    revision: revisionCount,
    review: reviewCount,
    inactive: Math.max(
      0,
      normalizedProducts.length - activeCount - restrictedCount - revisionCount - reviewCount,
    ),
  };

  Object.entries(productListingSummaryValues).forEach(([key, element]) => {
    if (element) {
      element.textContent = String(summary[key] ?? 0);
    }
  });
  syncProductListingStatusFilterUi();
}

function normalizeProductSearchTerm(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeProductCategoryFilter(value) {
  return normalizeCategoryName(value).toLowerCase();
}

function syncInventoryCategoryFilterSummary() {
  if (!productCategoryFilterSummary) {
    return;
  }

  productCategoryFilterSummary.textContent =
    normalizeCategoryName(productCategoryFilter) || "All Categories";
}

function normalizeProductStatusFilter(value) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();
  if (normalizedValue === "pending" || normalizedValue === "in-review") {
    return "review";
  }
  if (
    normalizedValue === "in-revision"
    || normalizedValue === "needs-revision"
    || normalizedValue === "revision-requested"
  ) {
    return "revision";
  }
  if (normalizedValue === "total" || normalizedValue === "total-listing") {
    return "all";
  }
  return productStatusFilterOptions.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : "all";
}

function syncInventoryStatusFilterSummary() {
  if (!productStatusFilterSummary) {
    return;
  }

  const normalizedFilter = normalizeProductStatusFilter(productStatusFilter);
  productStatusFilterSummary.textContent =
    productStatusFilterOptions.find((option) => option.value === normalizedFilter)?.label || "Total Listing";
}

function syncProductListingStatusFilterUi() {
  const normalizedFilter = normalizeProductStatusFilter(productStatusFilter);
  document.querySelectorAll("[data-product-listing-filter]").forEach((card) => {
    if (!(card instanceof HTMLElement)) {
      return;
    }
    if (card.closest(".product-listing-summary")) {
      card.classList.remove("is-active");
      if (card instanceof HTMLButtonElement) {
        card.setAttribute("aria-pressed", "false");
      }
      return;
    }
    const isActive = normalizeProductStatusFilter(card.dataset.productListingFilter) === normalizedFilter;
    card.classList.toggle("is-active", isActive);
    if (card instanceof HTMLButtonElement) {
      card.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  });
  syncInventoryStatusFilterSummary();
}

function setProductListingStatusFilter(nextFilter, options = {}) {
  const normalizedFilter = normalizeProductStatusFilter(nextFilter);
  const didChange = productStatusFilter !== normalizedFilter;
  productStatusFilter = normalizedFilter;
  if (didChange) {
    productListingPage = 1;
  }
  syncProductListingStatusFilterUi();
  renderInventoryStatusFilterOptions();
  if (options.render !== false) {
    renderProducts(currentProducts);
  }
  if (didChange || options.forceEvent === true) {
    window.dispatchEvent(new CustomEvent("gms-product-listing-status-filter", {
      detail: { filter: productStatusFilter },
    }));
  }
  return productStatusFilter;
}

function focusProductListing(options = {}) {
  const productId = String(options.productId ?? "").trim();
  const statusFilter = Object.prototype.hasOwnProperty.call(options, "statusFilter")
    ? options.statusFilter
    : productStatusFilter;
  if (statusFilter) {
    setProductListingStatusFilter(statusFilter, { render: false });
  }
  if (productId) {
    requestedProductListFocusId = productId;
    shouldAnimateProductEditorFocus = true;
  }
  renderProducts(currentProducts);
  if (productId) {
    window.requestAnimationFrame(() => {
      flashProductListFocusTarget(productId);
    });
  }
}

window.gmsSetProductListingStatusFilter = setProductListingStatusFilter;
window.gmsFocusProductListing = focusProductListing;

function setInventoryCategoryFilterOpen(isOpen) {
  if (
    !productCategoryFilterDropdown
    || !productCategoryFilterTrigger
    || !productCategoryFilterMenu
  ) {
    return;
  }

  productCategoryFilterDropdown.classList.toggle("is-open", Boolean(isOpen));
  productCategoryFilterTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  productCategoryFilterMenu.hidden = !isOpen;
}

function setInventoryStatusFilterOpen(isOpen) {
  if (
    !productStatusFilterDropdown
    || !productStatusFilterTrigger
    || !productStatusFilterMenu
  ) {
    return;
  }

  productStatusFilterDropdown.classList.toggle("is-open", Boolean(isOpen));
  productStatusFilterTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  productStatusFilterMenu.hidden = !isOpen;
}

function getProductSearchDocument(product) {
  const categoryList = Array.isArray(product?.categories) ? product.categories : [];
  const variantList = Array.isArray(product?.variants) ? product.variants : [];
  const variantNames = variantList.map((variant) => String(variant?.name ?? "").trim());
  const variantAddOns = variantList.flatMap((variant) =>
    Array.isArray(variant?.addOns)
      ? variant.addOns.map((addOn) => String(addOn?.name ?? "").trim())
      : [],
  );
  const reviewComments =
    product?.reviewComments ?? product?.productReviewComments ?? product?.reviews;

  return [
    product?.name,
    product?.category,
    ...categoryList,
    product?.description,
    product?.stock,
    getProductReviewCount(product),
    product?.originalPrice,
    product?.salesPrice,
    product?.productDisplayLabel,
    ...(Array.isArray(reviewComments) ? reviewComments : [])
      .map((review) => [
        review?.reviewer,
        review?.author,
        review?.message,
        review?.comment,
        review?.text,
      ].join(" ")),
    isExpiredProductDisplayEntry(product) ? "expired offline batch" : "",
    isFreshProductDisplayEntry(product) ? "fresh available batch" : "",
    isProductRevisionRequested(product) ? "needs revision in revision revision requested" : "",
    ...variantNames,
    ...variantAddOns,
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function matchesProductCategoryFilter(product, categoryFilter = productCategoryFilter) {
  const normalizedCategoryFilter = normalizeProductCategoryFilter(categoryFilter);
  if (!normalizedCategoryFilter) {
    return true;
  }

  return getProductCategoryList(product).some(
    (category) => normalizeProductCategoryFilter(category) === normalizedCategoryFilter,
  );
}

function matchesProductStatusFilter(product, statusFilter = productStatusFilter) {
  const normalizedStatusFilter = normalizeProductStatusFilter(statusFilter);
  if (normalizedStatusFilter === "all") {
    return true;
  }

  if (normalizedStatusFilter === "restricted") {
    return isProductListingRestricted(product);
  }

  if (normalizedStatusFilter === "revision") {
    return isProductInRevision(product);
  }

  if (normalizedStatusFilter === "review") {
    return isProductInReview(product);
  }

  if (normalizedStatusFilter === "active") {
    return isActiveProductInApp(product);
  }

  return !isActiveProductInApp(product)
    && !isProductListingRestricted(product)
    && !isProductInRevision(product)
    && !isProductInReview(product);
}

function getFilteredProducts(
  products,
  searchTerm = productSearchTerm,
  categoryFilter = productCategoryFilter,
  statusFilter = productStatusFilter,
) {
  const normalizedSearchTerm = normalizeProductSearchTerm(searchTerm);
  const normalizedProducts = Array.isArray(products) ? products : [];
  let filteredProducts = normalizedProducts;

  if (normalizedSearchTerm) {
    filteredProducts = filteredProducts.filter((product) =>
      getProductSearchDocument(product).includes(normalizedSearchTerm),
    );
  }

  return filteredProducts.filter((product) =>
    matchesProductCategoryFilter(product, categoryFilter) &&
    matchesProductStatusFilter(product, statusFilter),
  );
}

function renderInventoryCategoryFilterOptions(categories = availableCategories) {
  if (!productCategoryFilterMenu) {
    return;
  }

  const nextCategories = getUniqueCategories([categories]);
  const normalizedSelectedFilter = normalizeProductCategoryFilter(productCategoryFilter);
  const resolvedSelectedFilter = nextCategories.find(
    (category) => normalizeProductCategoryFilter(category) === normalizedSelectedFilter,
  );

  productCategoryFilter = resolvedSelectedFilter ?? "";
  syncInventoryCategoryFilterSummary();
  productCategoryFilterMenu.innerHTML = "";

  const options = [{ value: "", label: "All Categories" }, ...nextCategories.map((category) => ({
    value: category,
    label: category,
  }))];

  for (const optionConfig of options) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");

    const isSelected =
      normalizeProductCategoryFilter(optionConfig.value) === normalizeProductCategoryFilter(productCategoryFilter);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }

    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      productCategoryFilter = optionConfig.value;
      productListingPage = 1;
      syncInventoryCategoryFilterSummary();
      renderInventoryCategoryFilterOptions(availableCategories);
      setInventoryCategoryFilterOpen(false);
      productCategoryFilterTrigger?.focus();
      renderProducts(currentProducts);
    });

    productCategoryFilterMenu.appendChild(option);
  }
}

function renderInventoryStatusFilterOptions() {
  if (!productStatusFilterMenu) {
    return;
  }

  productStatusFilter = normalizeProductStatusFilter(productStatusFilter);
  syncInventoryStatusFilterSummary();
  productStatusFilterMenu.innerHTML = "";

  for (const optionConfig of productStatusFilterOptions) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "product-category-multiselect__option";
    option.setAttribute("role", "option");

    const isSelected = optionConfig.value === normalizeProductStatusFilter(productStatusFilter);
    option.setAttribute("aria-selected", isSelected ? "true" : "false");
    if (isSelected) {
      option.classList.add("is-selected");
    }

    option.textContent = optionConfig.label;
    option.addEventListener("click", () => {
      setProductListingStatusFilter(optionConfig.value);
      setInventoryStatusFilterOpen(false);
      productStatusFilterTrigger?.focus();
    });

    productStatusFilterMenu.appendChild(option);
  }
}

function normalizeLoadedProduct(product) {
  const normalizedStock = getStock(product);
  const approvalStatus = getProductApprovalStatus(product);
  return {
    ...product,
    approvalStatus,
    stock: normalizedStock,
    isActive:
      approvalStatus === "approved" &&
      normalizedStock > 0 &&
      normalizeProductActiveState(product?.isActive, true),
    categories: getProductCategoryList(product),
    category: getPrimaryProductCategory(product),
    deliveryPartnerIds: normalizeProductPartnerIds(product?.deliveryPartnerIds),
    paymentPartnerIds: normalizeProductPartnerIds(product?.paymentPartnerIds),
    moveBarcodeToPackingDashboard: Boolean(product?.moveBarcodeToPackingDashboard),
    videoUrls: getNormalizedProductVideoUrls(product),
    videoUrl: getProductVideoUrl(product),
    videoThumbnailUrls: getNormalizedProductVideoThumbnailUrls(product),
    videoThumbnailUrl: getProductVideoThumbnailUrl(product),
  };
}

function getProductListingLoadingSkeletonCount() {
  if (!currentProducts.length) {
    return PRODUCT_LISTING_PAGE_SIZE;
  }

  const filteredProducts = getFilteredProducts(getProductDisplayEntries(currentProducts));
  if (!filteredProducts.length) {
    return PRODUCT_LISTING_PAGE_SIZE;
  }

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCT_LISTING_PAGE_SIZE));
  const page = Math.min(Math.max(1, productListingPage), totalPages);
  const pageStart = (page - 1) * PRODUCT_LISTING_PAGE_SIZE;
  return Math.min(PRODUCT_LISTING_PAGE_SIZE, filteredProducts.length - pageStart);
}

function renderProductListingLoadingSkeletons(count = getProductListingLoadingSkeletonCount()) {
  if (!productList) {
    return;
  }

  const normalizedCount = Math.trunc(Number(count));
  const skeletonCount = Number.isFinite(normalizedCount) && normalizedCount >= 0
    ? Math.min(PRODUCT_LISTING_PAGE_SIZE, normalizedCount)
    : PRODUCT_LISTING_PAGE_SIZE;

  productList.replaceChildren();
  productList.classList.add("is-loading");
  productList.setAttribute("aria-busy", "true");
  if (productListingFooter instanceof HTMLElement) {
    productListingFooter.hidden = false;
  }
  if (productListingPageMeta instanceof HTMLElement) {
    productListingPageMeta.textContent = skeletonCount > 0
      ? `Loading ${skeletonCount.toLocaleString()} products...`
      : "Loading products...";
  }
  productListingPagination?.replaceChildren();

  for (let index = 0; index < skeletonCount; index += 1) {
    const card = document.createElement("article");
    card.className = "product-listing-skeleton-card";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <span class="product-listing-skeleton-card__media"></span>
      <span class="product-listing-skeleton-card__line product-listing-skeleton-card__line--strong"></span>
      <span class="product-listing-skeleton-card__line"></span>
      <span class="product-listing-skeleton-card__line product-listing-skeleton-card__line--short"></span>
    `;
    productList.append(card);
  }
}

function renderProductListingPagination(totalItems) {
  const total = Math.max(0, Math.trunc(Number(totalItems)) || 0);
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_LISTING_PAGE_SIZE));
  productListingPage = Math.min(Math.max(1, productListingPage), totalPages);
  const start = total > 0 ? (productListingPage - 1) * PRODUCT_LISTING_PAGE_SIZE + 1 : 0;
  const end = total > 0 ? Math.min(total, start + PRODUCT_LISTING_PAGE_SIZE - 1) : 0;

  if (productListingPageMeta instanceof HTMLElement) {
    productListingPageMeta.textContent =
      `Showing ${start.toLocaleString()} to ${end.toLocaleString()} of ${total.toLocaleString()} results`;
  }
  if (productListingFooter instanceof HTMLElement) {
    productListingFooter.hidden = total === 0;
  }
  if (!(productListingPagination instanceof HTMLElement)) {
    return;
  }

  productListingPagination.replaceChildren();
  if (total === 0) {
    return;
  }

  const createPageButton = (label, page, options = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.productListingPage = String(page);
    button.setAttribute("aria-label", options.ariaLabel || `Page ${page}`);
    button.classList.toggle("is-active", options.active === true);
    if (options.active === true) {
      button.setAttribute("aria-current", "page");
    }
    button.disabled = options.disabled === true;
    button.innerHTML = label;
    return button;
  };

  productListingPagination.append(createPageButton(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    productListingPage - 1,
    { ariaLabel: "Previous page", disabled: productListingPage <= 1 },
  ));

  const firstVisiblePage = Math.max(1, Math.min(productListingPage - 2, totalPages - 4));
  const lastVisiblePage = Math.min(totalPages, firstVisiblePage + 4);
  for (let page = firstVisiblePage; page <= lastVisiblePage; page += 1) {
    productListingPagination.append(createPageButton(String(page), page, {
      active: page === productListingPage,
    }));
  }

  productListingPagination.append(createPageButton(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>',
    productListingPage + 1,
    { ariaLabel: "Next page", disabled: productListingPage >= totalPages },
  ));
}

function syncProductListingPageToRequestedFocus(products) {
  if (!requestedProductListFocusId || !shouldAnimateProductEditorFocus) {
    return;
  }

  const normalizedProductId = String(requestedProductListFocusId).trim();
  const productIndex = products.findIndex((product) => {
    const sourceProduct = getDisplayProductSourceProduct(product);
    return String(sourceProduct?.id ?? product?.id ?? "").trim() === normalizedProductId;
  });
  if (productIndex >= 0) {
    productListingPage = Math.floor(productIndex / PRODUCT_LISTING_PAGE_SIZE) + 1;
  }
}

function renderProducts(products) {
  renderProductListingSummary(products);
  const displayProducts = getProductDisplayEntries(products);
  const savedProducts = [...getFilteredProducts(displayProducts)].sort((left, right) => {
    const nameComparison = String(left?.name ?? "").localeCompare(String(right?.name ?? ""), undefined, {
      sensitivity: "base",
    });
    if (nameComparison !== 0) {
      return nameComparison;
    }

    const leftSortOrder = Number.isFinite(Number(left?.productDisplaySortOrder))
      ? Number(left.productDisplaySortOrder)
      : 0;
    const rightSortOrder = Number.isFinite(Number(right?.productDisplaySortOrder))
      ? Number(right.productDisplaySortOrder)
      : 0;
    return leftSortOrder - rightSortOrder;
  });

  if (!productList) {
    if (productCount) {
      productCount.textContent = `${savedProducts.length} total`;
    }
    return;
  }

  productList.replaceChildren();
  productList.classList.remove("is-loading");
  productList.setAttribute("aria-busy", "false");
  if (productCount) {
    productCount.textContent = `${savedProducts.length} total`;
  }

  if (savedProducts.length === 0) {
    productListingPage = 1;
    renderProductListingPagination(0);
    if (
      normalizeProductSearchTerm(productSearchTerm)
      && window.GMS_ADMIN_SEARCH_NOT_FOUND
    ) {
      productList.appendChild(window.GMS_ADMIN_SEARCH_NOT_FOUND.create());
      return;
    }

    if (
      normalizeProductCategoryFilter(productCategoryFilter)
      || normalizeProductStatusFilter(productStatusFilter) !== "all"
    ) {
      const emptyState = window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create?.({
        label: "No products match the current category or status filter.",
        copy: "Try another filter to see available product listings.",
      }) || document.createElement("div");
      if (!emptyState.dataset.gmsAdminEmptyStateLottie) {
        emptyState.className = "empty-state";
        emptyState.textContent = "No products match the current search, category, or status filter.";
      }
      productList.appendChild(emptyState);
    } else {
      const emptyState = window.GMS_ADMIN_EMPTY_STATE_LOTTIE?.create?.({
        label: "No products yet.",
        copy: "Published listings will appear here once products are added.",
      }) || document.createElement("div");
      if (!emptyState.dataset.gmsAdminEmptyStateLottie) {
        emptyState.className = "empty-state";
        emptyState.textContent = "No products yet.";
      }
      productList.appendChild(emptyState);
    }
    return;
  }

  syncProductListingPageToRequestedFocus(savedProducts);
  renderProductListingPagination(savedProducts.length);
  const pageStart = (productListingPage - 1) * PRODUCT_LISTING_PAGE_SIZE;
  const pagedProducts = savedProducts.slice(pageStart, pageStart + PRODUCT_LISTING_PAGE_SIZE);
  for (const product of pagedProducts) {
    productList.appendChild(createProductCard(product));
  }

  applyRequestedProductListFocus();
}

async function loadProducts(options = {}) {
  const quiet = options?.quiet === true;
  try {
    if (!quiet) {
      renderProductListingLoadingSkeletons();
      setStatus("Loading...", "default");
      setServerStatus("Checking server...", "default");
    }
    const response = await fetch("/api/products", {
      cache: "no-store",
      headers: withProductPanelAdminScopeHeaders({ Accept: "application/json" }),
    });

    if (!response.ok) {
      throw new Error("Failed to load products.");
    }

    const data = await response.json();
    const products = data.products ?? [];
    currentProducts = Array.isArray(products)
      ? products.map(normalizeLoadedProduct)
      : [];
    hasLoadedProductsForBarcodeValidation = true;
    if (categorySelect || selectedCategoryChips) {
      setCategoryOptions(availableCategories, selectedProductCategories);
    }
    await refreshSellerFlashDealsCache();
    renderProducts(currentProducts);
    renderAndroidProductPreview();

    if (form && requestedEditProductId && !editingProductId) {
      const requestedProduct = currentProducts.find(
        (product) => String(product.id ?? "") === String(requestedEditProductId),
      );

      if (requestedProduct) {
        enterEditMode(requestedProduct);
      } else {
        requestedEditProductId = "";
        setEditQueryParam("");
        setHelperText("The selected product could not be found for editing.");
      }
    }

    if (!quiet) {
      setStatus(editingProductId ? "Editing" : "Adding", "default");
      setServerStatus("Server Ready", "success");
      notifyProductsUpdated();
    }
    return true;
  } catch (error) {
    console.error(error);
    if (quiet) {
      return false;
    }
    if (productList) {
      productList.classList.remove("is-loading");
      productList.setAttribute("aria-busy", "false");
      productList.innerHTML = `
        <div class="empty-state">The backend could not load products right now.</div>
      `;
    }
    if (productListingFooter instanceof HTMLElement) {
      productListingFooter.hidden = true;
    }
    setStatus("Load Failed", "error");
    setServerStatus("Server Offline", "error");
    return false;
  }
}

async function flushProductRealtimeRefresh() {
  if (productRealtimeRefreshInFlight) {
    productRealtimeRefreshQueued = true;
    return;
  }

  const topics = new Set(pendingProductRealtimeTopics);
  pendingProductRealtimeTopics.clear();
  if (!topics.size) {
    return;
  }

  productRealtimeRefreshInFlight = true;
  try {
    const refreshAll = topics.has("all");
    const shouldRefreshCategories = refreshAll
      || topics.has("categories")
      || topics.has("store-types");
    const shouldRefreshPartners = refreshAll
      || topics.has("delivery-partners")
      || topics.has("payment-partners");
    const shouldRefreshProducts = refreshAll
      || topics.has("products")
      || topics.has("product-requests")
      || topics.has("inventory")
      || topics.has("orders");

    if (shouldRefreshCategories && (categorySelect || selectedCategoryChips || productCategoryFilterMenu)) {
      await loadCategories(selectedProductCategories, { quiet: true });
    }
    if (shouldRefreshPartners && form) {
      await loadProductPartnerOptions({ quiet: true });
    }
    if (shouldRefreshProducts && (form || productList)) {
      await loadProducts({ quiet: true });
    }
  } finally {
    productRealtimeRefreshInFlight = false;
    if (productRealtimeRefreshQueued || pendingProductRealtimeTopics.size) {
      productRealtimeRefreshQueued = false;
      scheduleProductRealtimeRefresh();
    }
  }
}

function scheduleProductRealtimeRefresh(topics = []) {
  (Array.isArray(topics) ? topics : []).forEach((topic) => {
    const normalizedTopic = String(topic || "").trim().toLowerCase();
    if (normalizedTopic) {
      pendingProductRealtimeTopics.add(normalizedTopic);
    }
  });
  if (!pendingProductRealtimeTopics.size) {
    return;
  }

  window.clearTimeout(productRealtimeRefreshTimer);
  productRealtimeRefreshTimer = window.setTimeout(() => {
    productRealtimeRefreshTimer = 0;
    void flushProductRealtimeRefresh();
  }, 220);
}

function handleProductRealtimeChange(event) {
  const detail = event?.detail;
  const isReconnect = detail?.type === "ready" && detail?.reconnected === true;
  if (detail?.type !== "data-change" && !isReconnect) {
    return;
  }

  const topics = (Array.isArray(detail?.topics) ? detail.topics : [])
    .map((topic) => String(topic || "").trim().toLowerCase())
    .filter(Boolean);
  if (isReconnect) {
    scheduleProductRealtimeRefresh(["all"]);
    return;
  }
  if (!topics.some((topic) => productRealtimeTopics.has(topic))) {
    return;
  }
  scheduleProductRealtimeRefresh(topics);
}

async function handleSubmit(event) {
  if (!form) {
    return;
  }

  event.preventDefault();
  if (isProductFormSubmitting) {
    return;
  }

  const isEditing = Boolean(editingProductId);
  const shouldSkipAddOnNotice = shouldBypassUpdateAddOnNotice;
  shouldBypassUpdateAddOnNotice = false;
  const pendingListingStockDeductReason = listingStockDeductReasonDraft;
  const submittedExpiryDate = String(form.elements.expiryDate?.value ?? "").trim();
  if (submittedExpiryDate && isSelectedProductExpiryDateExpired(submittedExpiryDate)) {
    notifyExpiredProductNotAllowed();
    setStatus("Expired product", "error");
    setHelperText("Expired products are not allowed in the listing.");
    return;
  }

  if (!syncProductFormSubmitState()) {
    if (isEditing && isProductFormReadyToSave() && !hasProductEditChanges()) {
      setStatus("No Changes", "default");
      setHelperText("Make a change before updating this product.");
      return;
    }

    if (shouldUseProductValidationModal()) {
      const validationIssues = getProductValidationIssues();
      openProductValidationModal({
        title: "Error",
        copy: "Please review the details carefully before you continue.",
        issues: validationIssues,
        actionLabel: "Go Back",
      });
      setStatus("Validation Error", "error");
      setHelperText("Review the required fields listed in the validation modal.");
      return;
    }

    if (!getMainProductImagePreviewUrl()) {
      revealProductEditorSection("product-editor-section-photo");
      focusMainProductImagePicker();
    }
    return;
  }

  if (isEditing) {
    const salesPriceLimitIssue = getMainProductSalesPriceLimitIssue();
    if (salesPriceLimitIssue) {
      openProductValidationModal({
        mode: "notice",
        title: "Important notice",
        copy: "Sales price cannot be higher than original price.",
        actionLabel: "Go Back",
        actionVariant: "primary",
        onAction: () => {
          closeProductValidationModal({ focusPendingIssue: false });
          focusProductValidationIssue(salesPriceLimitIssue);
          return true;
        },
      });
      setStatus("Validation Error", "error");
      setHelperText("Sales price cannot be higher than original price.");
      return;
    }

    const existingProductForStock = currentProducts.find(
      (product) => String(product?.id ?? "") === String(editingProductId),
    );
    const submittedStockValue = getStock({ stock: form.elements.stock?.value ?? 0 });
    const existingStockValue = getStock(existingProductForStock);
    const stockDelta = submittedStockValue - existingStockValue;
    if (stockDelta < 0) {
      const priorityQuantity = getListingPriorityDeductLimit(existingProductForStock);
      const deductQuantity = Math.abs(stockDelta);
      if (deductQuantity > priorityQuantity) {
        openProductValidationModal({
          mode: "notice",
          title: "Priority stock limit",
          copy:
            `You can only deduct up to ${priorityQuantity} from the priority batch. `
            + "Other expiry batches are not affected by listing stock edits.",
          actionLabel: "Go Back",
          actionVariant: "primary",
          onAction: () => {
            closeProductValidationModal({ focusPendingIssue: false });
            form.elements.stock?.focus();
            return true;
          },
        });
        setStatus("Validation Error", "error");
        setHelperText("Deduction exceeds the priority batch stock.");
        return;
      }

      if (!pendingListingStockDeductReason) {
        void openListingStockDeductReasonModal({
          deductQuantity,
          priorityQuantity,
        }).then((reasonResult) => {
          if (!reasonResult) {
            listingStockDeductReasonDraft = null;
            shouldBypassListingStockDeductReason = false;
            return;
          }
          listingStockDeductReasonDraft = reasonResult;
          shouldBypassListingStockDeductReason = true;
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
        });
        return;
      }
    }

    const listingBatchPreview = applyListingActiveBatchFieldsToPayload(
      {
        stock: submittedStockValue,
        inventoryStock: submittedStockValue,
        expiryDate: submittedExpiryDate,
      },
      existingProductForStock,
      {
        submittedExpiryDate,
        sourceBatch: editingListingActiveSourceBatch,
        deductReason: pendingListingStockDeductReason,
      },
    );
    if (!listingBatchPreview?.ok) {
      openProductValidationModal({
        mode: "notice",
        title: "Unable to update stock",
        copy: listingBatchPreview?.error || "Unable to apply the stock change for this listing.",
        actionLabel: "Go Back",
        actionVariant: "primary",
        onAction: () => {
          closeProductValidationModal({ focusPendingIssue: false });
          form.elements.stock?.focus();
          return true;
        },
      });
      setStatus("Validation Error", "error");
      setHelperText(listingBatchPreview?.error || "Unable to apply the stock change.");
      return;
    }
  }

  if (isEditing && !shouldSkipAddOnNotice) {
    const missingAddOnIssues = getEditableVariantMissingAddOnIssues();
    if (missingAddOnIssues.length) {
      openProductValidationModal({
        mode: "notice",
        title: "Important notice",
        copy: "Please review the details carefully before you continue.",
        issues: missingAddOnIssues,
        actionLabel: "Continue",
        secondaryActionLabel: "Go Back",
        onAction: () => {
          shouldBypassUpdateAddOnNotice = true;
          closeProductValidationModal({ focusPendingIssue: false });
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }
          return true;
        },
        onSecondaryAction: () => {
          closeProductValidationModal({ focusPendingIssue: true });
          return true;
        },
      });
      return;
    }
  }

  setProductFormSubmitting(true);

  const formData = new FormData(form);
  const salesPriceValue = formData.get("salesPrice")?.toString().trim();
  const usesDescriptionModeSwitcher = isProductDescriptionModeSwitcherAvailable();
  const activeDescriptionMode = getProductDescriptionMode();
  const shouldSaveDescriptionText =
    !usesDescriptionModeSwitcher || activeDescriptionMode === "text";
  const shouldSaveDescriptionImages =
    !usesDescriptionModeSwitcher || activeDescriptionMode === "image";
  const resolvedSlotImageUrls = [...editingImageUrls];
  const resolvedDescriptionImageUrls = [...editingDescriptionImageUrls];
  const resolvedSlotVideoUrls = [...editingVideoUrls];
  const resolvedSlotVideoThumbnailUrls = [...editingVideoThumbnailUrls];
  const previewSlotImageUrls = editingImageUrls.map((existingImageUrl, slotIndex) =>
    getImageSlotPreviewUrl(slotIndex, existingImageUrl),
  );
  const previewSlotVideoUrls = editingVideoUrls.map((existingVideoUrl, slotIndex) =>
    getVideoSlotPreviewUrl(slotIndex, existingVideoUrl),
  );
  const previewImagePayload = buildProductImagePayload(
    previewSlotImageUrls,
    0,
  );
  const pendingDetailsImageCrops = collectPreviewDetailsCropsForImageUrls(
    previewImagePayload.imageUrls,
    previewImagePayload.mainImageIndex,
  );

  const payload = {
    name: formData.get("name")?.toString().trim(),
    originalPrice: formData.get("originalPrice")?.toString().trim(),
    salesPrice: salesPriceValue || null,
    category: selectedProductCategories[0] ?? formData.get("category")?.toString().trim(),
    categories: [...selectedProductCategories],
    deliveryPartnerIds: getSelectedActiveProductPartnerIds("delivery"),
    paymentPartnerIds: getSelectedActiveProductPartnerIds("payment"),
    stock: formData.get("stock")?.toString().trim(),
    barcode: formData.get("barcode")?.toString().trim(),
    moveBarcodeToPackingDashboard:
      Boolean(formData.get("barcode")?.toString().trim())
      && formData.has("moveBarcodeToPackingDashboard"),
    expiryDate: formData.get("expiryDate")?.toString().trim() || "",
    imageUrl: "",
    imageUrls: [],
    detailsImageCrops: [],
    videoUrl: "",
    videoUrls: [],
    videoThumbnailUrl: "",
    videoThumbnailUrls: [],
    detailsVideoSourceUrl: "",
    detailsVideoPositionX: DEFAULT_CARD_IMAGE_POSITION_X,
    detailsVideoPositionY: DEFAULT_CARD_IMAGE_POSITION,
    detailsVideoZoomPercent: 0,
    detailsVideoVisibleWidthFraction: 0,
    detailsVideoVisibleHeightFraction: 0,
    detailsVideoPreviewTimeMs: 0,
    visualSearchImageUrl: getPrimaryVisualSearchImageUrl(),
    visualSearchImageUrls: getVisualSearchImageUrlsFromAngles(),
    visualSearchImageAngles: getVisualSearchImageAnglesPayload(),
    model3dUrl: editingProductModelUrl,
    model3dScanImageUrls: [],
    mainImageIndex: 0,
    buyModalImageUrl: "",
    buyModalImageSourceUrl: "",
    cardImageUrl: "",
    cardImageSourceUrl: "",
    buyModalImagePositionX: normalizeCardImagePosition(
      editingBuyModalImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    buyModalImagePositionY: normalizeCardImagePosition(
      editingBuyModalImagePositionY,
      DEFAULT_CARD_IMAGE_POSITION,
    ),
    cardImagePositionX: normalizeCardImagePosition(
      editingCardImagePositionX,
      DEFAULT_CARD_IMAGE_POSITION_X,
    ),
    cardImagePosition: normalizeCardImagePosition(editingCardImagePosition),
    description: shouldSaveDescriptionText
      ? String(form.elements.description?.value ?? "").trim()
      : "",
    descriptionImageUrls: [],
    variants: [],
    __activityActor: getProductPanelActivityActor(),
  };

  let activeDescriptionUploadIndex = -1;
  try {
    for (const [slotIndex, imageFile] of pendingImageFiles.entries()) {

      if (!imageFile || slotIndex < 0) {
        continue;
      }

      setStatus(`Uploading image ${slotIndex + 1}...`, "default");
      resolvedSlotImageUrls[slotIndex] = await uploadMediaFile(imageFile);
    }

    if (shouldSaveDescriptionImages) {
      for (const [imageIndex, imageFile] of pendingDescriptionImageFiles.entries()) {
        if (!imageFile || imageIndex < 0) {
          continue;
        }

        activeDescriptionUploadIndex = imageIndex;
        setStatus(`Uploading description photo ${imageIndex + 1}...`, "default");
        const uploadedImageUrl = await uploadMediaFile(imageFile);
        if (!uploadedImageUrl) {
          throw new Error(`Unable to upload description photo ${imageIndex + 1}.`);
        }
        resolvedDescriptionImageUrls[imageIndex] = uploadedImageUrl;
      }
      payload.descriptionImageUrls = normalizeProductDescriptionImageUrls(
        resolvedDescriptionImageUrls,
      );
      activeDescriptionUploadIndex = -1;
    } else {
      payload.descriptionImageUrls = [];
    }

    const visualSearchUploadSlotKeys = getVisualSearchOrderedSlotKeys(
      [pendingVisualSearchImageFiles],
      false,
    );
    for (const slotKey of visualSearchUploadSlotKeys) {
      const pendingVisualSearchImageFile = pendingVisualSearchImageFiles[slotKey];
      if (!pendingVisualSearchImageFile) {
        continue;
      }

      const slotLabel = getVisualSearchImageSlotLabel(slotKey).toLowerCase();
      setStatus(`Uploading ${slotLabel} visual search image...`, "default");
      editingVisualSearchImageAngles[slotKey] = await uploadMediaFile(
        pendingVisualSearchImageFile,
      );
      pendingVisualSearchImageFiles[slotKey] = null;
      clearVisualSearchPreviewObjectUrl(slotKey);
    }
    syncLegacyVisualSearchImageState();
    payload.visualSearchImageUrl = getPrimaryVisualSearchImageUrl();
    payload.visualSearchImageUrls = getVisualSearchImageUrlsFromAngles();
    payload.visualSearchImageAngles = getVisualSearchImageAnglesPayload();

    if (pendingProductModelFile) {
      setStatus("Uploading 3D model...", "default");
      editingProductModelUrl = await uploadProductModelFile(pendingProductModelFile);
      pendingProductModelFile = null;
      clearProductModelObjectUrl();
      if (productModelFileInput) {
        productModelFileInput.value = "";
      }
      renderProductModelRegistration();
    }
    payload.model3dUrl = editingProductModelUrl;
    editingProductModelScanImageUrls = [];
    pendingProductModelScanFiles = [];
    clearPendingProductModelScanObjectUrls();
    payload.model3dScanImageUrls = [];

    const imagePayload = buildProductImagePayload(
      resolvedSlotImageUrls,
      Number.isInteger(selectedMainImageSlot)
        ? selectedMainImageSlot
        : 0,
    );

    payload.imageUrl = imagePayload.imageUrl;
    payload.imageUrls = imagePayload.imageUrls;
    payload.mainImageIndex = imagePayload.mainImageIndex;

    const resolvedMainImageUrl = String(payload.imageUrl ?? "").trim();
    const hasMatchingCardCrop =
      resolvedMainImageUrl &&
      previewCardCroppedImageUrl &&
      previewCardCropSourceUrl === resolvedMainImageUrl;

    if (hasMatchingCardCrop) {
      payload.cardImageSourceUrl = resolvedMainImageUrl;

      if (previewCardCroppedImageUrl.startsWith("data:image/")) {
        const cardCropUploadFile = createCardCropUploadFile(
          previewCardCroppedImageUrl,
          payload.name || "product",
        );

        if (!cardCropUploadFile) {
          throw new Error("Unable to prepare the saved card crop for upload.");
        }

        setStatus("Uploading saved card crop...", "default");
        payload.cardImageUrl = await uploadMediaFile(cardCropUploadFile);
        previewCardCroppedImageUrl = payload.cardImageUrl;
      } else {
        payload.cardImageUrl = previewCardCroppedImageUrl;
      }

      previewCardCropSourceUrl = resolvedMainImageUrl;
    }

    const hasMatchingBuyModalCrop =
      resolvedMainImageUrl &&
      previewBuyModalCroppedImageUrl &&
      previewBuyModalCropSourceUrl === resolvedMainImageUrl;

    if (hasMatchingBuyModalCrop) {
      payload.buyModalImageSourceUrl = resolvedMainImageUrl;

      if (previewBuyModalCroppedImageUrl.startsWith("data:image/")) {
        const buyModalCropUploadFile = createCardCropUploadFile(
          previewBuyModalCroppedImageUrl,
          `${payload.name || "product"}-buy-modal`,
        );

        if (!buyModalCropUploadFile) {
          throw new Error("Unable to prepare the saved buy modal image crop for upload.");
        }

        setStatus("Uploading saved buy modal image crop...", "default");
        payload.buyModalImageUrl = await uploadMediaFile(buyModalCropUploadFile);
        previewBuyModalCroppedImageUrl = payload.buyModalImageUrl;
      } else {
        payload.buyModalImageUrl = previewBuyModalCroppedImageUrl;
      }

      previewBuyModalCropSourceUrl = resolvedMainImageUrl;
    }

    if (pendingDetailsImageCrops.length) {
      const uploadedDetailsImageCrops = [];
      for (const cropEntry of pendingDetailsImageCrops) {
        const normalizedImageIndex = Number(cropEntry?.imageIndex ?? -1);
        const resolvedSourceUrl = String(
          imagePayload.imageUrls[normalizedImageIndex] ?? "",
        ).trim();
        const croppedImageUrl = String(cropEntry?.croppedImageUrl ?? "").trim();

        if (!resolvedSourceUrl || !croppedImageUrl) {
          continue;
        }

        let resolvedCroppedImageUrl = croppedImageUrl;
        if (croppedImageUrl.startsWith("data:image/")) {
          const detailsCropUploadFile = createCardCropUploadFile(
            croppedImageUrl,
            `${payload.name || "product"}-details-${normalizedImageIndex + 1}`,
          );
          if (!detailsCropUploadFile) {
            throw new Error("Unable to prepare the saved product details crop for upload.");
          }

          setStatus(
            `Uploading saved details image crop ${normalizedImageIndex + 1}...`,
            "default",
          );
          resolvedCroppedImageUrl = await uploadMediaFile(detailsCropUploadFile);
        }

        uploadedDetailsImageCrops.push({
          sourceUrl: resolvedSourceUrl,
          croppedImageUrl: resolvedCroppedImageUrl,
          positionX: normalizeCardImagePosition(
            cropEntry?.positionX,
            DEFAULT_CARD_IMAGE_POSITION_X,
          ),
          positionY: normalizeCardImagePosition(
            cropEntry?.positionY,
            DEFAULT_CARD_IMAGE_POSITION,
          ),
        });
      }

      payload.detailsImageCrops = uploadedDetailsImageCrops;
    }

    for (const [slotIndex, videoFile] of pendingVideoFiles.entries()) {
      if (!videoFile || slotIndex < 0) {
        continue;
      }

      const uploadTask = getPendingProductVideoUploadTask(slotIndex);
      setStatus(
        uploadTask?.status === "complete"
          ? `Preparing product video ${slotIndex + 1}...`
          : `Finishing product video ${slotIndex + 1} upload...`,
        "default",
      );
      resolvedSlotVideoUrls[slotIndex] = await resolvePendingProductVideoUpload(
        slotIndex,
        videoFile,
      );
    }

    for (const [slotIndex, thumbnailFile] of pendingVideoThumbnailFiles.entries()) {
      if (!thumbnailFile || slotIndex < 0) {
        continue;
      }

      setStatus(`Uploading video cover ${slotIndex + 1}...`, "default");
      resolvedSlotVideoThumbnailUrls[slotIndex] = await uploadMediaFile(thumbnailFile);
    }

    const videoPayload = buildProductVideoPayload(
      resolvedSlotVideoUrls,
      resolvedSlotVideoThumbnailUrls,
    );
    payload.videoUrl = videoPayload.videoUrl;
    payload.videoUrls = videoPayload.videoUrls;
    payload.videoThumbnailUrl = videoPayload.videoThumbnailUrl;
    payload.videoThumbnailUrls = videoPayload.videoThumbnailUrls;

    const resolvedVariants = editingVariants.map((variant) => ({
      ...variant,
      imageUrl: String(variant?.imageUrl ?? "").trim(),
      imageSourceUrl: String(variant?.imageSourceUrl ?? "").trim(),
    }));

    for (const [variantIndex, variant] of resolvedVariants.entries()) {
      let resolvedSourceImageUrl =
        String(variant?.imageSourceUrl ?? "").trim() ||
        String(variant?.cropSourceUrl ?? "").trim() ||
        String(variant?.imageUrl ?? "").trim();
      const hasSavedVariantCrop = Boolean(getVariantPreviewCroppedImageUrl(variant));

      if (variant.pendingImageFile) {
        setStatus(`Uploading variant image ${variantIndex + 1}...`, "default");
        resolvedSourceImageUrl = await uploadMediaFile(variant.pendingImageFile);
        resolvedVariants[variantIndex].imageSourceUrl = resolvedSourceImageUrl;
        if (!hasSavedVariantCrop) {
          resolvedVariants[variantIndex].imageUrl = resolvedSourceImageUrl;
        }
      }

      const savedVariantCropDataUrl = getVariantPreviewCroppedImageUrl(variant);
      if (savedVariantCropDataUrl) {
        if (savedVariantCropDataUrl.startsWith("data:image/")) {
          const variantCropUploadFile = createCardCropUploadFile(
            savedVariantCropDataUrl,
            `${payload.name || "product"}-variant-${variantIndex + 1}`,
          );
          if (!variantCropUploadFile) {
            throw new Error(`Unable to prepare the saved variant crop ${variantIndex + 1}.`);
          }

          setStatus(`Uploading saved variant crop ${variantIndex + 1}...`, "default");
          resolvedVariants[variantIndex].imageUrl = await uploadMediaFile(variantCropUploadFile);
        } else {
          resolvedVariants[variantIndex].imageUrl = savedVariantCropDataUrl;
        }
        resolvedVariants[variantIndex].imageSourceUrl =
          resolvedSourceImageUrl || resolvedVariants[variantIndex].imageUrl;
        continue;
      }

      resolvedVariants[variantIndex].imageSourceUrl =
        resolvedSourceImageUrl || resolvedVariants[variantIndex].imageUrl;
    }

    payload.variants = buildVariantsPayload(resolvedVariants);
    if (isEditing) {
      const existingProduct = currentProducts.find(
        (product) => String(product?.id ?? "") === String(editingProductId),
      );
      const batchResult = applyListingActiveBatchFieldsToPayload(payload, existingProduct, {
        submittedExpiryDate: String(payload.expiryDate ?? "").trim(),
        sourceBatch: editingListingActiveSourceBatch,
        deductReason: pendingListingStockDeductReason,
      });
      listingStockDeductReasonDraft = null;
      if (!batchResult?.ok) {
        openProductValidationModal({
          mode: "notice",
          title: "Unable to update stock",
          copy: batchResult?.error || "Unable to apply the stock change for this listing.",
          actionLabel: "Go Back",
          actionVariant: "primary",
          onAction: () => {
            closeProductValidationModal({ focusPendingIssue: false });
            form.elements.stock?.focus();
            return true;
          },
        });
        setStatus("Validation Error", "error");
        setHelperText(batchResult?.error || "Unable to apply the stock change.");
        return;
      }
    }
    const scopedPayload = withProductPanelAdminScopePayload(payload);
    setStatus(isEditing ? "Updating..." : "Saving...", "default");
    const response = await fetch(
      isEditing
        ? `/api/products/${editingProductId}?prototype=1`
        : "/api/products?prototype=1",
      {
        method: isEditing ? "PUT" : "POST",
        headers: withProductPanelAdminScopeHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(scopedPayload),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const saveError = new Error(
        data.message || (isEditing ? "Unable to update product." : "Unable to save product."),
      );
      saveError.code = data.code || "";
      saveError.yoloSafety = data.yoloSafety || data.sellerSafety || null;
      saveError.product = data.product || null;
      throw saveError;
    }

    const savedName = data.product.name;
    const savedProductPendingApproval = isProductPendingApproval(data.product);
    const successCopy = savedProductPendingApproval
      ? `Submitted "${savedName}" for review. It will update in the app after approval.`
      : `Saved "${savedName}" successfully.`;
    const variantRevisionAlertMessage = getProductVariantRevisionAlertMessage(data.product);
    setHelperText(successCopy);
    setStatus(isEditing ? "Updated" : "Saved", "success");
    if (variantRevisionAlertMessage) {
      window.alert(variantRevisionAlertMessage);
    }

    if (isStandaloneProductEditorPage) {
      if (isEditing) {
        openAdminEditSuccessFeedbackModal(successCopy, {
          onAutoClose: () => {
            window.location.href = getProductPanelUrl();
          },
        });
        return;
      }

      setProductPanelSuccessFlash({
        title: "Success",
        copy: successCopy,
      });
      window.location.href = getProductPanelUrl();
      return;
    }

    resetFormMode();
    // LISTING_DRAFT: clearListingDraftFromStorage();
    closeProductComposer({ reset: false, saveDraft: false });
    await initializeProductPanel();
    notifyProductsUpdated();
    if (isEditing) {
      openAdminEditSuccessFeedbackModal(successCopy);
    } else {
      openProductSuccessFeedbackModal({
        title: "Success",
        copy: successCopy,
      });
    }
  } catch (error) {
    console.error(error);

    if (activeDescriptionUploadIndex >= 0) {
      const uploadMessage = String(error?.message || "Unable to upload this description photo.").trim();
      showProductDescriptionUploadSnackbar(
        `Photo ${activeDescriptionUploadIndex + 1}: ${uploadMessage}`,
      );
    }

    if (error?.code === PRODUCT_ILLEGAL_CONTENT_ERROR_CODE) {
      openProductIllegalContentModal({
        message: error.message,
        yoloSafety: error.yoloSafety,
        product: error.product,
      });
      setStatus("Illegal Content", "error");
      setHelperText("This content is illegal and cannot be listed.");
      return;
    }

    // Check for barcode duplicate error and show validation modal
    if (error.message && error.message.includes("Barcode already exists")) {
      if (shouldUseProductValidationModal()) {
        openProductValidationModal({
          title: "Barcode Already Exists",
          copy: "The barcode you entered is already registered to another product. Please use a different barcode.",
          issues: [{
            field: "barcode",
            message: "This barcode is already in use.",
          }],
          actionLabel: "Go Back",
        });
        setStatus("Validation Error", "error");
        setHelperText("Barcode already exists. Please use a different barcode.");
        return;
      }
    }

    setHelperText(error.message);
    setStatus(editingProductId ? "Update Failed" : "Save Failed", "error");
  } finally {
    setProductFormSubmitting(false);
  }
}

async function handleDeleteProduct(product, { skipConfirmation = false } = {}) {
  if (!skipConfirmation) {
    openProductDeleteConfirmationModal(`product "${product.name}"`, () => {
      prepareProductDeleteSuccessAudio();
      void handleDeleteProduct(product, { skipConfirmation: true });
    });
    return;
  }

  try {
    setStatus("Deleting...", "default");
    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
      headers: withProductPanelAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        adminId: requireActiveProductPanelAdminTenantId(),
        __activityActor: getProductPanelActivityActor(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete product.");
    }

    if (editingProductId === product.id) {
      void closeProductComposer({ reset: true });
    }

    setHelperText(`"${product.name}" was deleted successfully. Refresh the app products to remove it there too.`);
    setStatus("Deleted", "success");
    await initializeProductPanel();
    notifyProductsUpdated();
    openProductDeleteSuccessFeedbackModal(`"${product.name}" was deleted successfully.`);
  } catch (error) {
    console.error(error);
    setHelperText(error.message);
    setStatus("Delete Failed", "error");
  }
}

async function handleProductVisibilityToggle(
  product,
  nextIsActive,
  toggleButton = null,
  options = {},
) {
  const productId = String(product?.id ?? "").trim();
  if (!productId) {
    return;
  }

  const { skipDeactivateConfirmation = false } = options ?? {};
  if (!nextIsActive && !skipDeactivateConfirmation) {
    openProductDeactivateConfirmationModal(product, () =>
      handleProductVisibilityToggle(product, nextIsActive, toggleButton, {
        skipDeactivateConfirmation: true,
      }));
    return;
  }

  if (nextIsActive && getStock(product) <= 0) {
    syncProductCardVisibilityState(toggleButton, true, false);
    window.setTimeout(() => {
      syncProductCardVisibilityState(toggleButton, false, false);
      openProductValidationModal({
        mode: "error",
        title: "Error",
        copy: `"${product.name}" cannot be activated because it has 0 stock.`,
        actionLabel: "Go Back",
        iconHtml: "fa-solid fa-circle-xmark",
      });
      setHelperText(`"${product.name}" stays deactivated because its stock is 0.`);
      setStatus("Out of Stock", "error");
    }, 220);
    return;
  }

  const animationStartedAt = Date.now();
  syncProductCardVisibilityState(toggleButton, nextIsActive, true);

  if (toggleButton) {
    toggleButton.disabled = true;
  }

  try {
    setStatus(nextIsActive ? "Activating..." : "Deactivating...", "default");
    const response = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: withProductPanelAdminScopeHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        adminId: requireActiveProductPanelAdminTenantId(),
        isActive: nextIsActive,
        __activityContext: "product-visibility-toggle",
        __activityActor: getProductPanelActivityActor(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update product visibility.");
    }

    const animationElapsedMs = Date.now() - animationStartedAt;
    const remainingAnimationMs = Math.max(0, 220 - animationElapsedMs);
    if (remainingAnimationMs > 0) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, remainingAnimationMs);
      });
    }

    const updatedProduct = normalizeLoadedProduct(data.product ?? {
      ...product,
      isActive: nextIsActive,
    });
    currentProducts = currentProducts.map((entry) =>
      String(entry?.id ?? "").trim() === productId ? updatedProduct : entry,
    );
    renderProducts(currentProducts);
    renderAndroidProductPreview();
    notifyProductsUpdated();
    setHelperText(
      `"${updatedProduct.name}" is now ${updatedProduct.isActive ? "active" : "not active"} in the app.`,
    );
    setStatus(updatedProduct.isActive ? "Activated" : "Deactivated", "success");
  } catch (error) {
    console.error(error);
    syncProductCardVisibilityState(toggleButton, !nextIsActive, getStock(product) > 0);
    setHelperText(error.message);
    setStatus(nextIsActive ? "Activate Failed" : "Deactivate Failed", "error");

    if (toggleButton) {
      toggleButton.disabled = false;
    }
  }
}

form?.addEventListener("submit", handleSubmit);
form?.addEventListener("input", () => {
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  syncBarcodePreview();
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
});
form?.addEventListener("change", () => {
  renderAndroidProductPreview();
  syncProductFormSubmitState();
  syncBarcodePreview();
  // LISTING_DRAFT: maybeScheduleListingDraftAutoSave();
});
productDescriptionModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDescriptionMode(button.dataset.productDescriptionMode, { focus: true });
  });
});
productDescriptionImageInput?.addEventListener("change", () => {
  const selectedFiles = Array.from(productDescriptionImageInput.files || []);
  productDescriptionImageInput.value = "";
  void appendProductDescriptionImageFiles(selectedFiles);
});
barcodeInput?.addEventListener("focus", () => {
  syncBarcodeScanFocusState();
});
barcodeInput?.addEventListener("blur", () => {
  window.requestAnimationFrame(() => {
    syncBarcodeScanFocusState();
  });
});
barcodeInput?.addEventListener("keydown", (event) => {
  if (!isBarcodeScannerFocused()) {
    return;
  }
  const key = String(event.key || "");
  if (key.length === 1) {
    event.preventDefault();
    if (hasGeneratedBarcode()) {
      if (!isBlockingBarcodeScan) {
        isBlockingBarcodeScan = true;
        showSingleBarcodeValidation();
      }
      return;
    }
    pendingBarcodeScanValue += key;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (isBlockingBarcodeScan) {
      isBlockingBarcodeScan = false;
      pendingBarcodeScanValue = "";
      return;
    }
    if (pendingBarcodeScanValue) {
      barcodeInput.value = pendingBarcodeScanValue;
      pendingBarcodeScanValue = "";
      isBlockingBarcodeScan = false;
      syncBarcodePreview();
      renderAndroidProductPreview();
      syncProductFormSubmitState();
      return;
    }
    if (hasGeneratedBarcode()) {
      showSingleBarcodeValidation();
      return;
    }
    pendingBarcodeScanValue = "";
  }
});
productDetailsBarcodeToggle?.addEventListener("click", () => {
  const isOpen = productDetailsBarcodeModal instanceof HTMLElement
    && !productDetailsBarcodeModal.hidden;
  if (isOpen) {
    return;
  }
  setProductDetailsBarcodeModalOpen(true, {
    restoreFocus: false,
    focusInput: true,
  });
});
productDetailsBarcodeModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDetailsBarcodeModalOpen(false, { focusInput: false, restoreFocus: true });
  });
});
productDetailsBarcodeModalReset?.addEventListener("click", resetProductBarcodeFromModal);
productDetailsBarcodeModalSave?.addEventListener("click", saveProductBarcodeFromModal);
productBarcodeScanFocusButton?.addEventListener("click", () => {
  barcodeInput?.focus({ preventScroll: true });
  syncBarcodeScanFocusState();
});
productDetailsModelToggle?.addEventListener("click", () => {
  const isOpen = productDetailsModelModal instanceof HTMLElement
    && !productDetailsModelModal.hidden;
  if (isOpen) {
    return;
  }
  setProductDetailsModelModalOpen(true);
});
productDetailsModelModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDetailsModelModalOpen(false, { restoreFocus: true });
  });
});
productDetailsVariantsToggle?.addEventListener("click", () => {
  const isOpen = productDetailsVariantsModal instanceof HTMLElement
    && !productDetailsVariantsModal.hidden;
  if (isOpen) {
    return;
  }
  setProductDetailsVariantsModalOpen(true);
});
productDetailsVariantsModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDetailsVariantsModalOpen(false, { restoreFocus: true });
  });
});
productDetailsDeliveryToggle?.addEventListener("click", () => {
  const isOpen = productDetailsDeliveryModal instanceof HTMLElement
    && !productDetailsDeliveryModal.hidden;
  if (isOpen) {
    return;
  }
  setProductDetailsPartnerModalOpen("delivery", true);
});
productDetailsDeliveryModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDetailsPartnerModalOpen("delivery", false, { restoreFocus: true });
  });
});
productDetailsPaymentToggle?.addEventListener("click", () => {
  const isOpen = productDetailsPaymentModal instanceof HTMLElement
    && !productDetailsPaymentModal.hidden;
  if (isOpen) {
    return;
  }
  setProductDetailsPartnerModalOpen("payment", true);
});
productDetailsPaymentModalCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setProductDetailsPartnerModalOpen("payment", false, { restoreFocus: true });
  });
});
refreshButton?.addEventListener("click", initializeProductPanel);
backToProductsButton?.addEventListener("click", () => {
  window.location.href = getProductPanelUrl();
});
productComposerCloseButton?.addEventListener("click", () =>
  void closeProductComposer({ reset: true }),
);
productComposerOpenButton?.addEventListener("click", () => {
  revealProductComposer({ reset: true });
});
productComposerDismissButton?.addEventListener("click", () => {
  void closeProductComposer({ reset: true });
});
productComposerModal?.addEventListener("click", (event) => {
  if (event.target === productComposerModal) {
    void closeProductComposer({ reset: true });
  }
});
if (productPhotoFileInput) {
  getQuickAddProductImageInput();
} else {
  addImageInputButton?.addEventListener("click", handleAddImageInput);
}
const productPhotoDropTarget =
  productPhotoCarousel || productImageInputList || addImageInputButton;
productPhotoDropTarget?.addEventListener("dragenter", handleProductPhotoDragEnter);
productPhotoDropTarget?.addEventListener("dragover", handleProductPhotoDragOver);
productPhotoDropTarget?.addEventListener("dragleave", handleProductPhotoDragLeave);
productPhotoDropTarget?.addEventListener("drop", handleProductPhotoDrop);
productPhotoCarouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scrollProductPhotoCarousel(button.dataset.productPhotoScroll || "next");
  });
});
productImageInputList?.addEventListener("scroll", requestProductPhotoCarouselControlSync, {
  passive: true,
});
window.addEventListener("resize", requestProductPhotoCarouselControlSync);
productDescriptionImageCarouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scrollProductDescriptionCarousel(button.dataset.descriptionImageScroll || "next");
  });
});
const productDescriptionDropTarget = getProductDescriptionDropTarget();
productDescriptionDropTarget?.addEventListener("dragenter", handleProductDescriptionDragEnter);
productDescriptionDropTarget?.addEventListener("dragover", handleProductDescriptionDragOver);
productDescriptionDropTarget?.addEventListener("dragleave", handleProductDescriptionDragLeave);
productDescriptionDropTarget?.addEventListener("drop", handleProductDescriptionDrop);
productDescriptionImageList?.addEventListener(
  "scroll",
  requestProductDescriptionCarouselControlSync,
  { passive: true },
);
productDescriptionImageList?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  scrollProductDescriptionCarousel(event.key === "ArrowLeft" ? "previous" : "next");
});
window.addEventListener("resize", requestProductDescriptionCarouselControlSync);
productDescriptionUploadSnackbarClose?.addEventListener(
  "click",
  hideProductDescriptionUploadSnackbar,
);
selectedCategoryCarouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scrollSelectedCategoryCarousel(button.dataset.productCategoryScroll || "next");
  });
});
selectedCategoryChips?.addEventListener(
  "scroll",
  requestSelectedCategoryCarouselControlSync,
  { passive: true },
);
selectedCategoryChips?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  scrollSelectedCategoryCarousel(event.key === "ArrowLeft" ? "previous" : "next");
});
window.addEventListener("resize", requestSelectedCategoryCarouselControlSync);
productVideoCarouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scrollProductVideoCarousel(button.dataset.productVideoScroll || "next");
  });
});
productVideoInputList?.addEventListener("scroll", requestProductVideoCarouselControlSync, {
  passive: true,
});
window.addEventListener("resize", requestProductVideoCarouselControlSync);
if (productVideoFileInput) {
  getQuickAddProductVideoInput();
} else {
  addVideoInputButton?.addEventListener("click", handleAddVideoInput);
}
const productVideoDropTarget =
  productVideoCarousel || productVideoInputList || addVideoInputButton;
productVideoDropTarget?.addEventListener("dragenter", handleProductVideoDragEnter);
productVideoDropTarget?.addEventListener("dragover", handleProductVideoDragOver);
productVideoDropTarget?.addEventListener("dragleave", handleProductVideoDragLeave);
productVideoDropTarget?.addEventListener("drop", handleProductVideoDrop);
addVariantButton?.addEventListener("click", handleAddVariant);
productModelScanButton?.addEventListener("click", openProductModelScanModal);
productModelUploadButton?.addEventListener("click", () => {
  productModelFileInput?.click();
});
productModelRemoveButton?.addEventListener("click", () => {
  resetProductModelRegistration();
  syncProductFormSubmitState();
  setStatus(editingProductId ? "Editing" : "Adding", "default");
  setHelperText("3D model removed. Save the product to apply the change.");
});
productModelFileInput?.addEventListener("change", () => {
  const selectedFile = productModelFileInput.files?.[0] ?? null;
  if (!selectedFile) {
    return;
  }
  setPendingProductModelFile(selectedFile);
});
androidPreviewThemeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    androidPreviewThemeMode = normalizeAndroidPreviewThemeMode(
      button?.dataset?.androidPreviewTheme,
    );
    syncAndroidPreviewThemePresentation();
  });
});
productEditorSectionCarouselButtons.forEach((button) => {
  button.addEventListener("click", () => {
    revealProductEditorSection(button.dataset.productEditorSectionTarget);
  });
});
window.addEventListener("resize", () => {
  syncProductDetailsHeaderDropdownPosition();
  if (openProductPartnerDropdownType) {
    positionProductPartnerOverlay(openProductPartnerDropdownType);
  }
}, { passive: true });
document.addEventListener("scroll", () => {
  syncProductDetailsHeaderDropdownPosition();
  if (openProductPartnerDropdownType) {
    positionProductPartnerOverlay(openProductPartnerDropdownType);
  }
}, true);
categoryTriggerButton?.addEventListener("click", () => {
  closeProductPartnerDropdowns();
  setCategoryMultiSelectOpen(categoryMenu?.hidden ?? true);
});
productCategoryFilterTrigger?.addEventListener("click", () => {
  closeProductPartnerDropdowns();
  setInventoryCategoryFilterOpen(productCategoryFilterMenu?.hidden ?? true);
});
productStatusFilterTrigger?.addEventListener("click", () => {
  closeProductPartnerDropdowns();
  setInventoryStatusFilterOpen(productStatusFilterMenu?.hidden ?? true);
});
document.addEventListener("click", (event) => {
  closeProductDetailsHeaderDropdownsFromOutside(event);

  const openAddonPicker = document.querySelector("[data-variant-addon-picker].is-open");
  const openAddonPanel = document.querySelector(
    ".product-variant-addon-picker__panel.is-portal-open",
  );
  if (
    openAddonPicker instanceof HTMLElement
    && event.target instanceof Node
    && !openAddonPicker.contains(event.target)
    && !(openAddonPanel instanceof HTMLElement && openAddonPanel.contains(event.target))
  ) {
    const trigger = openAddonPicker.querySelector(".product-variant-addon-picker__trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.click();
    }
  }

  if (
    categoryMultiSelect &&
    event.target instanceof Node &&
    !categoryMultiSelect.contains(event.target)
  ) {
    setCategoryMultiSelectOpen(false);
  }

  const productPartnerSelection = getProductPartnerSelectionSection();
  if (
    !usesProductPartnerHeaderModals()
    && productPartnerSelection
    && event.target instanceof Node
    && !productPartnerSelection.contains(event.target)
  ) {
    closeProductPartnerDropdowns();
  }

  if (
    productCategoryFilterDropdown &&
    event.target instanceof Node &&
    !productCategoryFilterDropdown.contains(event.target)
  ) {
    setInventoryCategoryFilterOpen(false);
  }

  if (
    productStatusFilterDropdown &&
    event.target instanceof Node &&
    !productStatusFilterDropdown.contains(event.target)
  ) {
    setInventoryStatusFilterOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape"
    && productDetailsBarcodeModal instanceof HTMLElement
    && !productDetailsBarcodeModal.hidden
  ) {
    setProductDetailsBarcodeModalOpen(false, { focusInput: false, restoreFocus: true });
    return;
  }

  if (
    event.key === "Escape"
    && productDetailsModelModal instanceof HTMLElement
    && !productDetailsModelModal.hidden
  ) {
    setProductDetailsModelModalOpen(false, { restoreFocus: true });
    return;
  }

  if (
    event.key === "Escape"
    && productDetailsVariantsModal instanceof HTMLElement
    && !productDetailsVariantsModal.hidden
  ) {
    setProductDetailsVariantsModalOpen(false, { restoreFocus: true });
    return;
  }

  if (
    event.key === "Escape"
    && productDetailsDeliveryModal instanceof HTMLElement
    && !productDetailsDeliveryModal.hidden
  ) {
    setProductDetailsPartnerModalOpen("delivery", false, { restoreFocus: true });
    return;
  }

  if (
    event.key === "Escape"
    && productDetailsPaymentModal instanceof HTMLElement
    && !productDetailsPaymentModal.hidden
  ) {
    setProductDetailsPartnerModalOpen("payment", false, { restoreFocus: true });
    return;
  }

  if (event.key === "Escape" && document.body.classList.contains(PRODUCT_STATUS_MOBILE_NAV_CLASS)) {
    setProductStatusMobileNavOpen(false, { restoreFocus: true });
    return;
  }

  if (event.key === "Escape" && productCategoryFilterMenu && !productCategoryFilterMenu.hidden) {
    setInventoryCategoryFilterOpen(false);
    productCategoryFilterTrigger?.focus();
    return;
  }

  if (event.key === "Escape" && productStatusFilterMenu && !productStatusFilterMenu.hidden) {
    setInventoryStatusFilterOpen(false);
    productStatusFilterTrigger?.focus();
    return;
  }

  if (event.key === "Escape" && categoryMenu && !categoryMenu.hidden) {
    setCategoryMultiSelectOpen(false);
    categoryTriggerButton?.focus();
    return;
  }

  if (event.key === "Escape" && openProductPartnerDropdownType) {
    setProductPartnerDropdownOpen(openProductPartnerDropdownType, false, {
      focusTrigger: true,
    });
    return;
  }

  const openAddonPicker = document.querySelector("[data-variant-addon-picker].is-open");
  if (event.key === "Escape" && openAddonPicker instanceof HTMLElement) {
    const trigger = openAddonPicker.querySelector(".product-variant-addon-picker__trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.click();
      trigger.focus({ preventScroll: true });
    }
    return;
  }

  if (
    event.key === "Escape"
    && productValidationModalElements
    && !productValidationModalElements.overlay.hidden
    && productValidationModalElements.allowManualClose !== false
  ) {
    closeProductValidationModal({ focusPendingIssue: false });
    return;
  }

  if (event.key === "Escape" && productComposerModal && !productComposerModal.hidden) {
    void closeProductComposer({ reset: true });
  }
});

async function initializeProductPanel() {
  const validationModal = ensureProductValidationModal();
  if (validationModal?.icon) {
    window.WebTheme?.applyFontAwesomeIcons?.(validationModal.icon);
  }

  ensureProductDetailsBarcodeModalPlacement();
  setProductDescriptionMode(productDescriptionMode);
  renderProductImageInputs();
  renderProductVideoInputs();
  renderProductDescriptionImageEditor();
  initializeProductExpiryDatePicker();
  renderProductModelRegistration();
  ensureProductPartnerSelectionSection();
  renderProductPartnerSelections();
  renderInventoryStatusFilterOptions();

  if (categorySelect || selectedCategoryChips || productCategoryFilterMenu) {
    await loadCategories();
  }

  if (form) {
    await loadProductPartnerOptions();
  }

  if (form || productList) {
    await loadProducts();
  }

  if (
    shouldRevealRequestedProductComposer
    && form
    && productComposerModal
    && !requestedEditProductId
  ) {
    shouldRevealRequestedProductComposer = false;
    const url = new URL(window.location.href);
    url.searchParams.delete("composer");
    window.history?.replaceState?.({}, "", `${url.pathname}${url.search}${url.hash}`);
    revealProductComposer({ reset: true });
  }

  showPendingProductPanelSuccessFeedback();
  syncListingDraftFab();

  window.addEventListener("gms-flash-deals-changed", () => {
    void (async () => {
      await refreshSellerFlashDealsCache();
      if (Array.isArray(currentProducts) && currentProducts.length) {
        renderProducts(currentProducts);
      }
    })();
  });
}

if (form || productList) {
  initializeProductStatusMobileNav();

  if (productSearchInput) {
    productSearchInput.addEventListener("input", () => {
      window.clearTimeout(productSearchTimer);
      productSearchTimer = window.setTimeout(() => {
        productSearchTerm = normalizeProductSearchTerm(productSearchInput.value);
        productListingPage = 1;
        renderProducts(currentProducts);
      }, 500);
    });
  }

  productListingPagination?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const pageButton = event.target.closest("[data-product-listing-page]");
    if (!(pageButton instanceof HTMLButtonElement) || pageButton.disabled) {
      return;
    }

    const nextPage = Number(pageButton.dataset.productListingPage);
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage === productListingPage) {
      return;
    }

    productListingPage = nextPage;
    renderProducts(currentProducts);
    productList?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (productList) {
    renderProductListingLoadingSkeletons(PRODUCT_LISTING_PAGE_SIZE);
  }

  revealProductEditorSection(defaultProductEditorSectionId, { shouldScroll: false });
  syncProductDetailsBarcodeToggleState();
  syncProductDetailsModelToggleState();
  syncProductDetailsVariantsToggleState();
  syncProductDetailsPartnerToggleStates();
  initializeProductPanel();
}

window.addEventListener("gms:realtime-change", handleProductRealtimeChange);

# Third-Party Services

## Overview

The project uses third-party packages and optional integrations. Seller and buyer PayMongo checkout are optional. Courier booking uses a provider adapter (manual or Lalamove stub/live-ready).

## Backend Integrations

### Sharp

- **Package:** `sharp`
- **Location:** `backend/package.json`, `backend/server.js`
- **Used for:** Image conversion to WebP, upload processing, visual-search fingerprint generation, and product visual search.
- **Required:** Yes for visual search and image conversion features. The server can start without it, but visual search returns unavailable.

### OpenAI-Compatible Chat API

- **Environment variables:** `CHAT_AI_API_KEY`, `OPENAI_API_KEY`, `CHAT_AI_MODEL`, `OPENAI_MODEL`, `CHAT_AI_API_URL`
- **Location:** `backend/server.js`
- **Used for:** Optional AI-generated support replies in chat.
- **Default model:** `gpt-4o-mini`
- **Default API URL:** `https://api.openai.com/v1/chat/completions`
- **Status:** Optional. Disabled when no API key is configured.

### PayMongo (optional seller + buyer checkout)

- **Environment variables:** `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`
- **Location:** `backend/services/sellerCheckoutGateway.js`, `backend/services/buyerCheckoutGateway.js`, `backend/server.js`
- **Used for:** Hosted seller-plan checkout and buyer order checkout sessions with signed webhooks.
- **Seller webhook:** `POST /api/payments/paymongo/seller-webhook`
- **Buyer webhook:** `POST /api/payments/paymongo/buyer-webhook` (provider ledger key `paymongo_buyer`)
- **Buyer checkout:** `POST /api/orders/checkout-session` (buyer session) → returns `checkoutUrl` when PayMongo is enabled; marks the order paid locally when keys are unset (`provider: manual`)
- **Status:** Optional. Live when credentials are configured. Unsigned client confirm cannot mark buyer orders paid when PayMongo is enabled — webhook is source of truth.

### Courier provider adapter (optional)

- **Environment variables:** `COURIER_PROVIDER` (`manual` \| `lalamove`), `LALAMOVE_API_KEY`, `LALAMOVE_API_SECRET`, `LALAMOVE_WEBHOOK_SECRET`
- **Location:** `backend/services/courierProviderAdapter.js`, `backend/server.js`
- **Endpoints:** `POST /api/orders/{groupId}/shipments`; ship flow auto-creates a Lalamove stub tracking number when `COURIER_PROVIDER=lalamove` and no tracking is supplied
- **Status:** Adapter is wired. Without live Lalamove credentials, shipments return deterministic stub tracking (`LALA-…`). Manual mode keeps existing local waybill + optional tracking entry.

### Face Attendance Local Integration

- **Environment variables:** `FACE_ATTENDANCE_EMPLOYEES_FILE`, `FACE_ATTENDANCE_FACES_DIR`, `FACE_ATTENDANCE_ATTENDANCE_FILE`
- **Location:** `backend/server.js`
- **Used for:** Reading employee face verification/attendance metadata and cleaning up profiles when employee accounts are deleted.
- **Status:** Local file integration, not a remote third-party API.

## Flutter Package Integrations

### Google ML Kit Object Detection

- **Package:** `google_mlkit_object_detection`
- **Location:** `pubspec.yaml`, `lib/services/visual_product_detector_*`
- **Used for:** Preparing visual product search images on supported mobile platforms.

### Image Picker and Image Processing

- **Packages:** `image_picker`, `image`
- **Used for:** Selecting/cropping/preparing images before upload or visual search.

### Cached Network Image

- **Package:** `cached_network_image`
- **Used for:** Loading and caching product/company media from backend URLs.

### Lottie

- **Package:** `lottie`
- **Used for:** App animations and chat reaction/preview animations.
- **Assets:** `assets/animations`, `backend/public/vendor/lottie.min.js`, `backend/public/animations`.

### Video Player

- **Package:** `video_player`
- **Used for:** Product/review video previews.

### Shared Preferences

- **Package:** `shared_preferences`
- **Used for:** Local session state, guest mode, cart, favorites, orders, chat cache, profile fields, and search history.

### URL Launcher and WebView

- **Packages:** `url_launcher`, `webview_flutter`
- **Used for:** External links and embedded web content where supported.

### Google Fonts

- **Package:** `google_fonts`
- **Used for:** Flutter typography.

## Admin Web Assets and Libraries

### Font/Icon Assets

The admin pages use iconography and inline SVG/icon patterns. Some pages include externally styled icon class names. Verify actual CDN use before production deployment because most admin files are static local files.

### Unity Product Viewer

- **Location:** `backend/public/unity/product-viewer`
- **Used for:** Product viewer page/assets.
- **Status:** Static bundled viewer files.

## Payment Partners

- **Location:** `payment_partners.json`, `backend/public/payment_partners.*`, Flutter payment partner repository/model.
- **Purpose:** Configurable payment options shown in checkout and product management.
- **Status:** Partner catalog remains local. Full-payment buyer orders call `POST /api/orders/checkout-session` and PayMongo hosted checkout when configured; COD deposit flow stays local.

## Delivery Partners

- **Location:** `delivery_partners.json`, `backend/public/delivery_partners.*`, Flutter delivery partner repository/model, `courierProviderAdapter.js`.
- **Purpose:** Configurable courier/delivery options shown in checkout and product management.
- **Status:** Partner catalog remains local. Shipments can mint tracking via `POST /api/orders/{groupId}/shipments` (`COURIER_PROVIDER=lalamove` stub without live keys). Local waybill print remains available.

## Email Services

No SMTP, SendGrid, Gmail API, or other email-sending integration was found.

## Cloud Storage

No cloud object storage SDK or API was found. Files are stored on the local filesystem under `backend/public/uploads`.

## AI Services

Only the optional OpenAI-compatible chat reply integration was found. Visual search is local image processing with `sharp` plus mobile object detection preparation; no external AI search service was found.

## Recommendations

- Add secret management for AI/API keys.
- Move uploaded files to cloud object storage with signed URLs.
- Complete live Lalamove market signing when production courier credentials are available.
- Add an email/SMS provider for account verification, receipts, and status updates.


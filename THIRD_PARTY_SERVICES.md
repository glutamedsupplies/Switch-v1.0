# Third-Party Services

## Overview

The project uses third-party packages and optional integrations, but most business operations are implemented locally. Payment and delivery partner records exist, but no direct payment gateway or courier API integration was found.

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
- **Status:** Internal records only. No live payment gateway API, webhook, or settlement callback was found.

## Delivery Partners

- **Location:** `delivery_partners.json`, `backend/public/delivery_partners.*`, Flutter delivery partner repository/model.
- **Purpose:** Configurable courier/delivery options shown in checkout and product management.
- **Status:** Internal records only. No live courier API, shipping label, or tracking webhook integration was found.

## Email Services

No SMTP, SendGrid, Gmail API, or other email-sending integration was found.

## Cloud Storage

No cloud object storage SDK or API was found. Files are stored on the local filesystem under `backend/public/uploads`.

## AI Services

Only the optional OpenAI-compatible chat reply integration was found. Visual search is local image processing with `sharp` plus mobile object detection preparation; no external AI search service was found.

## Recommendations

- Add secret management for AI/API keys.
- Move uploaded files to cloud object storage with signed URLs.
- Add real payment gateway integration if payment capture is required.
- Add courier API integration if live tracking is required.
- Add an email/SMS provider for account verification, receipts, and status updates.


# Automations

## Backend Automations

### Storage Initialization

- **Where:** `backend/server.js`
- **Trigger:** Backend startup and read/write helpers.
- **Behavior:** Ensures `backend/data` and `backend/public/uploads` exist, then initializes missing JSON files with empty arrays or objects.

### Legacy Product Gallery Migration

- **Where:** `backend/server.js` startup sequence.
- **Trigger:** Backend startup.
- **Behavior:** Runs product image gallery migration logic and logs when legacy galleries were migrated.

### Image Conversion

- **Where:** `/api/uploads` in `backend/server.js`
- **Trigger:** Image upload.
- **Behavior:** Converts supported uploaded images to WebP using `sharp`, unless PNG should be preserved.

### Visual Search Fingerprint Generation

- **Where:** Product save/update and `/api/products/visual-search`.
- **Trigger:** Product media changes or image search request.
- **Behavior:** Generates or refreshes RGB vector fingerprints for product visual-search images, then compares query fingerprints to approved, active, in-stock products.

### Product 3D Model Generation

- **Where:** `/api/product-models/from-frames`, `/api/product-models/from-scan`, `backend/scripts/generate-six-frame-glb.js`.
- **Trigger:** Admin product model generation action.
- **Behavior:** Creates generated model/texture files from provided frame or scan image data and writes them to uploads.

### Product Approval Workflow

- **Where:** `/api/products`, `/api/super-admin/product-requests`, approve/cancel endpoints.
- **Trigger:** Admin product submission and super admin decision.
- **Behavior:** New products are saved as pending. Super admin approval marks them approved. Cancellation removes pending requests.

### Inventory Movement Automation

- **Where:** `/api/orders/{createdAtEpochMs}/pack`, `/api/orders/{createdAtEpochMs}/cancel`, cancellation decision endpoints.
- **Trigger:** Pack or cancel order group.
- **Behavior:** Packing can deduct product/variant stock. Cancellation can restore previously deducted inventory. Movement details are written back to order entries and product stock/history.

### Sales Counter Update

- **Where:** `/api/orders/{createdAtEpochMs}/ship`.
- **Trigger:** Admin/employee ships an order group.
- **Behavior:** Moves orders to `toReceive` and increments product `sold` counters for products in the group.

### Review Aggregate Sync

- **Where:** Order sync and product read helpers in `backend/server.js`.
- **Trigger:** Order sync, review submission, product fetch.
- **Behavior:** Builds product review aggregates from orders and applies rating/comment totals to product responses.

### Activity Log Creation

- **Where:** Product/account change handlers in `backend/server.js`.
- **Trigger:** Product create/update/delete, employee create/update/delete, and selected inventory/account actions.
- **Behavior:** Creates notification/activity entries and stores the latest records in `activity_log.json`, capped at 50 entries.

### AI Chat Reply

- **Where:** Chat sync and `/api/chat-support/{threadId}/ai-reply`.
- **Trigger:** Explicit AI reply request or auto-reply condition in chat sync.
- **Behavior:** Calls the configured OpenAI-compatible chat API and appends an AI support message when successful.

### Face Attendance Cleanup

- **Where:** Account delete handler in `backend/server.js`.
- **Trigger:** Employee account deletion.
- **Behavior:** Attempts to remove matching face attendance profile metadata from configured external files.

## Flutter App Automations

### Startup Store Loading

- **Where:** `lib/main.dart`.
- **Trigger:** App launch.
- **Behavior:** Loads guest/auth session, migrates old global keys, loads favorites/cart/orders, and starts a remote order refresh.

### Product Auto Refresh

- **Where:** `lib/main.dart`.
- **Trigger:** Timer while app is active.
- **Behavior:** Refreshes product data periodically. The interval constant is 15 seconds.

### Chat Auto Refresh

- **Where:** `lib/main.dart`, `lib/chat_support.dart`.
- **Trigger:** Timer while app/chat is active.
- **Behavior:** Refreshes chat threads frequently for near-real-time chat behavior.

### Local Per-Account Data Migration

- **Where:** `lib/utils/auth_session.dart`.
- **Trigger:** App startup.
- **Behavior:** Removes legacy global keys and isolates cart/favorites/orders/chat/recent searches by account.

### Order Remote Sync

- **Where:** `lib/order_store.dart`, `lib/services/order_sync_*`.
- **Trigger:** App startup, checkout, order updates, and refresh actions.
- **Behavior:** Syncs local order state with `/api/orders`.

### Notification Sound

- **Where:** `lib/services/notification_sound_service_*`.
- **Trigger:** New chat/notification events in UI.
- **Behavior:** Plays notification sound when implemented for the platform.

## Admin Web Automations

### Dashboard Polling

- **Where:** `backend/public/admin_dashboard.js`.
- **Trigger:** Page load and timers.
- **Behavior:** Fetches orders, products, accounts, and follower counts. Followers refresh every 15 seconds.

### Navigation Badge Polling

- **Where:** `backend/public/admin_navigation.js`, `backend/public/employee_access_guard.js`, `backend/public/settings-menu.js`.
- **Trigger:** Page load and intervals.
- **Behavior:** Refreshes live chat badges, activity notifications, access indicators, and settings notification state.

### Concern Refresh

- **Where:** `backend/public/concern.js`.
- **Trigger:** Page load and interval.
- **Behavior:** Refreshes cancel/return request lists from orders.

### Employee Dashboard Polling

- **Where:** `backend/public/employee_dashboard.js`.
- **Trigger:** Page load and intervals.
- **Behavior:** Refreshes chat threads, orders, stock products, and cancellation requests.

### Insight Chat Refresh

- **Where:** `backend/public/insight.js`.
- **Trigger:** Page load and interval.
- **Behavior:** Refreshes chat-related insight data.

### Theme and Settings Persistence

- **Where:** `backend/public/theme.js`, `backend/public/settings-menu.js`, `backend/public/web_theme.js`.
- **Trigger:** User changes theme/settings.
- **Behavior:** Stores theme color and notification state in browser storage and applies it across admin pages.

## Missing Automation Opportunities

- No cron/scheduled task runner was found.
- No background worker queue was found.
- No email notification automation was found.
- No payment callback automation was found.
- No courier/tracking callback automation was found.
- No automated backup/retention process was found for JSON data or uploads.


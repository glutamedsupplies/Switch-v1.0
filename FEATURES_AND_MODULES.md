# Features and Modules

## Customer Flutter Application

### App Shell and Navigation

- **Purpose:** Starts the app, loads sessions/stores, applies theme, and coordinates home/shop/favorites/orders/profile tabs.
- **Main files:** `lib/main.dart`, `lib/theme/*`, `lib/utils/app_keyboard.dart`, `lib/order_tab_navigation.dart`.
- **Main classes:** `MyApp`, `HeaderFooterPage`, `OrderTabNavigation`.
- **User flow:** App starts, loads guest/auth state, loads local stores, refreshes remote orders, and shows the main tab shell.
- **Dependencies:** Flutter Material, `shared_preferences`, product/seller/order/chat stores.
- **Future improvements:** Split `main.dart` into smaller feature controllers and widgets.

### Authentication, Guest Mode, and Session Storage

- **Purpose:** Lets app users log in, register, recover passwords, continue as guest, and isolate local data per account.
- **Main files:** `lib/login.dart`, `lib/register.dart`, `lib/forgotpassword.dart`, `lib/verify_code.dart`, `lib/change_password.dart`, `lib/guest_session.dart`, `lib/utils/auth_session.dart`, `lib/services/login_service_*`, `lib/services/account_registration_*`.
- **Main classes:** `LoginPage`, `RegisterPage`, `AuthSession`.
- **User flow:** User opens login, enters email/password, receives account data from `/api/accounts/login`, and app reloads cart/favorites/orders/chat under the account.
- **Dependencies:** `shared_preferences`, backend accounts API.
- **Future improvements:** Replace client-side session flags with signed sessions or JWTs and server-side password hashing.

### Product Catalog, Search, and Visual Search

- **Purpose:** Displays approved products, categories, seller metadata, search results, and image-based visual matches.
- **Main files:** `lib/shop.dart`, `lib/search_bar.dart`, `lib/product_details.dart`, `lib/models/product.dart`, `lib/services/product_repository_*`, `lib/services/category_repository_*`, `lib/services/visual_product_detector_*`.
- **Main classes:** `ShopPage`, `ProductSearchPage`, `ProductDetailsPage`, `Product`, `ProductVariant`.
- **User flow:** User browses categories or searches text/images, opens a product, views media and pricing, then adds to cart or buys directly.
- **Dependencies:** Backend `/api/products`, `/api/products/visual-search`, `/api/categories`, image packages, Google ML Kit on supported platforms.
- **Future improvements:** Server-side pagination, stronger search indexing, and explicit API contracts for visual-search responses.

### Cart, Favorites, and Checkout

- **Purpose:** Stores selected products locally, supports quantity/variant changes, and starts booking/checkout.
- **Main files:** `lib/cart.dart`, `lib/add_to_cart.dart`, `lib/buy.dart`, `lib/favorite_products_store.dart`, `lib/place_order.dart`, `lib/user_details.dart`.
- **Main classes:** `CartStore`, `CartItemData`, `AddToCartSelection`, `BookingPage`, `BookingLineItem`.
- **User flow:** User adds items to cart or selects direct buy, enters client details, chooses delivery/payment partners, selects payment collection option, and places an order.
- **Dependencies:** `shared_preferences`, delivery/payment partner repositories, order store/sync service.
- **Future improvements:** Move cart and checkout validation server-side and reserve stock before order placement.

### Orders, Tracking, and Cancellation

- **Purpose:** Synchronizes customer orders with the backend and shows order status/tracking.
- **Main files:** `lib/order.dart`, `lib/order_store.dart`, `lib/order_tab_navigation.dart`, `lib/tacking.dart`, `lib/services/order_sync_*`.
- **Main classes:** `OrderPage`, `OrderStore`, `OrderSyncService`, `TackingPage`.
- **User flow:** User places an order, sees it under the proper order tab, can track status, request cancellation where supported, and review after purchase.
- **Dependencies:** Backend `/api/orders`, `/api/orders/{group}/cancel`, review upload APIs.
- **Future improvements:** Replace group identity based on `createdAtEpochMs` with a stable order group ID.

### Reviews and Ratings

- **Purpose:** Allows product rating, text review, media upload, review display, and seller reply viewing.
- **Main files:** `lib/comment_rate.dart`, `lib/customer_review.dart`, `lib/models/product.dart`, `backend/server.js` review handlers.
- **Main classes:** `CommentRatePage`, `CustomerReviewPage`, `ProductReviewMedia`, `ProductReviewSellerReply`.
- **User flow:** Customer rates an ordered product, uploads review media, submits comment, and later sees seller reply.
- **Dependencies:** `/api/review-uploads`, `/api/product-reviews/reply`, `/api/orders`.
- **Future improvements:** Add moderation, delete/edit review controls, and review abuse reporting.

### Customer Support Chat

- **Purpose:** Provides customer-to-support chat with thread sync, media, typing state, read state, edit/delete, reactions, product pinning, and optional AI replies.
- **Main files:** `lib/chat_support.dart`, `lib/chat_list.dart`, `lib/services/chat_support_sync_*`, `backend/server.js`, admin chat pages.
- **Main classes:** `ChatSupportStore`, `ChatSupportThreadData`, `ChatSupportStoredMessage`, `ChatSupportPage`.
- **User flow:** User opens chat from product/seller/chat tab, sends messages/media, sees support replies and typing/read state.
- **Dependencies:** `/api/chat-support`, `/api/chat-support/{threadId}/*`, `/api/uploads`, optional `CHAT_AI_*` env vars.
- **Future improvements:** Use WebSockets or server-sent events instead of polling.

### Seller Profiles and Followers

- **Purpose:** Shows seller/company pages, seller products, ratings, and follow/unfollow state.
- **Main files:** `lib/seller.dart`, `lib/models/seller_summary.dart`, `lib/services/seller_repository_*`, backend seller/follower APIs.
- **Main classes:** `SellerPage`, `SellerSummary`, `SellerRepository`.
- **User flow:** User taps seller identity, views seller page, follows/unfollows seller, browses seller products, and can start support chat.
- **Dependencies:** `/api/sellers`, `/api/sellers/{adminId}/profile`, follower endpoints.
- **Future improvements:** Add customer-facing seller notifications and feed/subscription features.

## Admin Web Console

### Admin Authentication and Navigation

- **Purpose:** Logs admins/employees in, stores browser session state, enforces employee page access, and renders shared navigation.
- **Main files:** `backend/public/login.html`, `backend/public/admin_navigation.js`, `backend/public/employee_access_guard.js`, `backend/public/employee_sign_out.js`, `backend/public/admin_account_settings.js`, `backend/public/employee_account_settings.js`.
- **User flow:** Admin logs in, session data is stored in browser storage, nav scripts read `gms-admin-id`, and pages call APIs with admin scope headers.
- **Dependencies:** `/api/admin-login`, `/api/employee-login`, `/api/admin-account`, `/api/accounts`.
- **Future improvements:** Replace storage-only sessions with signed HTTP-only cookies or JWT access tokens.

### Dashboard and Analytics

- **Purpose:** Shows store operational metrics, sales/order charts, low/dead stock, staff/user counts, top selling/top reviewed products, and follower counts.
- **Main files:** `backend/public/admin_dashboard.html/js`, `backend/public/insight.html/js`, `backend/public/product_insight.html/js`, `backend/public/employee_order_insight.html`.
- **User flow:** Admin opens dashboard or insights, scripts fetch orders/products/accounts/chat/partner data and render summary panels.
- **Dependencies:** `/api/orders`, `/api/products`, `/api/accounts`, `/api/admin-followers-count`, `/api/chat-support`.
- **Future improvements:** Move expensive aggregation logic server-side and add date-range export APIs.

### Products and Listing Approval

- **Purpose:** Lets admins create/edit products and lets super admins approve or cancel pending product requests.
- **Main files:** `backend/public/product_panel.html`, `backend/public/add_products.html`, `backend/public/edit_products.html`, `backend/public/app.js`, `backend/public/superadmin_product.html`, `backend/public/super_admin.js`.
- **User flow:** Admin submits product, backend marks it pending, super admin reviews it, and approved products become visible to the customer catalog.
- **Dependencies:** `/api/products`, `/api/products/{id}`, `/api/uploads`, `/api/product-models/*`, `/api/super-admin/product-requests`, approve/cancel endpoints.
- **Future improvements:** Add draft status, rejection reason, audit trail, and product version history.

### Inventory and Stock

- **Purpose:** Manages product stock, restocks, deductions, expiry dates, barcode handling, and inventory movement history.
- **Main files:** `backend/public/stock.html/js`, `backend/public/employee_stock.html`, product inventory helpers in `backend/server.js`.
- **User flow:** Admin updates stock, packing can deduct inventory, cancellation can restore inventory, and stock history is stored on product records.
- **Dependencies:** `/api/products`, `/api/orders/{group}/pack`, `/api/orders/{group}/cancel`.
- **Future improvements:** Add explicit stock movement collection and immutable inventory ledger.

### Orders, Packing, Tracking, and Concerns

- **Purpose:** Supports operational order processing from order review through packing, shipping, tracking, cancellation, and concern handling.
- **Main files:** `backend/public/packing_dashboard.html/js`, `backend/public/traking.html/js`, `backend/public/concern.html/js`, `backend/public/employee_dashboard.html/js`.
- **User flow:** Admin/employee reviews orders, packs orders, ships orders, handles cancellation requests, and monitors tracking.
- **Dependencies:** `/api/orders`, `/api/orders/{group}/pack`, `/api/orders/{group}/ship`, `/api/orders/{group}/cancel`, `/api/orders/{group}/cancel-request/{decision}`.
- **Future improvements:** Integrate real courier APIs and use explicit shipment/tracking records.

### Employee and User Management

- **Purpose:** Manages customer/user records, employee records, employee access permissions, documents, account settings, and face verification metadata.
- **Main files:** `backend/public/user_data.html/js`, `backend/public/Employee_data.html`, `backend/public/employee_data.js`, `backend/public/register.html`, `backend/public/register_fallback.js`, `backend/public/face_verfication.html`.
- **User flow:** Admin creates/edits employee accounts, grants module access, uploads documents, reviews users, and uses employee login/face verification flows.
- **Dependencies:** `/api/accounts`, `/api/document-uploads`, `/api/employee-lookup`, `/api/employee-login`, external face attendance files.
- **Future improvements:** Separate employee and customer records into different collections and add granular server-side RBAC.

### Live Chat

- **Purpose:** Lets admins and employees answer customer support threads from the web console.
- **Main files:** `backend/public/main.html`, `backend/public/main.js`, `backend/public/main.css`.
- **User flow:** Staff opens live chat, sees thread list, sends replies/media, marks support read, and updates typing state.
- **Dependencies:** `/api/chat-support`, `/api/chat-support/{threadId}/reply`, edit/delete/typing/read endpoints, `/api/uploads`.
- **Future improvements:** Real-time transport, assignment/routing, and conversation SLA reporting.

### Delivery and Payment Partners

- **Purpose:** Stores selectable partner records for checkout and product restrictions.
- **Main files:** `backend/public/delivery_partners.html/js`, `backend/public/payment_partners.html/js`, partner models/services in Flutter.
- **User flow:** Admin/super admin adds partner, uploads logo, activates/deactivates partner, and products/checkout use available partner records.
- **Dependencies:** `/api/delivery-partners`, `/api/payment-partners`, `/api/uploads`.
- **Future improvements:** Add actual courier/payment provider callbacks and credentials management.

### Super Admin, Categories, and Store Types

- **Purpose:** Gives platform operators control over admin companies, global categories, Store Types/Business Types, product requests, follower overview, and metrics.
- **Main files:** `backend/public/super_admin.html/js/css`, `backend/public/superadmin_product.html`, super admin handlers in `backend/server.js`.
- **User flow:** Super admin logs in, reviews dashboards, manages companies, edits Store Types and categories, approves listings, and clears company data when needed.
- **Dependencies:** `/api/super-admin-login`, `/api/super-admin/admins`, `/api/super-admin/store-types`, `/api/super-admin/categories`, product approval endpoints.
- **Future improvements:** Replace static root credentials/token with managed super admin users and audited privileged actions.

## Shared Backend Services

### Uploads and Media Processing

- **Purpose:** Receives images, videos, documents, and generated model assets.
- **Main files:** `backend/server.js`, `backend/public/uploads`, `backend/scripts/generate-six-frame-glb.js`.
- **Dependencies:** `sharp`, local filesystem.
- **Future improvements:** Move uploads to cloud object storage and add malware scanning.

### Activity Notifications

- **Purpose:** Stores recent activity events used by notification menus and dashboards.
- **Main files:** `backend/server.js`, `backend/data/activity_log.json`, `backend/public/settings-menu.js`, `backend/public/admin_navigation.js`.
- **Dependencies:** Product/account/order/admin actions.
- **Future improvements:** Use durable event tables and user-specific notification read state on the server.

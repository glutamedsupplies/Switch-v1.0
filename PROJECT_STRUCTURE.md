# Project Structure

## Root Files

| Path | Purpose |
| --- | --- |
| `README.md` | Default Flutter starter README. Backend-specific instructions are in `backend/README.md`. |
| `pubspec.yaml` | Flutter package metadata, dependencies, assets, and SDK constraints. |
| `pubspec.lock` | Locked Flutter dependency versions. |
| `analysis_options.yaml` | Dart analyzer and lint configuration. |
| `.gitignore` | Ignores Flutter build artifacts, backend runtime JSON data, uploads, local env files, agent files, and node modules. |
| `skills-lock.json`, `Insight` | Local project/tooling artifacts. |

## Flutter Platform Folders

| Folder | Purpose |
| --- | --- |
| `android/` | Android Gradle project and Kotlin `MainActivity`. |
| `ios/` | iOS runner project, Swift delegates, launch screen, app icons, and tests. |
| `linux/` | Linux runner CMake project and generated plugin files. |
| `macos/` | macOS runner project, entitlements, app icons, and tests. |
| `windows/` | Windows runner CMake project, native runner code, resources, and manifest. |
| `web/` | Flutter web entry files, manifest, favicon, and web icons. |

Most files in these folders are generated or maintained by Flutter tooling. Application behavior is primarily implemented in `lib/`.

## `lib/` Flutter Application

### Main Screens and Flows

| File | Purpose |
| --- | --- |
| `main.dart` | App bootstrap, theme setup, primary tab shell, product refresh timers, chat refresh timers, home, shop, favorites, order, profile, search, visual search, and seller navigation. |
| `login.dart` | Customer login page with email/password, guest mode, register, forgot password, and social button placeholders. |
| `register.dart` | Customer registration flow. |
| `forgotpassword.dart`, `verify_code.dart`, `change_password.dart` | Password recovery and password change screens. |
| `shop.dart` | Product listing, category filtering, lazy loading, visual search results, and product card grid. |
| `product_details.dart` | Product details, media previews, add to cart, direct buy, reviews, seller identity, chat entry, and 3D model preview references. |
| `cart.dart` | Cart model, per-account cart persistence, cart page, selection, quantity updates, checkout entry, and item removal. |
| `add_to_cart.dart`, `buy.dart` | Modal flows for selecting quantity, variants, and direct-buy options. |
| `place_order.dart` | Booking/checkout flow, payment collection options, delivery/payment partner selection, client details, and order creation. |
| `order.dart`, `order_store.dart`, `order_tab_navigation.dart`, `tacking.dart` | Local/remote order storage, order tabs, order detail actions, tracking display, and order-stage navigation. |
| `chat_support.dart`, `chat_list.dart` | Customer support chat, thread list, local persistence, sync, typing, reactions, media, edit/delete, and employee rating. |
| `customer_review.dart`, `comment_rate.dart` | Product review listing, review creation, rating, media upload, and seller reply display. |
| `seller.dart` | Seller/company profile, seller products, follower state, and chat entry. |
| `profile.dart`, `user_details.dart` | Customer profile data and reusable client detail editor for checkout. |
| `search_bar.dart` | Product search screen, recent searches, and product navigation. |
| `guest_session.dart` | Guest mode state. |
| `favorite_products_store.dart` | Per-account favorite product persistence. |
| `login_redirect.dart`, `platform_login_redirect*.dart` | Login redirect helpers for platform-specific flows. |

### Models

| File | Purpose |
| --- | --- |
| `models/product.dart` | Product, variants, add-ons, image crops, review media, and seller reply parsing. |
| `models/seller_summary.dart` | Seller/company summary returned by seller APIs. |
| `models/delivery_partner.dart` | Delivery partner data model. |
| `models/payment_partner.dart` | Payment partner data model. |

### Services

Each service generally has a base interface, an IO implementation, a web implementation, a stub, and a platform export file.

| Service Files | Purpose |
| --- | --- |
| `account_registration_*` | Customer account registration API client. |
| `admin_scope_*` | Admin scope/session lookup helpers for web/native contexts. |
| `category_repository_*` | Category fetching from `/api/categories`. |
| `chat_support_sync_*` | Chat support sync, thread fetch, message actions, typing state, AI reply, media upload, and delete thread actions. |
| `delivery_partner_repository_*` | Delivery partner API client. |
| `payment_partner_repository_*` | Payment partner API client. |
| `login_service_*` | Customer login API client. |
| `notification_sound_service_*` | Notification sound playback abstraction. |
| `order_sync_*` | Order fetch, replace, upsert, cancel group, and review media upload API client. |
| `product_repository_*` | Product catalog fetch and visual search API client. |
| `seller_repository_*` | Seller summary API client. |
| `visual_product_detector_*` | Visual search image preparation and object detection wrappers. |

### Theme, Utilities, and Widgets

| Folder/File | Purpose |
| --- | --- |
| `theme/` | App theme, icon helpers, default font, loading screen, snack bars, and theme mode storage. |
| `utils/` | Authentication session, keyboard handling, currency formatting, motion timing, and session image cache. |
| `widgets/` | Product card widgets, company identity, tap-lift effects, loaders, and no-more-products indicator. |
| `error_validation.dart`, `drawable_list_view.dart` | Validation helper and UI helper widget. |

## `assets/`

| Folder | Purpose |
| --- | --- |
| `assets/animations/` | Lottie animation JSON files used by app reactions and UI animations. |
| `assets/images/` | GMS logo, login logos, chat employee avatar, and order icons. |
| `assets/icons/` | SVG navigation icons for home and chat states. |
| `assets/sounds/` | Notification sound used by the Flutter app. |

## `backend/`

| Path | Purpose |
| --- | --- |
| `backend/server.js` | Node.js HTTP server, API handlers, JSON file storage helpers, uploads, visual search, AI chat calls, and static file serving. |
| `backend/package.json` | Backend package metadata and `sharp` dependency. |
| `backend/package-lock.json` | Locked backend dependency versions. |
| `backend/README.md` | Backend run instructions and basic product API notes. |
| `backend/scripts/generate-six-frame-glb.js` | Script for generating a six-frame GLB-style product model asset. |
| `backend/data/` | Runtime JSON stores. Ignored by Git through `backend/data/*.json`. |
| `backend/public/` | Static admin console pages, scripts, styles, assets, vendor files, audio, Unity viewer, and runtime uploads. |

## `backend/public/` Important Pages

| File | Purpose |
| --- | --- |
| `index.html` | Backend landing page. |
| `login.html`, `root_login.html`, `admin_signup.html` | Admin, super admin, and admin signup entry points. |
| `admin_dashboard.html/js` | Store overview dashboard and analytics cards. |
| `product_panel.html`, `add_products.html`, `edit_products.html`, `app.js`, `product-panel.css` | Product listing and product editor workflow. |
| `stock.html/js`, `employee_stock.html` | Inventory and stock management. |
| `packing_dashboard.html/js`, `traking.html/js`, `concern.html/js` | Packing, tracking, and concern/cancel request flows. |
| `main.html`, `main.js`, `main.css` | Main workspace with the integrated Messages / Live Chat view. |
| `Employee_data.html`, `employee_data.js`, `register.html`, `register_fallback.js` | Employee data, registration, access, and document handling. |
| `user_data.html/js` | Customer/user data listing. |
| `insight.html/js`, `product_insight.html/js`, `employee_order_insight.html` | Reporting and analytics views. |
| `delivery_partners.html/js`, `payment_partners.html/js` | Delivery and payment partner CRUD and status controls. |
| `super_admin.html/js/css`, `superadmin_product.html` | Super admin dashboard, store types, global categories, admin company control, and listing approvals. |
| `admin_navigation.js`, `employee_access_guard.js`, `settings-menu.js`, `theme.js`, `web_theme.js` | Shared admin navigation, access guard, notifications, settings, and theme behavior. |
| `validation_modal.html` | Modal preview and validation UI reference. |
| `web_immersive.html`, `web_immersive*`, `web_theme.html` | Presentation/preview pages for admin UI and theme customization. |

## Runtime and Generated Content

| Path | Purpose |
| --- | --- |
| `backend/public/uploads/` | Public uploaded media/documents/models generated at runtime. Ignored by Git. |
| `backend/public/.chrome-check-profile*/` | Local browser test profile artifacts. Ignored by Git. |
| `generated_3d/` | Generated image crops used for 3D/product model references. |
| `test/widget_test.dart` | Default Flutter widget test scaffold. |

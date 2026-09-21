# Project Overview

## Project Summary

Switch is a multi-platform shopping application with a Flutter customer app and a local Node.js backend that also serves a browser-based admin console. The system supports product browsing, visual product search, cart and checkout, order tracking, customer support chat, ratings and reviews, seller profiles, employee/admin operations, inventory, analytics, delivery/payment partner management, and super admin oversight.

The repository is currently structured as a Flutter project with platform targets for Android, iOS, web, Windows, macOS, and Linux. The backend is a single Node.js HTTP server under `backend/server.js`, with static HTML/CSS/JavaScript admin pages in `backend/public`.

## Business Purpose

The project is designed for a shopping marketplace or store-management environment where:

- Customers browse products, purchase items, track orders, review products, follow sellers, and chat with support.
- Store admins manage listings, inventory, orders, employees, reports, delivery partners, and payment partners.
- Employees work inside permission-controlled admin pages such as packing, inventory, and live chat.
- A super admin controls company/admin accounts, product approvals, global categories, store/business types, and platform-level reporting.

## Objectives

- Provide a customer-facing mobile/web shopping experience.
- Provide an admin operations dashboard for stores and employees.
- Support multi-tenant data separation through `adminId`/workspace scope.
- Capture operational events such as product updates, employee changes, and notifications.
- Allow super admin review and governance of business accounts, store types, categories, and product listings.
- Persist data locally using JSON files for development or lightweight deployment.

## Target Users

- **Customers:** app users who shop, place orders, review products, follow sellers, and contact support.
- **Guest shoppers:** users who can browse in guest mode with limited access.
- **Store admins:** business owners or managers who maintain catalog, inventory, orders, employees, and reports.
- **Employees:** staff members with scoped access to admin modules.
- **Super admins:** platform operators who govern companies, global store types, product approvals, and master data.
- **Developers:** engineers maintaining the Flutter app, Node backend, and admin web console.

## Main Features

- Flutter shopping app with home, shop, favorites, cart, orders, chat, seller, profile, and search flows.
- Product catalog with categories, variants, images, video media, 3D model references, ratings, stock, and visual search metadata.
- Cart, direct buy, booking/checkout, payment option selection, delivery partner selection, and order creation.
- Order lifecycle stages including to pay, to prepare, to ship, to receive, completed, cancelled, and cancel requests.
- Product reviews, ratings, review media uploads, and seller replies.
- Customer support chat with message edit/delete, typing state, read state, media upload, and optional AI reply support.
- Admin web console for dashboards, products, inventory, packing, tracking, concerns, users, employees, live chat, reports, partners, and account settings.
- Super admin console for admin companies, categories, store/business types, product approval requests, partner management, and dashboard metrics.
- Local file uploads with image conversion to WebP when possible.
- Optional OpenAI-compatible chat reply integration through environment variables.
- Optional local Face Attendance data integration for employee verification metadata.

## Technologies Used

### Flutter Application

- Flutter and Dart SDK `^3.11.5`
- `shared_preferences` for local session and per-account storage
- `cached_network_image` for product/media loading
- `image_picker` and `image` for media selection/preparation
- `google_mlkit_object_detection` for visual product detection on supported mobile platforms
- `lottie` for animations
- `video_player` for review/product videos
- `webview_flutter` and `url_launcher` for embedded/external navigation
- `google_fonts` and Cupertino/Material UI assets

### Backend and Admin Console

- Node.js built-in `http`, `fs`, `path`, and `os` modules
- `sharp` for image processing, WebP conversion, and visual-search fingerprints
- Static browser pages using HTML, CSS, and vanilla JavaScript
- JSON file persistence in `backend/data`
- Public uploads under `backend/public/uploads`

## Folder Structure Overview

```text
Switch-v1.0/
  android/                 Flutter Android target
  ios/                     Flutter iOS target
  linux/                   Flutter Linux target
  macos/                   Flutter macOS target
  windows/                 Flutter Windows target
  web/                     Flutter web target
  lib/                     Flutter app source code
  assets/                  Flutter images, icons, sounds, and Lottie files
  backend/                 Node.js backend and static admin console
  backend/public/          Admin HTML, CSS, JavaScript, assets, and uploads
  backend/data/            Local runtime JSON data stores, ignored by Git
  backend/scripts/         Utility scripts
  generated_3d/            Generated/reference 3D image assets
  test/                    Flutter tests
```

## Assumptions and Notes

- The backend uses JSON files as collections, not a relational database. Database documentation in this handoff treats each JSON file as a collection/table equivalent.
- The repository contains local runtime data under `backend/data`; documentation describes field names and relationships without copying sensitive record values.
- Authentication is implemented with credentials, browser session/local storage, trusted headers, and a super admin token. No production JWT/session middleware was found.
- Payment and delivery partners are represented as configurable records. No direct payment gateway or courier API callback integration was found.

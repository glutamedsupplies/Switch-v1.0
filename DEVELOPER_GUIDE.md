# Developer Guide

## Prerequisites

- Flutter SDK compatible with Dart SDK `^3.11.5`
- Node.js and npm
- A modern browser for admin console testing
- Optional: Android Studio/Xcode/Visual Studio toolchains for platform builds

## Installation

From the project root:

```bash
flutter pub get
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Dependencies

### Flutter

Main runtime dependencies from `pubspec.yaml`:

- `cupertino_icons`
- `google_fonts`
- `google_mlkit_object_detection`
- `image`
- `image_picker`
- `lottie`
- `shared_preferences`
- `video_player`
- `webview_flutter`
- `url_launcher`
- `cached_network_image`

Development:

- `flutter_test`
- `flutter_lints`

### Backend

The backend depends on:

- `sharp` for image processing and visual-search fingerprints

It otherwise uses Node.js built-in modules.

## Environment Variables

The backend loads `backend/.env` and root `.env` if present.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Backend HTTP port. |
| `BIND_HOST` | `127.0.0.1` | Listen address. Set `0.0.0.0` to bind all NICs. |
| `SUPER_ADMIN_USERNAME` | none | Required super admin username. |
| `SUPER_ADMIN_PASSWORD` | none | Required bcrypt hash for the super admin password; plaintext is rejected. |
| `ADMIN_API_SESSION_SECRET` | none | Required HMAC signing secret for expiring super admin sessions. |
| `SUPER_ADMIN_SESSION_TTL_SECONDS` | `28800` | Super admin session lifetime, capped at seven days. |
| `APP_SESSION_SECRET` | falls back to `ADMIN_API_SESSION_SECRET` | Preferred dedicated HMAC secret for buyer/seller/employee sessions. |
| `APP_SESSION_TTL_SECONDS` | `86400` | App session lifetime, capped at 30 days. |
| `REQUIRE_SECRETS` | `0` | Set to `1` to enforce required secrets outside production. |
| `CHAT_AI_API_KEY` or `OPENAI_API_KEY` | empty | Enables AI chat replies. |
| `CHAT_AI_MODEL` or `OPENAI_MODEL` | `gpt-4o-mini` | AI model name. |
| `CHAT_AI_API_URL` | `https://api.openai.com/v1/chat/completions` | OpenAI-compatible API URL. |
| `FACE_ATTENDANCE_EMPLOYEES_FILE` | external local default | Employee profile file for face attendance metadata. |
| `FACE_ATTENDANCE_FACES_DIR` | sibling `faces` directory | Face image directory. |
| `FACE_ATTENDANCE_ATTENDANCE_FILE` | sibling `attendance.csv` | Attendance record file. |

Flutter clients can use:

```bash
--dart-define=API_BASE_URL=http://127.0.0.1:8080
```

## Running the Backend

From the repository root:

```bash
node backend/server.js
```

Or:

```bash
cd backend
npm start
```

Open the admin console:

```text
http://127.0.0.1:8080
```

## Running the Flutter App

Web:

```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://127.0.0.1:8080
```

Android emulator:

```bash
flutter run -d android --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

Desktop:

```bash
flutter run -d windows --dart-define=API_BASE_URL=http://127.0.0.1:8080
```

Use the equivalent device ID for macOS, Linux, iOS, or other targets.

## Database Setup

PostgreSQL is required for durable accounts, products, orders, and analytics events.

1. Create a database and set `DATABASE_URL` in `backend/.env` (see `backend/.env.example`).
2. Apply schema: `cd backend && npm run db:migrate`
3. Optional JSON import (idempotent upserts, does not delete extra Postgres rows):
   - `npm run db:migrate-users` — `accounts.json`
   - `npm run db:migrate-catalog` — `store_types.json`, `products.json`, `orders.json`
4. Without `DATABASE_URL`, the backend still creates JSON files in `backend/data` on startup. Analytics ingest/funnel/summary return `503` until Postgres is migrated (`020_analytics_events.sql`).

Product/order/line IDs keep existing JSON string values across migrate and dual-write. Order groups without `orderGroupId` get a deterministic `og_*`. Lifecycle columns (`created_at`, `paid_at`, `packed_at`, `shipped_at`, `cancelled_at`, product `submitted_at` / `approved_at` / `listed_at`) are first-class so funnel queries do not need a schema rewrite. Order groups also store PayMongo prep columns (`payment_intent_id`, `payment_idempotency_key`) and optional `tracking_number`. List/page APIs are tenant-scoped (`adminId` / buyer `accountId`); public product listings are approved-only. Launch funnel APIs are documented in [ANALYTICS.md](ANALYTICS.md).

JSON-only collections (chat, partners, activity, followers, and similar) remain files under `backend/data/` and are ignored by Git.

## File Uploads

Uploads are stored in:

```text
backend/public/uploads
```

This folder is ignored by Git. Uploaded images/videos/documents/model files are served publicly under `/uploads/{fileName}`.

## Project Structure

- Flutter app code lives in `lib/`.
- Flutter assets live in `assets/`.
- Node backend lives in `backend/server.js`.
- Admin web console lives in `backend/public/`.
- Runtime data lives in `backend/data/`.
- Generated/reference 3D assets live in `generated_3d/`.

See `PROJECT_STRUCTURE.md` for detailed file descriptions.

## Coding Standards

- Follow the existing Flutter service pattern: base interface, web implementation, IO implementation, stub implementation, and platform export.
- Keep per-account local storage keys scoped through `AuthSession`.
- Derive account and tenant scope from `request.authSession`; legacy identity headers are hints only.
- Validate inputs on both client and server.
- Avoid storing sensitive data in Git. Runtime JSON data and uploads are ignored.
- Prefer smaller modules when changing large files such as `backend/server.js`, `backend/public/app.js`, `backend/public/settings-menu.js`, `lib/main.dart`, and `lib/chat_support.dart`.

## Testing and Validation

Suggested checks:

```bash
flutter analyze
flutter test
node --check backend/server.js
node --check backend/public/super_admin.js
npm --prefix backend run test:password-auth
npm --prefix backend run test:session-tenancy
```

### JSON Password Migration

Run the migration before deploying the hash-only login code. It preserves account data, changes only non-empty plaintext `password` values, skips existing bcrypt hashes, and creates a timestamped backup when writing.

```bash
cd backend
npm run passwords:migrate-json -- --dry-run
npm run passwords:migrate-json -- --write
npm run passwords:migrate-json -- --dry-run
```

The final dry run must report `plaintext=0`. Use `--file <path>` to migrate a non-default accounts JSON file. Plaintext records cannot authenticate after this change.

For web/admin changes, manually test:

- Admin login
- Product create/edit
- Uploads
- Inventory updates
- Order pack/ship/cancel
- Store Type modal and dashboard
- Super admin category and product approval actions

## Deployment Notes

For production-like deployment:

1. Set `SUPER_ADMIN_USERNAME`, a bcrypt hash in `SUPER_ADMIN_PASSWORD`, `ADMIN_API_SESSION_SECRET`, and a dedicated `APP_SESSION_SECRET`.
2. Set an API URL for Flutter builds with `--dart-define=API_BASE_URL=...`.
3. Move JSON persistence to a real database or enforce file locks/backups.
4. Move uploads to object storage or protected storage.
5. Add HTTPS, CSRF protection, and audit logs. CORS is loopback-only; set `CORS_ALLOWED_ORIGINS` in production.
6. Ensure `backend/data` and `backend/public/uploads` are persisted outside ephemeral runtime directories.

## Troubleshooting

- If Flutter cannot fetch products, confirm the backend is running and `API_BASE_URL` points to the backend host.
- For Android emulator, use `http://10.0.2.2:8080` instead of `127.0.0.1`.
- If visual search fails, confirm `sharp` installed successfully in `backend/node_modules`.
- If AI reply fails, confirm `CHAT_AI_API_KEY` or `OPENAI_API_KEY` is set.
- If protected admin data returns `401`, sign in again and verify the signed app-session cookie/token is present.

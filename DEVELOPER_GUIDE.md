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
| `SUPER_ADMIN_USERNAME` | *(required)* | Super admin username. Server will not start if unset. |
| `SUPER_ADMIN_PASSWORD` | *(required)* | Super admin password. Server will not start if unset. |
| `ADMIN_API_SESSION_SECRET` | *(required)* | HMAC secret for signed API sessions. Min 16 characters. |
| `CORS_ALLOWED_ORIGINS` | empty | Comma-separated browser origins allowed for CORS. Not `*`. |
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

No separate database server is required. On startup, `backend/server.js` creates missing runtime files in `backend/data`:

```text
products.json
activity_log.json
accounts.json
categories.json
store_types.json
chat_threads.json
delivery_partners.json
payment_partners.json
orders.json
followers.json
```

The `backend/data/*.json` files are ignored by Git and should be backed up separately in any real deployment.

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
- Preserve admin workspace scoping through `adminId` and the existing helper functions.
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
```

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

1. Set strong `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`, and `ADMIN_API_SESSION_SECRET`. The backend refuses to start without them.
2. Set an API URL for Flutter builds with `--dart-define=API_BASE_URL=...`.
3. Move JSON persistence to a real database or enforce file locks/backups.
4. Move uploads to object storage or protected storage.
5. Add HTTPS, secure sessions, password hashing, authorization middleware, CSRF protection, rate limiting, and audit logs.
6. Ensure `backend/data` and `backend/public/uploads` are persisted outside ephemeral runtime directories.

## Troubleshooting

- If Flutter cannot fetch products, confirm the backend is running and `API_BASE_URL` points to the backend host.
- For Android emulator, use `http://10.0.2.2:8080` instead of `127.0.0.1`.
- If visual search fails, confirm `sharp` installed successfully in `backend/node_modules`.
- If AI reply fails, confirm `CHAT_AI_API_KEY` or `OPENAI_API_KEY` is set.
- If admin data appears empty, check the browser's stored `gms-admin-id` and backend JSON files.


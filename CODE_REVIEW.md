# Code Review

## Findings

### Critical: Passwords Are Stored and Compared as Plaintext

- **Area:** `backend/server.js`, `backend/data/accounts.json`
- **Impact:** Account compromise if local data files leak. Plaintext comparison also prevents safe password rotation/auditing.
- **Evidence:** Login handlers compare `String(account.password)` directly with submitted password. Account schema includes `password`.
- **Recommendation:** Migrate passwords to Argon2id or bcrypt hashes, remove plaintext fields, and add reset/migration flow.

### Critical: Default Super Admin Credentials Exist in Code

- **Area:** `backend/server.js`
- **Impact:** Any deployment that does not override environment variables has predictable root access.
- **Evidence:** `SUPER_ADMIN_USERNAME` defaults to `root`; `SUPER_ADMIN_PASSWORD` defaults to `Root@12345`.
- **Recommendation:** Require credentials through environment variables and fail startup when missing in production.

### High: Tenant/Admin Scope Is Caller-Controlled

- **Area:** `backend/server.js`, admin JavaScript clients
- **Impact:** A caller can provide `x-gms-admin-id`, `x-admin-id`, or query parameters to target another workspace if no signed auth is added.
- **Recommendation:** Derive `adminId` from a signed session/JWT on the server and ignore caller-provided tenant IDs for protected writes.

### High: No Central Auth/Authorization Middleware

- **Area:** `backend/server.js`
- **Impact:** Endpoint protection is inconsistent. Some upload and read endpoints are effectively public or rely on UI controls.
- **Recommendation:** Introduce centralized authentication and role/permission middleware. Require explicit auth metadata for every route.

### High: JSON File Persistence Has Race and Durability Risks

- **Area:** `backend/data` helpers in `backend/server.js`
- **Impact:** Concurrent writes can lose updates. Full-file rewrites do not provide transactions, indexes, backups, or constraints.
- **Recommendation:** Move to a database or add file locks, atomic writes, backups, and migration tooling as an interim step.

### High: Public Upload Storage Can Expose Sensitive Files

- **Area:** `backend/public/uploads`, `/api/uploads`, `/api/review-uploads`, `/api/document-uploads`
- **Impact:** Uploaded employee documents and media are public static files. MIME/extension checks are not enough for malware protection.
- **Recommendation:** Store documents privately, enforce authenticated upload/download, add scanning, quotas, and signed URLs.

### Medium: CORS Allows Any Origin

- **Area:** `backend/server.js`
- **Impact:** Browsers from arbitrary origins can call the API. This is especially risky if cookie/session auth is added later.
- **Recommendation:** Restrict `Access-Control-Allow-Origin` to known app/admin origins.

### Medium: No Rate Limiting or Brute Force Protection

- **Area:** Backend API
- **Impact:** Login, upload, visual search, and AI endpoints can be abused.
- **Recommendation:** Add IP/account-based rate limits and upload quotas.

### Medium: Large Monolithic Files Increase Regression Risk

- **Area:** `backend/server.js` (~14k lines), `backend/public/app.js` (~15k lines), `backend/public/settings-menu.js`, `backend/public/stock.js`, `backend/public/employee_dashboard.js`, `lib/chat_support.dart`, `lib/main.dart`
- **Impact:** Harder review, testing, ownership, and refactoring. Small changes can create broad regressions.
- **Recommendation:** Split into route modules, services, validators, repositories, UI components, and feature-specific controllers.

### Medium: Business Rules Are Duplicated Across Client and Server

- **Area:** Flutter services/pages, admin scripts, backend handlers
- **Impact:** Validation and behavior can drift between app, admin web, and backend.
- **Recommendation:** Define shared API schemas and keep authoritative validation on the server.

### Medium: Polling Is Used for Near-Real-Time Features

- **Area:** Chat, dashboard, employee dashboard, notifications
- **Impact:** Frequent polling can increase load and still feel delayed.
- **Recommendation:** Use WebSockets or server-sent events for chat, order status, and notifications.

### Medium: Upload Type Validation Is Incomplete for Production

- **Area:** Upload handlers
- **Impact:** File extension/content type can be spoofed.
- **Recommendation:** Inspect file signatures, transcode media where possible, scan files, and block executable content.

### Medium: Order Grouping Uses Timestamp as Identifier

- **Area:** `/api/orders/{createdAtEpochMs}/...`, order records
- **Impact:** Timestamp collisions or client clock issues can affect order grouping.
- **Recommendation:** Generate stable server-side order group IDs.

### Low: Naming and File Typos Reduce Maintainability

- **Area:** `tacking.dart`, `traking.html/js`, `face_verfication.html`
- **Impact:** Harder discovery and onboarding.
- **Recommendation:** Add compatibility redirects/imports, then rename files safely.

### Low: README Is Still Starter-Level

- **Area:** `README.md`
- **Impact:** New developers do not get accurate setup or architecture guidance from the first file they open.
- **Recommendation:** Replace or link it to `DEVELOPER_GUIDE.md` and `PROJECT_OVERVIEW.md`.

## Dead Code and Unused Files

Potential candidates for review:

- `validation_modal.html` appears to be a preview/reference page.
- `web_immersive.html` and related screenshots/previews are presentation assets rather than runtime admin modules.
- Platform-generated Flutter files should remain, but app-specific logic should stay out of generated runner files.
- `register_fallback.js` may be fallback/legacy behavior and should be confirmed.

No files were deleted as part of this documentation pass.

## Performance Concerns

- Full JSON file reads/writes on each request will not scale with many products/orders/accounts.
- Browser-side dashboards aggregate large payloads client-side.
- Chat polling and dashboard polling can create high request volume.
- Public static uploads can grow without cleanup or compression policy for videos/documents.

## Error Handling Improvements

- Standardize response shape across endpoints, for example `{ "error": { "code": "...", "message": "..." } }`.
- Add structured server logs with request ID, user/admin ID, endpoint, and status.
- Avoid swallowing JSON parse errors silently in data reads; corrupted data should be visible.
- Add user-safe error messages and internal diagnostic logs separately.

## Scalability Concerns

- JSON file storage is the largest scalability blocker.
- Lack of queues/workers makes AI, image processing, uploads, and model generation block request flows.
- No CDN/object storage for media.
- No database indexes for catalog search, order filtering, reports, or tenant lookup.

## Positive Observations

- The code consistently uses `adminId` scoping helpers in many handlers.
- Product approval and store type/category management are clearly separated into super admin handlers.
- The Flutter service abstraction pattern supports web, IO, and stub builds.
- Upload handlers enforce size limits and basic type checks.
- Recent Store Type work records categories, status, company usage, product count, commission, and service fee.


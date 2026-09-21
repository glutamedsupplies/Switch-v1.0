# Security Documentation

## Current Authentication

The system currently uses separate login endpoints:

- Customer login: `/api/accounts/login`
- Admin login: `/api/admin-login`
- Employee login: `/api/employee-login`
- Super admin login: `/api/super-admin-login`

Successful buyer, seller, employee, and Google login responses now issue an HMAC-signed, expiring app session. Browsers receive the session in an `HttpOnly`, `SameSite=Lax` cookie; API clients can send the returned `sessionToken` in `x-switch-session` or `Authorization: Bearer <token>`.

The signed claims bind `accountId`, role, email, and seller `adminId`. Legacy identity inputs remain accepted only as compatibility hints:

- `x-gms-admin-id`
- `x-admin-id`
- `adminId`
- `tenantId`
- `workspaceId`

These values no longer select the authorized account or tenant. A mismatch against the signed session returns `403`; a missing, forged, or expired session returns `401` on protected routes. A valid session with the wrong role also returns `403`.

Super admin APIs require a signed, expiring `x-gms-super-admin-token`, which is returned by the super admin login endpoint. The token signature uses `ADMIN_API_SESSION_SECRET`; invalid, forged, and expired sessions receive `401`.

## Authorization

Authorization uses central signed-session guards plus handler-specific permission checks:

- Super admin routes and handlers call `requireSuperAdmin`.
- Product writes, orders, employee accounts, seller account settings, and buyer self-account routes derive identity from the verified app session.
- Buyer order reads/writes are forced to the session account; seller/employee order and product operations are forced to the session tenant.
- Delivery/payment partner administration is session-protected; only read-only `?productOptions=1` buyer lists are public.
- Employee page access is partly enforced in browser JavaScript through `employee_access_guard.js`.
- Customer ownership is checked in selected flows such as seller follow and chat message deletion.

Migrated route groups include `/api/products` writes, `/api/products/{id}` writes, `/api/orders`, `/api/orders/*`, `/api/accounts` administration, `/api/admin-account*`, `/api/auth/session`, `/api/auth/switch-role`, `/api/account/roles`, `/api/account/profile-image`, buyer password/deletion/language routes, devices, and delivery addresses.

## Password Security

Passwords are verified only through bcrypt. PostgreSQL stores them in `password_hash`; JSON account records retain the legacy `password` field name, but its value must be a bcrypt hash. The JSON writer rejects non-empty values that are not valid bcrypt hashes.

Operational requirements:

- Run `npm run passwords:migrate-json -- --dry-run` from `backend` before deploying hash-only login.
- Run `npm run passwords:migrate-json -- --write` after reviewing the counts. The script creates a timestamped backup and is idempotent.
- Confirm a second dry run reports `plaintext=0` before starting the updated backend.
- Plaintext JSON records are intentionally unable to log in until migrated.

Login endpoints apply per-IP and per-identifier lockout. Too many failed attempts return `429` with `Retry-After` and code `LOGIN_LOCKED`. Never log or return password fields.

## Signed Sessions

Super admin authentication uses its separate short-lived HMAC token. Buyer, seller, and employee authentication uses `backend/security/appSessionAuth.js`, with domain-separated HMAC signing even when `ADMIN_API_SESSION_SECRET` is used as the fallback secret.

Set `APP_SESSION_SECRET` to a dedicated random value in production. `APP_SESSION_TTL_SECONDS` defaults to 24 hours and is capped at 30 days. Production and `REQUIRE_SECRETS=1` fail closed when neither app-session nor admin-session signing secret is configured.

Recommendations:

- Add server-side revocation or rotating refresh tokens for immediate invalidation.
- Add logout/session invalidation.

## API Protection

Current API protections include:

- Per-handler method checks.
- Some validation for required fields and duplicate records.
- Session-derived account and tenant filtering for migrated routes.
- Super admin token checks on privileged endpoints.
- Upload size limits and signed-session checks on upload routes.
- CORS allowlist (never `*`).
- Login lockout plus rate limits on uploads, AI reply, and visual search.

### CORS allowlist

`Access-Control-Allow-Origin` is never `*`. The server reflects the request `Origin` only when it is a localhost Flutter/admin origin:

| Host | Scheme | Ports | Typical use |
| --- | --- | --- | --- |
| `localhost` | `http` or `https` | any | Flutter Chrome (`flutter run -d chrome`), local admin |
| `127.0.0.1` | `http` or `https` | any | Backend-served admin at `http://127.0.0.1:8080` |
| `[::1]` | `http` or `https` | any | IPv6 loopback |

Add extra exact origins with `CORS_ALLOWED_ORIGINS` (comma-separated). Requests that send a non-allowlisted `Origin` to `/api/*` receive `403` (`CORS_ORIGIN_FORBIDDEN`). Same-origin, curl, and native Flutter clients that omit `Origin` are unchanged.

### Listen address

The HTTP server binds `BIND_HOST` (default `127.0.0.1`). Override with `BIND_HOST=0.0.0.0` to listen on all NICs for LAN devices.

Risks:

- Some non-critical legacy routes still need migration to the central app-session policy.
- There is no CSRF protection for browser-based admin actions.

Recommendations:

- Require signed auth for every remaining non-public API.
- Add CSRF protection if cookie sessions are used.
- Validate roles and permissions server-side.
- Add audit logs for privileged actions.

## Validation

Validation exists in many places:

- Emails and phone numbers are validated in admin/account update flows.
- Duplicate admin email/mobile, customer email/mobile, employee ID, applicant name, and product barcode are checked.
- Store Type and category names must be at least two characters and unique.
- Upload types and sizes are checked.
- Order group IDs and decisions are validated.

Remaining gaps:

- Validation is distributed across handlers and client scripts.
- No schema validation library was found.
- Some payloads accept flexible/legacy field names, making contracts harder to enforce.

Recommendations:

- Add schema validation with a library such as Zod, Joi, or JSON Schema.
- Centralize request parsing and validation.
- Add consistent error responses.

## File Upload Security

Current upload behavior:

- Uploads are written to `backend/public/uploads`.
- Images may be converted to WebP with `sharp`.
- Upload max is 100 MB generally.
- Review video max is 50 MB.
- Documents allow PDF, DOC, and DOCX.
- Uploaded files are publicly accessible through `/uploads/...`.

Risks:

- Public uploads can expose sensitive documents.
- MIME type and extension checks are not enough for malware protection.
- Large uploads can consume disk space.

`/api/uploads`, `/api/chat-uploads`, `/api/review-uploads`, and `/api/document-uploads` require a valid signed session (or super-admin token) **before** the body is read or validated. Unauthenticated callers receive `401`, not `400`.

Recommendations:

- Store employee documents outside public static storage.
- Scan uploads for malware.
- Enforce strict allowlists and content sniffing.
- Add disk quotas and cleanup jobs.
- Use object storage with signed URLs for private files.

## Rate Limiting

In-memory limiters (per process) cover:

| Area | Default | Env |
| --- | --- | --- |
| Login lockout per IP + identifier | 5 failures / 15 min | `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS` |
| Login cap per IP | 40 failures / 15 min | `LOGIN_RATE_LIMIT_IP_MAX` |
| Uploads | 30 / 15 min per session or IP | `UPLOAD_RATE_LIMIT_MAX` |
| AI reply / image enhancement | 20 / 10 min | `AI_RATE_LIMIT_MAX` |
| Visual search | 30 / 10 min | `VISUAL_SEARCH_RATE_LIMIT_MAX` |
| Analytics event ingestion | 120 / 1 min | `ANALYTICS_RATE_LIMIT_MAX`, `ANALYTICS_RATE_LIMIT_WINDOW_MS` |

Exceeded limits return `429` with `Retry-After`. Login lockout uses code `LOGIN_LOCKED`.

## PayMongo seller checkout

`POST /api/payments/paymongo/seller-webhook` always requires `PAYMONGO_WEBHOOK_SECRET`. Missing secret → `503`. Missing or invalid `paymongo-signature` → `401`. Unsigned webhooks never activate a seller.

Signed events must be no more than five minutes old. Paid events are matched to the stored checkout session and unexpired checkout intent, then claimed through the durable `payment_webhook_events` ledger. Duplicate deliveries return `200` without repeating activation; failed/stale processing claims can be retried. The intent is marked active only after seller activation succeeds, avoiding partial-failure retry skips. Only the event ID and payload hash are retained in checkout metadata, not the complete webhook payload.

`POST /api/account/become-seller/confirm-payment` requires a signed app session (`401` if missing). When PayMongo hosted checkout is enabled (`PAYMONGO_SECRET_KEY` set), that route will not activate a seller until the webhook has marked the checkout intent paid (`409` / `PAYMONGO_WEBHOOK_REQUIRED`). Manual/free local onboarding still works for an authenticated session when PayMongo is not enabled.

## Potential Security Risks

| Severity | Risk | Files/Area |
| --- | --- | --- |
| High | Public file uploads can expose media/documents. | `backend/public/uploads`, upload handlers |
| Medium | Some non-critical legacy routes are not yet covered by central app-session policy. | Backend route dispatcher |
| Medium | CORS is loopback-only by default; production needs `CORS_ALLOWED_ORIGINS`. | `backend/security/cors.js` |
| Medium | Rate limits are in-memory per process. | `backend/security/rateLimit.js` |
| Medium | No CSRF protection for browser admin actions. | Admin web console |
| Medium | JSON file database has no transaction/locking protections. | `backend/data` helpers |
| Low | Browser local/session storage can be tampered with by scripts running on the same origin. | `backend/public/*.js` |

## Recommended Security Roadmap

1. Extend central session policy to remaining non-critical legacy routes.
2. Implement server-side RBAC/permission checks.
3. Add CSRF protection for cookie admin flows.
4. Move documents to private storage.
5. Add structured audit logs for admin/super admin actions.
6. Move from JSON files to a database with constraints and backups.

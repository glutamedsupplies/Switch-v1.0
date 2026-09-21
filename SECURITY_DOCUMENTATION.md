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

These values no longer select the authorized account or tenant. A mismatch against the signed session returns `403`; a missing, forged, or expired session returns `401` on protected routes.

Super admin APIs require a signed, expiring `x-gms-super-admin-token`, which is returned by the super admin login endpoint. The token signature uses `ADMIN_API_SESSION_SECRET`; invalid, forged, and expired sessions receive `401`.

## Authorization

Authorization uses central signed-session guards plus handler-specific permission checks:

- Super admin routes and handlers call `requireSuperAdmin`.
- Product writes, orders, employee accounts, seller account settings, and buyer self-account routes derive identity from the verified app session.
- Buyer order reads/writes are forced to the session account; seller/employee order and product operations are forced to the session tenant.
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

Remaining recommendations:

- Add login rate limiting and account lockout.
- Never log or return password fields.

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
- Upload size limits.
- CORS preflight handling.

Risks:

- `Access-Control-Allow-Origin` is currently `*`.
- Some non-critical legacy routes still need migration to the central app-session policy.
- Many upload endpoints lack explicit auth checks inside the handler.
- There is no global rate limiting.
- There is no CSRF protection for browser-based admin actions.

Recommendations:

- Restrict CORS to trusted origins.
- Require signed auth for every non-public API.
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
- No per-user upload authorization was found in upload handlers.

Recommendations:

- Require auth for uploads.
- Store employee documents outside public static storage.
- Scan uploads for malware.
- Enforce strict allowlists and content sniffing.
- Add disk quotas and cleanup jobs.
- Use object storage with signed URLs for private files.

## Rate Limiting

No rate limiter was found.

Endpoints needing rate limits:

- Login endpoints
- Upload endpoints
- AI reply endpoint
- Visual search endpoint
- Product/account/order write endpoints

## Potential Security Risks

| Severity | Risk | Files/Area |
| --- | --- | --- |
| High | Public file uploads can expose media/documents. | `backend/public/uploads`, upload handlers |
| Medium | Some non-critical legacy routes are not yet covered by central app-session policy. | Backend route dispatcher |
| Medium | CORS allows all origins. | `backend/server.js` |
| Medium | No rate limiting or brute-force protection. | Backend API |
| Medium | No CSRF protection for browser admin actions. | Admin web console |
| Medium | JSON file database has no transaction/locking protections. | `backend/data` helpers |
| Low | Browser local/session storage can be tampered with by scripts running on the same origin. | `backend/public/*.js` |

## Recommended Security Roadmap

1. Extend central session policy to remaining non-critical legacy routes.
2. Implement server-side RBAC/permission checks.
3. Restrict CORS and add CSRF protection.
4. Protect uploads and move documents to private storage.
5. Add rate limiting and request size controls per endpoint.
6. Add structured audit logs for admin/super admin actions.
7. Move from JSON files to a database with constraints and backups.

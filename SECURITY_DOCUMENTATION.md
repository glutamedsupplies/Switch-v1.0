# Security Documentation

## Current Authentication

Login endpoints:

- Customer login: `/api/accounts/login`
- Admin/seller login: `/api/admin-login`
- Employee login: `/api/employee-login`
- Super admin login: `/api/super-admin-login`
- Google buyer/seller login: `/api/auth/google/login`, `/api/auth/google/seller-login`

Successful logins issue a **signed session** (HMAC-SHA256) using `ADMIN_API_SESSION_SECRET`:

- HttpOnly `gms_session` cookie
- `sessionToken` in the JSON body (super admin also returns it as `token` for existing clients)

The backend accepts the session from:

- `Cookie: gms_session=...`
- `X-GMS-Session-Token`
- `Authorization: Bearer ...`
- `X-GMS-Super-Admin-Token` (signed super-admin session from login)

Browser `sessionStorage` / `localStorage` is still used by the admin UI for display state. It is **not** authorization. Tenant headers such as `x-gms-admin-id` cannot grant workspace scope by themselves.

## Authorization

- Super admin handlers call `requireSuperAdmin`, which now requires a signed super-admin session.
- Product/order/account/admin writes derive `adminId` from the signed session. A spoofed `x-gms-admin-id` / `x-admin-id` / `adminId` query without a matching session returns **401**. A signed admin session that claims a different tenant returns **403**.
- Upload endpoints require any valid signed session.
- Employee page access is still partly enforced in browser JavaScript through `employee_access_guard.js`.
- Customer ownership is checked in selected flows such as seller follow and chat message deletion.

## Password Security

Passwords are hashed with **bcrypt** (`backend/db/password.js`). Login for buyer, seller, admin, employee, and super-admin uses `verifyPassword` / `verifyAndRehash`:

- bcrypt hashes are compared with bcrypt
- Legacy plaintext values still verify, then are **re-hashed on successful login**
- Account create/update/reset paths hash passwords before storing them
- Super-admin password comes from `SUPER_ADMIN_PASSWORD` and is hashed in memory at startup
- API serializers strip `password`, `_passwordHash`, and related secret fields

Required environment (no hardcoded defaults):

- `SUPER_ADMIN_USERNAME`
- `SUPER_ADMIN_PASSWORD`
- `ADMIN_API_SESSION_SECRET` (min 16 characters)

The process **exits on startup** if any of these are missing, or if the well-known default password `Root@12345` is used.

## JWT and Sessions

Sessions are compact HMAC tokens (`payload.signature`), not a JWT library. Claims include `role`, `adminId`, `accountId`, `exp`. Default TTL is 12 hours (`ADMIN_API_SESSION_TTL_SECONDS`).

Logout/session invalidation is cookie expiry / client token discard. Server-side revocation is not yet implemented.

## API Protection

- CORS origins come from `CORS_ALLOWED_ORIGINS` (comma-separated). There is no `Access-Control-Allow-Origin: *`.
- Allowed origins are reflected with `Access-Control-Allow-Credentials: true`.
- Requests with no `Origin` (same-origin, curl, mobile) are not treated as CORS.
- Login endpoints are rate limited per IP and identifier.
- Uploads require a signed session.
- Super admin token checks use the signed session, not a static username:password token.

## File Upload Security

- Uploads still write to `backend/public/uploads`.
- Images may be converted to WebP with `sharp`.
- Size and type checks remain.
- **Auth is required** on `/api/uploads`, `/api/chat-uploads`, `/api/review-uploads`, `/api/document-uploads`, product-model generators, and platform-feedback uploads.

Clients must send the session cookie or `X-GMS-Session-Token` / `Authorization: Bearer`.

## Rate Limiting

Login rate limiting (`LOGIN_RATE_LIMIT_MAX`, default 8 attempts per `LOGIN_RATE_LIMIT_WINDOW_MS`, default 15 minutes) applies per:

- client IP
- IP + identifier (email, username, or employee ID)

Exceeded attempts return **429** with `Retry-After`. Successful logins clear the identifier bucket.

## Potential Security Risks

| Severity | Risk | Status |
| --- | --- | --- |
| Critical | Plaintext password storage and string comparison | Mitigated: bcrypt + legacy re-hash on login |
| Critical | Default super admin credentials in code | Mitigated: required env, startup fail-closed |
| High | Caller-controlled `adminId` headers trusted for tenant scope | Mitigated: signed session required; spoof → 401/403 |
| High | Public file uploads | Partially mitigated: upload auth required; files remain statically served |
| High | No centralized auth middleware | Step 1: session attach + tenant/upload guards in the HTTP server |
| Medium | CORS allows all origins | Mitigated: env allowlist |
| Medium | No rate limiting | Step 1: login rate limit |
| Medium | No CSRF protection for cookie sessions | Remaining: SameSite=Lax cookie; add CSRF if cookie-only browser writes expand |
| Medium | JSON file database has no transaction/locking protections | Remaining |
| Low | Browser local/session storage can be tampered with | Remaining, but it no longer grants API tenant scope |

## Recommended Security Roadmap

1. ~~Hash all existing passwords and migrate login comparisons.~~ (Step 1: bcrypt helpers + legacy re-hash)
2. ~~Replace default super admin credentials with required environment configuration.~~
3. ~~Add central authentication middleware.~~ (Step 1: signed session + tenant guard)
4. Implement server-side RBAC/permission checks for every route.
5. ~~Restrict CORS~~ and add CSRF protection.
6. Move documents to private storage and signed download URLs.
7. Extend rate limiting to upload, AI, and visual-search endpoints.
8. Add structured audit logs for admin/super admin actions.
9. Complete the PostgreSQL migration and retire JSON password fields.

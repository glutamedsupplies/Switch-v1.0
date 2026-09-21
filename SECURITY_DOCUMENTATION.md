# Security Documentation

## Current Authentication

The system currently uses separate login endpoints:

- Customer login: `/api/accounts/login`
- Admin login: `/api/admin-login`
- Employee login: `/api/employee-login`
- Super admin login: `/api/super-admin-login`

Browser admin sessions are stored in browser `sessionStorage`/`localStorage`. The backend uses request headers and query parameters to determine workspace scope, especially:

- `x-gms-admin-id`
- `x-admin-id`
- `adminId`
- `tenantId`
- `workspaceId`

Super admin APIs require a signed, expiring `x-gms-super-admin-token`, which is returned by the super admin login endpoint. The token signature uses `ADMIN_API_SESSION_SECRET`; invalid, forged, and expired sessions receive `401`.

## Authorization

Current authorization is mostly handler-specific, with a central guard for all `/api/super-admin/*` routes:

- Super admin routes and handlers call `requireSuperAdmin`.
- Product/order/account/admin resources use `adminId` scope checks.
- Employee page access is partly enforced in browser JavaScript through `employee_access_guard.js`.
- Customer ownership is checked in selected flows such as seller follow and chat message deletion.

There is no shared role policy layer or signed session verification for most non-super-admin endpoints.

## Password Security

Passwords are compared directly as strings in the backend. The data schema includes a `password` field on account records.

Risks:

- Plaintext passwords can be exposed if JSON files leak.
- Non-super-admin legacy account records may still contain plaintext passwords during migration.
- No password hashing, salting, rotation policy, lockout, or brute-force protection was found.

Recommendations:

- Hash passwords with Argon2id or bcrypt.
- Require strong super admin credentials through environment variables.
- Add password reset tokens with expiration.
- Add login rate limiting and account lockout.
- Never log or return password fields.

## JWT and Sessions

No JWT library or signed cookie session middleware was found.

Current super admin token is derived from username and password and sent in a custom header. Admin and employee sessions are primarily browser-stored client data.

Recommendations:

- Use signed HTTP-only secure cookies or short-lived JWT access tokens plus refresh tokens.
- Store roles/permissions server-side or in signed claims.
- Validate tokens for every protected endpoint.
- Add logout/session invalidation.

## API Protection

Current API protections include:

- Per-handler method checks.
- Some validation for required fields and duplicate records.
- Admin scope filtering by `adminId`.
- Super admin token checks on privileged endpoints.
- Upload size limits.
- CORS preflight handling.

Risks:

- `Access-Control-Allow-Origin` is currently `*`.
- Tenant scope is accepted from caller-controlled headers/query parameters.
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
| Critical | Plaintext password storage and string comparison. | `backend/server.js`, `backend/data/accounts.json` |
| Critical | Default super admin credentials exist in code. | `backend/server.js` |
| High | Caller-controlled `adminId` headers/query parameters are trusted for tenant scope. | `backend/server.js`, admin JS clients |
| High | Public file uploads can expose media/documents. | `backend/public/uploads`, upload handlers |
| High | No centralized auth middleware for protected APIs. | `backend/server.js` |
| Medium | CORS allows all origins. | `backend/server.js` |
| Medium | No rate limiting or brute-force protection. | Backend API |
| Medium | No CSRF protection for browser admin actions. | Admin web console |
| Medium | JSON file database has no transaction/locking protections. | `backend/data` helpers |
| Low | Browser local/session storage can be tampered with by scripts running on the same origin. | `backend/public/*.js` |

## Recommended Security Roadmap

1. Hash all existing passwords and migrate login comparisons.
2. Replace default super admin credentials with required environment configuration.
3. Add central authentication middleware.
4. Implement server-side RBAC/permission checks.
5. Restrict CORS and add CSRF protection.
6. Protect uploads and move documents to private storage.
7. Add rate limiting and request size controls per endpoint.
8. Add structured audit logs for admin/super admin actions.
9. Move from JSON files to a database with constraints and backups.

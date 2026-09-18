# TODO and Recommendations

## Missing Features

- Production authentication with signed sessions or JWT.
- Password hashing and password reset tokens.
- Server-side role-based access control for every endpoint.
- Real database with migrations, constraints, and indexes.
- Cloud/private file storage for uploads and documents.
- Real payment gateway integration and payment callbacks.
- Courier/shipping API integration and live tracking callbacks.
- Email/SMS notifications for verification, receipts, and order updates.
- Central audit trail for all privileged admin/super admin actions.
- Backup and restore process for JSON data and uploaded files.

## Suggested Improvements

- Replace starter `README.md` with a concise project-specific README that links to these docs.
- Add OpenAPI/Swagger generation for the backend API.
- Add schema validation for every request body.
- Add integration tests for critical order, product, auth, and upload flows.
- Add seeded demo data that is safe to commit.
- Add development scripts for running backend and Flutter together.

## Refactoring Opportunities

- Split `backend/server.js` into:
  - route registration
  - auth middleware
  - request validators
  - repositories/data access
  - product service
  - order service
  - chat service
  - upload service
  - super admin service
- Split large admin scripts by feature and component.
- Move admin dashboard aggregations into backend summary endpoints.
- Split `lib/main.dart` into app shell, home, tabs, header, refresh controllers, and navigation modules.
- Split `lib/chat_support.dart` into models, store, service adapter, composer, message list, media preview, and reactions.

## Performance Improvements

- Move from JSON file storage to PostgreSQL, SQLite with WAL, or another durable database.
- Add indexes for `adminId`, `accountId`, `productId`, `createdAtEpochMs`, `threadId`, `approvalStatus`, and `category`.
- Add pagination for products, orders, accounts, chat threads, and activity.
- Use WebSockets/server-sent events for chat, notifications, and order status.
- Cache public catalog responses.
- Add media cleanup and compression policies.
- Process heavy image/model/AI work in background jobs.

## Security Improvements

- Hash passwords with Argon2id or bcrypt.
- Remove default super admin credentials and require env configuration.
- Require authenticated sessions for admin, employee, upload, product, order, and partner write APIs.
- Derive tenant scope from auth token instead of request headers.
- Restrict CORS.
- Add CSRF protection for browser admin flows.
- Add rate limiting for login, upload, AI, and visual search endpoints.
- Store employee documents privately.
- Add malware scanning and file signature validation.
- Add security headers for static pages.

## UI/UX Improvements

- Standardize admin modal, validation, button, table, and form patterns.
- Add loading, empty, and error states consistently across admin pages.
- Add clear success/error toasts for every write action.
- Add keyboard/focus accessibility to modal and dropdown components.
- Add confirmation flows for destructive actions.
- Improve mobile responsiveness for admin pages if mobile admin use is expected.
- Add clearer product approval statuses and rejection reasons.

## Data Model Improvements

- Separate `accounts.json` into admins, employees, and customers in a real database.
- Add immutable order groups with a server-generated `orderGroupId`.
- Add explicit inventory movement records instead of storing history only on products/orders.
- Add normalized product reviews collection.
- Add normalized notification/activity tables with read state per user.
- Use IDs for categories and store types instead of only names.
- Add created/updated/deleted metadata consistently.

## Future Roadmap

### Phase 1: Stabilize and Secure

- Replace plaintext passwords.
- Add auth middleware and role checks.
- Restrict CORS and add rate limiting.
- Protect uploads.
- Add backups for data and uploads.

### Phase 2: Make Data Durable

- Move JSON collections to a database.
- Add migrations and seed scripts.
- Add indexes and server-side pagination.
- Add OpenAPI documentation and schema validation.

### Phase 3: Improve Operations

- Add background jobs for image processing, AI replies, notifications, and cleanup.
- Add WebSockets/SSE for chat and live notifications.
- Add order group IDs and inventory ledger.
- Add admin audit logs.

### Phase 4: Business Integrations

- Add payment gateway integration.
- Add courier/tracking API integration.
- Add email/SMS notifications.
- Add cloud storage with CDN and signed URLs.

### Phase 5: Product Experience

- Improve visual search accuracy and ranking.
- Add product recommendation/search indexing.
- Add seller storefront enhancements.
- Add richer analytics and export features.


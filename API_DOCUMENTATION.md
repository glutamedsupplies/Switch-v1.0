# API Documentation

## Base URL

Development default:

```text
http://127.0.0.1:8080
```

Flutter services can override this with:

```text
--dart-define=API_BASE_URL=http://127.0.0.1:8080
```

## Common Request Headers

| Header | Purpose |
| --- | --- |
| `Content-Type: application/json` | JSON request bodies. |
| `x-gms-admin-id` or `x-admin-id` | Admin/workspace scope for most admin-owned resources. |
| `x-gms-super-admin-token` | Super admin token returned by `/api/super-admin-login`. |
| `x-gms-account-id`, `x-account-id`, `x-user-id` | Customer account identity for selected customer APIs. |
| `x-gms-account-email`, `x-account-email` | Customer email identity fallback for selected customer APIs. |
| `x-file-name` | Source file name for binary upload endpoints. |

## Common Status Codes

| Code | Meaning |
| --- | --- |
| `200` | Request succeeded. |
| `201` | Record or upload created. |
| `204` | CORS preflight accepted. |
| `400` | Invalid input or validation failure. |
| `401` | Missing or invalid authentication/session token. |
| `403` | Authenticated but not allowed. |
| `404` | Resource not found. |
| `405` | HTTP method is not allowed for that endpoint. |
| `409` | Current resource state blocks the requested action. |
| `413` | Upload body is too large. |
| `500` | Server error. |
| `503` | Optional service unavailable, such as AI or `sharp` visual search. |

## Endpoint Reference

### Health

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/health` | None | None | `{ "status": "ok", "message": "GMS Shopping backend is running." }` | None | `GET /health` |

### Authentication and Accounts

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/accounts/login` | None | `{ "email": "user@example.com", "password": "secret" }` | `{ "account": {...}, "message": "Login successful." }` | None | `POST /api/accounts/login` |
| `POST` | `/api/admin-login` | None | `{ "email": "admin@example.com", "password": "secret" }` | `{ "admin": {...}, "redirectPath": "/admin_dashboard.html" }` | None | `POST /api/admin-login` |
| `POST` | `/api/employee-login` | None | `{ "employeeId": "GMS-123456", "password": "secret" }` | `{ "account": {...}, "adminId": "...", "redirectPath": "..." }` | None | `POST /api/employee-login` |
| `GET` | `/api/employee-lookup` | `employeeId` query | None | `{ "account": { "employeeId": "...", "accountCode": "...", "role": "employee" } }` | None | `GET /api/employee-lookup?employeeId=GMS-123456` |
| `POST` | `/api/admin-presence` | None | `{ "adminId": "...", "isOnline": true }` | `{ "admin": {...}, "message": "Admin is online." }` | Account must exist | `POST /api/admin-presence` |
| `GET` | `/api/admin-account` | Optional `adminId` query | None | `{ "admin": {...} }` | Admin scope header/query | `GET /api/admin-account` with `x-gms-admin-id` |
| `PUT` | `/api/admin-account` | Optional `adminId` query | Admin profile fields | `{ "admin": {...}, "message": "Admin account updated." }` | Admin scope header/query | `PUT /api/admin-account` |
| `POST` | `/api/admin-register` | None | Admin account fields | `{ "admin": {...}, "redirectPath": "/login.html?role=admin" }` | None | `POST /api/admin-register` |
| `GET` | `/api/accounts` | Optional `id`, `accountId`, `employeeId` for delete/update lookups | None | `{ "accounts": [...] }` | Admin scope unless super admin token | `GET /api/accounts` with `x-gms-admin-id` |
| `POST` | `/api/accounts` | None | Customer or employee account fields | `{ "account": {...}, "message": "User account created." }` | Admin scope for web-created records | `POST /api/accounts` |
| `PUT` | `/api/accounts` | Optional `id`, `accountId`, `employeeId` | Employee update fields | `{ "account": {...}, "message": "Employee account updated." }` | Admin scope | `PUT /api/accounts?id=EMP-1` |
| `DELETE` | `/api/accounts` | Optional `id`, `accountId`, `employeeId` | Optional account ID body | `{ "account": {...}, "faceAttendanceProfileRemoved": true }` | Admin scope | `DELETE /api/accounts?id=EMP-1` |

### Super Admin

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/super-admin-login` | None | `{ "username": "root", "password": "secret" }` | `{ "root": {...}, "token": "...", "redirectPath": "/super_admin.html" }` | None | `POST /api/super-admin-login` |
| `GET` | `/api/super-admin/admins` | None | None | `{ "admins": [...], "total": 0 }` | `x-gms-super-admin-token` | `GET /api/super-admin/admins` |
| `POST` | `/api/super-admin/admins` | None | Admin account fields | `{ "admin": {...}, "message": "Admin account created." }` | Super admin token | `POST /api/super-admin/admins` |
| `PATCH`/`POST` | `/api/super-admin/admins/{adminId}/action` | `adminId` path | `{ "action": "notify" \| "deactivate" \| "ban" }` | `{ "admin": {...}, "action": "...", "message": "..." }` | Super admin token | `PATCH /api/super-admin/admins/admin-1/action` |
| `DELETE` | `/api/super-admin/admins/{adminId}/data` | `adminId` path | None or empty body | `{ "adminId": "...", "cleared": {...} }` | Super admin token | `DELETE /api/super-admin/admins/admin-1/data` |
| `GET` | `/api/seller-followers/overview` | None | None | `{ "totalFollowers": 0, "perSeller": [...] }` | Super admin token | `GET /api/seller-followers/overview` |

### Categories and Store Types

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/categories` | Optional `adminId` | None | `{ "categories": [...] }` | Admin scope defaults if omitted | `GET /api/categories?adminId=admin-1` |
| Other | `/api/categories` | None | Any | `{ "message": "Category management is available in Super Admin only." }` | Not allowed | `POST /api/categories` returns `403` |
| `GET` | `/api/super-admin/categories` | None | None | `{ "categories": [...] }` | Super admin token | `GET /api/super-admin/categories` |
| `POST` | `/api/super-admin/categories` | None | `{ "name": "Skincare" }` | `{ "category": "Skincare", "categories": [...] }` | Super admin token | `POST /api/super-admin/categories` |
| `PUT` | `/api/super-admin/categories` | None | `{ "oldName": "Skin", "name": "Skincare" }` | `{ "category": "Skincare", "updatedProducts": 3 }` | Super admin token | `PUT /api/super-admin/categories` |
| `DELETE` | `/api/super-admin/categories` | `name` query | None | `{ "categories": [...], "reassignedProducts": 0 }` | Super admin token | `DELETE /api/super-admin/categories?name=Skincare` |
| `GET` | `/api/store-types` | None | None | `{ "storeTypes": ["Retail"] }` | None | `GET /api/store-types` |
| Other | `/api/store-types` | None | Any | `{ "message": "Store type management is available in Super Admin only." }` | Not allowed | `POST /api/store-types` returns `403` |
| `GET` | `/api/super-admin/store-types` | None | None | `{ "storeTypes": [...], "storeTypeDetails": [...] }` | Super admin token | `GET /api/super-admin/store-types` |
| `POST` | `/api/super-admin/store-types` | None | `{ "name": "Retail", "categories": [], "status": "active", "commissionRate": 5, "serviceFee": 50 }` | `{ "storeTypeRecord": {...}, "storeTypeDetails": [...] }` | Super admin token | `POST /api/super-admin/store-types` |
| `PUT` | `/api/super-admin/store-types` | None | `{ "oldName": "Retail", "name": "Retail Plus", "categories": [], "status": "active" }` | `{ "storeTypeRecord": {...}, "updatedAdmins": 1 }` | Super admin token | `PUT /api/super-admin/store-types` |
| `DELETE` | `/api/super-admin/store-types` | `name` query | None | `{ "storeTypeDetails": [...], "clearedAdmins": 0 }` | Super admin token | `DELETE /api/super-admin/store-types?name=Retail` |

### Products and Product Approval

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/products` | `approvalStatus`; admin scope headers/query | None | `{ "products": [...] }` | Public only for `approvalStatus=approved`; otherwise admin scope required | `GET /api/products?approvalStatus=approved` |
| `POST` | `/api/products` | Admin scope header/query | Product payload | `{ "product": {...}, "message": "Product submitted for super admin review." }` | Admin scope | `POST /api/products` |
| `PUT` | `/api/products/{productId}` | `productId` path | Full product update | `{ "product": {...}, "message": "Product updated." }` | Admin scope | `PUT /api/products/prod-1` |
| `PATCH` | `/api/products/{productId}` | `productId` path | `{ "isActive": true }` | `{ "product": {...}, "message": "Product visibility updated." }` | Admin scope | `PATCH /api/products/prod-1` |
| `DELETE` | `/api/products/{productId}` | `productId` path | Optional activity actor | `{ "deletedId": "...", "message": "Product deleted." }` | Admin scope | `DELETE /api/products/prod-1` |
| `POST` | `/api/products/visual-search` | Admin scope header/query | Binary image body, `x-file-name` | `{ "products": [...], "total": 1, "message": "Visual matches found." }` | Admin scope/default scope | `POST /api/products/visual-search` |
| `GET` | `/api/super-admin/product-requests` | None | None | `{ "products": [...], "total": 0 }` | Super admin token | `GET /api/super-admin/product-requests` |
| `PATCH`/`POST` | `/api/super-admin/products/{productId}/approve` | `productId` path | Optional empty body | `{ "product": {...}, "message": "Product request approved." }` | Super admin token | `PATCH /api/super-admin/products/prod-1/approve` |
| `PATCH`/`POST`/`DELETE` | `/api/super-admin/products/{productId}/cancel` | `productId` path | Optional empty body | `{ "product": {...}, "message": "Product request cancelled." }` | Super admin token | `POST /api/super-admin/products/prod-1/cancel` |
| `GET` | `/api/super-admin/products/{adminId}` | `adminId` path | None | `{ "products": [...], "companyName": "...", "companyId": "..." }` | Currently no explicit token check in dispatcher handler | `GET /api/super-admin/products/admin-1` |
| `POST`/`PATCH` | `/api/product-reviews/reply` | None | `{ "productId": "...", "reviewId": "...", "reply": "Thanks" }` | `{ "product": {...}, "message": "Reply saved." }` | Admin context inferred from product/order | `POST /api/product-reviews/reply` |

### Sellers and Followers

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/sellers` | None | None | `{ "sellers": [...], "total": 0 }` | None | `GET /api/sellers` |
| `GET` | `/api/sellers/{adminId}/profile` | `adminId` path | None | Seller profile, rating, followers, products | None | `GET /api/sellers/admin-1/profile` |
| `POST` | `/api/sellers/{adminId}/follow` | Account ID/email headers or query | Optional empty body | `{ "adminId": "...", "followersCount": 1, "followed": true }` | Account identity required | `POST /api/sellers/admin-1/follow?accountId=user-1` |
| `POST` | `/api/sellers/{adminId}/unfollow` | Account ID/email headers or query | Optional empty body | `{ "adminId": "...", "followersCount": 0, "followed": false }` | Account identity required | `POST /api/sellers/admin-1/unfollow` |
| `GET` | `/api/sellers/{adminId}/followers-count` | `adminId` path | None | `{ "adminId": "...", "followersCount": 0 }` | None | `GET /api/sellers/admin-1/followers-count` |
| `GET` | `/api/super-admin/{adminId}/followers-count` | `adminId` path | None | `{ "adminId": "...", "followersCount": 0 }` | None | `GET /api/super-admin/admin-1/followers-count` |
| `GET` | `/api/sellers/{adminId}/is-followed` | Account ID/email headers or query | None | `{ "followed": true }` | Account identity required | `GET /api/sellers/admin-1/is-followed?accountId=user-1` |
| `GET` | `/api/admin-followers-count` | Admin scope | None | `{ "adminId": "...", "followersCount": 0 }` | Admin scope | `GET /api/admin-followers-count` |

### Delivery and Payment Partners

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/delivery-partners` | Optional admin scope | None | `{ "partners": [...] }` | Admin scope or super admin token | `GET /api/delivery-partners` |
| `POST` | `/api/delivery-partners` | Optional admin scope | `{ "branch": "LBC", "description": "...", "imageUrl": "/uploads/x.webp" }` | `{ "partner": {...}, "message": "Delivery partner saved." }` | Admin scope or super admin token | `POST /api/delivery-partners` |
| `PATCH` | `/api/delivery-partners/{partnerId}` | `partnerId` path | `{ "isActive": false }` | `{ "partner": {...}, "message": "Delivery partner deactivated." }` | Admin scope or super admin token | `PATCH /api/delivery-partners/partner-1` |
| `DELETE` | `/api/delivery-partners/{partnerId}` | `partnerId` path | None | `{ "deletedId": "...", "message": "Delivery partner deleted." }` | Admin scope or super admin token | `DELETE /api/delivery-partners/partner-1` |
| `GET` | `/api/payment-partners` | Optional admin scope | None | `{ "partners": [...] }` | Admin scope or super admin token | `GET /api/payment-partners` |
| `POST` | `/api/payment-partners` | Optional admin scope | `{ "branch": "GCash", "imageUrl": "/uploads/x.webp" }` | `{ "partner": {...}, "message": "Payment partner saved." }` | Admin scope or super admin token | `POST /api/payment-partners` |
| `PATCH` | `/api/payment-partners/{partnerId}` | `partnerId` path | `{ "enabled": true }` | `{ "partner": {...}, "message": "Payment partner activated." }` | Admin scope or super admin token | `PATCH /api/payment-partners/partner-1` |
| `DELETE` | `/api/payment-partners/{partnerId}` | `partnerId` path | None | `{ "deletedId": "...", "message": "Payment partner deleted." }` | Admin scope or super admin token | `DELETE /api/payment-partners/partner-1` |

### Orders

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/orders` | Admin scope or account ID headers/query | None | `{ "orders": [...] }` | Admin or account scope | `GET /api/orders?accountId=user-1` |
| `PUT` | `/api/orders` | Admin scope or account ID headers/query | Array or object containing orders | `{ "orders": [...], "total": 0, "message": "Orders synced." }` | Admin or account scope | `PUT /api/orders` |
| `POST` | `/api/orders` | Admin scope or account ID headers/query | Array or object containing orders | `{ "orders": [...], "mergedCount": 1, "message": "Orders merged." }` | Admin or account scope | `POST /api/orders` |
| `POST` | `/api/orders/{createdAtEpochMs}/pack` | `createdAtEpochMs` path | `{ "deductInventory": true }` | `{ "createdAtEpochMs": 0, "updatedCount": 1 }` | Admin scope | `POST /api/orders/1780000000000/pack` |
| `POST` | `/api/orders/{createdAtEpochMs}/ship` | `createdAtEpochMs` path | Optional empty body | `{ "createdAtEpochMs": 0, "updatedCount": 1 }` | Admin scope | `POST /api/orders/1780000000000/ship` |
| `POST` | `/api/orders/{createdAtEpochMs}/cancel` | `createdAtEpochMs` path | Optional empty body | `{ "createdAtEpochMs": 0, "updatedCount": 1 }` | Admin scope | `POST /api/orders/1780000000000/cancel` |
| `POST` | `/api/orders/{createdAtEpochMs}/cancel-request/{accept|reject}` | Group ID and decision path | Optional empty body | `{ "decision": "accept", "message": "Cancellation request accepted." }` | Admin scope | `POST /api/orders/1780000000000/cancel-request/accept` |

### Chat Support

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/chat-support` | `customerId`/`userId` query or admin scope | None | `{ "threads": [...] }` | Customer ID or admin scope | `GET /api/chat-support?customerId=user-1` |
| `POST` | `/api/chat-support` | Optional admin scope | Thread payload or `{ "thread": {...} }` | `{ "thread": {...}, "message": "Chat thread synced." }` | Customer/admin identity inferred | `POST /api/chat-support` |
| `GET` | `/api/chat-support/{threadId}` | `threadId` path, admin scope | None | `{ "thread": {...} }` | Admin scope | `GET /api/chat-support/thread-1` |
| `DELETE` | `/api/chat-support/{threadId}` | `threadId` path, admin scope | None | `{ "deletedId": "...", "message": "Chat thread deleted." }` | Admin scope | `DELETE /api/chat-support/thread-1` |
| `POST`/`PUT` | `/api/chat-support/{threadId}/typing` | `threadId` path | `{ "actor": "user" \| "employee", "isTyping": true }` | `{ "thread": {...}, "message": "Typing state updated." }` | Admin scope or thread input for users | `POST /api/chat-support/thread-1/typing` |
| `POST` | `/api/chat-support/{threadId}/reply` | `threadId` path | `{ "text": "Hello", "imageUrl": "" }` | `{ "thread": {...}, "message": "Reply sent." }` | Admin scope | `POST /api/chat-support/thread-1/reply` |
| `POST`/`PUT` | `/api/chat-support/{threadId}/edit-message` | `threadId` path | `{ "messageId": "...", "text": "Updated" }` | `{ "thread": {...}, "message": "Message updated." }` | Admin scope/customer owner rules | `POST /api/chat-support/thread-1/edit-message` |
| `POST` | `/api/chat-support/{threadId}/delete-message` | `threadId` path | `{ "messageId": "...", "customerId": "..." }` | `{ "thread": {...}, "message": "Message deleted." }` | Admin scope/customer owner rules | `POST /api/chat-support/thread-1/delete-message` |
| `POST` | `/api/chat-support/{threadId}/ai-reply` | `threadId` path | Optional empty body | `{ "thread": {...}, "message": "AI reply sent." }` | Admin scope | `POST /api/chat-support/thread-1/ai-reply` |
| `POST` | `/api/chat-support/{threadId}/read-support` | `threadId` path | Optional empty body | `{ "thread": {...}, "message": "Chat thread marked as seen by support." }` | Admin scope | `POST /api/chat-support/thread-1/read-support` |

### Activity and Uploads

| Method | URL | Parameters | Request Body | Response | Auth | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `GET` | `/api/activity` | `limit`, viewer fields, admin scope | None | `{ "activities": [...], "total": 0 }` | Admin scope | `GET /api/activity?limit=10` |
| `POST` | `/api/uploads` | `x-file-name`; binary body | Image, video, or model bytes | `{ "imageUrl": "/uploads/file.webp", "mediaUrl": "...", "fileName": "..." }` | No explicit auth in handler; callers are admin pages | `POST /api/uploads` |
| `POST` | `/api/review-uploads` | `x-file-name`; binary body | Review image/video bytes | Upload metadata | No explicit auth in handler; callers are app/admin pages | `POST /api/review-uploads` |
| `POST` | `/api/document-uploads` | `x-file-name`; binary body | PDF, DOC, or DOCX bytes | `{ "documentUrl": "/uploads/file.pdf" }` | No explicit auth in handler; callers are employee/admin pages | `POST /api/document-uploads` |
| `POST` | `/api/product-models/from-frames` | None | JSON with six frame image references | Generated model/texture URLs | Admin caller expected | `POST /api/product-models/from-frames` |
| `POST` | `/api/product-models/from-scan` | None | JSON with scan frame image references | Generated model/texture URLs | Admin caller expected | `POST /api/product-models/from-scan` |

## Representative Requests

### Create Product

```http
POST /api/products HTTP/1.1
Content-Type: application/json
x-gms-admin-id: admin-1

{
  "name": "Sample Product",
  "originalPrice": 1000,
  "salesPrice": 899,
  "category": "General",
  "stock": 25,
  "imageUrl": "/uploads/sample.webp"
}
```

### Create Order

```http
POST /api/orders HTTP/1.1
Content-Type: application/json
x-gms-account-id: user-1

{
  "orders": [
    {
      "adminId": "admin-1",
      "accountId": "user-1",
      "productId": "prod-1",
      "quantity": 1,
      "unitPrice": 899,
      "stage": "toPrepare",
      "createdAtEpochMs": 1780000000000
    }
  ]
}
```

### Add Store Type

```http
POST /api/super-admin/store-types HTTP/1.1
Content-Type: application/json
x-gms-super-admin-token: <token>

{
  "name": "Retail",
  "categories": ["Skincare", "Wellness"],
  "status": "active",
  "commissionRate": 5,
  "serviceFee": 50
}
```

## API Assumptions

- Request and response schemas are inferred from `backend/server.js` and client calls.
- Several endpoints rely on trusted headers/query parameters rather than signed sessions.
- Some upload endpoints do not enforce endpoint-level authentication in the handler; access is currently controlled by UI availability rather than server middleware.
- Super admin product-by-company route naming overlaps with product approval routes. The dispatcher handles approve/cancel first, then `/api/super-admin/products/{adminId}`.


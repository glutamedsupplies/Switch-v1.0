# Analytics baseline (pre-launch)

Launch-day funnel visibility for Switch: browse → cart → checkout → order → payment → pack/ship/cancel.

Events are **append-only** in PostgreSQL (`analytics_events`, migration `021`). Funnel and GMV summaries are computed on the server from that table plus `orders` / `order_items`. Clients must not aggregate JSON locally.

## Event taxonomy

| `event_name` | Who emits it | Typical properties |
| --- | --- | --- |
| `product_view` | Buyer app / web (POST) | `productId` |
| `add_to_cart` | Buyer app / web (POST) | `productId`, `quantity`, `variantId` |
| `begin_checkout` | Buyer app / web (POST) | `productId`, optional `orderId` |
| `place_order` | Server, when a new order group is written | `orderId` (`orders.id` / `orderGroupId`) |
| `payment_initiated` | Server, when checkout enters unpaid `toPay` (or a paid/failed attempt is first seen) | `orderId` |
| `payment_succeeded` | Server, when an order leaves unpaid (`paid_at` / paid stages) | `orderId` |
| `payment_failed` | Server, when `paymentStatus` becomes failed/declined/expired without a paid stamp | `orderId` |
| `pack` | Server pack path (`toShip` / `packed_at`) | `orderId` |
| `ship` | Server ship path (`toReceive` / `shipped_at`) | `orderId` |
| `cancel` | Server cancel / accepted cancel-request (`cancelled`) | `orderId` |

Unknown `event_name` values are rejected (HTTP 400). Max batch size is 100 events.

This records **status-change telemetry only**. It does not talk to PayMongo or invent gateway behavior.

## APIs

All three routes require a signed app session (`x-switch-session` / `Authorization: Bearer` / `switch_session` cookie). Super Admin may call funnel/summary with `x-gms-super-admin-token`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/analytics/events` | buyer, seller, employee | Ingest one event or `{ "events": [ ... ] }` |
| `GET` | `/api/analytics/funnel` | seller, employee, super admin | Stage counts + conversion rates |
| `GET` | `/api/analytics/summary` | seller, employee, super admin | GMV proxy, AOV, cancel rate |

Default window is **7 days** (`from = now - 7d`, `to = now`). Override with `days`, or `from` / `to` ISO timestamps. Seller/employee reads are always scoped to the signed `adminId`. Super Admin may pass `?adminId=` to slice one tenant, or omit it for platform-wide totals.

`GET /api/analytics/funnel` uses:

- `product_view` / `add_to_cart` / `begin_checkout` from `analytics_events`
- `place_order` / `payment_initiated` / `payment_succeeded` / `pack` / `ship` / `cancel` from `orders` timestamps when those rows exist, otherwise from events
- `payment_failed` from events (side exit; not a conversion stage)

Conversion rate is `stage_n / stage_{n-1}` (0 when the previous stage is 0). Cancel is a side exit (`cancel.rate = cancelled / placed`).

`GET /api/analytics/summary`:

- **GMV** — sum of `order_items.quantity * unit_price` for orders with `paid_at` in range
- **AOV** — GMV / paid order count
- **Cancel rate** — cancelled orders in range / placed orders in range

Requires `DATABASE_URL` and applied migrations; otherwise the endpoints return `503 ANALYTICS_UNAVAILABLE`.

## Client stub

The ingest API is ready. Buyer `product_view` / `add_to_cart` / `begin_checkout` can POST after login. Wiring those calls into Flutter screens is optional and non-blocking for launch infrastructure.

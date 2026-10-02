-- Switch Rider: first-party rider/dispatch system.
--
-- Delivery jobs reference the original order by order_group_id (no FK: order
-- rows are rewritten by syncOrdersToPostgres, and a cascading FK would wipe
-- delivery accountability). Pickup/drop-off are snapshotted on the job because
-- rider accountability must not change when a seller later edits their pickup
-- location or a buyer edits an address book entry.

CREATE TABLE IF NOT EXISTS switch_rider_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO switch_rider_settings (id, settings)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS seller_pickup_locations (
  admin_id        TEXT PRIMARY KEY,
  contact_name    TEXT NOT NULL DEFAULT '',
  contact_phone   TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL,
  area            TEXT NOT NULL DEFAULT '',
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

CREATE SEQUENCE IF NOT EXISTS rider_code_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS delivery_code_seq START 100001;

CREATE TABLE IF NOT EXISTS riders (
  id                          TEXT PRIMARY KEY,
  rider_code                  TEXT NOT NULL UNIQUE,
  first_name                  TEXT NOT NULL,
  last_name                   TEXT NOT NULL,
  country_code                TEXT NOT NULL DEFAULT '+63',
  mobile_number               TEXT NOT NULL,
  email                       TEXT,
  password_hash               TEXT NOT NULL,
  birthday                    DATE,
  profile_photo_key           TEXT NOT NULL DEFAULT '',
  status                      TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
    CHECK (status IN ('PENDING_VERIFICATION','APPROVED','REJECTED','ACTIVE','SUSPENDED','DEACTIVATED')),
  status_reason               TEXT NOT NULL DEFAULT '',
  availability_status         TEXT NOT NULL DEFAULT 'OFFLINE'
    CHECK (availability_status IN ('OFFLINE','ONLINE','ON_DELIVERY')),
  vehicle_type                TEXT NOT NULL
    CHECK (vehicle_type IN ('BICYCLE','MOTORCYCLE','CAR','VAN')),
  plate_number                TEXT NOT NULL DEFAULT '',
  vehicle_model               TEXT NOT NULL DEFAULT '',
  vehicle_color               TEXT NOT NULL DEFAULT '',
  emergency_contact_name      TEXT NOT NULL DEFAULT '',
  emergency_contact_phone     TEXT NOT NULL DEFAULT '',
  emergency_contact_relation  TEXT NOT NULL DEFAULT '',
  current_delivery_id         TEXT,
  last_online_at              TIMESTAMPTZ,
  last_offline_at             TIMESTAMPTZ,
  last_latitude               DOUBLE PRECISION,
  last_longitude              DOUBLE PRECISION,
  last_location_accuracy      DOUBLE PRECISION,
  last_location_at            TIMESTAMPTZ,
  rating_average              NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count                INTEGER NOT NULL DEFAULT 0,
  approved_at                 TIMESTAMPTZ,
  approved_by                 TEXT NOT NULL DEFAULT '',
  last_login_at               TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS riders_mobile_unique_idx
  ON riders (country_code, mobile_number);
CREATE UNIQUE INDEX IF NOT EXISTS riders_email_unique_idx
  ON riders (lower(email)) WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders (status);
CREATE INDEX IF NOT EXISTS idx_riders_availability ON riders (availability_status, status);

CREATE TABLE IF NOT EXISTS rider_documents (
  id              TEXT PRIMARY KEY,
  rider_id        TEXT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL
    CHECK (doc_type IN ('DRIVERS_LICENSE','VEHICLE_REGISTRATION','GOVERNMENT_ID','SELFIE','PROFILE_PHOTO')),
  storage_key     TEXT NOT NULL,
  content_type    TEXT NOT NULL DEFAULT '',
  byte_size       INTEGER NOT NULL DEFAULT 0,
  review_status   TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (review_status IN ('PENDING','APPROVED','REJECTED','SUPERSEDED')),
  review_note     TEXT NOT NULL DEFAULT '',
  reviewed_by     TEXT NOT NULL DEFAULT '',
  reviewed_at     TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_documents_rider ON rider_documents (rider_id, doc_type);

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id                        TEXT PRIMARY KEY,
  delivery_code             TEXT NOT NULL UNIQUE,
  order_group_id            TEXT NOT NULL,
  order_created_at_epoch_ms BIGINT NOT NULL DEFAULT 0,
  delivery_provider         TEXT NOT NULL DEFAULT 'SWITCH_RIDER',
  seller_admin_id           TEXT NOT NULL,
  buyer_account_id          TEXT NOT NULL,
  rider_id                  TEXT REFERENCES riders(id),
  batch_id                  TEXT,
  status                    TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN (
      'PREPARING','WAITING_FOR_RIDER','OFFERED','RIDER_ASSIGNED','RIDER_TO_PICKUP',
      'ARRIVED_AT_PICKUP','PICKED_UP','IN_TRANSIT','ARRIVED_AT_DROPOFF','DELIVERED',
      'FAILED_DELIVERY','RETURN_REQUIRED','RETURNING_TO_SELLER','RETURNED_TO_SELLER','CANCELLED'
    )),
  dispatch_mode             TEXT NOT NULL DEFAULT 'AUTO' CHECK (dispatch_mode IN ('AUTO','MANUAL')),
  dispatch_attempts         INTEGER NOT NULL DEFAULT 0,
  dispatch_stuck_notified   BOOLEAN NOT NULL DEFAULT FALSE,
  current_offer_id          TEXT,
  vehicle_type_required     TEXT NOT NULL DEFAULT 'MOTORCYCLE'
    CHECK (vehicle_type_required IN ('BICYCLE','MOTORCYCLE','CAR','VAN')),
  pickup_name               TEXT NOT NULL DEFAULT '',
  pickup_contact_phone      TEXT NOT NULL DEFAULT '',
  pickup_address            TEXT NOT NULL DEFAULT '',
  pickup_area               TEXT NOT NULL DEFAULT '',
  pickup_latitude           DOUBLE PRECISION NOT NULL,
  pickup_longitude          DOUBLE PRECISION NOT NULL,
  dropoff_name              TEXT NOT NULL DEFAULT '',
  dropoff_contact_phone     TEXT NOT NULL DEFAULT '',
  dropoff_address           TEXT NOT NULL DEFAULT '',
  dropoff_area              TEXT NOT NULL DEFAULT '',
  dropoff_latitude          DOUBLE PRECISION NOT NULL,
  dropoff_longitude         DOUBLE PRECISION NOT NULL,
  package_count             INTEGER NOT NULL DEFAULT 1,
  package_notes             TEXT NOT NULL DEFAULT '',
  distance_km               NUMERIC(8,2) NOT NULL DEFAULT 0,
  estimated_minutes         INTEGER NOT NULL DEFAULT 0,
  quoted_delivery_fee       NUMERIC(12,2) NOT NULL DEFAULT 0,
  customer_delivery_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_subsidy          NUMERIC(12,2) NOT NULL DEFAULT 0,
  rider_earning             NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_delivery_margin  NUMERIC(12,2) NOT NULL DEFAULT 0,
  pricing_snapshot          JSONB NOT NULL DEFAULT '{}'::jsonb,
  payment_method            TEXT NOT NULL DEFAULT 'PREPAID' CHECK (payment_method IN ('COD','PREPAID')),
  cod_amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
  cod_collected_amount      NUMERIC(12,2),
  cod_collected_at          TIMESTAMPTZ,
  pin_nonce                 TEXT NOT NULL,
  pickup_pin_attempts       INTEGER NOT NULL DEFAULT 0,
  delivery_pin_attempts     INTEGER NOT NULL DEFAULT 0,
  return_pin_attempts       INTEGER NOT NULL DEFAULT 0,
  delivery_confirmation_type TEXT CHECK (delivery_confirmation_type IN ('PIN','PHOTO')),
  delivery_pin_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  proof_of_delivery_id      TEXT,
  failure_reason            TEXT NOT NULL DEFAULT '',
  failure_note              TEXT NOT NULL DEFAULT '',
  cancelled_by              TEXT NOT NULL DEFAULT '',
  cancelled_by_role         TEXT NOT NULL DEFAULT '',
  cancellation_reason       TEXT NOT NULL DEFAULT '',
  cancellation_stage        TEXT NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at                  TIMESTAMPTZ,
  offered_at                TIMESTAMPTZ,
  accepted_at               TIMESTAMPTZ,
  to_pickup_at              TIMESTAMPTZ,
  arrived_pickup_at         TIMESTAMPTZ,
  picked_up_at              TIMESTAMPTZ,
  in_transit_at             TIMESTAMPTZ,
  arrived_dropoff_at        TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,
  failed_at                 TIMESTAMPTZ,
  return_started_at         TIMESTAMPTZ,
  returned_at               TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One live Switch Rider job per order group; a cancelled job can be re-created.
CREATE UNIQUE INDEX IF NOT EXISTS delivery_jobs_active_order_group_idx
  ON delivery_jobs (order_group_id) WHERE status <> 'CANCELLED';
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_rider ON delivery_jobs (rider_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_seller ON delivery_jobs (seller_admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_buyer ON delivery_jobs (buyer_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_offers (
  id              TEXT PRIMARY KEY,
  delivery_id     TEXT NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  rider_id        TEXT NOT NULL REFERENCES riders(id),
  status          TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN')),
  distance_to_pickup_km NUMERIC(8,2) NOT NULL DEFAULT 0,
  offered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  responded_at    TIMESTAMPTZ,
  decline_reason  TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_delivery_offers_rider ON delivery_offers (rider_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_delivery ON delivery_offers (delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_pending_expiry
  ON delivery_offers (expires_at) WHERE status = 'PENDING';
-- A rider can hold at most one pending offer at a time.
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_one_pending_per_rider_idx
  ON delivery_offers (rider_id) WHERE status = 'PENDING';
-- A job is offered to exactly one rider at a time.
CREATE UNIQUE INDEX IF NOT EXISTS delivery_offers_one_pending_per_delivery_idx
  ON delivery_offers (delivery_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS delivery_status_history (
  id            BIGSERIAL PRIMARY KEY,
  delivery_id   TEXT NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  from_status   TEXT NOT NULL DEFAULT '',
  to_status     TEXT NOT NULL,
  actor_type    TEXT NOT NULL,
  actor_id      TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery
  ON delivery_status_history (delivery_id, created_at);

CREATE TABLE IF NOT EXISTS rider_locations (
  id            BIGSERIAL PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  delivery_id   TEXT,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  accuracy_m    DOUBLE PRECISION NOT NULL DEFAULT 0,
  recorded_at   TIMESTAMPTZ NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_time
  ON rider_locations (rider_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS delivery_proofs (
  id            TEXT PRIMARY KEY,
  delivery_id   TEXT NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  order_group_id TEXT NOT NULL,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  proof_type    TEXT NOT NULL CHECK (proof_type IN ('DELIVERY','FAILED_ATTEMPT','INCIDENT')),
  storage_key   TEXT NOT NULL,
  content_type  TEXT NOT NULL DEFAULT '',
  byte_size     INTEGER NOT NULL DEFAULT 0,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_delivery ON delivery_proofs (delivery_id);

CREATE TABLE IF NOT EXISTS rider_earnings (
  id              TEXT PRIMARY KEY,
  rider_id        TEXT NOT NULL REFERENCES riders(id),
  delivery_id     TEXT NOT NULL REFERENCES delivery_jobs(id),
  base_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  distance_fee    NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus           NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip             NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  earning_type    TEXT NOT NULL DEFAULT 'DELIVERY' CHECK (earning_type IN ('DELIVERY','FAILED_ATTEMPT')),
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','AVAILABLE','PAID','VOID')),
  available_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  payout_id       TEXT,
  CONSTRAINT rider_earnings_one_per_delivery UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_rider_earnings_rider ON rider_earnings (rider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rider_earnings_release ON rider_earnings (available_at) WHERE status = 'PENDING';

-- Append-only earnings ledger. Balances are SUM(amount) per bucket, never overwritten.
CREATE TABLE IF NOT EXISTS rider_wallet_transactions (
  id            BIGSERIAL PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  bucket        TEXT NOT NULL CHECK (bucket IN ('PENDING','AVAILABLE','PAID')),
  amount        NUMERIC(12,2) NOT NULL,
  txn_type      TEXT NOT NULL
    CHECK (txn_type IN ('EARNING','RELEASE','PAYOUT','ADJUSTMENT','VOID')),
  delivery_id   TEXT,
  earning_id    TEXT,
  payout_id     TEXT,
  note          TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL DEFAULT 'system',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_wallet_txn_rider ON rider_wallet_transactions (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rider_payouts (
  id            TEXT PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method        TEXT NOT NULL CHECK (method IN ('GCASH','BANK_TRANSFER','MANUAL')),
  reference     TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_payouts_rider ON rider_payouts (rider_id, created_at DESC);

-- COD is a cash liability the rider holds for the platform, never an earning.
CREATE TABLE IF NOT EXISTS cod_transactions (
  id            TEXT PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  delivery_id   TEXT NOT NULL REFERENCES delivery_jobs(id),
  order_group_id TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status        TEXT NOT NULL DEFAULT 'PENDING_REMITTANCE'
    CHECK (status IN ('PENDING_REMITTANCE','REMITTED','VERIFIED')),
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remittance_id TEXT,
  CONSTRAINT cod_transactions_one_per_delivery UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_cod_transactions_rider ON cod_transactions (rider_id, status);

CREATE TABLE IF NOT EXISTS rider_remittances (
  id            TEXT PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method        TEXT NOT NULL CHECK (method IN ('GCASH','BANK_TRANSFER','CASH_AT_HUB')),
  reference     TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'REMITTED' CHECK (status IN ('REMITTED','VERIFIED','REJECTED')),
  submitted_by  TEXT NOT NULL,
  verified_by   TEXT NOT NULL DEFAULT '',
  verified_at   TIMESTAMPTZ,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_remittances_rider ON rider_remittances (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rider_ratings (
  id                TEXT PRIMARY KEY,
  delivery_id       TEXT NOT NULL UNIQUE REFERENCES delivery_jobs(id),
  rider_id          TEXT NOT NULL REFERENCES riders(id),
  buyer_account_id  TEXT NOT NULL,
  stars             INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment           TEXT NOT NULL DEFAULT '',
  flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_ratings_rider ON rider_ratings (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_incidents (
  id            TEXT PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id),
  delivery_id   TEXT REFERENCES delivery_jobs(id),
  category      TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  is_safety     BOOLEAN NOT NULL DEFAULT FALSE,
  status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED')),
  resolution    TEXT NOT NULL DEFAULT '',
  resolved_by   TEXT NOT NULL DEFAULT '',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_incidents_status ON delivery_incidents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_incidents_rider ON delivery_incidents (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rider_notifications (
  id            TEXT PRIMARY KEY,
  rider_id      TEXT NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  delivery_id   TEXT,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_notifications_rider ON rider_notifications (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS buyer_delivery_notifications (
  id                TEXT PRIMARY KEY,
  buyer_account_id  TEXT NOT NULL,
  delivery_id       TEXT REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  order_group_id    TEXT NOT NULL DEFAULT '',
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL DEFAULT '',
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_delivery_notifications_buyer
  ON buyer_delivery_notifications (buyer_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS switch_rider_audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_type    TEXT NOT NULL,
  actor_id      TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL,
  delivery_id   TEXT,
  rider_id      TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_switch_rider_audit_delivery ON switch_rider_audit_log (delivery_id, created_at);
CREATE INDEX IF NOT EXISTS idx_switch_rider_audit_rider ON switch_rider_audit_log (rider_id, created_at);

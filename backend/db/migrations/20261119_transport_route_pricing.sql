-- Route-based transport pricing (replaces USD price-per-day x days).
-- Additive only: new tables + nullable/defaulted columns. Existing bookings
-- keep their transport_days and stored amounts. Safe to re-run.
--
-- Route/place data is loaded separately and idempotently with:
--   python -m app.seed_transport

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin-editable pricing inputs (single row).
CREATE TABLE IF NOT EXISTS transport_pricing_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fuel_price_kes numeric(10,2) NOT NULL CHECK (fuel_price_kes > 0),
  margin_kes numeric(12,2) NOT NULL DEFAULT 0 CHECK (margin_kes >= 0),
  multiplier numeric(5,4) NOT NULL CHECK (multiplier > 0 AND multiplier <= 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Defaults from UHAMBO TRANSPORT PRICE CHART.xlsx (fuel 217, margin 0, x0.9).
INSERT INTO transport_pricing_settings (id, fuel_price_kes, margin_kes, multiplier)
VALUES (1, 217, 0, 0.9)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS transport_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transport_places_name_key
  ON transport_places (lower(btrim(name)));

-- One row per unordered pair of places; looked up in either direction.
CREATE TABLE IF NOT EXISTS transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_a_id uuid NOT NULL REFERENCES transport_places(id) ON DELETE CASCADE,
  place_b_id uuid NOT NULL REFERENCES transport_places(id) ON DELETE CASCADE,
  distance_km numeric(7,1) NOT NULL CHECK (distance_km > 0),
  -- Routes needing review cannot be quoted or paid for publicly.
  needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (place_a_id <> place_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS transport_routes_pair_key
  ON transport_routes (LEAST(place_a_id, place_b_id), GREATEST(place_a_id, place_b_id));
CREATE INDEX IF NOT EXISTS idx_transport_routes_place_b ON transport_routes (place_b_id);

-- Per-vehicle fuel consumption. NULL = vehicle cannot be quoted yet.
-- price_per_day is kept (no longer used for pricing).
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS km_per_litre numeric(5,2)
    CHECK (km_per_litre IS NULL OR km_per_litre > 0);

-- Booking trip type, priced-quote snapshot and quote requests.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS trip_type text
    CHECK (trip_type IS NULL OR trip_type IN ('one_way', 'return')),
  ADD COLUMN IF NOT EXISTS transport_quote jsonb,
  ADD COLUMN IF NOT EXISTS quote_requested boolean NOT NULL DEFAULT false;

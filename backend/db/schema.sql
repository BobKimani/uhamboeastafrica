CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  destination text NOT NULL,
  price_per_night numeric(12,2) NOT NULL CHECK (price_per_night >= 0),
  rating numeric(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  image text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  top_rated boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  rates jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL,
  capacity integer NOT NULL CHECK (capacity >= 1),
  price_per_day numeric(12,2) NOT NULL CHECK (price_per_day >= 0),
  best_for text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  image text NOT NULL,
  region text NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  destination text NOT NULL,
  travel_start_date date NOT NULL,
  travel_end_date date NOT NULL,
  travelling_with text NOT NULL CHECK (travelling_with IN ('solo', 'couple', 'family', 'group')),
  booking_type text NOT NULL CHECK (booking_type IN ('accommodation', 'transport', 'both')),
  number_of_travellers integer NOT NULL CHECK (number_of_travellers >= 1),
  number_of_rooms integer NOT NULL CHECK (number_of_rooms >= 0),
  transport_from text,
  transport_to text,
  transport_days integer CHECK (transport_days IS NULL OR transport_days BETWEEN 1 AND 365),
  vehicle_type text,
  selected_hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  selected_vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'confirmed', 'cancelled', 'completed')),
  payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'unpaid', 'pending', 'paid', 'failed')),
  amount_usd numeric(12,2),
  amount_kes integer CHECK (amount_kes IS NULL OR amount_kes >= 0),
  transport_amount_kes integer CHECK (transport_amount_kes IS NULL OR transport_amount_kes >= 0),
  exchange_rate numeric(12,6),
  currency_source text,
  rate_locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (travel_end_date >= travel_start_date)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid,
  payment_reference text UNIQUE,
  invoice_number text UNIQUE,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  phone_number text,
  account_number text NOT NULL,
  provider text NOT NULL DEFAULT 'kcb',
  provider_reference text,
  status text NOT NULL DEFAULT 'queried' CHECK (status IN ('queried', 'pending', 'paid', 'failed', 'not_found')),
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  currency text,
  paid_at timestamptz,
  queried_at timestamptz NOT NULL DEFAULT now(),
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  contact text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotels_destination ON hotels(destination);
CREATE INDEX IF NOT EXISTS idx_hotels_is_available ON hotels(is_available);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_capacity ON vehicles(capacity);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_selected_hotel_id ON bookings(selected_hotel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_selected_vehicle_id ON bookings(selected_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payments_account_number ON payments(account_number);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_request_id ON payments(merchant_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_queried_at ON payments(queried_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

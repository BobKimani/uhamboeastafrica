ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS merchant_request_id text,
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS mpesa_receipt_number text,
  ADD COLUMN IF NOT EXISTS phone_number text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_payment_reference
  ON payments(payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_invoice_number
  ON payments(invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON payments(booking_id);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_request_id
  ON payments(merchant_request_id);

CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id
  ON payments(checkout_request_id);

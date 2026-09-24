ALTER TABLE bookings
  DROP COLUMN IF EXISTS minimum_budget,
  DROP COLUMN IF EXISTS maximum_budget;

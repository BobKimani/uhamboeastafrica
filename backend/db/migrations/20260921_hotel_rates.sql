-- Stores each hotel's contract rates so the planner can price stays by month.
-- Shape: {"KES"|"USD": {"sharing"|"single"|"triple": {"monthly": [12 numbers|null], "festive": number|null}}}
-- "sharing" is per person sharing, "single" is per single room, "triple" is per person in a triple.
-- "festive" applies to nights from 22 Dec to 2 Jan.

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS rates jsonb;

CREATE INDEX IF NOT EXISTS idx_hotels_country ON hotels(country);

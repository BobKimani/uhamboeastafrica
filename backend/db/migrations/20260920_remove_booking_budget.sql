-- Removes the budget range from bookings.
-- The planner no longer asks for a budget; trip cost is derived from the
-- selected hotel's nightly rate and the vehicle's daily rate.
-- Dropping the columns also drops the CHECK constraints that referenced them
-- (minimum_budget >= 0, maximum_budget >= 0, maximum_budget >= minimum_budget).

ALTER TABLE bookings
  DROP COLUMN IF EXISTS minimum_budget,
  DROP COLUMN IF EXISTS maximum_budget;

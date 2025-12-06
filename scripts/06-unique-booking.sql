-- 06-unique-booking.sql
-- Purpose: remove duplicate booking rows for the same slot and add a unique index
-- Strategy:
-- 1) For duplicate (garage_id, customer_id, car_id, booking_date, start_time) groups,
--    keep a single row. Prefer rows with payment_status = 'paid'. If none are paid,
--    keep the row with the smallest id.
-- 2) Create a unique index on the five columns to prevent future duplicates.

BEGIN;

-- Step 1: delete duplicate rows, keeping one per group (prefer paid)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY garage_id, customer_id, car_id, booking_date, start_time
      ORDER BY (payment_status = 'paid') DESC, id ASC
    ) AS rn
  FROM bookings
)
DELETE FROM bookings
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 2: create a unique index to enforce the constraint
-- Use IF NOT EXISTS so the script is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_booking_slot
ON bookings (garage_id, customer_id, car_id, booking_date, start_time);

COMMIT;

-- Notes:
-- - Run this migration against your Postgres/Supabase database. If duplicates exist,
--   the deletion step will keep a single record per slot (paid preferred).
-- - After this, you can safely use UPSERT (ON CONFLICT) against this unique index.
-- - If you prefer an ALTER TABLE ADD CONSTRAINT instead of creating an index, that
--   can be added later, but a unique index enforces the same uniqueness property.

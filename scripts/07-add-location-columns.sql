-- 07-add-location-columns.sql
-- Add latitude/longitude and address columns to customers and garages if missing
-- Safe to run multiple times (uses IF NOT EXISTS)

BEGIN;

-- Customers
ALTER TABLE IF EXISTS customers
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text;

-- Garages
ALTER TABLE IF EXISTS garages
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text;

-- Optional: create index on location columns to speed up queries (useful for distance queries)
-- Note: creating a btree on floats is fine; for geospatial queries consider PostGIS instead.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_customers_lat_lng'
  ) THEN
    CREATE INDEX idx_customers_lat_lng ON customers (latitude, longitude);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_garages_lat_lng'
  ) THEN
    CREATE INDEX idx_garages_lat_lng ON garages (latitude, longitude);
  END IF;
END$$;

COMMIT;

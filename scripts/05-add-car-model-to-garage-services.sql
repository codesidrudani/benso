-- Add car_model column to garage_services table
ALTER TABLE garage_services
ADD COLUMN IF NOT EXISTS car_model TEXT;

-- Update existing records to have NULL car_model (they were brand-only)
-- This is safe since existing records only had brands

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_garage_services_car_model ON garage_services(car_model);
CREATE INDEX IF NOT EXISTS idx_garage_services_brand_model ON garage_services(car_brand, car_model);


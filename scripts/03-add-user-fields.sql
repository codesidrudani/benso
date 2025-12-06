-- Add address column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Add constraint and index for registration_number validation
ALTER TABLE customer_cars ADD CONSTRAINT check_registration_format 
  CHECK (registration_number ~ '^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$');

CREATE INDEX idx_customer_cars_registration ON customer_cars(registration_number);

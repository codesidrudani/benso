-- Add pickup_arrived column to bookings table
ALTER TABLE bookings ADD COLUMN pickup_arrived BOOLEAN DEFAULT FALSE;
-- Add pickup_arrived_at timestamp column to bookings table
ALTER TABLE bookings ADD COLUMN pickup_arrived_at TIMESTAMP;
-- Add pickup_otp column to bookings table
ALTER TABLE bookings ADD COLUMN pickup_otp VARCHAR(10);
-- Add delivery_otp column to bookings table for delivery validation
ALTER TABLE bookings ADD COLUMN delivery_otp VARCHAR(10);
-- Optionally, add pickup_pending column if needed for timeline status
-- ALTER TABLE bookings ADD COLUMN pickup_pending BOOLEAN DEFAULT TRUE;
-- Update bookings table to support new booking flow
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS request_type TEXT CHECK (request_type IN ('walk_in', 'pickup')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS inspection_done BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS additional_services JSONB,
ADD COLUMN IF NOT EXISTS additional_services_status TEXT CHECK (additional_services_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS vehicle_ready BOOLEAN DEFAULT FALSE;

-- Update status enum to include new statuses
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'rejected', 'inspection_pending', 'inspection_done', 'service_pending', 'additional_services_pending', 'additional_services_accepted', 'additional_services_rejected', 'ready_for_pickup', 'completed', 'cancelled'));

-- Update default status
ALTER TABLE bookings
ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_request_type ON bookings(request_type);


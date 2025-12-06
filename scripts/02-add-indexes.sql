-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_garages_user_id ON garages(user_id);
CREATE INDEX IF NOT EXISTS idx_garages_location ON garages(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_garage_services_garage_id ON garage_services(garage_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_cars_customer_id ON customer_cars(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_garage_id ON bookings(garage_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

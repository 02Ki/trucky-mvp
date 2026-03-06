/* =========================================
    TRUCKY DATABASE SCHEMA
    ========================================= */

/* Enable UUID extension */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* =========================================
    PROFILES TABLE
    ========================================= */

CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phone TEXT,
    email TEXT,
    driving_license TEXT,
    company_name TEXT,
    gst_number TEXT,
    company_address TEXT,
    phone_number TEXT
);

/* =========================================
    BOOKINGS TABLE
    ========================================= */

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT,
    from_city TEXT,
    to_city TEXT,
    load TEXT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID,
    driver_id UUID,
    pickup_location TEXT,
    drop_location TEXT,
    driver_lat FLOAT,
    driver_lng FLOAT,

    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES profiles(id),

    CONSTRAINT fk_driver
        FOREIGN KEY(driver_id)
        REFERENCES profiles(id)
);

/* =========================================
    DRIVER LOCATIONS TABLE
    ========================================= */

CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID,
    booking_id UUID,
    latitude FLOAT,
    longitude FLOAT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_location
        FOREIGN KEY(driver_id)
        REFERENCES profiles(id),

    CONSTRAINT fk_booking_location
        FOREIGN KEY(booking_id)
        REFERENCES bookings(id)
);

/* =========================================
    OWNERS TABLE
    ========================================= */

CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    gst_number TEXT,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    total_trucks INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* =========================================
    TRUCKS TABLE
    ========================================= */

CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID,
    truck_number TEXT,
    model TEXT,
    capacity TEXT,
    driver_id UUID,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_trucks INT,
    current_location_lat FLOAT,
    current_location_lon FLOAT,

    CONSTRAINT fk_owner
        FOREIGN KEY(owner_id)
        REFERENCES owners(id),

    CONSTRAINT fk_driver
        FOREIGN KEY(driver_id)
        REFERENCES profiles(id)
);

/* =========================================
    TRUCK EARNINGS TABLE
    ========================================= */

CREATE TABLE truck_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID,
    booking_id UUID,
    amount NUMERIC,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_truck
        FOREIGN KEY(truck_id)
        REFERENCES trucks(id),

    CONSTRAINT fk_booking
        FOREIGN KEY(booking_id)
        REFERENCES bookings(id)
);

/* =========================================
    INDEXES FOR PERFORMANCE
    ========================================= */

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX idx_trucks_owner ON trucks(owner_id);
CREATE INDEX idx_truck_earnings_truck ON truck_earnings(truck_id);

/* =========================================
    SAMPLE DATA INSERTS
    ========================================= */

-- Insert sample profiles
INSERT INTO profiles (id, full_name, role, phone, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'John Owner', 'owner', '111-222-3333', 'john@example.com'),
('550e8400-e29b-41d4-a716-446655440001', 'Driver One', 'driver', '123-456-7890', 'driver1@example.com'),
('550e8400-e29b-41d4-a716-446655440002', 'Driver Two', 'driver', '098-765-4321', 'driver2@example.com');

-- Insert sample owners
INSERT INTO owners (id, company_name, gst_number, owner_name, phone, address, total_trucks) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'Trucky Logistics', 'GST123456', 'John Owner', '111-222-3333', '123 Main St, City', 2);

-- Insert sample trucks
INSERT INTO trucks (id, owner_id, truck_number, model, capacity, status) VALUES
('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'TRK001', 'Volvo FH', '20 tons', 'available'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'TRK002', 'Scania R', '25 tons', 'in transit');

-- Insert sample bookings
INSERT INTO bookings (id, customer_name, from_city, to_city, load, status, user_id, driver_id) VALUES
('880e8400-e29b-41d4-a716-446655440000', 'Customer A', 'New York', 'Los Angeles', 'Electronics', 'Pending', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
('880e8400-e29b-41d4-a716-446655440001', 'Customer B', 'Chicago', 'Houston', 'Machinery', 'In Transit', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002');

-- Insert sample driver locations
INSERT INTO driver_locations (id, driver_id, booking_id, latitude, longitude) VALUES
('990e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440000', 40.7128, -74.0060),
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 34.0522, -118.2437);

-- Insert sample truck earnings
INSERT INTO truck_earnings (id, truck_id, booking_id, amount, description) VALUES
('aa0e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 500, 'Delivery fee'),
('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001', 300, 'Additional charges'),
('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 700, 'Long distance delivery');

/* =========================================
    END OF SCHEMA
    ========================================= */
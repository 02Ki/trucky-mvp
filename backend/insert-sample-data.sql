/* =========================================
    SAMPLE DATA INSERTS ONLY
    (Run this in Supabase if tables already exist)
    ========================================= */

-- Clear existing data (optional - comment out if you want to keep data)
-- DELETE FROM truck_earnings;
-- DELETE FROM driver_locations;
-- DELETE FROM bookings;
-- DELETE FROM trucks;
-- DELETE FROM owners;
-- DELETE FROM profiles;

-- Insert sample profiles
INSERT INTO profiles (id, full_name, role, phone, email) VALUES
(gen_random_uuid(), 'John Owner', 'owner', '111-222-3333', 'john@example.com'),
(gen_random_uuid(), 'Driver One', 'driver', '123-456-7890', 'driver1@example.com'),
(gen_random_uuid(), 'Driver Two', 'driver', '098-765-4321', 'driver2@example.com')
ON CONFLICT DO NOTHING;

-- Get the profile IDs (adjust these based on actual IDs in your database)
-- For now, using hardcoded UUIDs - you may need to adjust based on your actual data

-- Insert sample owners
INSERT INTO owners (id, company_name, gst_number, owner_name, phone, address, total_trucks) VALUES
(gen_random_uuid(), 'Trucky Logistics', 'GST123456', 'John Owner', '111-222-3333', '123 Main St, City', 2)
ON CONFLICT DO NOTHING;

-- Insert sample trucks (adjust owner_id if needed)
INSERT INTO trucks (id, owner_id, truck_number, model, capacity, status) VALUES
(gen_random_uuid(), (SELECT id FROM owners LIMIT 1), 'TRK001', 'Volvo FH', '20 tons', 'available'),
(gen_random_uuid(), (SELECT id FROM owners LIMIT 1), 'TRK002', 'Scania R', '25 tons', 'in transit')
ON CONFLICT DO NOTHING;

-- Insert sample driver locations (this can work with auto-generated IDs)
INSERT INTO driver_locations (id, driver_id, latitude, longitude) VALUES
(gen_random_uuid(), (SELECT id FROM profiles WHERE role = 'driver' LIMIT 1), 40.7128, -74.0060),
(gen_random_uuid(), (SELECT id FROM profiles WHERE role = 'driver' LIMIT 1 OFFSET 1), 34.0522, -118.2437)
ON CONFLICT DO NOTHING;

/* =========================================
    END OF INSERT SCRIPT
    ========================================= */

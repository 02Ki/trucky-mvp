const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Root route (test)
app.get("/", (req, res) => {
  res.send("Trucky backend running 🚛");
});

// ✅ GET all users (from profiles table)
app.get("/users", async (req, res) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST to add a user
app.post("/users", async (req, res) => {
  const { full_name, role, phone, email } = req.body;
  if (!full_name || !role) {
    return res.status(400).json({ message: "Name and role are required" });
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert([{ full_name, role, phone, email }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    console.log("🆕 New user added:", data[0]);
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Owner Dashboard Routes

// GET owner by ID
app.get("/owners/:id", async (req, res) => {
  const ownerId = req.params.id;
  try {
    const { data, error } = await supabase
      .from("owners")
      .select("*")
      .eq("id", ownerId)
      .single();
    if (error) return res.status(404).json({ message: "Owner not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET trucks for owner
app.get("/owners/:id/trucks", async (req, res) => {
  const ownerId = req.params.id;
  try {
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("owner_id", ownerId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add truck for owner
app.post("/owners/:id/trucks", async (req, res) => {
  const ownerId = req.params.id;
  const { truck_number, model, capacity } = req.body;
  if (!truck_number || !model || !capacity) {
    return res.status(400).json({ message: "Truck number, model, and capacity are required" });
  }
  try {
    const { data, error } = await supabase
      .from("trucks")
      .insert([{
        owner_id: ownerId,
        truck_number,
        model,
        capacity,
        status: "available"
      }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    console.log("🆕 New truck added:", data[0]);
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE truck
app.delete("/trucks/:id", async (req, res) => {
  const truckId = req.params.id;
  try {
    const { error } = await supabase
      .from("trucks")
      .delete()
      .eq("id", truckId);
    if (error) return res.status(404).json({ message: "Truck not found" });
    console.log("🗑️ Truck deleted:", truckId);
    res.json({ message: "Truck deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET earnings for owner
app.get("/owners/:id/earnings", async (req, res) => {
  const ownerId = req.params.id;
  try {
    // Get trucks for owner
    const { data: ownerTrucks, error: truckErr } = await supabase
      .from("trucks")
      .select("id")
      .eq("owner_id", ownerId);
    
    if (truckErr) return res.status(400).json({ error: truckErr.message });
    
    const truckIds = ownerTrucks.map(t => t.id);
    
    // Get earnings for those trucks
    const { data: earnings, error: earnErr } = await supabase
      .from("truck_earnings")
      .select("truck_id, amount")
      .in("truck_id", truckIds);
    
    if (earnErr && earnErr.code !== 'PGRST116') {
      return res.status(400).json({ error: earnErr.message });
    }
    
    const earningsData = earnings || [];
    const total = earningsData.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const byTruck = {};
    earningsData.forEach(e => {
      byTruck[e.truck_id] = (byTruck[e.truck_id] || 0) + (Number(e.amount) || 0);
    });
    
    res.json({ total, byTruck });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET driver locations
app.get("/driver-locations", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("driver_locations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profiles Routes

// GET all profiles
app.get("/profiles", async (req, res) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET profile by ID
app.get("/profiles/:id", async (req, res) => {
  const profileId = req.params.id;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();
    if (error) return res.status(404).json({ message: "Profile not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings Routes

// GET all bookings
app.get("/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase.from("bookings").select("*");
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings for driver
app.get("/drivers/:id/bookings", async (req, res) => {
  const driverId = req.params.id;
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("driver_id", driverId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings for owner
app.get("/owners/:id/bookings", async (req, res) => {
  const ownerId = req.params.id;
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", ownerId);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create booking
app.post("/bookings", async (req, res) => {
  const { customer_name, from_city, to_city, load, user_id, driver_id } = req.body;
  if (!from_city || !to_city || !load || !user_id || !driver_id) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert([{
        customer_name,
        from_city,
        to_city,
        load,
        status: "Pending",
        user_id,
        driver_id
      }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    console.log("🆕 New booking created:", data[0]);
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update booking status
app.put("/bookings/:id", async (req, res) => {
  const bookingId = req.params.id;
  const { status } = req.body;
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .select();
    if (error) return res.status(404).json({ message: "Booking not found" });
    console.log("📝 Booking updated:", data[0]);
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET booking with details (simulated view)
app.get("/booking_with_details", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, profiles!user_id(full_name, phone, email), profiles!driver_id(full_name, phone, email)");
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} with Supabase`);
});
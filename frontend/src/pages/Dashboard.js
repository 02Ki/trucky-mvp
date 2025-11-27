// src/pages/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/Dashboard.css";
import OwnerDashboard from "./OwnerDashboard";
import L from "leaflet";

// Fix Leaflet marker icons for various bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function Dashboard() {
  // core state (kept your existing variables)
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // will hold profile OR synthesized owner object
  const [bookings, setBookings] = useState([]);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [load, setLoad] = useState("");
  const [loading, setLoading] = useState(true);

  // new states (search/filter/map toggle + driver locations)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAllMap, setShowAllMap] = useState(false);
  const [driverLocations, setDriverLocations] = useState([]); // from driver_locations table

  // ---------- get current user ----------
  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);
      } catch (err) {
        console.error("getUser error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, []);

  // ---------- fetch profile OR owner ----------
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function fetchProfileOrOwner() {
      try {
        // Try profiles table first (customers & drivers)
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profErr && profErr.code !== "PGRST116") {
          // log non-not-found errors (PGRST116 may be "No rows" depending on PG client)
          console.warn("profiles fetch warning:", profErr.message || profErr);
        }

        if (profData) {
          if (mounted) setProfile(profData);
          return;
        }

        // If not found in profiles, check owners table
        // If found in owners table
const { data: ownerData, error: ownerErr } = await supabase
  .from("owners")
  .select("*")
  .eq("id", user.id)
  .single();

if (ownerErr && ownerErr.code !== "PGRST116") {
  console.warn("owners fetch warning:", ownerErr.message || ownerErr);
}

if (ownerData) {
  const ownerProfile = {
    ...ownerData,
    role: "Owner",
    total_trucks: ownerData.total_trucks || 0,  // <-- FIX HERE
  };

  if (mounted) setProfile(ownerProfile);
  return;
}


        // If neither found, set profile null (user exists but no profile/owner record)
        if (mounted) setProfile(null);
      } catch (err) {
        console.error("fetchProfileOrOwner error:", err);
        if (mounted) setProfile(null);
      }
    }

    fetchProfileOrOwner();
    return () => {
      mounted = false;
    };
  }, [user]);

  // ---------- fetch bookings (unchanged logic, uses booking_with_details view) ----------
  const fetchBookings = useCallback(async () => {
    if (!profile) return;

    try {
      let query = supabase.from("booking_with_details").select("*");

      if (profile.role === "Customer") {
        query = query.eq("customer_id", user.id);
      } else if (profile.role === "Driver") {
        query = query.or(`status.eq.Pending,driver_id.eq.${user.id}`);
      } else {
        // owners don't use bookings list here (Owner has separate dashboard)
        return;
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error.message);
      } else {
        setBookings(data || []);
      }
    } catch (err) {
      console.error("fetchBookings error:", err);
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile) fetchBookings();
  }, [profile, fetchBookings]);

  // realtime subscription for bookings (keeps your existing realtime)
  useEffect(() => {
    if (!profile) return;
    // only subscribe if user role is Customer or Driver
    if (profile.role !== "Customer" && profile.role !== "Driver") return;

    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () =>
        fetchBookings()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile, fetchBookings]);

  // ---------- Driver locations: fetch & realtime ----------
  const fetchDriverLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("driver_locations")
        .select("id, driver_id, latitude, longitude, updated_at, profiles(full_name, phone)")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching driver locations:", error.message);
      } else {
        setDriverLocations(data || []);
      }
    } catch (err) {
      console.error("fetchDriverLocations error:", err);
    }
  }, []);

  useEffect(() => {
    // initial fetch
    fetchDriverLocations();

    // realtime for driver_locations
    const channel = supabase
      .channel("driver-locations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        () => fetchDriverLocations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchDriverLocations]);

  // ---------- if logged-in user is a driver -> auto-update their location ----------
  useEffect(() => {
    if (!profile || profile.role !== "Driver") return;

    let cancelled = false;
    async function updateDriverLocationOnce() {
      if (!navigator.geolocation) return console.warn("Geolocation not available");
      navigator.geolocation.getCurrentPosition(async (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        try {
          const { error } = await supabase
            .from("driver_locations")
            .upsert(
              {
                driver_id: user.id,
                latitude,
                longitude,
                updated_at: new Date().toISOString(),
              },
              { onConflict: ["driver_id"] }
            );
          if (error) console.error("Driver location upsert error:", error.message);
        } catch (err) {
          console.error("updateDriverLocationOnce error:", err);
        }
      }, (err) => {
        console.warn("Geolocation error:", err.message);
      });
    }

    // run immediately and then every 30s
    updateDriverLocationOnce();
    const interval = setInterval(updateDriverLocationOnce, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile, user]);

  // ---------- create booking (Customer) ----------
  async function createBooking(e) {
    e.preventDefault();
    if (!profile || profile.role !== "Customer") return alert("Only customers can create bookings.");

    const { error } = await supabase.from("bookings").insert([
      {
        user_id: user.id,
        from_city: fromCity,
        to_city: toCity,
        load,
        status: "Pending",
      },
    ]);

    if (error) alert("❌ " + error.message);
    else {
      alert("✅ Booking created!");
      setFromCity("");
      setToCity("");
      setLoad("");
      fetchBookings();
    }
  }

  // ---------- accept & complete booking ----------
  async function acceptBooking(id) {
    const { error } = await supabase
      .from("bookings")
      .update({ driver_id: user.id, status: "Accepted" })
      .eq("id", id);

    if (error) alert("❌ " + error.message);
    else fetchBookings();
  }

  async function completeBooking(id) {
    const { error } = await supabase.from("bookings").update({ status: "Completed" }).eq("id", id);
    if (error) alert("❌ " + error.message);
    else fetchBookings();
  }

  // ---------- contact helpers ----------
  const handleCall = (num) => {
    if (!num) return alert("No contact number available");
    window.open(`tel:${num}`, "_self");
  };
  const handleWhatsApp = (num, name) => {
    if (!num) return alert("No contact number available");
    const msg = encodeURIComponent(`Hello ${name}, this is from Trucky 🚛`);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  // ---------- geocoding helper ----------
  async function getCoordinates(city) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  }

  // utility: find driver location item by driver_id
  function findDriverLocById(driverId) {
    if (!driverId) return null;
    return driverLocations.find((d) => String(d.driver_id) === String(driverId)) || null;
  }

  // ---------- UI states ----------
  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in</p>;
  if (!profile) return <p>Loading profile...</p>;

  // If user is owner, redirect to owner dashboard component
  if (profile.role === "Owner") {
    // pass owner object so OwnerDashboard doesn't re-query owners if you prefer that
    return <OwnerDashboard owner={profile} />;
  }

  // ---------- filtered bookings (same logic) ----------
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.from_city || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.to_city || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.load || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "Pending").length;
  const accepted = bookings.filter((b) => b.status === "Accepted").length;
  const completed = bookings.filter((b) => b.status === "Completed").length;

  return (
    <div style={{ padding: "20px" }}>
      <h2>🚛 Trucky Dashboard</h2>
      <p>
        Welcome, <b>{profile.full_name}</b> ({profile.role})
      </p>

      {/* Analytics */}
      <div style={{ marginTop: "15px", marginBottom: "20px" }}>
        <b>📊 Summary:</b>
        <p>
          Total: {total} | Pending: {pending} | Accepted: {accepted} | Completed: {completed}
        </p>
      </div>

      {/* Search & filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search city or load..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Accepted">Accepted</option>
          <option value="Completed">Completed</option>
        </select>
        <button onClick={() => setShowAllMap(!showAllMap)}>
          {showAllMap ? "🗺️ Hide All Map" : "🌍 Show All Map"}
        </button>
      </div>

      {/* Customer booking form (unchanged) */}
      {profile.role === "Customer" && (
        <form
          onSubmit={createBooking}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            maxWidth: "400px",
            marginTop: "20px",
          }}
        >
          <input
            type="text"
            placeholder="From City"
            value={fromCity}
            onChange={(e) => setFromCity(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="To City"
            value={toCity}
            onChange={(e) => setToCity(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Goods / Load Description"
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            required
          />
          <button type="submit">Create Booking</button>
        </form>
      )}

      {/* Show all drivers on a single map when toggled */}
      {showAllMap && driverLocations.length > 0 && (
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={4}
          style={{ height: "350px", width: "100%", marginTop: "20px" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {driverLocations.map((d) => (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
            >
              <Popup>
                🚚 <b>{d.profiles?.full_name || "Driver"}</b>
                <br />
                📍 {Number(d.latitude).toFixed(4)}, {Number(d.longitude).toFixed(4)}
                <br />
                ⏱ {new Date(d.updated_at).toLocaleString()}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {/* Bookings list (unchanged UI & per-booking maps) */}
      <h3 style={{ marginTop: "40px" }}>📦 Bookings</h3>
      {filteredBookings.length === 0 && <p>No bookings found.</p>}

      {filteredBookings.map((b, i) => {
        const driverLoc = findDriverLocById(b.driver_id);

        return (
          <div
            key={b.id || i}
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "20px",
              backgroundColor:
                b.status === "Completed" ? "#e0ffe0" : b.status === "Accepted" ? "#fff7cc" : "#ffeaea",
            }}
          >
            <b>
              {b.from_city} ➡ {b.to_city}
            </b>
            <br />
            🏷️ Load: {b.load}
            <br />
            🕒 Status: <b>{b.status}</b>
            <br />

            {/* Customer details for driver */}
            {profile.role === "Driver" && b.status === "Accepted" && b.customer_full_name && (
              <div style={{ marginTop: "8px" }}>
                👤 <b>Customer:</b> {b.customer_full_name} ({b.customer_contact})
                <br />
                <button onClick={() => handleCall(b.customer_contact)}>📞 Call</button>{" "}
                <button onClick={() => handleWhatsApp(b.customer_contact, b.customer_full_name)}>💬 WhatsApp</button>
              </div>
            )}

            {/* Driver details for customer */}
            {profile.role === "Customer" && b.status === "Accepted" && b.driver_full_name && (
              <div style={{ marginTop: "8px" }}>
                🚚 <b>Driver:</b> {b.driver_full_name} ({b.driver_contact})
                <br />
                🪪 License: {b.license_number}
                <br />
                🚛 Vehicle: {b.vehicle_number} ({b.vehicle_capacity} tons)
                <br />
                <button onClick={() => handleCall(b.driver_contact)}>📞 Call</button>{" "}
                <button onClick={() => handleWhatsApp(b.driver_contact, b.driver_full_name)}>💬 WhatsApp</button>
              </div>
            )}

            {/* Per-booking map */}
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: "250px", width: "100%", marginTop: "10px" }}
              whenCreated={async (map) => {
                const fromCoords = await getCoordinates(b.from_city);
                const toCoords = await getCoordinates(b.to_city);

                if (fromCoords) L.marker(fromCoords).addTo(map).bindPopup(`📍 From: ${b.from_city}`);
                if (toCoords) L.marker(toCoords).addTo(map).bindPopup(`🏁 To: ${b.to_city}`);

                if (fromCoords && toCoords) {
                  const group = L.featureGroup([L.marker(fromCoords), L.marker(toCoords)]);
                  map.fitBounds(group.getBounds(), { padding: [50, 50] });
                }
              }}
            >
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* Live driver marker: react-leaflet Marker updates when driverLocations changes */}
              {b.status === "Accepted" && driverLoc && driverLoc.latitude && driverLoc.longitude && (
                <Marker position={[driverLoc.latitude, driverLoc.longitude]}>
                  <Popup>
                    🚚 <b>{driverLoc.profiles?.full_name || "Driver"}</b>
                    <br />
                    ⏱ {new Date(driverLoc.updated_at).toLocaleString()}
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Actions */}
            <div style={{ marginTop: "10px" }}>
              {profile.role === "Driver" && b.status === "Pending" && (
                <button onClick={() => acceptBooking(b.id)}>✅ Accept Booking</button>
              )}
              {profile.role === "Driver" && b.status === "Accepted" && (
                <button onClick={() => completeBooking(b.id)}>🏁 Mark Completed</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;

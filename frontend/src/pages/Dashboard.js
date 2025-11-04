import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ✅ Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [load, setLoad] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 New states for filtering/search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAllMap, setShowAllMap] = useState(false);

  // 🔹 Get current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    }
    getUser();
  }, []);

  // 🔹 Fetch profile
  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) console.error("Profile error:", error.message);
      else setProfile(data);
    }
    fetchProfile();
  }, [user]);

  // 🔹 Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!profile) return;

    let query = supabase.from("booking_with_details").select("*");

    if (profile.role === "Customer") {
      query = query.eq("customer_id", user.id);
    } else if (profile.role === "Driver") {
      query = query.or(`status.eq.Pending,driver_id.eq.${user.id}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) console.error("Error fetching bookings:", error.message);
    else setBookings(data || []);
  }, [profile, user]);

  useEffect(() => {
    if (profile) fetchBookings();
  }, [profile, fetchBookings]);

  // 🔄 Real-time updates
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile, fetchBookings]);

  // 🧾 Create booking
  async function createBooking(e) {
    e.preventDefault();
    if (profile.role !== "Customer") return alert("Only customers can create bookings.");

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

  // 🚚 Accept booking
  async function acceptBooking(id) {
    const { error } = await supabase
      .from("bookings")
      .update({ driver_id: user.id, status: "Accepted" })
      .eq("id", id);

    if (error) alert("❌ " + error.message);
    else fetchBookings();
  }

  // ✅ Mark completed
  async function completeBooking(id) {
    const { error } = await supabase.from("bookings").update({ status: "Completed" }).eq("id", id);
    if (error) alert("❌ " + error.message);
    else fetchBookings();
  }

  // 📞 Contact helpers
  const handleCall = (num) => window.open(`tel:${num}`, "_self");
  const handleWhatsApp = (num, name) => {
    const msg = encodeURIComponent(`Hello ${name}, this is from Trucky 🚛`);
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  // 🗺️ Get city coordinates (OpenStreetMap API)
  async function getCoordinates(city) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
      const data = await res.json();
      if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in</p>;
  if (!profile) return <p>Loading profile...</p>;

  // 🔹 Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.from_city.toLowerCase().includes(search.toLowerCase()) ||
      b.to_city.toLowerCase().includes(search.toLowerCase()) ||
      b.load.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 🔹 Analytics summary
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

      {/* 🔹 Analytics */}
      <div style={{ marginTop: "15px", marginBottom: "20px" }}>
        <b>📊 Summary:</b>
        <p>
          Total: {total} | Pending: {pending} | Accepted: {accepted} | Completed: {completed}
        </p>
      </div>

      {/* 🔹 Search and Filters */}
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

      {/* 🧾 Booking Form for Customers */}
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

      {/* 🌍 All Bookings Map */}
      {showAllMap && filteredBookings.length > 0 && (
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={4}
          style={{ height: "300px", width: "100%", marginTop: "20px" }}
          whenCreated={async (map) => {
            const markers = [];
            for (const b of filteredBookings) {
              const from = await getCoordinates(b.from_city);
              const to = await getCoordinates(b.to_city);
              if (from) markers.push(L.marker(from).addTo(map).bindPopup(`📍 From: ${b.from_city}`));
              if (to) markers.push(L.marker(to).addTo(map).bindPopup(`🏁 To: ${b.to_city}`));
            }
            if (markers.length > 0) {
              const group = L.featureGroup(markers);
              map.fitBounds(group.getBounds(), { padding: [50, 50] });
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
      )}

      {/* 📋 Bookings List */}
      <h3 style={{ marginTop: "40px" }}>📦 Bookings</h3>
      {filteredBookings.length === 0 && <p>No bookings found.</p>}

      {filteredBookings.map((b, i) => (
        <div
          key={b.id || i}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "10px",
            marginBottom: "20px",
            backgroundColor:
              b.status === "Completed"
                ? "#e0ffe0"
                : b.status === "Accepted"
                ? "#fff7cc"
                : "#ffeaea",
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

          {/* 👤 Customer details for Driver */}
          {profile.role === "Driver" && b.status === "Accepted" && b.customer_full_name && (
            <div style={{ marginTop: "8px" }}>
              👤 <b>Customer:</b> {b.customer_full_name} ({b.customer_contact})
              <br />
              <button onClick={() => handleCall(b.customer_contact)}>📞 Call</button>{" "}
              <button onClick={() => handleWhatsApp(b.customer_contact, b.customer_full_name)}>
                💬 WhatsApp
              </button>
            </div>
          )}

          {/* 🚚 Driver details for Customer */}
          {profile.role === "Customer" && b.status === "Accepted" && b.driver_full_name && (
            <div style={{ marginTop: "8px" }}>
              🚚 <b>Driver:</b> {b.driver_full_name} ({b.driver_contact})
              <br />
              🪪 License: {b.license_number}
              <br />
              🚛 Vehicle: {b.vehicle_number} ({b.vehicle_capacity} tons)
              <br />
              <button onClick={() => handleCall(b.driver_contact)}>📞 Call</button>{" "}
              <button onClick={() => handleWhatsApp(b.driver_contact, b.driver_full_name)}>
                💬 WhatsApp
              </button>
            </div>
          )}

          {/* 🗺️ Map View for each booking */}
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "250px", width: "100%", marginTop: "10px" }}
            whenCreated={async (map) => {
              const fromCoords = await getCoordinates(b.from_city);
              const toCoords = await getCoordinates(b.to_city);

              if (fromCoords)
                L.marker(fromCoords).addTo(map).bindPopup(`📍 From: ${b.from_city}`);
              if (toCoords)
                L.marker(toCoords).addTo(map).bindPopup(`🏁 To: ${b.to_city}`);

              if (fromCoords && toCoords) {
                const group = L.featureGroup([
                  L.marker(fromCoords),
                  L.marker(toCoords),
                ]);
                map.fitBounds(group.getBounds(), { padding: [50, 50] });
              }
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>

          {/* 🎛 Actions */}
          <div style={{ marginTop: "10px" }}>
            {profile.role === "Driver" && b.status === "Pending" && (
              <button onClick={() => acceptBooking(b.id)}>✅ Accept Booking</button>
            )}
            {profile.role === "Driver" && b.status === "Accepted" && (
              <button onClick={() => completeBooking(b.id)}>🏁 Mark Completed</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;

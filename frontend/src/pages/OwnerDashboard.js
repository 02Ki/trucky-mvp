// src/pages/OwnerDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icons for some bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function OwnerDashboard({ owner: ownerProp }) {
  const [user, setUser] = useState(null);
  const [owner, setOwner] = useState(ownerProp || null);
  const [trucks, setTrucks] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // add-truck form state
  const [truckNumber, setTruckNumber] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");

  // earnings
  const [earnings, setEarnings] = useState({ total: 0, byTruck: {} });

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);
      } catch (err) {
        console.error("OwnerDashboard getUser error:", err);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, []);

  // fetch owner row if not passed by prop
  useEffect(() => {
    if (owner || !user) return;
    (async () => {
      const { data, error } = await supabase.from("owners").select("*").eq("id", user.id).single();
      if (error) console.error("owners fetch error:", error.message);
      else setOwner(data);
    })();
  }, [owner, user]);

  // fetch trucks & earnings & driver locations
  const fetchTrucksAndData = useCallback(async () => {
    if (!owner) return;
    // trucks for owner
    const { data: tdata, error: terr } = await supabase.from("trucks").select("*").eq("owner_id", owner.id);
    if (terr) console.error("trucks error:", terr.message);
    else setTrucks(tdata || []);

    // earnings: client-side fallback
    try {
      const sums = {};
      let total = 0;
      const { data: allEarnings, error: allEerr } = await supabase.from("truck_earnings").select("truck_id, amount");
      if (!allEerr && allEarnings) {
        allEarnings.forEach((row) => {
          sums[row.truck_id] = (sums[row.truck_id] || 0) + Number(row.amount || 0);
          total += Number(row.amount || 0);
        });
      }
      setEarnings({ total, byTruck: sums });
    } catch (err) {
      console.error("earnings fetch error:", err);
    }

    // driver locations (latest)
    const { data: locData, error: locErr } = await supabase
      .from("driver_locations")
      .select("id, driver_id, latitude, longitude, updated_at, profiles(full_name, phone)")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (locErr) console.error("driver_locations error:", locErr.message);
    else setDriverLocations(locData || []);
  }, [owner]);

  useEffect(() => {
    if (owner) fetchTrucksAndData();
  }, [owner, fetchTrucksAndData]);

  // realtime updates for trucks/earnings/driver locations
  useEffect(() => {
    if (!owner) return;
    const ch1 = supabase
      .channel("owner-trucks")
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, () => fetchTrucksAndData())
      .subscribe();
    const ch2 = supabase
      .channel("driver-locs-owner")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, () => fetchTrucksAndData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [owner, fetchTrucksAndData]);

  // add truck
  async function addTruck(e) {
    e.preventDefault();
    if (!owner) return alert("Owner not loaded");
    const payload = {
      owner_id: owner.id,
      truck_number: truckNumber,
      model,
      capacity: capacity ? Number(capacity) : null,
      status: "available",
    };
    const { error } = await supabase.from("trucks").insert([payload]);
    if (error) alert("Failed to add truck: " + error.message);
    else {
      setTruckNumber("");
      setModel("");
      setCapacity("");
      fetchTrucksAndData();
    }
  }

  // delete truck
  async function deleteTruck(truckId) {
    if (!window.confirm("Delete this truck?")) return;
    const { error } = await supabase.from("trucks").delete().eq("id", truckId);
    if (error) alert("Delete failed: " + error.message);
    else fetchTrucksAndData();
  }

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in</p>;
  if (!owner) return <p>Loading owner data...</p>;

  // helper mapping for earnings
  const truckEarnings = (truckId) => (earnings.byTruck[truckId] ? Number(earnings.byTruck[truckId]).toFixed(2) : "0.00");

  return (
    <div style={{ padding: 20 }}>
      <h2>Owner Dashboard — {owner.company_name}</h2>
      <p>Welcome, <b>{owner.owner_name}</b> — Trucks: {trucks.length} • Total earnings: ₹{earnings.total.toFixed?.(2) ?? earnings.total}</p>

      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <h4>Fleet Summary</h4>
          <p>Total Trucks: {trucks.length}</p>
          <p>Total Earnings: ₹{earnings.total.toFixed?.(2) ?? earnings.total}</p>
        </div>

        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <h4>Add New Truck</h4>
          <form onSubmit={addTruck} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} placeholder="Truck Number" required />
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model" />
            <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity (tons)" />
            <button type="submit">Add Truck</button>
          </form>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Trucks</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Truck</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Model</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Capacity (t)</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Driver</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Earnings</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((t) => (
              <tr key={t.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t.truck_number}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t.model}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t.capacity}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t.driver_id || "—"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>₹{truckEarnings(t.id)}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <button onClick={() => deleteTruck(t.id)} style={{ background: "red", color: "white" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Live Map — Trucks & Drivers</h3>
        <div style={{ height: 450, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {driverLocations.map((d) => (
              <Marker key={d.id} position={[d.latitude, d.longitude]}>
                <Popup>
                  {d.profiles?.full_name || "Driver"} <br />
                  {d.profiles?.phone ? `📞 ${d.profiles.phone}` : null} <br />
                  {new Date(d.updated_at).toLocaleString()}
                </Popup>
              </Marker>
            ))}
            {trucks.map((t) => (
              // If truck has no geo, skip; you can extend trucks with current_location later
              t.current_location ? (
                <Marker key={`truck-${t.id}`} position={[t.current_location_lat, t.current_location_lon]}>
                  <Popup>
                    Truck {t.truck_number} <br />
                    {t.model} • {t.capacity} t
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

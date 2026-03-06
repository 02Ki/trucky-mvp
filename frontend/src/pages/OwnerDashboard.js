// src/pages/OwnerDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../styles/OwnerDashboard.css";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_BASE = "http://localhost:5000";

export default function OwnerDashboard({ owner: ownerProp }) {
  const { ownerId } = useParams();
  const location = useLocation();
  const [owner, setOwner] = useState(ownerProp || null);
  const [trucks, setTrucks] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // add truck form
  const [truckNumber, setTruckNumber] = useState("");
  const [model, setModel] = useState("");
  const [capacity, setCapacity] = useState("");

  // earnings
  const [earnings, setEarnings] = useState({ total: 0, byTruck: {} });

  // Default owner ID (can be passed via URL param, route state, or default to 1)
  const currentOwnerId = ownerId || location.state?.ownerId || 1;

  // Fetch owner data from backend
  useEffect(() => {
    async function loadOwner() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/owners/${currentOwnerId}`);
        if (!res.ok) throw new Error("Failed to load owner");
        const data = await res.json();
        setOwner(data);
        setError(null);
      } catch (err) {
        console.error("Error loading owner:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOwner();
  }, [currentOwnerId]);

  // fetch trucks, driver locations, earnings from backend
  const fetchData = useCallback(async () => {
    if (!owner) return;
    try {
      // Get trucks
      const trucksRes = await fetch(`${API_BASE}/owners/${owner.id}/trucks`);
      const trucksData = await trucksRes.json();
      setTrucks(trucksData || []);

      // Get earnings
      const earningsRes = await fetch(`${API_BASE}/owners/${owner.id}/earnings`);
      const earningsData = await earningsRes.json();
      setEarnings(earningsData || { total: 0, byTruck: {} });

      // Get driver locations
      const locRes = await fetch(`${API_BASE}/driver-locations`);
      const locData = await locRes.json();
      setDriverLocations(locData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, [owner]);

  useEffect(() => {
    if (owner) fetchData();
  }, [owner, fetchData]);

  // Polling for updates (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (owner) fetchData();
    }, 10000);
    return () => clearInterval(interval);
  }, [owner, fetchData]);

  // add truck
  async function addTruck(e) {
    e.preventDefault();
    if (!owner) return;

    try {
      const res = await fetch(`${API_BASE}/owners/${owner.id}/trucks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truck_number: truckNumber, model, capacity }),
      });
      
      if (!res.ok) throw new Error("Failed to add truck");
      
      setTruckNumber("");
      setModel("");
      setCapacity("");
      fetchData();
    } catch (err) {
      console.error("Error adding truck:", err);
    }
  }

  // delete truck
  async function deleteTruck(id) {
    if (!window.confirm("Delete this truck?")) return;
    try {
      const res = await fetch(`${API_BASE}/trucks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete truck");
      fetchData();
    } catch (err) {
      console.error("Error deleting truck:", err);
    }
  }

  if (loading) return <p className="owner-loading">Loading owner dashboard...</p>;
  if (error) return <p className="owner-error">Error: {error}</p>;
  if (!owner) return <p className="owner-empty">No owner data found</p>;

  // earnings helper
  const truckEarnings = (id) =>
    earnings.byTruck[id] ? earnings.byTruck[id].toFixed(2) : "0.00";

  return (
    <div className="owner-dashboard-container">
      {/* Header */}
      <div className="owner-dashboard-header">
        <h2>🚛 {owner.company_name || "Owner Dashboard"}</h2>
        <p>
          Welcome, <b>{owner.owner_name || "Owner"}</b>
          <span>•</span>
          <span>Fleet: <b>{trucks.length}</b> trucks</span>
          <span>•</span>
          <span>Earnings: <b>₹{earnings.total.toFixed(2)}</b></span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="owner-stats-grid">
        <div className="owner-stat-card">
          <h4>Total Trucks</h4>
          <p>{trucks.length}</p>
        </div>
        <div className="owner-stat-card">
          <h4>Total Earnings</h4>
          <p>₹{earnings.total.toFixed(2)}</p>
        </div>
        <div className="owner-stat-card">
          <h4>Active Drivers</h4>
          <p>{driverLocations.length}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="owner-main-grid">
        {/* Add Truck Section */}
        <div className="owner-section">
          <h3>➕ Add New Truck</h3>
          <form onSubmit={addTruck} className="owner-form">
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="Truck Number (e.g., TRK001)"
              required
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model (e.g., Volvo FH)"
              required
            />
            <input
              type="text"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Capacity (e.g., 20 tons)"
              required
            />
            <button type="submit">Add Truck</button>
          </form>
        </div>

        {/* Trucks Table */}
        <div className="owner-section">
          <h3>🚚 Your Trucks</h3>
          <table className="owner-table">
            <thead>
              <tr>
                <th>Truck Number</th>
                <th>Model</th>
                <th>Capacity</th>
                <th>Earnings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trucks.length > 0 ? (
                trucks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.truck_number}</strong>
                    </td>
                    <td>{t.model || "—"}</td>
                    <td>{t.capacity || "—"}</td>
                    <td>
                      <strong>₹{truckEarnings(t.id)}</strong>
                    </td>
                    <td>
                      <button
                        className="owner-action-btn delete"
                        onClick={() => deleteTruck(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="owner-empty">
                    No trucks yet. Add one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Section */}
      <div className="owner-section" style={{ marginTop: "30px" }}>
        <h3>📍 Live Driver Locations</h3>
        <div className="owner-map-container">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "450px", width: "100%", borderRadius: "12px" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {driverLocations.map((d) => (
              <Marker key={d.id} position={[d.latitude, d.longitude]}>
                <Popup>
                  <div>
                    <strong>{d.full_name || "Driver"}</strong>
                    <br />
                    {d.phone ? `📞 ${d.phone}` : ""}
                    <br />
                    <small>{new Date(d.updated_at).toLocaleString()}</small>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

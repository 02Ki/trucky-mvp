import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

function DriverDashboard() {
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);

  // ✅ Get current logged-in user
  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  // ✅ Fetch all bookings (admin view)
  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("❌ Error fetching all bookings:", error);
      else setBookings(data || []);
    }
    fetchAll();
  }, []);

  // ✅ Change status
  async function changeStatus(id, newStatus) {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Failed to update: " + error.message);
    } else {
      alert(`✅ Status updated to ${newStatus}`);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
    }
  }

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>🧭 Driver Dashboard</h2>
      <p>Welcome, <strong>{user.email}</strong></p>

      {bookings.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {bookings.map((b) => (
            <li
              key={b.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                margin: "10px 0",
                padding: "10px",
              }}
            >
              <strong>{b.from_city}</strong> ➡ {b.to_city} — {b.load} —{" "}
              <em>{b.status}</em>

              <div style={{ marginTop: "8px" }}>
                {b.status === "Pending" && (
                  <button
                    onClick={() => changeStatus(b.id, "Accepted")}
                    style={{ marginRight: "8px" }}
                  >
                    Accept
                  </button>
                )}
                {b.status === "Accepted" && (
                  <button onClick={() => changeStatus(b.id, "Completed")}>
                    Mark Completed
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No bookings available.</p>
      )}
    </div>
  );
}

export default DriverDashboard;
    
import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

function Analytics() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🎯 Fetch current user
  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    }
    getUser();
  }, []);

  // 🚛 Fetch all bookings for analytics
  useEffect(() => {
    async function fetchBookings() {
      const { data, error } = await supabase
        .from("booking_with_details")
        .select("*");

      if (error) console.error("Error fetching analytics data:", error.message);
      else setBookings(data || []);
    }
    fetchBookings();
  }, []);

  // 📊 Derived analytics data
  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "Completed").length;
    const pending = bookings.filter((b) => b.status === "Pending").length;
    const accepted = bookings.filter((b) => b.status === "Accepted").length;

    const cityCount = {};
    bookings.forEach((b) => {
      cityCount[b.from_city] = (cityCount[b.from_city] || 0) + 1;
      cityCount[b.to_city] = (cityCount[b.to_city] || 0) + 1;
    });

    const topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { total, completed, pending, accepted, topCities };
  }, [bookings]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in to view analytics.</p>;

  return (
    <div style={{ padding: "30px" }}>
      <h2>📈 Trucky Analytics Dashboard</h2>
      <p>Real-time overview of your logistics operations.</p>

      {/* 🔹 Summary Stats */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={cardStyle}>
          <h3>Total Bookings</h3>
          <p style={numStyle}>{stats.total}</p>
        </div>
        <div style={cardStyle}>
          <h3>Completed</h3>
          <p style={numStyle}>{stats.completed}</p>
        </div>
        <div style={cardStyle}>
          <h3>Accepted</h3>
          <p style={numStyle}>{stats.accepted}</p>
        </div>
        <div style={cardStyle}>
          <h3>Pending</h3>
          <p style={numStyle}>{stats.pending}</p>
        </div>
      </div>

      {/* 🔸 Charts Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "30px",
          marginTop: "40px",
        }}
      >
        {/* 📊 Status Breakdown */}
        <div style={chartBox}>
          <h3>📦 Booking Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "Completed", value: stats.completed },
                  { name: "Accepted", value: stats.accepted },
                  { name: "Pending", value: stats.pending },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label
              >
                <Cell fill="#00C49F" />
                <Cell fill="#FFBB28" />
                <Cell fill="#FF8042" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 🏙️ Top Cities */}
        <div style={chartBox}>
          <h3>🏙️ Top 5 Active Cities</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topCities}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="city" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// 🎨 Inline styling (no Tailwind)
const cardStyle = {
  flex: "1 1 200px",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "20px",
  textAlign: "center",
  backgroundColor: "#f9f9f9",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};

const numStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#007BFF",
};

const chartBox = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "20px",
  backgroundColor: "#fff",
  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
};

export default Analytics;

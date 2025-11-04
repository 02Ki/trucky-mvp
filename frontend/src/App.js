import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Auth from "./Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./profile"; // ✅ capitalized filename for consistency
import Analytics from "./pages/Analytics";

function App() {
  return (
    <Router>
      <nav style={{ textAlign: "center", marginTop: "20px" }}>
        <Link to="/dashboard" style={{ marginRight: "15px" }}>Dashboard</Link>
        <Link to="/auth" style={{ marginRight: "15px" }}>Login / Signup</Link>
        <Link to="/profile" style={{ marginRight: "15px" }}>Profile</Link>
        {/* ✅ Added Analytics link below */}
        <Link to="/analytics">Analytics</Link>
      </nav>

      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/" element={<Dashboard />} /> {/* ✅ Home route */}
      </Routes>
    </Router>
  );
}

export default App;

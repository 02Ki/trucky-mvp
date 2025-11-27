import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Auth from "./Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./profile";
import Analytics from "./pages/Analytics";
import LandingPage from "./pages/LandingPage";
import OwnerDashboard from "./pages/OwnerDashboard";
import "./styles/Navbar.css"; // ✅ New CSS file for navbar

function Navbar() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <nav className={`navbar ${isLandingPage ? "navbar-transparent" : ""}`}>
      <div className="navbar-container">
        <div className="navbar-logo">Trucky</div>
        <div className="navbar-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/auth">Login / Signup</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/analytics">Analytics</Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  );
}

export default App;

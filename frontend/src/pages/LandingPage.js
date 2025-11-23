import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";

function LandingPage() {
  return (
    <div className="landing-container">
      {/* Header Section */}
      <header className="landing-header">
        <div className="overlay gradient-overlay">
          <div className="landing-text">
            <h1 className="landing-title">
              Simplify Your <span>Truck Bookings</span> with Trucky
            </h1>
            <p className="landing-subtitle">
              Fast, reliable and real-time truck logistics for businesses and individuals.
            </p>
            <div className="landing-buttons">
              <Link to="/auth" className="btn-primary">
                Get Started
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content / Features Section */}
      <section className="landing-content">
        <div className="landing-images">
          <img
            src="/images/truck-blue.png"
            alt="Truck"
            className="main-truck"
          />
          <img src="/images/ftl.png" alt="FTL Transport" className="ftl-image" />
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2025 Trucky. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;

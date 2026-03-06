import React, { useState } from "react";
import { supabase } from "./supabase";
import "./styles/Auth.css";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Customer");
  const [message, setMessage] = useState("");

  // Common fields
  const [phone, setPhone] = useState("");

  // Driver fields
  const [drivingLicense, setDrivingLicense] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");

  // Owner fields
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [truckCount, setTruckCount] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  // Indian driving license validation
  const indianLicensePattern = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;

  const handleAuth = async () => {
    setMessage("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setMessage("❌ " + error.message);
      else setMessage("✅ Logged in successfully!");
      return;
    }

    // SIGNUP VALIDATION
    if (!email || !password || !phone) {
      setMessage("⚠️ Please fill all required fields.");
      return;
    }

    // Driver validation
    if (role === "Driver") {
      if (!drivingLicense || !vehicleNumber || !vehicleCapacity) {
        setMessage("⚠️ Driver details missing.");
        return;
      }
      if (!indianLicensePattern.test(drivingLicense)) {
        setMessage("⚠️ Invalid driving license format.");
        return;
      }
    }

    // Owner validation
    if (role === "Owner") {
      if (!companyName || !gstNumber || !truckCount || !companyAddress) {
        setMessage("⚠️ Owner details missing.");
        return;
      }
    }

    // CREATE USER
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setMessage("📧 Verify your email to continue.");
      return;
    }

    // PROFILE INSERT
    const profileData = {
      id: user.id,
      full_name: email.split("@")[0],
      role,
      phone_number: phone,
    };

    // DRIVER fields
    if (role === "Driver") {
      profileData.driving_license = drivingLicense;
      profileData.vehicle_number = vehicleNumber;
      profileData.vehicle_capacity = vehicleCapacity;
    }

    // OWNER fields
    if (role === "Owner") {
      profileData.company_name = companyName;
      profileData.gst_number = gstNumber;
      profileData.truck_count = truckCount;
      profileData.company_address = companyAddress;
    }

    const { error: insertError } = await supabase
      .from("profiles")
      .insert([profileData]);

    if (insertError) {
      setMessage("❌ " + insertError.message);
      return;
    }

    setMessage("✅ Signup successful! Please log in now.");

    // CLEAR ALL
    setEmail("");
    setPassword("");
    setPhone("");
    setDrivingLicense("");
    setVehicleNumber("");
    setVehicleCapacity("");
    setCompanyName("");
    setGstNumber("");
    setTruckCount("");
    setCompanyAddress("");

    setRole("Customer");
    setIsLogin(true);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? "🔐 Login" : "✍️ Sign Up"}</h2>
          <p>{isLogin ? "Welcome back to Trucky" : "Join Trucky as a partner"}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
          {/* Basic Fields - Always shown */}
          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="your@email.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <>
              {/* Role Selector */}
              <div className="form-row">
                <div className="form-group">
                  <label>Sign up as:</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="role-select"
                  >
                    <option value="Customer">👤 Customer</option>
                    <option value="Driver">🚗 Driver</option>
                    <option value="Owner">🏢 Owner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* DRIVER FIELDS */}
              {role === "Driver" && (
                <div className="role-container driver-fields">
                  <h3 className="role-title">🚗 Driver Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Driving License</label>
                      <input 
                        type="text" 
                        placeholder="DL12345678901234"
                        value={drivingLicense}
                        onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
                        required
                      />
                      <small>Format: DL12345678901234</small>
                    </div>
                    <div className="form-group">
                      <label>Vehicle Number</label>
                      <input 
                        type="text" 
                        placeholder="MH01AB1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label>Vehicle Capacity (tons)</label>
                      <input 
                        type="number" 
                        placeholder="20"
                        value={vehicleCapacity}
                        onChange={(e) => setVehicleCapacity(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* OWNER FIELDS */}
              {role === "Owner" && (
                <div className="role-container owner-fields">
                  <h3 className="role-title">🏢 Company Information</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Company Name</label>
                      <input 
                        type="text" 
                        placeholder="Trucky Logistics"
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>GST Number</label>
                      <input 
                        type="text" 
                        placeholder="27AABCT1234H1Z0"
                        value={gstNumber} 
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Number of Trucks</label>
                      <input 
                        type="number" 
                        placeholder="5"
                        value={truckCount} 
                        onChange={(e) => setTruckCount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Address</label>
                      <textarea
                        placeholder="123 Business St, Mumbai..."
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Message Display */}
          {message && (
            <div className={message.startsWith("❌") ? "alert alert-error" : "alert alert-success"}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn">
            {isLogin ? "🔓 Login to Trucky" : "✨ Create Account"}
          </button>

          {/* Toggle Button */}
          <div className="auth-toggle">
            <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
            <button 
              type="button"
              className="auth-toggle-btn" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up Now" : "Login Here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

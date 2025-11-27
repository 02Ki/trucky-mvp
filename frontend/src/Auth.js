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
      <h2>{isLogin ? "Login" : "Sign Up"} to Trucky</h2>

      <input type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <input type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />

      {!isLogin && (
        <>
          {/* Role selector */}
          <label>Sign up as:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="Customer">Customer</option>
            <option value="Driver">Driver</option>
            <option value="Owner">Owner</option>
          </select>

          {/* Common phone field */}
          <input type="text" placeholder="Phone Number"
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />

          {/* DRIVER FIELDS */}
          {role === "Driver" && (
            <>
              <input type="text" placeholder="Driving License"
                value={drivingLicense}
                onChange={(e) =>
                  setDrivingLicense(e.target.value.toUpperCase())
                }
              />

              <input type="text" placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) =>
                  setVehicleNumber(e.target.value.toUpperCase())
                }
              />

              <input type="text" placeholder="Vehicle Capacity (tons)"
                value={vehicleCapacity}
                onChange={(e) => setVehicleCapacity(e.target.value)}
              />
            </>
          )}

          {/* OWNER FIELDS */}
          {role === "Owner" && (
            <>
              <input type="text" placeholder="Company Name"
                value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              />

              <input type="text" placeholder="GST Number"
                value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              />

              <input type="number" placeholder="Number of Trucks"
                value={truckCount} onChange={(e) => setTruckCount(e.target.value)}
              />

              <textarea
                placeholder="Company Address"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
              />
            </>
          )}
        </>
      )}

      <button onClick={handleAuth}>
        {isLogin ? "Login" : "Sign Up"}
      </button>

      {message && (
        <p className={message.startsWith("❌") ? "error" : "success"}>
          {message}
        </p>
      )}

      <p>
        {isLogin ? "Don't have an account?" : "Already registered?"}
        <button className="switch-btn" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </p>
    </div>
  );
}

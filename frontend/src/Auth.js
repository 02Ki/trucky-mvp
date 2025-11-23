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

  // Driver-specific fields
  const [drivingLicense, setDrivingLicense] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");

  // 🧠 Indian driving license regex: e.g. MH1420110023456
  const indianLicensePattern = /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/;

  const handleAuth = async () => {
    setMessage("");

    if (isLogin) {
      // 🔐 LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage("❌ " + error.message);
      else setMessage("✅ Logged in successfully!");
      return;
    }

    // 🧾 SIGNUP
    if (!email || !password || !phone) {
      setMessage("⚠️ Please fill all mandatory fields.");
      return;
    }

    if (role === "Driver") {
      if (!drivingLicense || !vehicleNumber || !vehicleCapacity) {
        setMessage("⚠️ Please fill all driver details.");
        return;
      }

      if (!indianLicensePattern.test(drivingLicense)) {
        setMessage(
          "⚠️ Invalid Indian driving license format. Example: MH1420110023456"
        );
        return;
      }
    }

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
      setMessage("✅ Signup successful. Please verify your email.");
      return;
    }

    // 🧩 Prepare profile data
    const profileData = {
      id: user.id,
      full_name: email.split("@")[0],
      role,
      phone_number: phone,
    };

    if (role === "Driver") {
      profileData.driving_license = drivingLicense;
      profileData.vehicle_number = vehicleNumber;
      profileData.vehicle_capacity = vehicleCapacity;
    }

    // 💾 Insert into Supabase profiles
    const { error: insertError } = await supabase
      .from("profiles")
      .insert([profileData]);

    if (insertError) {
      setMessage("❌ " + insertError.message);
    } else {
      setMessage("✅ Signup successful! You can log in now.");
      // clear fields
      setEmail("");
      setPassword("");
      setPhone("");
      setDrivingLicense("");
      setVehicleNumber("");
      setVehicleCapacity("");
      setRole("Customer");
      setIsLogin(true);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>{isLogin ? "Login" : "Sign Up"} to Trucky</h2>

      {/* Email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      {/* Password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      {/* Role selection */}
      {!isLogin && (
        <>
          <label><strong>Sign up as:</strong></label>{" "}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="Customer">Customer</option>
            <option value="Driver">Driver</option>
          </select>
          <br /><br />

          {/* Common: phone number */}
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <br /><br />

          {/* Driver fields */}
          {role === "Driver" && (
            <>
              <input
                type="text"
                placeholder="Driving License (e.g. MH1420110023456)"
                value={drivingLicense}
                onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
                required
              />
              <br /><br />

              <input
                type="text"
                placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                required
              />
              <br /><br />

              <input
                type="text"
                placeholder="Vehicle Capacity (in tons)"
                value={vehicleCapacity}
                onChange={(e) => setVehicleCapacity(e.target.value)}
                required
              />
              <br /><br />
            </>
          )}
        </>
      )}

      {/* Submit Button */}
      <button onClick={handleAuth}>
        {isLogin ? "Login" : "Sign Up"}
      </button>

      <p style={{ color: message.startsWith("❌") ? "red" : "green" }}>
        {message}
      </p>

      <p>
        {isLogin ? "Don't have an account?" : "Already registered?"}{" "}
        <button onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </p>
    </div>
  );
}

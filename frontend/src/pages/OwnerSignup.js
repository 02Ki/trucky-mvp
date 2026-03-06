// src/pages/OwnerSignup.js
import React, { useState } from "react";
import { supabase } from "../supabase";

export default function OwnerSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gst, setGst] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    // Step 1: Auth signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    const user = authData.user;
    if (!user) {
      alert("Signup failed. User not created.");
      return;
    }

    // Step 2 — Insert into profiles
    const { error: profileErr } = await supabase.from("profiles").insert([
      {
        id: user.id,
        full_name: ownerName,
        address: address,
        role: "owner",
        phone_number: phone,  // you added column — now OK
      },
    ]);

    if (profileErr) {
      alert(profileErr.message);
      return;
    }

    // Step 3 — Insert into owners table
    const { error: ownerErr } = await supabase.from("owners").insert([
      {
        id: user.id, // link to profiles.id
        owner_name: ownerName,
        company_name: companyName,
        gst_number: gst,
        total_trucks: 0,  // initially 0
      },
    ]);

    if (ownerErr) {
      alert(ownerErr.message);
      return;
    }

    alert("Owner account created successfully!");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Owner Signup</h2>
      <form
        onSubmit={handleSignup}
        style={{ display: "flex", flexDirection: "column", gap: 10, width: 300 }}
      >
        <input
          placeholder="Owner Full Name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
        />

        <input
          placeholder="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        <input
          placeholder="GST Number"
          value={gst}
          onChange={(e) => setGst(e.target.value)}
          required
        />

        <input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Create Owner Account</button>
      </form>
    </div>
  );
}

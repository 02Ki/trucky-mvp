import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    }
    getProfile();
  }, []);

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Welcome, {profile.full_name} 👋</h2>
      <p>Your role: <b>{profile.role}</b></p>
    </div>
  );
}   

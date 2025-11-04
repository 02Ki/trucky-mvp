import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "./supabase";

const truckIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [40, 40],
});

function LiveMap({ bookingId }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Fetch initial location
    async function fetchLocation() {
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("booking_id", bookingId)
        .single();
      if (data) setLocation(data);
    }
    fetchLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("driver-location")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        (payload) => {
          if (payload.new.booking_id === bookingId) {
            setLocation(payload.new);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [bookingId]);

  if (!location) return <p>Waiting for driver location...</p>;

  return (
    <MapContainer
      center={[location.latitude, location.longitude]}
      zoom={13}
      style={{ height: "300px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <Marker
        position={[location.latitude, location.longitude]}
        icon={truckIcon}
      >
        <Popup>🚛 Driver’s Current Location</Popup>
      </Marker>
    </MapContainer>
  );
}

export default LiveMap;

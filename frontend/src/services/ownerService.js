import { supabase } from "../supabase";

export async function getOwnerDashboardData(userId) {
  try {
    // 1) Fetch owner profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // 2) Fetch trucks that belong to this owner
    const { data: trucks, error: trucksError } = await supabase
      .from("trucks")
      .select("*")
      .eq("owner_id", userId);

    if (trucksError) throw trucksError;

    if (!trucks || trucks.length === 0) {
      return { profile, trucks: [], earnings: [] };
    }

    // Extract only truck IDs
    const truckIds = trucks.map(t => t.id);

    // 3) Fetch earnings for all trucks
    const { data: earnings, error: earningsError } = await supabase
      .from("truck_earnings")
      .select("*")
      .in("truck_id", truckIds);

    if (earningsError) throw earningsError;

    return {
      profile,
      trucks,
      earnings
    };

  } catch (err) {
    console.error("Owner dashboard fetch error:", err);
    return { error: err.message };
  }
}

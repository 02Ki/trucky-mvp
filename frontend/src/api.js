// src/api.js
export const API_URL = process.env.REACT_APP_API_URL;


// Helper function to make GET requests
export async function fetchData(endpoint) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Fetch error:", error);
    return null;
  }
}

// Helper function to make POST requests
export async function postData(endpoint, body) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Post error:", error);
    return null;
  }
  
}

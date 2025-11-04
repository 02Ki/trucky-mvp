const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Root route (test)
app.get("/", (req, res) => {
  res.send("Trucky backend running 🚛");
});

// ✅ New route: GET all users
app.get("/users", (req, res) => {
  const users = [
    { id: 1, name: "Kiran", role: "Admin" },
    { id: 2, name: "Rajesh", role: "Driver" },
    { id: 3, name: "Sanjay", role: "Customer" },
  ];
  res.json(users);
});

// ✅ New route: POST to add a user
app.post("/users", (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ message: "Name and role are required" });
  }
  const newUser = { id: Date.now(), name, role };
  console.log("🆕 New user added:", newUser);
  res.status(201).json(newUser);
});

app.listen(5000, () => {
  console.log("✅ Server running on port 5000");
});
// Export the app for testing
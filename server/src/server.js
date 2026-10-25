require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ message: `A record with this ${field} already exists.` });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(err.errors).map(e => e.message).join(", ")
    });
  }
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith("REPLACE_")) {
  console.error("Set a real JWT_SECRET in server/.env before starting the API.");
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student_management_portal")
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`API running at http://localhost:${port}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

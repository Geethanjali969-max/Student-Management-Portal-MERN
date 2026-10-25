const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Student = require("../models/Student");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

function makeToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "2h" });
}
function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    student: user.student ? user.student.toString() : null
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, studentId } = req.body;
    if (![name, email, password, studentId].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ message: "Name, email, password, and student ID are required." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must contain at least 8 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedId = studentId.trim().toUpperCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const student = await Student.findOne({ studentId: normalizedId, email: normalizedEmail });
    if (!student) {
      return res.status(400).json({ message: "No matching student record found. Ask your administrator to add your student record first." });
    }
    if (await User.exists({ student: student._id })) {
      return res.status(409).json({ message: "An account already exists for this student." });
    }
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "student",
      student: student._id
    });
    res.status(201).json({ message: "Student account created successfully.", token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ message: "Login successful.", token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.get("/me", authenticateToken, (req, res) => res.json({ user: req.user }));

router.post("/setup-admin", async (req, res, next) => {
  try {
    const configuredSecret = process.env.ADMIN_SETUP_SECRET;
    const supplied = req.get("x-admin-setup-secret");
    if (!configuredSecret || configuredSecret.startsWith("REPLACE_")) {
      return res.status(503).json({ message: "Admin setup is not configured." });
    }
    if (typeof supplied !== "string") return res.status(403).json({ message: "Invalid setup secret." });
    const a = Buffer.from(supplied);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ message: "Invalid setup secret." });
    }
    if (await User.exists({ role: "admin" })) {
      return res.status(409).json({ message: "An admin already exists. Setup is closed." });
    }
    const { name, email, password } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string") {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (password.length < 12) return res.status(400).json({ message: "Admin password must contain at least 12 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "This email is already registered." });
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      student: null
    });
    res.status(201).json({ message: "Admin created. Sign in using the login form.", user: publicUser(user) });
  } catch (err) { next(err); }
});

module.exports = router;

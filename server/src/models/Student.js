const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, trim: true, uppercase: true, unique: true, minlength: 2 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  department: { type: String, required: true, trim: true, enum: ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AI&DS", "Other"] },
  year: { type: Number, required: true, min: 1, max: 4 },
  cgpa: { type: Number, required: true, min: 0, max: 10 },
  phone: { type: String, trim: true, default: "", maxlength: 20 }
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);

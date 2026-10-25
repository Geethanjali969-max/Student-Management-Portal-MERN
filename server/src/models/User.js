const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["admin", "student"], default: "student", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.index({ student: 1 }, { unique: true, partialFilterExpression: { student: { $type: "objectId" } } });
module.exports = mongoose.model("User", userSchema);

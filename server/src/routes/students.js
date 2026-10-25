const express = require("express");
const Student = require("../models/Student");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// Students can only view their own record; admins can list and filter all records.
router.get("/", async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      if (!req.user.student) return res.status(404).json({ message: "No student profile is linked to this account." });
      const own = await Student.findById(req.user.student);
      return own ? res.json([own]) : res.status(404).json({ message: "Student profile not found." });
    }
    const { search = "", department = "" } = req.query;
    const query = {};
    if (department && department !== "All") query.department = department;
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { studentId: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } }
      ];
    }
    const students = await Student.find(query).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (req.user.role === "student" && req.user.student !== req.params.id) {
      return res.status(403).json({ message: "You can only view your own student profile." });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });
    res.json(student);
  } catch (err) { next(err); }
});

router.post("/", authorizeRoles("admin"), async (req, res, next) => {
  try {
    const payload = cleanStudent(req.body);
    const student = await Student.create(payload);
    res.status(201).json({ message: "Student added successfully.", student });
  } catch (err) { next(err); }
});

router.put("/:id", authorizeRoles("admin"), async (req, res, next) => {
  try {
    const payload = cleanStudent(req.body);
    const student = await Student.findByIdAndUpdate(req.params.id, payload, {
      new: true, runValidators: true
    });
    if (!student) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student updated successfully.", student });
  } catch (err) { next(err); }
});

router.delete("/:id", authorizeRoles("admin"), async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });
    const User = require("../models/User");
    await User.deleteMany({ student: student._id });
    await student.deleteOne();
    res.json({ message: "Student deleted successfully." });
  } catch (err) { next(err); }
});

function cleanStudent(body) {
  return {
    studentId: typeof body.studentId === "string" ? body.studentId.trim().toUpperCase() : body.studentId,
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    department: body.department,
    year: Number(body.year),
    cgpa: Number(body.cgpa),
    phone: typeof body.phone === "string" ? body.phone.trim() : ""
  };
}

module.exports = router;

const express = require("express");
const { getStudentDashboard, getAdminDashboard } = require("../controllers/dashboard.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/student", protect, requireRole("student"), getStudentDashboard);
router.get("/admin", protect, requireRole("admin"), getAdminDashboard);

module.exports = router;

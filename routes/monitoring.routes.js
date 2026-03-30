const express = require("express");
const {
  reportAntiCheatEvent,
  getExamMonitoring,
  revertAutoSubmittedSession,
} = require("../controllers/monitoring.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/events", protect, requireRole("student"), reportAntiCheatEvent);
router.get("/exams/:examId", protect, requireRole("admin"), getExamMonitoring);
router.post("/sessions/:sessionId/revert", protect, requireRole("admin"), revertAutoSubmittedSession);

module.exports = router;

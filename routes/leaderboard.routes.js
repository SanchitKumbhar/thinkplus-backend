const express = require("express");
const {
  getLeaderboard,
  createLeaderboardSnapshot,
  getStudentBadges,
} = require("../controllers/leaderboard.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getLeaderboard);
router.post("/snapshot", protect, requireRole("admin"), createLeaderboardSnapshot);
router.get("/students/:studentId", protect, getStudentBadges);

module.exports = router;

const express = require("express");
const {
  listTopics,
  createTopic,
  updateTopic,
  createQuestion,
  createQuestionsBulk,
  listQuestionsByTopic,
  getTopicUnlockStatus,
  submitPracticeAttempt,
  getPracticeStats,
} = require("../controllers/practice.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/topics", protect, listTopics);
router.post("/topics", protect, requireRole("admin"), createTopic);
router.put("/topics/:topicId", protect, requireRole("admin"), updateTopic);

router.get("/topics/:topicId/questions", protect, listQuestionsByTopic);
router.get("/topics/:topicId/unlock-status", protect, requireRole("student"), getTopicUnlockStatus);
router.post("/questions", protect, requireRole("admin"), createQuestion);
router.post("/questions/bulk", protect, requireRole("admin"), createQuestionsBulk);

router.post("/attempts", protect, requireRole("student"), submitPracticeAttempt);
router.get("/stats/me", protect, requireRole("student"), getPracticeStats);

module.exports = router;

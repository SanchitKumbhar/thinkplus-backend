const express = require("express");
const { listClassLevels, listTopics, createTopic } = require("../controllers/syllabus.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/classes", protect, listClassLevels);
router.get("/topics", protect, listTopics);
router.post("/topics", protect, requireRole("admin"), createTopic);

module.exports = router;

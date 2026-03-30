
const express = require("express");
const {
  createExam,
  validateExamCodeEntry,
  listExams,
  getExamById,
  updateExam,
  deleteExam,
  createExamQuestion,
  listExamQuestions,
  assignExam,
  listStudentExams,
  startExamSession,
  saveQuestionAttempt,
  submitExamSession,
  getExamSession,
  listSubmittedExamScores,
} = require("../controllers/exams.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin: List all submitted exam scores, filterable by exam
router.get("/admin/submitted-scores", protect, requireRole("admin"), listSubmittedExamScores);

router.get("/", protect, listExams);
router.post("/", protect, requireRole("admin"), createExam);
router.get("/assigned/me", protect, requireRole("student"), listStudentExams);
router.post("/entry/validate", protect, requireRole("student"), validateExamCodeEntry);

router.get("/:examId", protect, getExamById);
router.put("/:examId", protect, requireRole("admin"), updateExam);
router.delete("/:examId", protect, requireRole("admin"), deleteExam);

router.get("/:examId/questions", protect, listExamQuestions);
router.post("/:examId/questions", protect, requireRole("admin"), createExamQuestion);
router.post("/:examId/assign", protect, requireRole("admin"), assignExam);

router.post("/sessions/start", protect, requireRole("student"), startExamSession);
router.post("/sessions/attempt", protect, saveQuestionAttempt);
router.post("/sessions/submit", protect, requireRole("student"), submitExamSession);
router.get("/sessions/:sessionId", protect, getExamSession);

module.exports = router;

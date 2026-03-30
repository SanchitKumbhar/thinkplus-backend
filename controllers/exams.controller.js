
const asyncHandler = require("express-async-handler");
const Exam = require("../models/Exam");
const ExamQuestion = require("../models/ExamQuestion");
const ExamAssignment = require("../models/ExamAssignment");
const ExamSession = require("../models/ExamSession");
const QuestionAttempt = require("../models/QuestionAttempt");

// List all submitted exam sessions with scores, filterable by examId
const listSubmittedExamScores = asyncHandler(async (req, res) => {
  const { examId } = req.query;
  const filter = { status: "submitted" };
  if (examId) filter.examId = examId;
  const sessions = await ExamSession.find(filter)
    .populate("studentId", "fullName email")
    .populate("examId", "title")
    .sort({ submittedAt: -1 });
  res.status(200).json(sessions);
});

const shuffleArray = (items = []) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateExamCode = () => `EX${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const generateUniqueExamCode = async () => {
  let code = generateExamCode();
  let exists = await Exam.exists({ examCode: code });
  let attempts = 0;

  while (exists && attempts < 10) {
    code = generateExamCode();
    exists = await Exam.exists({ examCode: code });
    attempts += 1;
  }

  if (exists) {
    throw new Error("Unable to generate unique exam code. Please retry.");
  }

  return code;
};

const createExam = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.user._id,
  };

  let createdExam = null;
  let attempts = 0;

  while (!createdExam && attempts < 5) {
    try {
      payload.examCode = await generateUniqueExamCode();
      createdExam = await Exam.create(payload);
    } catch (error) {
      if (error?.code === 11000) {
        attempts += 1;
        continue;
      }
      throw error;
    }
  }

  if (!createdExam) {
    res.status(500);
    throw new Error("Failed to create exam with unique code. Please retry.");
  }

  res.status(201).json(createdExam);
});

const validateExamCodeEntry = asyncHandler(async (req, res) => {
  const examCode = String(req.body?.examCode || "").trim().toUpperCase();
  if (!examCode) {
    res.status(400);
    throw new Error("examCode is required");
  }

  const exam = await Exam.findOne({ examCode });
  if (!exam) {
    res.status(404);
    throw new Error("Invalid exam code");
  }

  res.status(200).json({
    exam: {
      _id: exam._id,
      title: exam.title,
      totalQuestions: exam.totalQuestions,
      durationMinutes: exam.durationMinutes,
      markingScheme: exam.markingScheme,
      rules: exam.rules,
      schedule: exam.schedule,
      examCode: exam.examCode,
    },
  });
});

const listExams = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const exams = await Exam.find(filter).sort({ createdAt: -1 });
  res.status(200).json(exams);
});

const getExamById = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.examId || req.params.id);
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  res.status(200).json(exam);
});

const updateExam = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.examCode) {
    payload.examCode = String(payload.examCode).trim().toUpperCase();
  }

  const exam = await Exam.findByIdAndUpdate(req.params.examId || req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  res.status(200).json(exam);
});

const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByIdAndDelete(req.params.examId || req.params.id);
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  res.status(200).json({ message: "Exam deleted" });
});

const createExamQuestion = asyncHandler(async (req, res) => {
  const examId = req.params.examId;
  const exam = await Exam.findById(examId);
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!req.body?.topic || !String(req.body.topic).trim()) {
    res.status(400);
    throw new Error("Question topic is required");
  }

  if (!req.body?.difficulty || !["easy", "medium", "hard"].includes(String(req.body.difficulty).toLowerCase())) {
    res.status(400);
    throw new Error("Question difficulty must be one of: easy, medium, hard");
  }

  const question = await ExamQuestion.create({
    ...req.body,
    difficulty: String(req.body.difficulty).toLowerCase(),
    examId,
  });

  await Exam.findByIdAndUpdate(examId, { $inc: { totalQuestions: 1 } });

  res.status(201).json(question);
});

const listExamQuestions = asyncHandler(async (req, res) => {
  const questions = await ExamQuestion.find({ examId: req.params.examId });

  let orderedQuestions = questions;

  if (req.user.role === "admin") {
    orderedQuestions = [...questions].sort((a, b) => (a.questionNo || 0) - (b.questionNo || 0));
  } else {
    const sessionId = String(req.query.sessionId || "").trim();

    if (sessionId) {
      const session = await ExamSession.findById(sessionId).select("studentId examId questionOrder");
      if (!session) {
        res.status(404);
        throw new Error("Session not found");
      }

      if (session.studentId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Forbidden");
      }

      if (session.examId.toString() !== req.params.examId.toString()) {
        res.status(400);
        throw new Error("Session does not belong to this exam");
      }

      const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
      let questionOrder = (session.questionOrder || []).map((id) => id.toString());

      if (!questionOrder.length) {
        questionOrder = shuffleArray(questions.map((q) => q._id.toString()));
        session.questionOrder = questionOrder;
        await session.save();
      }

      const ordered = [];
      questionOrder.forEach((id) => {
        const question = questionMap.get(id);
        if (question) {
          ordered.push(question);
          questionMap.delete(id);
        }
      });

      // If admin added new questions after session start, append them in random order.
      const remaining = shuffleArray(Array.from(questionMap.values()));
      orderedQuestions = [...ordered, ...remaining];
    } else {
      orderedQuestions = shuffleArray(questions);
    }
  }

  const safeQuestions = req.user.role === "admin"
    ? orderedQuestions
    : orderedQuestions.map((q) => ({
        _id: q._id,
        examId: q.examId,
        questionNo: q.questionNo,
        questionType: q.questionType,
        questionText: q.questionText,
        topic: q.topic,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        media: q.media,
        options: q.options.map((o) => ({ _id: o._id, label: o.label, text: o.text })),
      }));

  res.status(200).json(safeQuestions);
});

const assignExam = asyncHandler(async (req, res) => {
  const { studentIds = [] } = req.body;
  const examId = req.params.examId;

  if (!studentIds.length) {
    res.status(400);
    throw new Error("studentIds is required");
  }

  const created = [];
  for (const studentId of studentIds) {
    const assignment = await ExamAssignment.findOneAndUpdate(
      { examId, studentId },
      { examId, studentId, assignedBy: req.user._id, status: "assigned" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created.push(assignment);
  }

  res.status(201).json(created);
});

const listStudentExams = asyncHandler(async (req, res) => {
  const [assignments, sessions] = await Promise.all([
    ExamAssignment.find({ studentId: req.user._id })
      .populate("examId")
      .sort({ assignedAt: -1 }),
    ExamSession.find({ studentId: req.user._id })
      .populate("examId")
      .sort({ startedAt: -1 }),
  ]);

  // Keep backwards compatibility with assignment objects while also returning
  // code-entry exam attempts that never created assignments.
  const mergedByExamId = new Map();

  assignments.forEach((assignment) => {
    if (!assignment.examId?._id) return;
    mergedByExamId.set(String(assignment.examId._id), assignment);
  });

  sessions.forEach((session) => {
    if (!session.examId?._id) return;
    const key = String(session.examId._id);
    const existing = mergedByExamId.get(key);

    if (!existing) {
      mergedByExamId.set(key, {
        _id: session._id,
        examId: session.examId,
        status: session.status === "active" ? "started" : session.status,
        assignedAt: session.startedAt,
        sessionId: session._id,
        scoreObtained: session.scoreObtained,
        accuracyPct: session.accuracyPct,
        submittedAt: session.submittedAt,
      });
      return;
    }

    // Prefer richer status from the latest session if it is beyond "assigned".
    if (existing.status === "assigned" && session.status && session.status !== "active") {
      existing.status = session.status;
      existing.sessionId = session._id;
      existing.scoreObtained = session.scoreObtained;
      existing.accuracyPct = session.accuracyPct;
      existing.submittedAt = session.submittedAt;
    }
  });

  const result = Array.from(mergedByExamId.values()).sort(
    (a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0)
  );

  res.status(200).json(result);
});

const startExamSession = asyncHandler(async (req, res) => {
  const { examId, examCode, entryMeta } = req.body;

  if (!examId || !examCode) {
    res.status(400);
    throw new Error("examId and examCode are required");
  }

  const exam = await Exam.findById(examId).select("examCode");
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (!exam.examCode) {
    exam.examCode = generateExamCode();
    await exam.save();
  }

  if ((exam.examCode || "").toUpperCase() !== String(examCode).toUpperCase().trim()) {
    res.status(400);
    throw new Error("Invalid exam code");
  }

  const existingSession = await ExamSession.findOne({ examId, studentId: req.user._id }).select("status");
  if (existingSession && existingSession.status !== "active") {
    res.status(403);
    if (existingSession.status === "auto_submitted") {
      throw new Error("Your test was auto-submitted. You can resume only after admin reverts this submission.");
    }
    throw new Error("This test session is already closed and cannot be started again.");
  }

  const session = await ExamSession.findOneAndUpdate(
    { examId, studentId: req.user._id },
    {
      examId,
      studentId: req.user._id,
      status: "active",
      examCodeUsed: String(examCode).toUpperCase().trim(),
      entryMeta: {
        userAgent: entryMeta?.userAgent,
        platform: entryMeta?.platform,
        language: entryMeta?.language,
        timezone: entryMeta?.timezone,
        screenWidth: entryMeta?.screenWidth,
        screenHeight: entryMeta?.screenHeight,
        enteredAt: new Date(),
        ipAddress: req.ip,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!session.questionOrder || !session.questionOrder.length) {
    const questionIds = await ExamQuestion.find({ examId }).distinct("_id");
    session.questionOrder = shuffleArray(questionIds.map((id) => id.toString()));
    await session.save();
  }

  res.status(200).json(session);
});

const saveQuestionAttempt = asyncHandler(async (req, res) => {
  const { sessionId, questionId, selectedOptionId, visitStatus, isMarkedForReview } = req.body;

  const session = await ExamSession.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (req.user.role === "student" && session.studentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Forbidden");
  }

  if (session.status !== "active") {
    res.status(400);
    throw new Error("This session is not active.");
  }

  const question = await ExamQuestion.findById(questionId);
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }

  let isCorrect;
  let marksAwarded;
  if (selectedOptionId) {
    const selected = question.options.find((o) => o._id.toString() === selectedOptionId);
    isCorrect = Boolean(selected && selected.isCorrect);
    marksAwarded = isCorrect ? question.marks : -Math.abs(question.negativeMarks || 0);
  }

  const attempt = await QuestionAttempt.findOneAndUpdate(
    { sessionId, questionId },
    {
      sessionId,
      examId: session.examId,
      studentId: session.studentId,
      questionId,
      selectedOptionId,
      visitStatus: visitStatus || (selectedOptionId ? "answered" : "not_answered"),
      isMarkedForReview: Boolean(isMarkedForReview),
      isCorrect,
      marksAwarded,
      answeredAt: selectedOptionId ? new Date() : undefined,
      viewedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json(attempt);
});

const submitExamSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const session = await ExamSession.findById(sessionId);

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (session.studentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Forbidden");
  }

  if (session.status !== "active") {
    res.status(400);
    throw new Error("This session is already submitted or closed.");
  }

  const attempts = await QuestionAttempt.find({ sessionId });
  const score = attempts.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
  const answered = attempts.filter((a) => a.selectedOptionId).length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  session.status = "submitted";
  session.submittedAt = new Date();
  session.scoreObtained = score;
  session.accuracyPct = accuracyPct;
  if (session.startedAt) {
    session.timeTakenSeconds = Math.max(0, Math.round((session.submittedAt - session.startedAt) / 1000));
  }
  await session.save();

  await ExamAssignment.findOneAndUpdate(
    { examId: session.examId, studentId: session.studentId },
    { status: "submitted" }
  );

  res.status(200).json(session);
});

const getExamSession = asyncHandler(async (req, res) => {
  const session = await ExamSession.findById(req.params.sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (req.user.role === "student" && session.studentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Forbidden");
  }

  const attempts = await QuestionAttempt.find({ sessionId: session._id });

  res.status(200).json({ session, attempts });
});

module.exports = {
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
};

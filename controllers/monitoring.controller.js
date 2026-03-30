const asyncHandler = require("express-async-handler");
const AntiCheatEvent = require("../models/AntiCheatEvent");
const MonitoringSession = require("../models/MonitoringSession");
const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");
const QuestionAttempt = require("../models/QuestionAttempt");
const ExamAssignment = require("../models/ExamAssignment");

const TAB_SWITCH_AUTO_SUBMIT_THRESHOLD = 2;

const finalizeSessionSubmission = async (session, status) => {
  const attempts = await QuestionAttempt.find({ sessionId: session._id });
  const score = attempts.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
  const answered = attempts.filter((a) => a.selectedOptionId).length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  session.status = status;
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

  return session;
};

const reportAntiCheatEvent = asyncHandler(async (req, res) => {
  const { sessionId, eventType, severity = "low", payload } = req.body;

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
    throw new Error("Anti-cheat events can only be reported for active sessions");
  }

  const event = await AntiCheatEvent.create({
    sessionId,
    examId: session.examId,
    studentId: req.user._id,
    eventType,
    severity,
    payload,
  });

  session.warningCount = (session.warningCount || 0) + 1;
  if (eventType === "tab_switch") {
    session.tabSwitchCount = (session.tabSwitchCount || 0) + 1;
  }

  let autoSubmittedSession = null;
  if (eventType === "tab_switch" && session.tabSwitchCount >= TAB_SWITCH_AUTO_SUBMIT_THRESHOLD) {
    autoSubmittedSession = await finalizeSessionSubmission(session, "auto_submitted");
  } else {
    await session.save();
  }

  await MonitoringSession.findOneAndUpdate(
    { examId: session.examId },
    {
      examId: session.examId,
      $inc: {
        warningEventsCount: 1,
        highSeverityCount: severity === "high" ? 1 : 0,
      },
      $set: { lastUpdatedAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    event,
    autoSubmitted: Boolean(autoSubmittedSession),
    session: autoSubmittedSession || session,
    tabSwitchThreshold: TAB_SWITCH_AUTO_SUBMIT_THRESHOLD,
  });
});

const getExamMonitoring = asyncHandler(async (req, res) => {
  const examId = req.params.examId;
  const exam = await Exam.findById(examId);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const [monitoring, activeSessions, autoSubmittedSessions, recentEvents] = await Promise.all([
    MonitoringSession.findOne({ examId }),
    ExamSession.find({ examId, status: "active" }).populate("studentId", "fullName email"),
    ExamSession.find({ examId, status: "auto_submitted" })
      .sort({ submittedAt: -1 })
      .limit(100)
      .populate("studentId", "fullName email"),
    AntiCheatEvent.find({ examId }).sort({ occurredAt: -1 }).limit(100).populate("studentId", "fullName email"),
  ]);

  res.status(200).json({
    exam,
    monitoring,
    activeSessions,
    autoSubmittedSessions,
    recentEvents,
  });
});

const revertAutoSubmittedSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ExamSession.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (session.status !== "auto_submitted") {
    res.status(400);
    throw new Error("Only auto-submitted sessions can be reverted");
  }

  session.status = "active";
  session.submittedAt = undefined;
  session.timeTakenSeconds = undefined;
  session.scoreObtained = undefined;
  session.accuracyPct = undefined;
  session.tabSwitchCount = 0;
  await session.save();

  await ExamAssignment.findOneAndUpdate(
    { examId: session.examId, studentId: session.studentId },
    { status: "started" }
  );

  res.status(200).json({
    message: "Auto-submitted session reverted to active",
    session,
  });
});

module.exports = {
  reportAntiCheatEvent,
  getExamMonitoring,
  revertAutoSubmittedSession,
};

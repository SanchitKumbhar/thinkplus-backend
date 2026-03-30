const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const examSessionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "submitted", "auto_submitted", "disqualified"],
      default: "active",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    timeTakenSeconds: {
      type: Number,
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    warningCount: {
      type: Number,
      default: 0,
    },
    scoreObtained: {
      type: Number,
    },
    accuracyPct: {
      type: Number,
    },
    percentile: {
      type: Number,
    },
    rankInExam: {
      type: Number,
    },
    questionOrder: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    examCodeUsed: {
      type: String,
      trim: true,
      uppercase: true,
    },
    entryMeta: {
      userAgent: {
        type: String,
      },
      platform: {
        type: String,
      },
      language: {
        type: String,
      },
      timezone: {
        type: String,
      },
      screenWidth: {
        type: Number,
      },
      screenHeight: {
        type: Number,
      },
      enteredAt: {
        type: Date,
      },
      ipAddress: {
        type: String,
      },
    },
  },
  {
    collection: "exam_sessions",
    versionKey: false,
  }
);

examSessionSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examSessionSchema.index({ examId: 1, status: 1 });
examSessionSchema.index({ studentId: 1, startedAt: -1 });

applyCascadeDelete(examSessionSchema, (session) => [
  {
    model: () => require("./QuestionAttempt"),
    action: "deleteMany",
    filter: { sessionId: session._id },
  },
  {
    model: () => require("./AntiCheatEvent"),
    action: "deleteMany",
    filter: { sessionId: session._id },
  },
]);

module.exports =
  mongoose.models.ExamSession || mongoose.model("ExamSession", examSessionSchema);

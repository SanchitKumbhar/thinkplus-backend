const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    examType: {
      type: String,
      trim: true,
    },
    classLevel: {
      type: String,
      trim: true,
    },
    examCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    maxMarks: {
      type: Number,
    },
    markingScheme: {
      positiveMark: {
        type: Number,
        default: 4,
      },
      negativeMark: {
        type: Number,
        default: 1,
      },
    },
    schedule: {
      startAt: {
        type: Date,
      },
      endAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "live", "completed", "archived"],
      default: "draft",
    },
    rules: {
      instructions: {
        type: String,
      },
      antiCheatWarning: {
        type: String,
      },
      autoSubmitTabSwitchLimit: {
        type: Number,
        default: 5,
      },
      allowReviewMark: {
        type: Boolean,
        default: true,
      },
    },
    assignedTo: {
      batchCodes: [
        {
          type: String,
          trim: true,
        },
      ],
      specificStudentIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    collection: "exams",
    timestamps: true,
  }
);

examSchema.index({ status: 1, "schedule.startAt": 1 });
examSchema.index({ createdBy: 1, createdAt: -1 });
examSchema.index({ "assignedTo.batchCodes": 1 });
examSchema.index({ createdAt: -1 });

applyCascadeDelete(examSchema, (exam) => [
  {
    model: () => require("./ExamQuestion"),
    action: "deleteMany",
    filter: { examId: exam._id },
  },
  {
    model: () => require("./ExamAssignment"),
    action: "deleteMany",
    filter: { examId: exam._id },
  },
  {
    model: () => require("./ExamSession"),
    action: "deleteMany",
    filter: { examId: exam._id },
  },
  {
    model: () => require("./QuestionAttempt"),
    action: "deleteMany",
    filter: { examId: exam._id },
  },
  {
    model: () => require("./AntiCheatEvent"),
    action: "deleteMany",
    filter: { examId: exam._id },
  },
  {
    model: () => require("./MonitoringSession"),
    action: "deleteOne",
    filter: { examId: exam._id },
  },
]);

module.exports = mongoose.models.Exam || mongoose.model("Exam", examSchema);

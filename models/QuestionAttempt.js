const mongoose = require("mongoose");

const questionAttemptSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamQuestion",
      required: true,
    },
    selectedOptionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    visitStatus: {
      type: String,
      enum: ["not_visited", "not_answered", "answered", "review"],
      default: "not_visited",
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
    isCorrect: {
      type: Boolean,
    },
    marksAwarded: {
      type: Number,
    },
    viewedAt: {
      type: Date,
    },
    answeredAt: {
      type: Date,
    },
  },
  {
    collection: "question_attempts",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

questionAttemptSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });
questionAttemptSchema.index({ examId: 1, studentId: 1 });

module.exports =
  mongoose.models.QuestionAttempt ||
  mongoose.model("QuestionAttempt", questionAttemptSchema);

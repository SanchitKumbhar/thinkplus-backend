const mongoose = require("mongoose");

const practiceAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeTopic",
      required: true,
    },
    practiceQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeQuestion",
      required: true,
    },
    selectedOptionId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    basePoints: {
      type: Number,
      default: 0,
    },
    streakAtAttempt: {
      type: Number,
      default: 0,
    },
    streakBonusPoints: {
      type: Number,
      default: 0,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "practice_attempts",
    versionKey: false,
  }
);

practiceAttemptSchema.index({ studentId: 1, attemptedAt: -1 });
practiceAttemptSchema.index({ studentId: 1, topicId: 1 });
practiceAttemptSchema.index({ practiceQuestionId: 1, isCorrect: 1 });
practiceAttemptSchema.index({ studentId: 1, streakAtAttempt: -1 });

module.exports =
  mongoose.models.PracticeAttempt ||
  mongoose.model("PracticeAttempt", practiceAttemptSchema);

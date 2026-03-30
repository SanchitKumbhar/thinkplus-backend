const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    academicProgram: {
      type: String,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
    },
    batchCode: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    pointsTotal: {
      type: Number,
      default: 0,
    },
    currentStreakDays: {
      type: Number,
      default: 0,
    },
    levelNo: {
      type: Number,
      default: 1,
    },
    rankGlobal: {
      type: Number,
    },
    examsAttemptedCount: {
      type: Number,
      default: 0,
    },
    avgAccuracyPct: {
      type: Number,
      default: 0,
    },
    practicePointsTotal: {
      type: Number,
      default: 0,
    },
    practiceCurrentCorrectStreak: {
      type: Number,
      default: 0,
    },
    practiceBestCorrectStreak: {
      type: Number,
      default: 0,
    },
    practiceAttemptCount: {
      type: Number,
      default: 0,
    },
    practiceCorrectCount: {
      type: Number,
      default: 0,
    },
    practiceStreakSum: {
      type: Number,
      default: 0,
    },
    practiceAvgCorrectStreak: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "student_profiles",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

studentProfileSchema.index({ batchCode: 1, rankGlobal: 1 });
studentProfileSchema.index({ pointsTotal: -1 });

module.exports =
  mongoose.models.StudentProfile ||
  mongoose.model("StudentProfile", studentProfileSchema);

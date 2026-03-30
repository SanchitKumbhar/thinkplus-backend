const mongoose = require("mongoose");

const studentBadgeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "student_badges",
    versionKey: false,
  }
);

studentBadgeSchema.index({ studentId: 1, badgeId: 1 }, { unique: true });
studentBadgeSchema.index({ studentId: 1, unlockedAt: -1 });

module.exports =
  mongoose.models.StudentBadge || mongoose.model("StudentBadge", studentBadgeSchema);

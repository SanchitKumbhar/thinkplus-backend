const mongoose = require("mongoose");

const studentTopicStatSchema = new mongoose.Schema(
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
    masteryPct: {
      type: Number,
      default: 0,
    },
    accuracyPct: {
      type: Number,
      default: 0,
    },
    solvedCount: {
      type: Number,
      default: 0,
    },
    totalAttempted: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "student_topic_stats",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

studentTopicStatSchema.index({ studentId: 1, topicId: 1 }, { unique: true });
studentTopicStatSchema.index({ studentId: 1, masteryPct: -1 });

module.exports =
  mongoose.models.StudentTopicStat ||
  mongoose.model("StudentTopicStat", studentTopicStatSchema);

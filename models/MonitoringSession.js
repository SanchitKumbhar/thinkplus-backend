const mongoose = require("mongoose");

const monitoringSessionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      unique: true,
    },
    examTitle: {
      type: String,
      trim: true,
    },
    activeStudentsCount: {
      type: Number,
      default: 0,
    },
    totalStudentsCount: {
      type: Number,
      default: 0,
    },
    warningEventsCount: {
      type: Number,
      default: 0,
    },
    highSeverityCount: {
      type: Number,
      default: 0,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "monitoring_sessions",
    versionKey: false,
  }
);

module.exports =
  mongoose.models.MonitoringSession ||
  mongoose.model("MonitoringSession", monitoringSessionSchema);

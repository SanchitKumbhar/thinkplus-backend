const mongoose = require("mongoose");

const antiCheatEventSchema = new mongoose.Schema(
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
      ref: "User",
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "tab_switch",
        "fullscreen_exit",
        "window_blur",
        "copy_attempt",
        "right_click",
        "devtools_open",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "anti_cheat_events",
    versionKey: false,
  }
);

antiCheatEventSchema.index({ sessionId: 1, occurredAt: -1 });
antiCheatEventSchema.index({ examId: 1, severity: 1, occurredAt: -1 });
antiCheatEventSchema.index({ studentId: 1, occurredAt: -1 });

module.exports =
  mongoose.models.AntiCheatEvent ||
  mongoose.model("AntiCheatEvent", antiCheatEventSchema);

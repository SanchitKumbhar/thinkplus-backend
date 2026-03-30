const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetRole: {
      type: String,
      enum: ["student", "admin", "all"],
      default: "all",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    publishAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "notices",
    versionKey: false,
  }
);

noticeSchema.index({ targetRole: 1, publishAt: -1 });
noticeSchema.index({ isPinned: 1, publishAt: -1 });

module.exports = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);

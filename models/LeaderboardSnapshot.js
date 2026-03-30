const mongoose = require("mongoose");

const leaderboardSnapshotSchema = new mongoose.Schema(
  {
    boardType: {
      type: String,
      enum: ["weekly", "monthly", "all_time"],
      required: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    rankNo: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {
    collection: "leaderboard_snapshots",
    versionKey: false,
  }
);

leaderboardSnapshotSchema.index(
  { boardType: 1, snapshotDate: 1, studentId: 1 },
  { unique: true }
);
leaderboardSnapshotSchema.index({ boardType: 1, snapshotDate: 1, rankNo: 1 });
leaderboardSnapshotSchema.index({ boardType: 1, snapshotDate: -1, points: -1 });

module.exports =
  mongoose.models.LeaderboardSnapshot ||
  mongoose.model("LeaderboardSnapshot", leaderboardSnapshotSchema);

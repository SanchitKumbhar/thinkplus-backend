const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const badgeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String,
      trim: true,
    },
    pointsReward: {
      type: Number,
      default: 0,
    },
    criteria: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    collection: "badges",
    versionKey: false,
  }
);

applyCascadeDelete(badgeSchema, (badge) => [
  {
    model: () => require("./StudentBadge"),
    action: "deleteMany",
    filter: { badgeId: badge._id },
  },
]);

module.exports = mongoose.models.Badge || mongoose.model("Badge", badgeSchema);

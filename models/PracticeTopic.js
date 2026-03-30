const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const practiceTopicSchema = new mongoose.Schema(
  {
    classLevel: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    topicName: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    easyToMediumUnlockCount: {
      type: Number,
      min: 1,
    },
    mediumToHardUnlockCount: {
      type: Number,
      min: 1,
    },
    practiceCountEasy: {
      type: Number,
      min: 1,
    },
    practiceCountMedium: {
      type: Number,
      min: 1,
    },
    practiceCountHard: {
      type: Number,
      min: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "practice_topics",
    versionKey: false,
  }
);

practiceTopicSchema.index({ classLevel: 1, subject: 1, topicName: 1 }, { unique: true });
practiceTopicSchema.index({ isActive: 1, classLevel: 1, subject: 1 });

applyCascadeDelete(practiceTopicSchema, (topic) => [
  {
    model: () => require("./PracticeQuestion"),
    action: "deleteMany",
    filter: { topicId: topic._id },
  },
  {
    model: () => require("./PracticeAttempt"),
    action: "deleteMany",
    filter: { topicId: topic._id },
  },
  {
    model: () => require("./StudentTopicStat"),
    action: "deleteMany",
    filter: { topicId: topic._id },
  },
]);

module.exports =
  mongoose.models.PracticeTopic ||
  mongoose.model("PracticeTopic", practiceTopicSchema);

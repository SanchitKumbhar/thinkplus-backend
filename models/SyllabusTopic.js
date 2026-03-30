const mongoose = require("mongoose");

const syllabusTopicSchema = new mongoose.Schema(
  {
    classLevel: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    topicName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: "syllabus_topics",
    timestamps: true,
    versionKey: false,
  }
);

syllabusTopicSchema.index({ classLevel: 1, subject: 1, topicName: 1 }, { unique: true });
syllabusTopicSchema.index({ classLevel: 1, isActive: 1 });

module.exports =
  mongoose.models.SyllabusTopic ||
  mongoose.model("SyllabusTopic", syllabusTopicSchema);

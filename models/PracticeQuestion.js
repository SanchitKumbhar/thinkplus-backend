const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const practiceOptionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const practiceQuestionSchema = new mongoose.Schema(
  {
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeTopic",
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
    },
    pointsReward: {
      type: Number,
      default: 20,
    },
    options: {
      type: [practiceOptionSchema],
      default: [],
    },
    media: {
      imageUrl: {
        type: String,
      },
      imageName: {
        type: String,
      },
      videoUrl: {
        type: String,
      },
      videoName: {
        type: String,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "practice_questions",
    versionKey: false,
  }
);

practiceQuestionSchema.index({ topicId: 1, difficulty: 1 });
practiceQuestionSchema.index({ createdBy: 1, createdAt: -1 });

applyCascadeDelete(practiceQuestionSchema, (question) => [
  {
    model: () => require("./PracticeAttempt"),
    action: "deleteMany",
    filter: { practiceQuestionId: question._id },
  },
]);

module.exports =
  mongoose.models.PracticeQuestion ||
  mongoose.model("PracticeQuestion", practiceQuestionSchema);

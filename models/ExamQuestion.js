const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
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

const examQuestionSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    questionNo: {
      type: Number,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["mcq_single"],
      default: "mcq_single",
    },
    questionText: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    marks: {
      type: Number,
      required: true,
      default: 4,
    },
    negativeMarks: {
      type: Number,
      required: true,
      default: 1,
    },
    options: {
      type: [optionSchema],
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
    explanation: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "exam_questions",
    versionKey: false,
  }
);

examQuestionSchema.index({ examId: 1, questionNo: 1 }, { unique: true });
examQuestionSchema.index({ examId: 1, topic: 1 });
examQuestionSchema.index({ examId: 1, subject: 1, topic: 1 });

module.exports =
  mongoose.models.ExamQuestion || mongoose.model("ExamQuestion", examQuestionSchema);

const mongoose = require("mongoose");

const examAssignmentSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["assigned", "started", "submitted", "expired"],
      default: "assigned",
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "exam_assignments",
    versionKey: false,
  }
);

examAssignmentSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examAssignmentSchema.index({ studentId: 1, status: 1 });
examAssignmentSchema.index({ examId: 1, status: 1 });

module.exports =
  mongoose.models.ExamAssignment ||
  mongoose.model("ExamAssignment", examAssignmentSchema);

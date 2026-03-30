const mongoose = require("mongoose");
const { applyCascadeDelete } = require("./plugins/cascadeDelete");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    collection: "users",
    timestamps: true,
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });

applyCascadeDelete(userSchema, (user) => [
  {
    model: () => require("./StudentProfile"),
    action: "deleteOne",
    filter: { userId: user._id },
  },
  {
    model: () => require("./AdminProfile"),
    action: "deleteOne",
    filter: { userId: user._id },
  },
  {
    model: () => require("./Exam"),
    action: "deleteMany",
    filter: { createdBy: user._id },
  },
  {
    model: () => require("./Exam"),
    action: "updateMany",
    filter: { "assignedTo.specificStudentIds": user._id },
    update: { $pull: { "assignedTo.specificStudentIds": user._id } },
  },
  {
    model: () => require("./ExamAssignment"),
    action: "deleteMany",
    filter: { $or: [{ studentId: user._id }, { assignedBy: user._id }] },
  },
  {
    model: () => require("./ExamSession"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./QuestionAttempt"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./AntiCheatEvent"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./PracticeQuestion"),
    action: "deleteMany",
    filter: { createdBy: user._id },
  },
  {
    model: () => require("./PracticeAttempt"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./StudentTopicStat"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./StudentBadge"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./LeaderboardSnapshot"),
    action: "deleteMany",
    filter: { studentId: user._id },
  },
  {
    model: () => require("./Notice"),
    action: "deleteMany",
    filter: { postedBy: user._id },
  },
]);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);

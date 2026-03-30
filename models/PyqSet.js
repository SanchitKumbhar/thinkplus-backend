const mongoose = require("mongoose");

const pyqSetSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      trim: true,
    },
    examYear: {
      type: Number,
    },
    title: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "pyq_sets",
    versionKey: false,
  }
);

pyqSetSchema.index({ examName: 1, examYear: -1 });

module.exports = mongoose.models.PyqSet || mongoose.model("PyqSet", pyqSetSchema);

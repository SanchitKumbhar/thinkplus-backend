const mongoose = require("mongoose");

const adminProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    settings: {
      emailAlertsEnabled: {
        type: Boolean,
        default: true,
      },
      strictAntiCheatEnabled: {
        type: Boolean,
        default: true,
      },
      darkModeEnabled: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    collection: "admin_profiles",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

module.exports =
  mongoose.models.AdminProfile || mongoose.model("AdminProfile", adminProfileSchema);

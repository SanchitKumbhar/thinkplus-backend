const express = require("express");
const {
  getMyProfile,
  updateMyProfile,
  listStudents,
  deleteUserWithCascade,
} = require("../controllers/profiles.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);
router.get("/students", protect, requireRole("admin"), listStudents);
router.delete("/users/:userId", protect, requireRole("admin"), deleteUserWithCascade);

module.exports = router;

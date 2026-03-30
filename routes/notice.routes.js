const express = require("express");
const {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} = require("../controllers/notice.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, listNotices);
router.post("/", protect, requireRole("admin"), createNotice);
router.put("/:noticeId", protect, requireRole("admin"), updateNotice);
router.delete("/:noticeId", protect, requireRole("admin"), deleteNotice);

module.exports = router;

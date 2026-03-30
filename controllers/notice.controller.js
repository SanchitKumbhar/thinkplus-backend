const asyncHandler = require("express-async-handler");
const Notice = require("../models/Notice");

const listNotices = asyncHandler(async (req, res) => {
  const roleFilter = req.user?.role === "admin"
    ? {}
    : { targetRole: { $in: [req.user?.role || "student", "all"] } };

  const notices = await Notice.find({
    ...roleFilter,
    publishAt: { $lte: new Date() },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ isPinned: -1, publishAt: -1 });

  res.status(200).json(notices);
});

const createNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.create({
    ...req.body,
    postedBy: req.user._id,
  });

  res.status(201).json(notice);
});

const updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndUpdate(req.params.noticeId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!notice) {
    res.status(404);
    throw new Error("Notice not found");
  }

  res.status(200).json(notice);
});

const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.noticeId);

  if (!notice) {
    res.status(404);
    throw new Error("Notice not found");
  }

  res.status(200).json({ message: "Notice deleted" });
});

module.exports = {
  listNotices,
  createNotice,
  updateNotice,
  deleteNotice,
};

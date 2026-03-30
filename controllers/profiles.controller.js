const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AdminProfile = require("../models/AdminProfile");

const getMyProfile = asyncHandler(async (req, res) => {
  if (req.user.role === "student") {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    return res.status(200).json({ user: req.user, profile });
  }

  const profile = await AdminProfile.findOne({ userId: req.user._id });
  return res.status(200).json({ user: req.user, profile });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { fullName, avatarUrl, ...rest } = req.body;

  if (fullName) {
    await User.findByIdAndUpdate(req.user._id, { fullName }, { new: true });
  }

  if (req.user.role === "student") {
    const profile = await StudentProfile.findOneAndUpdate(
      { userId: req.user._id },
      { avatarUrl, ...rest },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json(profile);
  }

  const profile = await AdminProfile.findOneAndUpdate(
    { userId: req.user._id },
    { avatarUrl, ...rest },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return res.status(200).json(profile);
});

const listStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "student" }).select("-passwordHash").sort({ createdAt: -1 });
  const profiles = await StudentProfile.find({ userId: { $in: students.map((s) => s._id) } });

  const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const merged = students.map((s) => ({
    ...s.toObject(),
    profile: profileByUserId.get(s._id.toString()) || null,
  }));

  res.status(200).json(merged);
});

const deleteUserWithCascade = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (req.user._id.toString() === user._id.toString()) {
    res.status(400);
    throw new Error("You cannot delete your own account");
  }

  await User.findByIdAndDelete(user._id);

  res.status(200).json({
    message: "User and related references deleted",
    deletedUserId: user._id,
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  listStudents,
  deleteUserWithCascade,
};

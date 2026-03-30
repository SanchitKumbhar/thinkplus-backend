const bcrypt = require("bcrypt");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AdminProfile = require("../models/AdminProfile");
const { signToken } = require("../utils/auth");

const buildUserPayload = async (user) => {
  const base = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  if (user.role === "student") {
    const profile = await StudentProfile.findOne({ userId: user._id });
    return { ...base, profile };
  }

  const profile = await AdminProfile.findOne({ userId: user._id });
  return { ...base, profile };
};

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, role = "student", profile = {} } = req.body;

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error("fullName, email, and password are required");
  }

  if (!["student", "admin"].includes(role)) {
    res.status(400);
    throw new Error("Invalid role");
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409);
    throw new Error("Email already in use");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    fullName,
    email,
    passwordHash,
    role,
  });

  if (role === "student") {
    await StudentProfile.create({
      userId: user._id,
      academicProgram: profile.academicProgram,
      yearOfStudy: profile.yearOfStudy,
      batchCode: profile.batchCode,
      avatarUrl: profile.avatarUrl,
    });
  } else {
    await AdminProfile.create({
      userId: user._id,
      avatarUrl: profile.avatarUrl,
      settings: profile.settings,
    });
  }

  const token = signToken(user);
  const payload = await buildUserPayload(user);

  res.status(201).json({ token, user: payload });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (role && user.role !== role) {
    res.status(403);
    throw new Error("Role mismatch for this account");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  const payload = await buildUserPayload(user);

  res.status(200).json({ token, user: payload });
});

const me = asyncHandler(async (req, res) => {
  const payload = await buildUserPayload(req.user);
  res.status(200).json(payload);
});

module.exports = {
  register,
  login,
  me,
};

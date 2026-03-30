const asyncHandler = require("express-async-handler");
const LeaderboardSnapshot = require("../models/LeaderboardSnapshot");
const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");

const getLeaderboard = asyncHandler(async (req, res) => {
  const boardType = req.query.boardType || "weekly";

  const latestSnapshot = await LeaderboardSnapshot.findOne({ boardType }).sort({ snapshotDate: -1 });

  if (latestSnapshot) {
    const rows = await LeaderboardSnapshot.find({
      boardType,
      snapshotDate: latestSnapshot.snapshotDate,
    }).sort({ rankNo: 1 });

    return res.status(200).json({ source: "snapshot", boardType, rows });
  }

  const dynamic = await StudentProfile.find()
    .sort({ pointsTotal: -1 })
    .limit(100)
    .populate({ path: "userId", select: "fullName" });

  const rows = dynamic.map((row, index) => ({
    rankNo: index + 1,
    studentId: row.userId?._id,
    name: row.userId?.fullName || "Student",
    points: row.pointsTotal || 0,
  }));

  return res.status(200).json({ source: "dynamic", boardType: "all_time", rows });
});

const createLeaderboardSnapshot = asyncHandler(async (req, res) => {
  const { boardType = "weekly", snapshotDate = new Date() } = req.body;

  const profiles = await StudentProfile.find()
    .sort({ pointsTotal: -1 })
    .populate({ path: "userId", select: "fullName" });

  const docs = [];
  for (let i = 0; i < profiles.length; i += 1) {
    const p = profiles[i];
    if (!p.userId) continue;

    docs.push({
      boardType,
      snapshotDate,
      studentId: p.userId._id,
      name: p.userId.fullName,
      points: p.pointsTotal || 0,
      rankNo: i + 1,
    });
  }

  await LeaderboardSnapshot.deleteMany({ boardType, snapshotDate: new Date(snapshotDate) });
  const inserted = await LeaderboardSnapshot.insertMany(docs);

  res.status(201).json({ count: inserted.length, boardType, snapshotDate });
});

const getStudentBadges = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.studentId).select("fullName role");
  if (!student || student.role !== "student") {
    res.status(404);
    throw new Error("Student not found");
  }

  const profile = await StudentProfile.findOne({ userId: req.params.studentId });

  res.status(200).json({ student, profile });
});

module.exports = {
  getLeaderboard,
  createLeaderboardSnapshot,
  getStudentBadges,
};

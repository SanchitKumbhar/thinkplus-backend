/* eslint-disable no-console */
require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AdminProfile = require("../models/AdminProfile");
const SyllabusTopic = require("../models/SyllabusTopic");
const PracticeTopic = require("../models/PracticeTopic");
const PracticeQuestion = require("../models/PracticeQuestion");
const PracticeAttempt = require("../models/PracticeAttempt");
const StudentTopicStat = require("../models/StudentTopicStat");
const Exam = require("../models/Exam");
const ExamQuestion = require("../models/ExamQuestion");
const ExamAssignment = require("../models/ExamAssignment");
const ExamSession = require("../models/ExamSession");
const QuestionAttempt = require("../models/QuestionAttempt");
const AntiCheatEvent = require("../models/AntiCheatEvent");
const MonitoringSession = require("../models/MonitoringSession");
const Notice = require("../models/Notice");
const LeaderboardSnapshot = require("../models/LeaderboardSnapshot");
const PyqSet = require("../models/PyqSet");

const STUDENT_PASSWORD = "123456";
const SEED_PREFIX = "[SEED]";
const SEED_EMAIL_DOMAIN = "seed.focusflair.local";
const argv = new Set(process.argv.slice(2));
const shouldReset = argv.has("--reset");

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randBool = (p = 0.5) => Math.random() < p;
const pickOne = (items) => items[randInt(0, items.length - 1)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientDnsError = (error) => {
  const text = `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();
  return text.includes("enotfound") || text.includes("getaddrinfo");
};

async function runWithDnsRetry(task, maxAttempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (!isTransientDnsError(error) || attempt === maxAttempts) {
        throw error;
      }

      const waitMs = attempt * 3000;
      console.warn(
        `Transient DNS error detected (attempt ${attempt}/${maxAttempts}). Retrying in ${waitMs / 1000}s...`
      );

      try {
        await mongoose.connection.close();
      } catch {
        // Ignore close errors and reconnect.
      }

      await sleep(waitMs);
      await connectDB();
    }
  }

  throw lastError;
}

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const standardOptions = (correctLabel) =>
  ["A", "B", "C", "D"].map((label) => ({
    label,
    text: `Option ${label}`,
    isCorrect: label === correctLabel,
  }));

const classBlueprint = {
  "Class 11": {
    Physics: ["Kinematics", "Laws of Motion", "Work Energy Power"],
    Chemistry: ["Structure of Atom", "Thermodynamics", "Equilibrium"],
    Mathematics: ["Sets", "Limits and Derivatives", "Trigonometric Functions"],
  },
  "Class 12": {
    Physics: ["Electrostatics", "Current Electricity", "Modern Physics"],
    Chemistry: ["Solutions", "Electrochemistry", "Biomolecules"],
    Mathematics: ["Matrices", "Integrals", "Probability"],
  },
};

async function cleanupSeedData() {
  const seedExams = await Exam.find({ title: new RegExp(`^\\${SEED_PREFIX}`) }).select("_id");
  const seedExamIds = seedExams.map((e) => e._id);

  if (seedExamIds.length) {
    await QuestionAttempt.deleteMany({ examId: { $in: seedExamIds } });
    await AntiCheatEvent.deleteMany({ examId: { $in: seedExamIds } });
    await ExamSession.deleteMany({ examId: { $in: seedExamIds } });
    await ExamAssignment.deleteMany({ examId: { $in: seedExamIds } });
    await MonitoringSession.deleteMany({ examId: { $in: seedExamIds } });
    await ExamQuestion.deleteMany({ examId: { $in: seedExamIds } });
  }

  const seedUsers = await User.find({ email: new RegExp(`@${SEED_EMAIL_DOMAIN}$`) }).select("_id");
  if (seedUsers.length) {
    await User.deleteMany({ _id: { $in: seedUsers.map((u) => u._id) } });
  }

  await Exam.deleteMany({ title: new RegExp(`^\\${SEED_PREFIX}`) });
  await Notice.deleteMany({ title: new RegExp(`^\\${SEED_PREFIX}`) });
  await PyqSet.deleteMany({ title: new RegExp(`^\\${SEED_PREFIX}`) });
  await LeaderboardSnapshot.deleteMany({ name: /Seed Student/i });
}

async function ensureAdmin(passwordHash) {
  const email = `admin@${SEED_EMAIL_DOMAIN}`;
  const adminUser = await User.findOneAndUpdate(
    { email },
    {
      fullName: "Seed Admin",
      email,
      role: "admin",
      passwordHash,
      isActive: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await AdminProfile.findOneAndUpdate(
    { userId: adminUser._id },
    {
      userId: adminUser._id,
      settings: {
        emailAlertsEnabled: true,
        strictAntiCheatEnabled: true,
        darkModeEnabled: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return adminUser;
}

async function createStudents(passwordHash, count = 24) {
  const students = [];

  for (let i = 1; i <= count; i += 1) {
    const classLevel = i <= count / 2 ? "Class 11" : "Class 12";
    const subjectGroup = i % 3 === 0 ? "PCM" : i % 3 === 1 ? "PCB" : "PCMB";
    const batchCode = `${classLevel.replace(" ", "")}-${subjectGroup}-B${String((i % 4) + 1).padStart(2, "0")}`;
    const email = `student${String(i).padStart(2, "0")}@${SEED_EMAIL_DOMAIN}`;

    const user = await User.findOneAndUpdate(
      { email },
      {
        fullName: `Seed Student ${String(i).padStart(2, "0")}`,
        email,
        role: "student",
        passwordHash,
        isActive: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await StudentProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        academicProgram: classLevel === "Class 11" ? "Science" : "Science Senior",
        yearOfStudy: classLevel === "Class 11" ? 1 : 2,
        batchCode,
        levelNo: randInt(1, 8),
        currentStreakDays: randInt(0, 12),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    students.push({ user, classLevel });
  }

  return students;
}

async function ensureSyllabusAndPracticeTopics() {
  const topics = [];

  for (const [classLevel, subjects] of Object.entries(classBlueprint)) {
    for (const [subject, topicNames] of Object.entries(subjects)) {
      for (const topicName of topicNames) {
        await SyllabusTopic.findOneAndUpdate(
          { classLevel, subject, topicName },
          { classLevel, subject, topicName, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const practiceTopic = await PracticeTopic.findOneAndUpdate(
          { classLevel, subject, topicName },
          { classLevel, subject, topicName, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        topics.push(practiceTopic);
      }
    }
  }

  return topics;
}

async function createPracticeQuestions(practiceTopics, adminId) {
  await PracticeQuestion.deleteMany({ questionText: new RegExp(`^\\${SEED_PREFIX}`) });

  const difficulties = ["easy", "medium", "hard"];
  const created = [];

  for (const topic of practiceTopics) {
    for (let i = 1; i <= 6; i += 1) {
      const correctLabel = pickOne(["A", "B", "C", "D"]);
      const difficulty = difficulties[(i - 1) % difficulties.length];
      const question = await PracticeQuestion.create({
        topicId: topic._id,
        difficulty,
        questionText: `${SEED_PREFIX} ${topic.classLevel} ${topic.subject} / ${topic.topicName} Practice Q${i}`,
        pointsReward: difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30,
        options: standardOptions(correctLabel),
        explanation: `${SEED_PREFIX} Practice explanation for ${topic.topicName} Q${i}`,
        createdBy: adminId,
      });
      created.push(question);
    }
  }

  return created;
}

async function createPracticeAttemptsAndStats(students, practiceTopics) {
  await PracticeAttempt.deleteMany({});
  await StudentTopicStat.deleteMany({});

  const questionsByTopic = new Map();
  const allQuestions = await PracticeQuestion.find({ questionText: new RegExp(`^\\${SEED_PREFIX}`) });
  allQuestions.forEach((q) => {
    const key = q.topicId.toString();
    const list = questionsByTopic.get(key) || [];
    list.push(q);
    questionsByTopic.set(key, list);
  });

  const profileUpdates = new Map();

  for (const s of students) {
    const studentId = s.user._id;
    const eligibleTopics = practiceTopics.filter((t) => t.classLevel === s.classLevel);
    const attemptsCount = randInt(20, 38);
    let streak = 0;

    const topicAgg = new Map();
    let practicePointsTotal = 0;
    let correctCount = 0;
    let streakSum = 0;
    let bestStreak = 0;

    for (let i = 0; i < attemptsCount; i += 1) {
      const topic = pickOne(eligibleTopics);
      const questions = questionsByTopic.get(topic._id.toString()) || [];
      if (!questions.length) continue;

      const question = pickOne(questions);
      const isCorrect = randBool(0.64);
      const correctOption = question.options.find((o) => o.isCorrect);
      const wrongOptions = question.options.filter((o) => !o.isCorrect);
      const selectedOption = isCorrect ? correctOption : pickOne(wrongOptions);

      streak = isCorrect ? streak + 1 : 0;
      bestStreak = Math.max(bestStreak, streak);

      const basePoints = isCorrect ? question.pointsReward : 0;
      const streakBonusPoints = isCorrect ? Math.max(0, Math.min(streak, 5) - 1) * 2 : 0;
      const pointsEarned = basePoints + streakBonusPoints;

      if (isCorrect) correctCount += 1;
      practicePointsTotal += pointsEarned;
      streakSum += streak;

      await PracticeAttempt.create({
        studentId,
        topicId: topic._id,
        practiceQuestionId: question._id,
        selectedOptionId: selectedOption?._id,
        isCorrect,
        basePoints,
        streakAtAttempt: streak,
        streakBonusPoints,
        pointsEarned,
        attemptedAt: new Date(Date.now() - randInt(1, 21) * 24 * 60 * 60 * 1000),
      });

      const agg = topicAgg.get(topic._id.toString()) || { solved: 0, attempted: 0 };
      agg.attempted += 1;
      if (isCorrect) agg.solved += 1;
      topicAgg.set(topic._id.toString(), agg);
    }

    for (const [topicId, agg] of topicAgg.entries()) {
      const accuracyPct = agg.attempted ? Math.round((agg.solved / agg.attempted) * 100) : 0;
      const masteryPct = Math.min(100, Math.round((agg.attempted / 50) * 100));

      await StudentTopicStat.create({
        studentId,
        topicId,
        solvedCount: agg.solved,
        totalAttempted: agg.attempted,
        accuracyPct,
        masteryPct,
      });
    }

    profileUpdates.set(studentId.toString(), {
      practiceAttemptCount: attemptsCount,
      practiceCorrectCount: correctCount,
      practiceCurrentCorrectStreak: streak,
      practiceBestCorrectStreak: bestStreak,
      practiceStreakSum: streakSum,
      practiceAvgCorrectStreak: attemptsCount > 0 ? Number((streakSum / attemptsCount).toFixed(2)) : 0,
      practicePointsTotal,
    });
  }

  return profileUpdates;
}

async function createExamsWithQuestions(adminId) {
  const now = Date.now();
  const makeCode = (suffix) => `SEED${suffix}${String(now).slice(-3)}`;

  const exams = await Exam.insertMany([
    {
      title: `${SEED_PREFIX} JEE Mock Live`,
      description: `${SEED_PREFIX} Live exam for anti-cheat and ongoing session testing`,
      examType: "JEE Main Mock",
      classLevel: "Class 12",
      examCode: makeCode("L"),
      durationMinutes: 90,
      maxMarks: 120,
      status: "live",
      rules: {
        instructions: "Answer all questions within time limit.",
        antiCheatWarning: "Tab switches are monitored.",
      },
      schedule: {
        startAt: new Date(Date.now() - 20 * 60 * 1000),
        endAt: new Date(Date.now() + 70 * 60 * 1000),
      },
      createdBy: adminId,
      publishedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      title: `${SEED_PREFIX} NEET Mock Scheduled`,
      description: `${SEED_PREFIX} Upcoming exam for assignment/instructions testing`,
      examType: "NEET Mock",
      classLevel: "Class 11",
      examCode: makeCode("S"),
      durationMinutes: 120,
      maxMarks: 160,
      status: "scheduled",
      schedule: {
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 26 * 60 * 60 * 1000),
      },
      createdBy: adminId,
      publishedAt: new Date(),
    },
    {
      title: `${SEED_PREFIX} Weekly Grand Test`,
      description: `${SEED_PREFIX} Completed exam for analytics and leaderboard data`,
      examType: "Weekly Test",
      classLevel: "Class 12",
      examCode: makeCode("C"),
      durationMinutes: 60,
      maxMarks: 80,
      status: "completed",
      schedule: {
        startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
      createdBy: adminId,
      publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  ]);

  if (!exams.length) {
    throw new Error("Failed to seed exams");
  }

  for (const exam of exams) {
    const questionDocs = [];
    const total = exam.status === "completed" ? 20 : 30;

    for (let i = 1; i <= total; i += 1) {
      const correctLabel = pickOne(["A", "B", "C", "D"]);
      const difficulty = i % 3 === 0 ? "hard" : i % 2 === 0 ? "medium" : "easy";
      questionDocs.push({
        examId: exam._id,
        questionNo: i,
        questionType: "mcq_single",
        questionText: `${SEED_PREFIX} ${exam.title} Question ${i}`,
        topic: i % 2 === 0 ? "Mechanics" : "Modern Physics",
        subject: i % 2 === 0 ? "Physics" : "Chemistry",
        difficulty,
        marks: 4,
        negativeMarks: 1,
        options: standardOptions(correctLabel),
        explanation: `${SEED_PREFIX} Explanation for exam question ${i}`,
      });
    }

    await ExamQuestion.insertMany(questionDocs);
    exam.totalQuestions = total;
    exam.maxMarks = total * 4;
    await exam.save();
  }

  return exams;
}

async function createAssignmentsSessionsMonitoring(exams, students, adminId) {
  const [liveExam, scheduledExam, completedExam] = exams;

  const submittedSessions = [];
  let activeCount = 0;
  let warningCount = 0;
  let highSeverityCount = 0;

  const completedExamQuestions = await ExamQuestion.find({ examId: completedExam._id });
  const liveExamQuestionIds = await ExamQuestion.find({ examId: liveExam._id }).distinct("_id");

  for (let idx = 0; idx < students.length; idx += 1) {
    const studentId = students[idx].user._id;

    await ExamAssignment.create({
      examId: liveExam._id,
      studentId,
      assignedBy: adminId,
      status: idx < 4 ? "started" : "assigned",
      assignedAt: new Date(Date.now() - randInt(1, 4) * 24 * 60 * 60 * 1000),
    });

    await ExamAssignment.create({
      examId: scheduledExam._id,
      studentId,
      assignedBy: adminId,
      status: "assigned",
      assignedAt: new Date(),
    });

    await ExamAssignment.create({
      examId: completedExam._id,
      studentId,
      assignedBy: adminId,
      status: idx < 10 ? "submitted" : "assigned",
      assignedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    });

    if (idx < 4) {
      activeCount += 1;
      const session = await ExamSession.create({
        examId: liveExam._id,
        studentId,
        status: "active",
        startedAt: new Date(Date.now() - randInt(5, 20) * 60 * 1000),
        questionOrder: shuffle(liveExamQuestionIds),
        examCodeUsed: liveExam.examCode,
      });

      const eventsForStudent = randInt(1, 3);
      for (let e = 0; e < eventsForStudent; e += 1) {
        const severity = randBool(0.2) ? "high" : randBool(0.5) ? "medium" : "low";
        if (severity === "high") highSeverityCount += 1;
        warningCount += 1;

        await AntiCheatEvent.create({
          sessionId: session._id,
          examId: liveExam._id,
          studentId,
          eventType: pickOne(["tab_switch", "window_blur", "fullscreen_exit"]),
          severity,
          payload: { source: "seed-script" },
          occurredAt: new Date(Date.now() - randInt(1, 15) * 60 * 1000),
        });
      }
    }

    if (idx < 10) {
      const session = await ExamSession.create({
        examId: completedExam._id,
        studentId,
        status: "submitted",
        startedAt: new Date(Date.now() - (6 * 24 * 60 + randInt(60, 120)) * 60 * 1000),
        submittedAt: new Date(Date.now() - (6 * 24 * 60) * 60 * 1000),
        timeTakenSeconds: randInt(1800, 3600),
        examCodeUsed: completedExam.examCode,
        questionOrder: shuffle(completedExamQuestions.map((q) => q._id)),
      });

      let score = 0;
      let answered = 0;
      let correct = 0;

      for (const q of completedExamQuestions) {
        const attemptChance = 0.85;
        if (!randBool(attemptChance)) {
          continue;
        }

        answered += 1;
        const isCorrect = randBool(0.63);
        if (isCorrect) correct += 1;

        const selectedOption = isCorrect
          ? q.options.find((o) => o.isCorrect)
          : pickOne(q.options.filter((o) => !o.isCorrect));
        const marksAwarded = isCorrect ? q.marks : -Math.abs(q.negativeMarks || 0);
        score += marksAwarded;

        await QuestionAttempt.create({
          sessionId: session._id,
          examId: completedExam._id,
          studentId,
          questionId: q._id,
          selectedOptionId: selectedOption?._id,
          visitStatus: "answered",
          isMarkedForReview: randBool(0.1),
          isCorrect,
          marksAwarded,
          viewedAt: new Date(session.startedAt.getTime() + randInt(10, 2000) * 1000),
          answeredAt: new Date(session.startedAt.getTime() + randInt(15, 2200) * 1000),
        });
      }

      session.scoreObtained = score;
      session.accuracyPct = answered ? Math.round((correct / answered) * 100) : 0;
      await session.save();

      submittedSessions.push({ studentId: studentId.toString(), score, accuracyPct: session.accuracyPct });
    }
  }

  await MonitoringSession.create({
    examId: liveExam._id,
    examTitle: liveExam.title,
    activeStudentsCount: activeCount,
    totalStudentsCount: students.length,
    warningEventsCount: warningCount,
    highSeverityCount,
    lastUpdatedAt: new Date(),
  });

  return { submittedSessions };
}

async function createNoticesAndPyq(adminId) {
  await Notice.insertMany([
    {
      title: `${SEED_PREFIX} Platform Smoke Test Notice`,
      body: "Use seed credentials to test login, exams, practice, analytics, and leaderboard.",
      postedBy: adminId,
      targetRole: "all",
      isPinned: true,
      publishAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      title: `${SEED_PREFIX} Mock Exam Reminder`,
      body: "JEE Mock Live is running. Scheduled exam starts tomorrow.",
      postedBy: adminId,
      targetRole: "student",
      isPinned: false,
      publishAt: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      title: `${SEED_PREFIX} Admin Ops Update`,
      body: "Monitoring panel seeded with anti-cheat events for testing.",
      postedBy: adminId,
      targetRole: "admin",
      isPinned: false,
      publishAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ]);

  await PyqSet.insertMany([
    {
      examName: "JEE Main",
      examYear: 2022,
      title: `${SEED_PREFIX} JEE Main 2022 Physics Set A`,
      subject: "Physics",
      isPublished: true,
    },
    {
      examName: "NEET",
      examYear: 2021,
      title: `${SEED_PREFIX} NEET 2021 Biology Set B`,
      subject: "Biology",
      isPublished: true,
    },
    {
      examName: "JEE Advanced",
      examYear: 2023,
      title: `${SEED_PREFIX} JEE Advanced 2023 Chemistry Draft`,
      subject: "Chemistry",
      isPublished: false,
    },
  ]);
}

async function finalizeProfilesAndLeaderboard(students, profilePracticeAgg, submittedSessions) {
  const examAggByStudent = new Map();
  submittedSessions.forEach((s) => {
    examAggByStudent.set(s.studentId, s);
  });

  const updatedProfiles = [];

  for (const s of students) {
    const userId = s.user._id.toString();
    const p = profilePracticeAgg.get(userId);
    const exam = examAggByStudent.get(userId);
    const examBonus = exam ? Math.max(0, Math.round(exam.score * 1.5)) : randInt(30, 90);
    const pointsTotal = (p?.practicePointsTotal || 0) + examBonus;

    const profile = await StudentProfile.findOneAndUpdate(
      { userId: s.user._id },
      {
        pointsTotal,
        practicePointsTotal: p?.practicePointsTotal || 0,
        practiceAttemptCount: p?.practiceAttemptCount || 0,
        practiceCorrectCount: p?.practiceCorrectCount || 0,
        practiceCurrentCorrectStreak: p?.practiceCurrentCorrectStreak || 0,
        practiceBestCorrectStreak: p?.practiceBestCorrectStreak || 0,
        practiceStreakSum: p?.practiceStreakSum || 0,
        practiceAvgCorrectStreak: p?.practiceAvgCorrectStreak || 0,
        examsAttemptedCount: exam ? 1 : 0,
        avgAccuracyPct: exam?.accuracyPct || 0,
        currentStreakDays: randInt(0, 10),
      },
      { new: true }
    );

    updatedProfiles.push({ user: s.user, profile });
  }

  const ranked = [...updatedProfiles]
    .sort((a, b) => (b.profile?.pointsTotal || 0) - (a.profile?.pointsTotal || 0))
    .map((row, idx) => ({
      rankNo: idx + 1,
      studentId: row.user._id,
      points: row.profile?.pointsTotal || 0,
      name: row.user.fullName,
    }));

  const weeklyDate = new Date();
  const monthlyDate = new Date();
  monthlyDate.setDate(1);
  monthlyDate.setHours(0, 0, 0, 0);

  await LeaderboardSnapshot.insertMany([
    ...ranked.map((r) => ({ ...r, boardType: "weekly", snapshotDate: weeklyDate })),
    ...ranked.map((r) => ({ ...r, boardType: "monthly", snapshotDate: monthlyDate })),
    ...ranked.map((r) => ({ ...r, boardType: "all_time", snapshotDate: weeklyDate })),
  ]);
}

async function run() {
  try {
    await connectDB();

    await runWithDnsRetry(async () => {
      if (shouldReset) {
        console.log("Cleaning previous seeded data...");
        await cleanupSeedData();
      } else {
        // Keep reruns deterministic by removing prior seed rows before generating fresh data.
        await cleanupSeedData();
      }

      const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 12);

      const admin = await ensureAdmin(passwordHash);
      const students = await createStudents(passwordHash);
      const practiceTopics = await ensureSyllabusAndPracticeTopics();
      await createPracticeQuestions(practiceTopics, admin._id);

      const practiceAgg = await createPracticeAttemptsAndStats(students, practiceTopics);
      const exams = await createExamsWithQuestions(admin._id);
      const { submittedSessions } = await createAssignmentsSessionsMonitoring(exams, students, admin._id);
      await createNoticesAndPyq(admin._id);
      await finalizeProfilesAndLeaderboard(students, practiceAgg, submittedSessions);

      const seededExamCount = await Exam.countDocuments({ title: new RegExp(`^\\${SEED_PREFIX}`) });
      const seededExamQuestionCount = await ExamQuestion.countDocuments({
        examId: { $in: exams.map((e) => e._id) },
      });
      const seededAssignmentCount = await ExamAssignment.countDocuments({
        examId: { $in: exams.map((e) => e._id) },
      });
      const seededSessionCount = await ExamSession.countDocuments({
        examId: { $in: exams.map((e) => e._id) },
      });

      console.log("\nSeed complete. Credentials:\n");
      console.log(`Admin: admin@${SEED_EMAIL_DOMAIN} / ${STUDENT_PASSWORD}`);
      console.log(`Students: student01@${SEED_EMAIL_DOMAIN} .. student24@${SEED_EMAIL_DOMAIN} / ${STUDENT_PASSWORD}`);
      console.log("\nCreated exams:");
      exams.forEach((exam) => {
        console.log(
          `- ${exam.title} | code=${exam.examCode} | status=${exam.status} | class=${exam.classLevel || "-"} | duration=${exam.durationMinutes}m`
        );
      });
      console.log("\nExam seed summary:");
      console.log(`- exams: ${seededExamCount}`);
      console.log(`- exam questions: ${seededExamQuestionCount}`);
      console.log(`- exam assignments: ${seededAssignmentCount}`);
      console.log(`- exam sessions: ${seededSessionCount}`);
      console.log("\nCreated data domains: users, profiles, syllabus, practice, attempts, exams, assignments, sessions, monitoring, notices, leaderboard, pyq.");
    });
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
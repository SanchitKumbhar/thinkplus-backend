const asyncHandler = require("express-async-handler");
const PracticeTopic = require("../models/PracticeTopic");
const PracticeQuestion = require("../models/PracticeQuestion");
const PracticeAttempt = require("../models/PracticeAttempt");
const StudentTopicStat = require("../models/StudentTopicStat");
const StudentProfile = require("../models/StudentProfile");

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

const normalizeUnlockCount = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
};

const normalizePracticeCount = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
};

const buildUnlockRule = (count, difficulty) => `Solve ${count} ${difficulty.toUpperCase()} question${count > 1 ? "s" : ""} correctly.`;

const normalizeDifficulty = (value) => String(value || "").trim().toLowerCase();
const VALID_OPTION_LABELS = ["A", "B", "C", "D"];

const getTopicQuotaField = (difficulty) => {
  if (difficulty === "easy") return "practiceCountEasy";
  if (difficulty === "medium") return "practiceCountMedium";
  return "practiceCountHard";
};


const getTopicDifficultyProgress = async (studentId, topicId) => {
  const topic = await PracticeTopic.findById(topicId).select(
    "easyToMediumUnlockCount mediumToHardUnlockCount practiceCountEasy practiceCountMedium practiceCountHard"
  );
  const questions = await PracticeQuestion.find({ topicId }).select("_id difficulty");

  const questionsByDifficulty = {
    easy: questions.filter((q) => q.difficulty === "easy"),
    medium: questions.filter((q) => q.difficulty === "medium"),
    hard: questions.filter((q) => q.difficulty === "hard"),
  };


  const availableByDifficulty = {
    easy: questions.filter((q) => q.difficulty === "easy").length,
    medium: questions.filter((q) => q.difficulty === "medium").length,
    hard: questions.filter((q) => q.difficulty === "hard").length,
  };

  const totalByDifficulty = {
    easy: topic?.practiceCountEasy ? Math.min(availableByDifficulty.easy, topic.practiceCountEasy) : availableByDifficulty.easy,
    medium: topic?.practiceCountMedium ? Math.min(availableByDifficulty.medium, topic.practiceCountMedium) : availableByDifficulty.medium,
    hard: topic?.practiceCountHard ? Math.min(availableByDifficulty.hard, topic.practiceCountHard) : availableByDifficulty.hard,
  };

  const correctAttempts = await PracticeAttempt.find({
    studentId,
    topicId,
    isCorrect: true,
  })
    .select("practiceQuestionId")
    .populate("practiceQuestionId", "difficulty");

  const correctDistinctByDifficultySets = {
    easy: new Set(),
    medium: new Set(),
    hard: new Set(),
  };

  correctAttempts.forEach((attemptDoc) => {
    const questionDoc = attemptDoc.practiceQuestionId;
    if (!questionDoc || !questionDoc._id || !DIFFICULTY_ORDER.includes(questionDoc.difficulty)) return;
    correctDistinctByDifficultySets[questionDoc.difficulty].add(questionDoc._id.toString());
  });

  const correctByDifficulty = {
    easy: Math.min(correctDistinctByDifficultySets.easy.size, totalByDifficulty.easy),
    medium: Math.min(correctDistinctByDifficultySets.medium.size, totalByDifficulty.medium),
    hard: Math.min(correctDistinctByDifficultySets.hard.size, totalByDifficulty.hard),
  };

  const requiredEasyCorrect = totalByDifficulty.easy === 0
    ? 0
    : Math.min(totalByDifficulty.easy, topic?.easyToMediumUnlockCount || totalByDifficulty.easy);
  const requiredMediumCorrect = totalByDifficulty.medium === 0
    ? 0
    : Math.min(totalByDifficulty.medium, topic?.mediumToHardUnlockCount || totalByDifficulty.medium);

  const completedEasy = totalByDifficulty.easy === 0 || correctByDifficulty.easy >= requiredEasyCorrect;
  const completedMedium = totalByDifficulty.medium === 0 || correctByDifficulty.medium >= requiredMediumCorrect;

  return {
    easy: {
      unlocked: true,
      completed: completedEasy,
      totalQuestions: totalByDifficulty.easy,
      correctQuestions: correctByDifficulty.easy,
      requiredCorrectToUnlockNext: requiredEasyCorrect,
      selectedQuestionCount: totalByDifficulty.easy,
      configuredQuestionCount: topic?.practiceCountEasy,
    },
    medium: {
      unlocked: completedEasy,
      completed: completedMedium,
      totalQuestions: totalByDifficulty.medium,
      correctQuestions: correctByDifficulty.medium,
      requiredCorrectToUnlockNext: requiredMediumCorrect,
      unlockRule: buildUnlockRule(requiredEasyCorrect, "easy"),
      selectedQuestionCount: totalByDifficulty.medium,
      configuredQuestionCount: topic?.practiceCountMedium,
    },
    hard: {
      unlocked: completedEasy && completedMedium,
      completed: totalByDifficulty.hard === 0 || correctByDifficulty.hard >= totalByDifficulty.hard,
      totalQuestions: totalByDifficulty.hard,
      correctQuestions: correctByDifficulty.hard,
      unlockRule: buildUnlockRule(requiredMediumCorrect, "medium"),
      selectedQuestionCount: totalByDifficulty.hard,
      configuredQuestionCount: topic?.practiceCountHard,
    },
  };
};

const shuffleArray = (items = []) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const listTopics = asyncHandler(async (req, res) => {
  const filter = req.user?.role === "admin" ? {} : { isActive: true };
  const classLevel = String(req.query.classLevel || "").trim();
  const subject = String(req.query.subject || "").trim();

  if (classLevel) {
    filter.classLevel = classLevel;
  }

  if (subject) {
    filter.subject = subject;
  }

  const topics = await PracticeTopic.find(filter).sort({ subject: 1, topicName: 1 });
  res.status(200).json(topics);
});

const createTopic = asyncHandler(async (req, res) => {
  const classLevel = String(req.body?.classLevel || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const topicName = String(req.body?.topicName || "").trim();
  const easyToMediumUnlockCount = normalizeUnlockCount(req.body?.easyToMediumUnlockCount);
  const mediumToHardUnlockCount = normalizeUnlockCount(req.body?.mediumToHardUnlockCount);
  const practiceCountEasy = normalizePracticeCount(req.body?.practiceCountEasy);
  const practiceCountMedium = normalizePracticeCount(req.body?.practiceCountMedium);
  const practiceCountHard = normalizePracticeCount(req.body?.practiceCountHard);

  if (!classLevel || !subject || !topicName) {
    res.status(400);
    throw new Error("classLevel, subject and topicName are required");
  }

  const topic = await PracticeTopic.create({
    ...req.body,
    classLevel,
    subject,
    topicName,
    easyToMediumUnlockCount,
    mediumToHardUnlockCount,
    practiceCountEasy,
    practiceCountMedium,
    practiceCountHard,
  });
  res.status(201).json(topic);
});

const updateTopic = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
  };

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "easyToMediumUnlockCount")) {
    payload.easyToMediumUnlockCount = normalizeUnlockCount(req.body.easyToMediumUnlockCount);
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "mediumToHardUnlockCount")) {
    payload.mediumToHardUnlockCount = normalizeUnlockCount(req.body.mediumToHardUnlockCount);
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "practiceCountEasy")) {
    payload.practiceCountEasy = normalizePracticeCount(req.body.practiceCountEasy);
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "practiceCountMedium")) {
    payload.practiceCountMedium = normalizePracticeCount(req.body.practiceCountMedium);
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "practiceCountHard")) {
    payload.practiceCountHard = normalizePracticeCount(req.body.practiceCountHard);
  }

  const topic = await PracticeTopic.findByIdAndUpdate(req.params.topicId, payload, {
    new: true,
    runValidators: true,
  });

  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  res.status(200).json(topic);
});

const createQuestion = asyncHandler(async (req, res) => {
  const question = await PracticeQuestion.create({
    ...req.body,
    createdBy: req.user._id,
  });
  res.status(201).json(question);
});

const createQuestionsBulk = asyncHandler(async (req, res) => {
  const topicId = String(req.body?.topicId || "").trim();
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const pointsReward = Number(req.body?.pointsReward ?? 20);
  const replaceExisting = Boolean(req.body?.replaceExisting);
  const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

  if (!topicId) {
    res.status(400);
    throw new Error("topicId is required");
  }

  if (!DIFFICULTY_ORDER.includes(difficulty)) {
    res.status(400);
    throw new Error("difficulty must be one of easy, medium, hard");
  }

  if (!questions.length) {
    res.status(400);
    throw new Error("questions array is required");
  }

  const topic = await PracticeTopic.findById(topicId).select("_id");
  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  const docs = [];
  const errors = [];

  questions.forEach((row, index) => {
    const rowNumber = index + 1;
    const questionText = String(row?.questionText || "").trim();
    const correctOption = String(row?.correctOption || "").trim().toUpperCase();
    const optionA = String(row?.optionA || row?.options?.[0] || "").trim();
    const optionB = String(row?.optionB || row?.options?.[1] || "").trim();
    const optionC = String(row?.optionC || row?.options?.[2] || "").trim();
    const optionD = String(row?.optionD || row?.options?.[3] || "").trim();

    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      errors.push(`Row ${rowNumber}: questionText and options A-D are required`);
      return;
    }

    if (!VALID_OPTION_LABELS.includes(correctOption)) {
      errors.push(`Row ${rowNumber}: correctOption must be one of A, B, C, D`);
      return;
    }

    docs.push({
      topicId,
      difficulty,
      questionText,
      pointsReward,
      createdBy: req.user._id,
      options: [
        { label: "A", text: optionA, isCorrect: correctOption === "A" },
        { label: "B", text: optionB, isCorrect: correctOption === "B" },
        { label: "C", text: optionC, isCorrect: correctOption === "C" },
        { label: "D", text: optionD, isCorrect: correctOption === "D" },
      ],
    });
  });

  if (errors.length) {
    res.status(400);
    throw new Error(`CSV validation failed: ${errors.slice(0, 10).join("; ")}`);
  }

  if (replaceExisting) {
    await PracticeQuestion.deleteMany({ topicId, difficulty });
  }

  // Randomize only once at import-time; subsequent student sessions keep stable order.
  const inserted = await PracticeQuestion.insertMany(shuffleArray(docs), { ordered: true });

  res.status(201).json({
    message: "Questions imported successfully",
    createdCount: inserted.length,
    difficulty,
    topicId,
    replacedExisting: replaceExisting,
  });
});

const listQuestionsByTopic = asyncHandler(async (req, res) => {
  const query = { topicId: req.params.topicId };
  if (req.query.difficulty) {
    query.difficulty = req.query.difficulty;
  }

  const normalizedDifficulty = normalizeDifficulty(query.difficulty);
  let topicConfig = null;

  if (req.user.role === "student" && query.difficulty && DIFFICULTY_ORDER.includes(normalizedDifficulty)) {
    const progress = await getTopicDifficultyProgress(req.user._id, req.params.topicId);
    if (!progress[normalizedDifficulty].unlocked) {
      res.status(403);
      throw new Error(
        normalizedDifficulty === "medium"
          ? "MEDIUM is locked. Complete all EASY questions correctly to unlock it."
          : "HARD is locked. Complete all MEDIUM questions correctly to unlock it."
      );
    }

    topicConfig = await PracticeTopic.findById(req.params.topicId).select(
      "practiceCountEasy practiceCountMedium practiceCountHard"
    );
  }

  const questions = await PracticeQuestion.find(query);
  const orderedQuestions = req.user.role === "admin"
    ? [...questions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : (() => {
        if (!DIFFICULTY_ORDER.includes(normalizedDifficulty)) {
          return [...questions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const quotaField = getTopicQuotaField(normalizedDifficulty);
        const configuredCount = topicConfig?.[quotaField];
        const randomized = shuffleArray(questions);
        if (!configuredCount) return randomized;
        return randomized.slice(0, Math.min(configuredCount, randomized.length));
      })();

  const safeQuestions = req.user.role === "admin"
    ? orderedQuestions
    : orderedQuestions.map((q) => ({
        _id: q._id,
        topicId: q.topicId,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options.map((o) => ({ _id: o._id, label: o.label, text: o.text })),
        media: q.media,
      }));

  res.status(200).json(safeQuestions);
});

const getTopicUnlockStatus = asyncHandler(async (req, res) => {
  const topicId = req.params.topicId;
  const topic = await PracticeTopic.findById(topicId).select("_id topicName");

  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  const progress = await getTopicDifficultyProgress(req.user._id, topicId);
  res.status(200).json({
    topicId,
    topicName: topic.topicName,
    difficultyProgress: progress,
  });
});

const submitPracticeAttempt = asyncHandler(async (req, res) => {
  const { topicId, practiceQuestionId, selectedOptionId } = req.body;

  if (!topicId || !practiceQuestionId || !selectedOptionId) {
    res.status(400);
    throw new Error("topicId, practiceQuestionId and selectedOptionId are required");
  }

  const question = await PracticeQuestion.findById(practiceQuestionId);
  if (!question) {
    res.status(404);
    throw new Error("Practice question not found");
  }

  if (question.topicId.toString() !== topicId.toString()) {
    res.status(400);
    throw new Error("topicId does not match the practice question topic");
  }

  const progressBeforeAttempt = await getTopicDifficultyProgress(req.user._id, topicId);
  if (!progressBeforeAttempt[question.difficulty]?.unlocked) {
    res.status(403);
    throw new Error(
      question.difficulty === "medium"
        ? "MEDIUM is locked. Complete all EASY questions correctly to unlock it."
        : "HARD is locked. Complete all MEDIUM questions correctly to unlock it."
    );
  }

  const selected = question.options.find((o) => o._id.toString() === selectedOptionId);
  const isCorrect = Boolean(selected && selected.isCorrect);

  const lastAttempt = await PracticeAttempt.findOne({ studentId: req.user._id })
    .sort({ attemptedAt: -1, _id: -1 })
    .select("isCorrect streakAtAttempt");

  const previousStreak = lastAttempt && lastAttempt.isCorrect ? (lastAttempt.streakAtAttempt || 0) : 0;
  const currentStreak = isCorrect ? previousStreak + 1 : 0;

  const basePoints = isCorrect ? question.pointsReward : 0;
  const streakBonusPoints = isCorrect ? Math.max(0, Math.min(currentStreak, 5) - 1) * 2 : 0;
  const pointsEarned = basePoints + streakBonusPoints;

  const attempt = await PracticeAttempt.create({
    studentId: req.user._id,
    topicId,
    practiceQuestionId,
    selectedOptionId,
    isCorrect,
    basePoints,
    streakAtAttempt: currentStreak,
    streakBonusPoints,
    pointsEarned,
  });

  const stat = await StudentTopicStat.findOneAndUpdate(
    { studentId: req.user._id, topicId },
    { $inc: { totalAttempted: 1, solvedCount: isCorrect ? 1 : 0 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const totalAttempted = stat.totalAttempted;
  const solvedCount = stat.solvedCount;
  stat.accuracyPct = totalAttempted > 0 ? Math.round((solvedCount / totalAttempted) * 100) : 0;
  stat.masteryPct = Math.min(100, Math.round((totalAttempted / 50) * 100));
  await stat.save();

  const profile = await StudentProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      $inc: {
        pointsTotal: pointsEarned,
        practicePointsTotal: pointsEarned,
        practiceAttemptCount: 1,
        practiceCorrectCount: isCorrect ? 1 : 0,
        practiceStreakSum: currentStreak,
      },
      $set: { practiceCurrentCorrectStreak: currentStreak },
      $max: { practiceBestCorrectStreak: currentStreak },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const averageStreak =
    profile.practiceAttemptCount > 0
      ? Number((profile.practiceStreakSum / profile.practiceAttemptCount).toFixed(2))
      : 0;

  if (profile.practiceAvgCorrectStreak !== averageStreak) {
    profile.practiceAvgCorrectStreak = averageStreak;
    await profile.save();
  }

  const progressAfterAttempt = await getTopicDifficultyProgress(req.user._id, topicId);
  const newlyUnlocked = [];
  const newlyCleared = [];
  if (!progressBeforeAttempt.easy.completed && progressAfterAttempt.easy.completed) {
    newlyCleared.push("easy");
  }
  if (!progressBeforeAttempt.medium.completed && progressAfterAttempt.medium.completed) {
    newlyCleared.push("medium");
  }
  if (!progressBeforeAttempt.hard.completed && progressAfterAttempt.hard.completed) {
    newlyCleared.push("hard");
  }
  if (!progressBeforeAttempt.medium.unlocked && progressAfterAttempt.medium.unlocked) {
    newlyUnlocked.push("medium");
  }
  if (!progressBeforeAttempt.hard.unlocked && progressAfterAttempt.hard.unlocked) {
    newlyUnlocked.push("hard");
  }

  res.status(201).json({
    attempt,
    stat,
    streak: {
      current: currentStreak,
      best: Math.max(profile.practiceBestCorrectStreak || 0, currentStreak),
      average: averageStreak,
    },
    points: {
      basePoints,
      streakBonusPoints,
      totalAwarded: pointsEarned,
      leaderboardTotal: profile.pointsTotal,
    },
    difficultyProgress: progressAfterAttempt,
    newlyUnlocked,
    newlyCleared,
  });
});

const getPracticeStats = asyncHandler(async (req, res) => {
  const stats = await StudentTopicStat.find({ studentId: req.user._id })
    .populate("topicId")
    .sort({ masteryPct: -1 });

  const profile = await StudentProfile.findOne({ userId: req.user._id }).select(
    "practiceCurrentCorrectStreak practiceBestCorrectStreak practiceAvgCorrectStreak practiceAttemptCount practiceCorrectCount practicePointsTotal pointsTotal"
  );

  res.status(200).json({
    topicStats: stats,
    analysis: {
      currentCorrectStreak: profile?.practiceCurrentCorrectStreak || 0,
      bestCorrectStreak: profile?.practiceBestCorrectStreak || 0,
      avgCorrectStreak: profile?.practiceAvgCorrectStreak || 0,
      totalAttempts: profile?.practiceAttemptCount || 0,
      totalCorrect: profile?.practiceCorrectCount || 0,
      practicePointsTotal: profile?.practicePointsTotal || 0,
      leaderboardPointsTotal: profile?.pointsTotal || 0,
    },
  });
});

module.exports = {
  listTopics,
  createTopic,
  updateTopic,
  createQuestion,
  createQuestionsBulk,
  listQuestionsByTopic,
  getTopicUnlockStatus,
  submitPracticeAttempt,
  getPracticeStats,
};

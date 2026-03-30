const asyncHandler = require("express-async-handler");
const SyllabusTopic = require("../models/SyllabusTopic");
const PracticeTopic = require("../models/PracticeTopic");

const DEFAULT_CLASS_LEVELS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
];

const DEFAULT_SYLLABUS = {
  "Class 9": {
    Mathematics: ["Number Systems", "Polynomials", "Linear Equations", "Coordinate Geometry"],
    Science: ["Matter", "Atoms and Molecules", "Motion", "Force and Laws of Motion"],
  },
  "Class 10": {
    Mathematics: ["Real Numbers", "Quadratic Equations", "Trigonometry", "Statistics"],
    Science: ["Chemical Reactions", "Life Processes", "Light", "Electricity"],
  },
  "Class 11": {
    Physics: ["Units and Measurements", "Kinematics", "Laws of Motion", "Work Energy Power"],
    Chemistry: ["Some Basic Concepts", "Structure of Atom", "Thermodynamics", "Equilibrium"],
    Mathematics: ["Sets", "Relations and Functions", "Trigonometric Functions", "Limits and Derivatives"],
  },
  "Class 12": {
    Physics: ["Electrostatics", "Current Electricity", "Magnetism", "Modern Physics"],
    Chemistry: ["Solutions", "Electrochemistry", "Organic Chemistry", "Biomolecules"],
    Mathematics: ["Matrices", "Determinants", "Integrals", "Probability"],
  },
};

const listClassLevels = asyncHandler(async (req, res) => {
  const dbClasses = await SyllabusTopic.distinct("classLevel", { isActive: true });
  const classes = Array.from(new Set([...DEFAULT_CLASS_LEVELS, ...dbClasses]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  res.status(200).json(classes);
});

const listTopics = asyncHandler(async (req, res) => {
  const classLevel = String(req.query.classLevel || "").trim();
  const subject = String(req.query.subject || "").trim();

  if (!classLevel) {
    res.status(400);
    throw new Error("classLevel query param is required");
  }

  const filter = { classLevel, isActive: true };
  if (subject) {
    filter.subject = subject;
  }

  const topics = await SyllabusTopic.find(filter)
    .sort({ subject: 1, topicName: 1 })
    .lean();

  if (topics.length > 0) {
    return res.status(200).json(topics);
  }

  const fallbackSubjects = DEFAULT_SYLLABUS[classLevel] || {};
  const fallback = Object.entries(fallbackSubjects)
    .flatMap(([s, topicNames]) =>
      topicNames.map((topicName) => ({
        _id: `${classLevel}-${s}-${topicName}`,
        classLevel,
        subject: s,
        topicName,
        isActive: true,
      }))
    )
    .filter((topic) => !subject || topic.subject === subject);

  return res.status(200).json(fallback);
});

const createTopic = asyncHandler(async (req, res) => {
  const classLevel = String(req.body?.classLevel || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const topicName = String(req.body?.topicName || "").trim();

  if (!classLevel || !subject || !topicName) {
    res.status(400);
    throw new Error("classLevel, subject and topicName are required");
  }

  const topic = await SyllabusTopic.findOneAndUpdate(
    { classLevel, subject, topicName },
    { classLevel, subject, topicName, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await PracticeTopic.findOneAndUpdate(
    { classLevel, subject, topicName },
    { classLevel, subject, topicName, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json(topic);
});

module.exports = {
  listClassLevels,
  listTopics,
  createTopic,
};

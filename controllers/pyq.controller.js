const asyncHandler = require("express-async-handler");
const PyqSet = require("../models/PyqSet");

const listPyqSets = asyncHandler(async (req, res) => {
  const filter = req.user?.role === "admin" ? {} : { isPublished: true };
  const sets = await PyqSet.find(filter).sort({ examYear: -1, createdAt: -1 });
  res.status(200).json(sets);
});

const createPyqSet = asyncHandler(async (req, res) => {
  const set = await PyqSet.create(req.body);
  res.status(201).json(set);
});

const updatePyqSet = asyncHandler(async (req, res) => {
  const set = await PyqSet.findByIdAndUpdate(req.params.pyqId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!set) {
    res.status(404);
    throw new Error("PYQ set not found");
  }

  res.status(200).json(set);
});

const deletePyqSet = asyncHandler(async (req, res) => {
  const set = await PyqSet.findByIdAndDelete(req.params.pyqId);

  if (!set) {
    res.status(404);
    throw new Error("PYQ set not found");
  }

  res.status(200).json({ message: "PYQ set deleted" });
});

module.exports = {
  listPyqSets,
  createPyqSet,
  updatePyqSet,
  deletePyqSet,
};

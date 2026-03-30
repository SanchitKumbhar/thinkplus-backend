const express = require("express");
const {
  listPyqSets,
  createPyqSet,
  updatePyqSet,
  deletePyqSet,
} = require("../controllers/pyq.controller");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, listPyqSets);
router.post("/", protect, requireRole("admin"), createPyqSet);
router.put("/:pyqId", protect, requireRole("admin"), updatePyqSet);
router.delete("/:pyqId", protect, requireRole("admin"), deletePyqSet);

module.exports = router;

const express = require("express");
const { predict, predictGrid, getHistory } = require("../controllers/predictionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, predict);
router.post("/grid", protect, predictGrid);
router.get("/history", protect, getHistory);

module.exports = router;

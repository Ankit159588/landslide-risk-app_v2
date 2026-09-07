const express = require("express");
const { createAuthority, listAuthorities } = require("../controllers/authorityController");
const { protect, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, listAuthorities);
router.post("/", protect, requireAdmin, createAuthority);

module.exports = router;

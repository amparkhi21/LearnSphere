const express = require("express");
const {
  recommendResources,
  generateCourseOutline,
  doubtAssist,
  getAIStatus,
} = require("../controllers/ai.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", getAIStatus);
router.post("/recommend-resources", protect, recommendResources);
router.post("/course-outline", protect, generateCourseOutline);
router.post("/doubt-assist", protect, doubtAssist);

module.exports = router;

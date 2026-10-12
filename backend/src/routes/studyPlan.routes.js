const express = require("express");
const {
  generateStudyPlan,
  generateSyllabus,
  getMyStudyPlans,
  getStudyPlanById,
  updateStudyPlanProgress,
  deleteStudyPlan,
} = require("../controllers/studyPlan.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/generate", generateStudyPlan);
router.post("/syllabus", generateSyllabus);
router.get("/mine", getMyStudyPlans);
router.get("/:id", getStudyPlanById);
router.patch("/:id/progress", updateStudyPlanProgress);
router.delete("/:id", deleteStudyPlan);

module.exports = router;

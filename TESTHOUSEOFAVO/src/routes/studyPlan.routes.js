const express = require("express");
const {
  generateStudyPlan,
  getMyStudyPlans,
  getStudyPlanById,
  updateStudyPlanProgress,
  deleteStudyPlan,
} = require("../controllers/studyPlan.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/generate", generateStudyPlan);
router.get("/mine", getMyStudyPlans);
router.get("/:id", getStudyPlanById);
router.patch("/:id/progress", updateStudyPlanProgress);
router.delete("/:id", deleteStudyPlan);

module.exports = router;

const express = require("express");
const {
  enrollInCourse,
  getMyEnrollments,
  updateProgress,
  addReview,
} = require("../controllers/enrollment.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/", enrollInCourse);
router.get("/mine", getMyEnrollments);
router.patch("/:id/progress", updateProgress);
router.post("/:id/review", addReview);

module.exports = router;

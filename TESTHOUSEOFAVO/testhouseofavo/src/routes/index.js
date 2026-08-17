const express = require("express");

const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/courses", require("./course.routes"));
router.use("/enrollments", require("./enrollment.routes"));
router.use("/resources", require("./resource.routes"));
router.use("/communities", require("./community.routes"));
router.use("/posts", require("./post.routes"));
router.use("/comments", require("./comment.routes"));
router.use("/quizzes", require("./quiz.routes"));
router.use("/quiz-attempts", require("./quizAttempt.routes"));
router.use("/study-plans", require("./studyPlan.routes"));
router.use("/bookmarks", require("./bookmark.routes"));
router.use("/notifications", require("./notification.routes"));
router.use("/payments", require("./payment.routes"));
router.use("/ai", require("./ai.routes"));

module.exports = router;

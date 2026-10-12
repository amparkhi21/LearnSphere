const express = require("express");
const {
  getTeacherClasses, getStudentClasses, scheduleClass, cancelClass, startClass, endClass, getJoinToken,
} = require("../controllers/liveClass.controller");
const { protect } = require("../middlewares/auth.middleware");
const restrictTo = require("../middlewares/role.middleware");

const router = express.Router();

router.use(protect);
router.get("/teacher/mine", restrictTo("teacher", "admin"), getTeacherClasses);
router.get("/student/mine", restrictTo("student"), getStudentClasses);
router.post("/", restrictTo("teacher", "admin"), scheduleClass);
router.post("/:id/start", restrictTo("teacher", "admin"), startClass);
router.post("/:id/end", restrictTo("teacher", "admin"), endClass);
router.post("/:id/cancel", restrictTo("teacher", "admin"), cancelClass);
router.post("/:id/token", getJoinToken);

module.exports = router;

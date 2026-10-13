const express = require("express");
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getMyCourses,
} = require("../controllers/course.controller");
const { protect } = require("../middlewares/auth.middleware");
const restrictTo = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");
const { ROLES } = require("../constants");

const router = express.Router();

router.get("/", getCourses);
router.get("/teacher/mine", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), getMyCourses);
router.post("/", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), upload.single("thumbnail"), createCourse);
router.get("/:idOrSlug", getCourseById);
router.patch("/:id", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), upload.single("thumbnail"), updateCourse);
router.delete("/:id", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), deleteCourse);

module.exports = router;

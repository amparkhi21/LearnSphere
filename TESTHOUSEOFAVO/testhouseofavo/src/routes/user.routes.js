const express = require("express");
const { getUserProfile, updateMyProfile, listUsers, toggleBanUser } = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth.middleware");
const restrictTo = require("../middlewares/role.middleware");
const { ROLES } = require("../constants");

const router = express.Router();

router.patch("/me", protect, updateMyProfile);
router.get("/", protect, restrictTo(ROLES.ADMIN), listUsers);
router.patch("/:id/ban", protect, restrictTo(ROLES.ADMIN), toggleBanUser);
router.get("/:id", getUserProfile);

module.exports = router;

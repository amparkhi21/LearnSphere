const express = require("express");
const {
  createCommunity,
  getCommunities,
  getCommunityBySlug,
  joinCommunity,
  leaveCommunity,
} = require("../controllers/community.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", getCommunities);
router.get("/:slug", getCommunityBySlug);
router.post("/", protect, createCommunity);
router.post("/:id/join", protect, joinCommunity);
router.post("/:id/leave", protect, leaveCommunity);

module.exports = router;

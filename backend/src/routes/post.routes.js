const express = require("express");
const {
  createPost,
  getPosts,
  getPostById,
  votePost,
  resolvePost,
  deletePost,
} = require("../controllers/post.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", getPosts);
router.get("/:id", getPostById);
router.post("/", protect, createPost);
router.post("/:id/vote", protect, votePost);
router.patch("/:id/resolve", protect, resolvePost);
router.delete("/:id", protect, deletePost);

module.exports = router;

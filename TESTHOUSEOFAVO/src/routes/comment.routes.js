const express = require("express");
const {
  createComment,
  getCommentsForPost,
  upvoteComment,
  deleteComment,
} = require("../controllers/comment.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", getCommentsForPost);
router.post("/", protect, createComment);
router.post("/:id/upvote", protect, upvoteComment);
router.delete("/:id", protect, deleteComment);

module.exports = router;

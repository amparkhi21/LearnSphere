const Comment = require("../models/comment.model");
const Post = require("../models/post.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { createNotification } = require("../services/notification.service");

// @route POST /api/v1/comments
const createComment = asyncHandler(async (req, res) => {
  const { post, content, parentComment } = req.body;

  const postDoc = await Post.findById(post);
  if (!postDoc) throw new ApiError(404, "Post not found");

  const comment = await Comment.create({
    post,
    author: req.user._id,
    content,
    parentComment: parentComment || null,
  });

  postDoc.commentCount += 1;
  await postDoc.save({ validateBeforeSave: false });

  if (String(postDoc.author) !== String(req.user._id)) {
    createNotification({
      recipient: postDoc.author,
      sender: req.user._id,
      type: "comment",
      title: "New comment on your post",
      message: `${req.user.name} commented on "${postDoc.title}"`,
      link: `/community/posts/${postDoc._id}`,
    }).catch(() => {});
  }

  res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"));
});

// @route GET /api/v1/comments?post=:id
const getCommentsForPost = asyncHandler(async (req, res) => {
  const { post } = req.query;
  if (!post) throw new ApiError(400, "post query param is required");

  const comments = await Comment.find({ post }).populate("author", "name avatar role").sort("createdAt");
  res.status(200).json(new ApiResponse(200, comments, "Comments fetched"));
});

// @route POST /api/v1/comments/:id/upvote
const upvoteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, "Comment not found");

  const userId = String(req.user._id);
  if (comment.upvotes.map(String).includes(userId)) {
    comment.upvotes = comment.upvotes.filter((id) => String(id) !== userId);
  } else {
    comment.upvotes.push(req.user._id);
  }
  await comment.save();

  res.status(200).json(new ApiResponse(200, comment, "Vote updated"));
});

// @route DELETE /api/v1/comments/:id
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (String(comment.author) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You do not own this comment");
  }

  await comment.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
});

module.exports = { createComment, getCommentsForPost, upvoteComment, deleteComment };

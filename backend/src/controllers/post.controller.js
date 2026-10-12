const Post = require("../models/post.model");
const Community = require("../models/community.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { DEFAULT_PAGE_SIZE } = require("../constants");

// @route POST /api/v1/posts
const createPost = asyncHandler(async (req, res) => {
  const { community, title, content, images, isDoubt, tags } = req.body;

  const communityDoc = await Community.findById(community);
  if (!communityDoc) throw new ApiError(404, "Community not found");

  const post = await Post.create({
    community,
    author: req.user._id,
    title,
    content,
    images: images || [],
    isDoubt: !!isDoubt,
    tags: tags || [],
  });

  communityDoc.postCount += 1;
  await communityDoc.save({ validateBeforeSave: false });

  res.status(201).json(new ApiResponse(201, post, "Post created successfully"));
});

// @route GET /api/v1/posts?community=:id
const getPosts = asyncHandler(async (req, res) => {
  const { community, isDoubt, isResolved, q, page = 1, limit = DEFAULT_PAGE_SIZE, sort = "-createdAt" } = req.query;

  const filter = {};
  if (community) filter.community = community;
  if (isDoubt !== undefined) filter.isDoubt = isDoubt === "true";
  if (isResolved !== undefined) filter.isResolved = isResolved === "true";
  if (q) filter.$text = { $search: q };

  const posts = await Post.find(filter)
    .populate("author", "name avatar role")
    .populate("community", "name slug")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Post.countDocuments(filter);

  res.status(200).json(new ApiResponse(200, { posts, total, page: Number(page) }, "Posts fetched"));
});

// @route GET /api/v1/posts/:id
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true })
    .populate("author", "name avatar role")
    .populate("community", "name slug");

  if (!post) throw new ApiError(404, "Post not found");
  res.status(200).json(new ApiResponse(200, post, "Post fetched"));
});

// @route POST /api/v1/posts/:id/vote  body: { direction: "up" | "down" }
const votePost = asyncHandler(async (req, res) => {
  const { direction } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, "Post not found");

  const userId = String(req.user._id);
  post.upvotes = post.upvotes.filter((id) => String(id) !== userId);
  post.downvotes = post.downvotes.filter((id) => String(id) !== userId);

  if (direction === "up") post.upvotes.push(req.user._id);
  if (direction === "down") post.downvotes.push(req.user._id);

  await post.save();
  res.status(200).json(new ApiResponse(200, post, "Vote recorded"));
});

// @route PATCH /api/v1/posts/:id/resolve
const resolvePost = asyncHandler(async (req, res) => {
  const { acceptedAnswer } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, "Post not found");

  if (String(post.author) !== String(req.user._id)) {
    throw new ApiError(403, "Only the post author can mark it resolved");
  }

  post.isResolved = true;
  if (acceptedAnswer) post.acceptedAnswer = acceptedAnswer;
  await post.save();

  res.status(200).json(new ApiResponse(200, post, "Post marked as resolved"));
});

// @route DELETE /api/v1/posts/:id
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, "Post not found");

  if (String(post.author) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You do not own this post");
  }

  await post.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Post deleted"));
});

module.exports = { createPost, getPosts, getPostById, votePost, resolvePost, deletePost };

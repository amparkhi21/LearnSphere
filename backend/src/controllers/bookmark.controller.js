const Bookmark = require("../models/bookmark.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @route POST /api/v1/bookmarks   body: { itemType, itemId }
const addBookmark = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;

  const existing = await Bookmark.findOne({ user: req.user._id, itemType, itemId });
  if (existing) throw new ApiError(409, "Already bookmarked");

  const bookmark = await Bookmark.create({ user: req.user._id, itemType, itemId });
  res.status(201).json(new ApiResponse(201, bookmark, "Bookmarked successfully"));
});

// @route GET /api/v1/bookmarks?itemType=course
const getMyBookmarks = asyncHandler(async (req, res) => {
  const { itemType } = req.query;
  const filter = { user: req.user._id };
  if (itemType) filter.itemType = itemType;

  const bookmarks = await Bookmark.find(filter).populate("itemId").sort("-createdAt");
  res.status(200).json(new ApiResponse(200, bookmarks, "Bookmarks fetched"));
});

// @route DELETE /api/v1/bookmarks/:id
const removeBookmark = asyncHandler(async (req, res) => {
  const bookmark = await Bookmark.findById(req.params.id);
  if (!bookmark) throw new ApiError(404, "Bookmark not found");
  if (String(bookmark.user) !== String(req.user._id)) throw new ApiError(403, "Not your bookmark");

  await bookmark.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Bookmark removed"));
});

module.exports = { addBookmark, getMyBookmarks, removeBookmark };

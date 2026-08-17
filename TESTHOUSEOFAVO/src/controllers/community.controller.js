const Community = require("../models/community.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @route POST /api/v1/communities
const createCommunity = asyncHandler(async (req, res) => {
  const community = await Community.create({
    ...req.body,
    createdBy: req.user._id,
    members: [req.user._id],
    moderators: [req.user._id],
    memberCount: 1,
  });
  res.status(201).json(new ApiResponse(201, community, "Community created successfully"));
});

// @route GET /api/v1/communities
const getCommunities = asyncHandler(async (req, res) => {
  const { subject, examTag, q } = req.query;
  const filter = {};
  if (subject) filter.subject = subject;
  if (examTag) filter.examTags = examTag;
  if (q) filter.name = { $regex: q, $options: "i" };

  const communities = await Community.find(filter).populate("createdBy", "name avatar").sort("-memberCount");
  res.status(200).json(new ApiResponse(200, communities, "Communities fetched"));
});

// @route GET /api/v1/communities/:slug
const getCommunityBySlug = asyncHandler(async (req, res) => {
  const community = await Community.findOne({ slug: req.params.slug }).populate("createdBy", "name avatar");
  if (!community) throw new ApiError(404, "Community not found");
  res.status(200).json(new ApiResponse(200, community, "Community fetched"));
});

// @route POST /api/v1/communities/:id/join
const joinCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new ApiError(404, "Community not found");

  if (community.members.includes(req.user._id)) {
    throw new ApiError(409, "You are already a member");
  }

  community.members.push(req.user._id);
  community.memberCount += 1;
  await community.save();

  res.status(200).json(new ApiResponse(200, community, "Joined community successfully"));
});

// @route POST /api/v1/communities/:id/leave
const leaveCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new ApiError(404, "Community not found");

  community.members = community.members.filter((m) => String(m) !== String(req.user._id));
  community.memberCount = Math.max(0, community.memberCount - 1);
  await community.save();

  res.status(200).json(new ApiResponse(200, community, "Left community"));
});

module.exports = { createCommunity, getCommunities, getCommunityBySlug, joinCommunity, leaveCommunity };

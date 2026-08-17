const Resource = require("../models/resource.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { DEFAULT_PAGE_SIZE } = require("../constants");

// @route POST /api/v1/resources  (multipart/form-data with "file" field)
const uploadResource = asyncHandler(async (req, res) => {
  const { title, description, type, stream, subject, examTags, tags, linkUrl, course } = req.body;

  let fileUrl = "";
  let fileSize = 0;

  if (req.file) {
    if (isCloudinaryConfigured()) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "learning-marketplace/resources",
        resource_type: "auto",
      });
      fileUrl = uploadResult.secure_url;
    } else {
      // Local fallback - served from /uploads static route
      fileUrl = `/uploads/${req.file.filename}`;
    }
    fileSize = Math.round(req.file.size / 1024);
  }

  const resource = await Resource.create({
    title,
    description,
    type,
    fileUrl,
    fileSize,
    linkUrl: linkUrl || "",
    uploadedBy: req.user._id,
    course: course || undefined,
    stream,
    subject,
    examTags: examTags ? JSON.parse(examTags) : [],
    tags: tags ? JSON.parse(tags) : [],
  });

  res.status(201).json(new ApiResponse(201, resource, "Resource uploaded successfully"));
});

// @route GET /api/v1/resources
const getResources = asyncHandler(async (req, res) => {
  const { q, stream, subject, examTag, type, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

  const filter = { isPublic: true };
  if (q) filter.$text = { $search: q };
  if (stream) filter.stream = stream;
  if (subject) filter.subject = subject;
  if (examTag) filter.examTags = examTag;
  if (type) filter.type = type;

  const resources = await Resource.find(filter)
    .populate("uploadedBy", "name avatar")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Resource.countDocuments(filter);

  res.status(200).json(new ApiResponse(200, { resources, total, page: Number(page) }, "Resources fetched"));
});

// @route GET /api/v1/resources/:id
const getResourceById = asyncHandler(async (req, res) => {
  const resource = await Resource.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }, { new: true }).populate(
    "uploadedBy",
    "name avatar"
  );
  if (!resource) throw new ApiError(404, "Resource not found");
  res.status(200).json(new ApiResponse(200, resource, "Resource fetched"));
});

// @route POST /api/v1/resources/:id/download (tracks download count)
const trackDownload = asyncHandler(async (req, res) => {
  const resource = await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }, { new: true });
  if (!resource) throw new ApiError(404, "Resource not found");
  res.status(200).json(new ApiResponse(200, { fileUrl: resource.fileUrl, linkUrl: resource.linkUrl }, "Download tracked"));
});

// @route DELETE /api/v1/resources/:id
const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new ApiError(404, "Resource not found");

  if (String(resource.uploadedBy) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "You do not own this resource");
  }

  await resource.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Resource deleted"));
});

module.exports = { uploadResource, getResources, getResourceById, trackDownload, deleteResource };

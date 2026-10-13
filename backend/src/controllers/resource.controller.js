const Resource = require("../models/resource.model");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { DEFAULT_PAGE_SIZE, RESOURCE_TYPE } = require("../constants");
const fs = require("fs/promises");
const path = require("path");

const removeTempUpload = async (file) => {
  if (!file?.path) return;
  try { await fs.unlink(file.path); } catch (error) { if (error.code !== "ENOENT") console.warn("Could not remove temporary resource upload", error.message); }
};

const storeUploadedFile = async (file) => {
  if (!file) return null;
  if (!isCloudinaryConfigured()) {
    return { fileUrl: `/uploads/${file.filename}`, fileSize: Math.round(file.size / 1024), storageProvider: "local", storagePublicId: "", storageResourceType: "" };
  }
  try {
    const uploaded = await cloudinary.uploader.upload(file.path, { folder: "learning-marketplace/resources", resource_type: "auto" });
    return { fileUrl: uploaded.secure_url, fileSize: Math.round(file.size / 1024), storageProvider: "cloudinary", storagePublicId: uploaded.public_id || "", storageResourceType: uploaded.resource_type || "" };
  } finally {
    await removeTempUpload(file);
  }
};

const removeStoredFile = async (resource) => {
  if (resource.storageProvider === "cloudinary" && resource.storagePublicId) {
    await cloudinary.uploader.destroy(resource.storagePublicId, { resource_type: resource.storageResourceType || "image" });
    return;
  }
  // Legacy Cloudinary URLs have no verified public ID; leave them untouched.
  const storedUrl = resource.fileUrl || "";
  if (resource.storageProvider === "cloudinary" || !storedUrl.startsWith("/uploads/")) return;
  const uploadRoot = path.resolve(__dirname, "..", "uploads");
  const filename = path.basename(storedUrl.slice("/uploads/".length));
  if (!filename) return;
  const filePath = path.resolve(uploadRoot, filename);
  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) return;
  try { await fs.unlink(filePath); } catch (error) { if (error.code !== "ENOENT") throw error; }
};

const cleanupStoredFileQuietly = async (resource) => {
  try { await removeStoredFile(resource); } catch (error) { console.warn("Could not clean up resource file", error.message); }
};

// @route POST /api/v1/resources  (multipart/form-data with "file" field)
const uploadResource = asyncHandler(async (req, res) => {
  const { title, description, type, stream, subject, examTags, tags, linkUrl, course } = req.body;

  let storedFile = { fileUrl: "", fileSize: 0, storageProvider: "", storagePublicId: "", storageResourceType: "" };

  if (type === "link") {
    try { const url = new URL(linkUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch (_) { throw new ApiError(400, "A valid HTTP or HTTPS resource URL is required"); }
  } else if (!req.file) {
    throw new ApiError(400, "Please attach a supported resource file");
  }

  if (req.file && type !== RESOURCE_TYPE.LINK) storedFile = await storeUploadedFile(req.file);
  else if (req.file) await removeTempUpload(req.file);

  const resource = await Resource.create({
    title,
    description,
    type,
    ...storedFile,
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

// @route PATCH /api/v1/resources/:id (teacher who owns the resource)
const updateResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findOne({ _id: req.params.id, uploadedBy: req.user._id });
  if (!resource) {
    await removeTempUpload(req.file);
    throw new ApiError(404, "Resource not found");
  }

  const { title, description, type, stream, subject, linkUrl } = req.body || {};
  const nextType = type === undefined ? resource.type : type;
  if (!Object.values(RESOURCE_TYPE).includes(nextType)) {
    await removeTempUpload(req.file);
    throw new ApiError(400, "Unsupported resource type");
  }
  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    await removeTempUpload(req.file);
    throw new ApiError(400, "Resource title is required");
  }

  let nextLinkUrl = linkUrl === undefined ? resource.linkUrl : String(linkUrl).trim();
  if (nextType === "link") {
    try { const url = new URL(nextLinkUrl); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
    catch (_) { await removeTempUpload(req.file); throw new ApiError(400, "A valid HTTP or HTTPS resource URL is required"); }
  } else if (!req.file && !(resource.fileUrl && resource.type !== "link")) {
    await removeTempUpload(req.file);
    throw new ApiError(400, "Please attach a supported resource file");
  }

  const oldStoredFile = { fileUrl: resource.fileUrl, storageProvider: resource.storageProvider, storagePublicId: resource.storagePublicId, storageResourceType: resource.storageResourceType };
  let nextStoredFile = null;
  try {
    if (req.file && nextType !== RESOURCE_TYPE.LINK) nextStoredFile = await storeUploadedFile(req.file);
    else if (req.file) await removeTempUpload(req.file);
    if (title !== undefined) resource.title = title.trim();
    if (description !== undefined) resource.description = description;
    if (stream !== undefined) resource.stream = stream;
    if (subject !== undefined) resource.subject = subject;
    resource.type = nextType;
    if (nextType === RESOURCE_TYPE.LINK) {
      resource.linkUrl = nextLinkUrl;
      resource.fileUrl = "";
      resource.fileSize = 0;
      resource.storageProvider = "";
      resource.storagePublicId = "";
      resource.storageResourceType = "";
    } else {
      resource.linkUrl = "";
      if (nextStoredFile) Object.assign(resource, nextStoredFile);
    }
    await resource.save();
  } catch (error) {
    if (nextStoredFile) await cleanupStoredFileQuietly(nextStoredFile);
    await removeTempUpload(req.file);
    throw error;
  }

  const fileWasReplacedOrRemoved = Boolean(nextStoredFile) || (nextType === RESOURCE_TYPE.LINK && oldStoredFile.fileUrl);
  if (fileWasReplacedOrRemoved) await cleanupStoredFileQuietly(oldStoredFile);
  res.status(200).json(new ApiResponse(200, resource, "Resource updated successfully"));
});

// @route GET /api/v1/resources
const getResources = asyncHandler(async (req, res) => {
  const { q, stream, subject, examTag, type, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

  // Only records with a current, trusted teacher owner are shared. Legacy records
  // with missing/untrusted uploader data remain stored but are not exposed as teacher resources.
  const teacherIds = await User.distinct("_id", { role: "teacher" });
  const filter = { isPublic: true, uploadedBy: { $in: teacherIds } };
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
  const resource = await Resource.findOneAndUpdate({ _id: req.params.id, uploadedBy: { $in: await User.distinct("_id", { role: "teacher" }) }, isPublic: true }, { $inc: { viewCount: 1 } }, { new: true }).populate(
    "uploadedBy",
    "name avatar"
  );
  if (!resource) throw new ApiError(404, "Resource not found");
  res.status(200).json(new ApiResponse(200, resource, "Resource fetched"));
});

// @route POST /api/v1/resources/:id/download (tracks download count)
const trackDownload = asyncHandler(async (req, res) => {
  const teacherIds = await User.distinct("_id", { role: "teacher" });
  const resource = await Resource.findOneAndUpdate({ _id: req.params.id, uploadedBy: { $in: teacherIds }, isPublic: true }, { $inc: { downloadCount: 1 } }, { new: true });
  if (!resource) throw new ApiError(404, "Resource not found");
  res.status(200).json(new ApiResponse(200, { fileUrl: resource.fileUrl, linkUrl: resource.linkUrl }, "Download tracked"));
});

// @route DELETE /api/v1/resources/:id
const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw new ApiError(404, "Resource not found");

  if (req.user.role !== "admin" && (req.user.role !== "teacher" || String(resource.uploadedBy) !== String(req.user._id))) {
    throw new ApiError(403, "You do not own this resource");
  }

  await resource.deleteOne();
  await cleanupStoredFileQuietly(resource);
  res.status(200).json(new ApiResponse(200, null, "Resource deleted"));
});

module.exports = { uploadResource, updateResource, getResources, getResourceById, trackDownload, deleteResource };

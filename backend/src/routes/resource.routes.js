const express = require("express");
const {
  uploadResource,
  getResources,
  getResourceById,
  trackDownload,
  deleteResource,
} = require("../controllers/resource.controller");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const restrictTo = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/", getResources);
router.get("/:id", getResourceById);
router.post("/:id/download", trackDownload);
router.post("/", protect, restrictTo("teacher"), upload.single("file"), uploadResource);
router.delete("/:id", protect, deleteResource);

module.exports = router;

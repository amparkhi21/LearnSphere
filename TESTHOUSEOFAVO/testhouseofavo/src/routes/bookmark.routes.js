const express = require("express");
const { addBookmark, getMyBookmarks, removeBookmark } = require("../controllers/bookmark.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/", addBookmark);
router.get("/", getMyBookmarks);
router.delete("/:id", removeBookmark);

module.exports = router;

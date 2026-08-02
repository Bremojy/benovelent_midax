const express = require("express");
const router = express.Router();

const {
    createNews,
    getNews,
    getSingleNews,
    getLatestNews,
    updateNews,
    deleteNews,
    likeNews,
    unlikeNews,
    addComment,
    deleteComment,
    pinNews,
    unpinNews
} = require("../controllers/newsController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

// =======================================
// NEWS ROUTES
// =======================================

// Create news (Admin / Super Admin)
router.post("/", protect, createNews);

// Public published news feed (used by the public website)
router.get("/public", getLatestNews);

// Get all news (authenticated management/member feed)
router.get("/", protect, getNews);

// Get one news article
router.get("/:id", protect, getSingleNews);

// Update news
router.put("/:id", protect, updateNews);

// Delete news
router.delete("/:id", protect, deleteNews);

// Like news
router.put("/:id/like", protect, likeNews);

// Unlike news
router.put("/:id/unlike", protect, unlikeNews);

// Add comment
router.post("/:id/comment", protect, addComment);

// Delete comment
router.delete("/:id/comment/:commentId", protect, deleteComment);

// Pin news
router.put("/:id/pin", protect, pinNews);

// Unpin news
router.put("/:id/unpin", protect, unpinNews);

module.exports = router;
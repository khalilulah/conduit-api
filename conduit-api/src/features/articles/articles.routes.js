const express = require("express");
const router = express.Router();
const { authOptional, authRequired } = require("../../middleware/auth");
const {
  createArticleHandler,
  listArticlesHandler,
  getFeedHandler,
  getArticleHandler,
  updateArticleHandler,
  deleteArticleHandler,
  unfavoriteArticleHandler,
  favoriteArticleHandler,
} = require("./articles.controller");
const {
  addCommentHandler,
  getCommentsHandler,
  deleteCommentHandler,
} = require("./comments.controller");

router.get("/articles/feed", authRequired, getFeedHandler);
router.get("/articles", authOptional, listArticlesHandler);
router.post("/articles", authRequired, createArticleHandler);
router.get("/articles/:slug", authOptional, getArticleHandler);
router.put("/articles/:slug", authRequired, updateArticleHandler);
router.delete("/articles/:slug", authRequired, deleteArticleHandler);
router.post("/articles/:slug/comments", authRequired, addCommentHandler);
router.get("/articles/:slug/comments", authOptional, getCommentsHandler);
router.post("/articles/:slug/favorite", authRequired, favoriteArticleHandler);
router.delete(
  "/articles/:slug/favorite",
  authRequired,
  unfavoriteArticleHandler,
);
router.delete(
  "/articles/:slug/comments/:id",
  authRequired,
  deleteCommentHandler,
);

module.exports = router;

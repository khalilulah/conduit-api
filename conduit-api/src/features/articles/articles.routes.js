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
} = require("./articles.controller");

router.get("/articles/feed", authRequired, getFeedHandler);
router.get("/articles", authOptional, listArticlesHandler);
router.post("/articles", authRequired, createArticleHandler);
router.get("/articles/:slug", authOptional, getArticleHandler);
router.put("/articles/:slug", authRequired, updateArticleHandler);
router.delete("/articles/:slug", authRequired, deleteArticleHandler);

module.exports = router;

const express = require("express");
const router = express.Router();
const { authOptional } = require("../../middleware/auth");
const {
  createArticleHandler,
  listArticlesHandler,
} = require("./articles.controller");
const { createArticleHandler } = require("./articles.controller");

router.post("/articles", authRequired, createArticleHandler);

router.get("/articles", authOptional, listArticlesHandler);

module.exports = router;

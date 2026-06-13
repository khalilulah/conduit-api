const express = require("express");
const router = express.Router();
const { authRequired } = require("../../middleware/auth");
const { createArticleHandler } = require("./articles.controller");

router.post("/articles", authRequired, createArticleHandler);

module.exports = router;

const express = require("express");
const router = express.Router();
const { getTagsHandler } = require("./tags.controller");

router.get("/tags", getTagsHandler);

module.exports = router;

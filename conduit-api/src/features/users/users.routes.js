const express = require("express");
const router = express.Router();
const { authRequired, authOptional } = require("../../middleware/auth");
const {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  getProfile,
  unfollow,
  follow,
} = require("./users.controller");

router.post("/users", register);
router.post("/users/login", login);
router.get("/user", authRequired, getCurrentUser);
router.put("/user", authRequired, updateCurrentUser);
router.get("/profiles/:username", authOptional, getProfile);
router.post("/profiles/:username/follow", authRequired, follow);
router.delete("/profiles/:username/follow", authRequired, unfollow);

module.exports = router;

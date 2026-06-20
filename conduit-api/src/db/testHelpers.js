const { query } = require("./index");
const request = require("supertest");
const app = require("../app");

const truncateAll = async () => {
  await query(`
    TRUNCATE TABLE
      favorites,
      follows,
      article_tags,
      comments,
      articles,
      tags,
      users
    RESTART IDENTITY CASCADE
  `);
};

const createTestUser = async (overrides = {}) => {
  const userData = {
    email: overrides.email || "khalil@test.com",
    username: overrides.username || "khalil",
    password: overrides.password || "password123",
  };

  const res = await request(app).post("/api/users").send({ user: userData });

  return {
    token: res.body.user.token,
    username: res.body.user.username,
    email: res.body.user.email,
  };
};

module.exports = { truncateAll, createTestUser };

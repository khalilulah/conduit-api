const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const usersRouter = require("./features/users/users.routes");
const articlesRouter = require("./features/articles/articles.routes");
const tagsRouter = require("./features/tags/tags.routes");
const { logger } = require("./middleware/logger");
const { errorHandler } = require("./middleware/errors");

app.use(logger);
app.use(express.json());

// General limit — 100 requests per 15 minutes for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { errors: { body: ["too many requests, please slow down"] } },
});

// Strict limit — 10 requests per 15 minutes for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { errors: { body: ["too many attempts, please try again later"] } },
});

app.use(express.json());

app.use("/api", generalLimiter);
app.use("/api/users", authLimiter); // covers POST /api/users and POST /api/users/login

app.use("/api", tagsRouter);
app.use("/api", usersRouter);
app.use("/api", articlesRouter);

// Health check — useful to confirm the server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);
// TODO: mount feature routers here as we build them

module.exports = app;

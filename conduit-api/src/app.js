const express = require("express");
const app = express();
const usersRouter = require("./features/users/users.routes");
const articlesRouter = require("./features/articles/articles.routes");

app.use(express.json());

app.use("/api", usersRouter);
app.use("/api", articlesRouter);

// Health check — useful to confirm the server is running
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// TODO: mount feature routers here as we build them

module.exports = app;

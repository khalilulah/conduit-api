const request = require("supertest");
const app = require("../app");
const { truncateAll, createTestUser } = require("../db/testHelpers");

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  const { pool } = require("../db/index");
  await pool.end();
});

describe("POST /api/articles", () => {
  test("creates an article and returns the correct shape", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "My Test Article",
          description: "A description",
          body: "The body",
          tagList: ["node", "javascript"],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.article.slug).toMatch(/^my-test-article-/);
    expect(res.body.article.title).toBe("My Test Article");
    expect(res.body.article.tagList).toContain("node");
    expect(res.body.article.tagList).toContain("javascript");
    expect(res.body.article.author.username).toBe("khalil");
    expect(res.body.article.favorited).toBe(false);
    expect(res.body.article.favoritesCount).toBe(0);
  });

  test("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .post("/api/articles")
      .send({
        article: {
          title: "My Test Article",
          description: "A description",
          body: "The body",
        },
      });

    expect(res.status).toBe(401);
  });

  test("returns 422 when required fields are missing", async () => {
    const { token } = await createTestUser();

    const res = await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "No description or body",
        },
      });

    expect(res.status).toBe(422);
  });
});

describe("GET /api/articles", () => {
  test("returns a list of articles with count", async () => {
    const { token } = await createTestUser();

    await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "Article One",
          description: "desc",
          body: "body",
          tagList: ["node"],
        },
      });

    await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "Article Two",
          description: "desc",
          body: "body",
          tagList: ["javascript"],
        },
      });

    const res = await request(app)
      .get("/api/articles")
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(2);
    expect(res.body.articlesCount).toBe(2);
  });

  test("filters articles by tag", async () => {
    const { token } = await createTestUser();

    await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "Node Article",
          description: "desc",
          body: "body",
          tagList: ["node"],
        },
      });

    await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: {
          title: "JS Article",
          description: "desc",
          body: "body",
          tagList: ["javascript"],
        },
      });

    const res = await request(app)
      .get("/api/articles?tag=node")
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.articles).toHaveLength(1);
    expect(res.body.articles[0].title).toBe("Node Article");
  });
});

describe("GET /api/articles/:slug", () => {
  test("returns a single article by slug", async () => {
    const { token } = await createTestUser();

    const created = await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: { title: "Single Article", description: "desc", body: "body" },
      });

    const slug = created.body.article.slug;

    const res = await request(app)
      .get(`/api/articles/${slug}`)
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.article.slug).toBe(slug);
    expect(res.body.article.title).toBe("Single Article");
  });

  test("returns 404 for a slug that does not exist", async () => {
    const res = await request(app).get(
      "/api/articles/this-slug-does-not-exist",
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/articles/:slug", () => {
  test("deletes an article when requested by the author", async () => {
    const { token } = await createTestUser();

    const created = await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({
        article: { title: "To Be Deleted", description: "desc", body: "body" },
      });

    const slug = created.body.article.slug;

    const res = await request(app)
      .delete(`/api/articles/${slug}`)
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(200);

    const check = await request(app).get(`/api/articles/${slug}`);
    expect(check.status).toBe(404);
  });

  test("returns 403 when a different user tries to delete", async () => {
    const { token: tokenA } = await createTestUser();
    const { token: tokenB } = await createTestUser({
      email: "sara@test.com",
      username: "sara",
    });

    const created = await request(app)
      .post("/api/articles")
      .set("Authorization", `Token ${tokenA}`)
      .send({
        article: { title: "Not Yours", description: "desc", body: "body" },
      });

    const slug = created.body.article.slug;

    const res = await request(app)
      .delete(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenB}`);

    expect(res.status).toBe(403);
  });
});

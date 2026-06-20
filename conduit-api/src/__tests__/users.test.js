const request = require("supertest");
const app = require("./../app");
const { truncateAll } = require("../db/testHelpers");

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  const { pool } = require("../db/index");
  await pool.end();
});

describe("POST /api/users (register)", () => {
  test("registers a new user and returns a token", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
          username: "khalil",
          password: "password123",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("khalil@test.com");
    expect(res.body.user.username).toBe("khalil");
    expect(res.body.user.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test("returns 422 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  test("returns 422 when email is already taken", async () => {
    await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
          username: "khalil",
          password: "password123",
        },
      });

    const res = await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
          username: "khalil2",
          password: "password123",
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

describe("POST /api/users/login", () => {
  test("logs in and returns a token", async () => {
    await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
          username: "khalil",
          password: "password123",
        },
      });

    const res = await request(app)
      .post("/api/users/login")
      .send({
        user: {
          email: "khalil@test.com",
          password: "password123",
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.user.token).toBeDefined();
    expect(res.body.user.email).toBe("khalil@test.com");
  });

  test("returns 401 with wrong password", async () => {
    await request(app)
      .post("/api/users")
      .send({
        user: {
          email: "khalil@test.com",
          username: "khalil",
          password: "password123",
        },
      });

    const res = await request(app)
      .post("/api/users/login")
      .send({
        user: {
          email: "khalil@test.com",
          password: "wrongpassword",
        },
      });

    expect(res.status).toBe(401);
  });

  test("returns 422 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({
        user: {
          email: "khalil@test.com",
        },
      });

    expect(res.status).toBe(422);
  });
});

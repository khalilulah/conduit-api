const db = require("../../db");

const createUser = async (username, email, passwordHash) => {
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, bio, image`,
    [username, email, passwordHash],
  );

  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await db.query(
    `SELECT id, username, email, password_hash, bio, image
     FROM users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await db.query(
    `SELECT id, username, email, bio, image
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0];
};

const findUserByUsername = async (username) => {
  const result = await db.query("SELECT id FROM users WHERE username = $1", [
    username,
  ]);
  return result.rows[0];
};

const updateUser = async (id, fields) => {
  // fields is an object like { bio: "I love Node.js" } or { email: "new@email.com", image: "http://..." }

  const allowed = ["email", "username", "password_hash", "bio", "image"];

  const setClauses = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      values.push(fields[key]);
      setClauses.push(`${key} = $${values.length}`);
    }
  }

  // Nothing to update
  if (setClauses.length === 0) {
    return findUserById(id);
  }

  // Add the WHERE id value at the end
  values.push(id);

  const result = await db.query(
    `UPDATE users
     SET ${setClauses.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, username, email, bio, image`,
    values,
  );

  return result.rows[0];
};

const findProfile = async (username, currentUserId) => {
  const result = await db.query(
    `SELECT 
       u.username,
       u.bio,
       u.image,
       EXISTS (
         SELECT 1 FROM follows
         WHERE follower_id = $2 AND followee_id = u.id
       ) AS following
     FROM users u
     WHERE u.username = $1`,
    [username, currentUserId],
  );

  return result.rows[0];
};

const followUser = async (followerId, followeeId) => {
  await db.query(
    `INSERT INTO follows (follower_id, followee_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [followerId, followeeId],
  );
};

const unfollowUser = async (followerId, followeeId) => {
  await db.query(
    `DELETE FROM follows
     WHERE follower_id = $1 AND followee_id = $2`,
    [followerId, followeeId],
  );
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  findProfile,
  followUser,
  unfollowUser,
  findUserByUsername,
};

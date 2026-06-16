const db = require("../../db");

const createComment = async (articleSlug, authorId, body) => {
  const { rows } = await db.query(
    `INSERT INTO comments (body, article_id, author_id)
     SELECT $1, a.id, $2 FROM articles a WHERE a.slug = $3
     RETURNING id`,
    [body, authorId, articleSlug],
  );
  return rows[0] ?? null;
};

const findCommentById = async (commentId, currentUserId = null) => {
  const { rows } = await db.query(
    `SELECT
       c.id,
       c.body,
       c.created_at,
       c.updated_at,
       u.username   AS author_username,
       u.bio        AS author_bio,
       u.image      AS author_image,
       EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $2 AND followee_id = u.id
       )            AS following
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.id = $1`,
    [commentId, currentUserId],
  );
  return rows[0] ?? null;
};

const getComments = async (articleSlug, currentUserId = null) => {
  const { rows } = await db.query(
    `SELECT
       c.id,
       c.body,
       c.created_at,
       c.updated_at,
       u.username   AS author_username,
       u.bio        AS author_bio,
       u.image      AS author_image,
       EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $2 AND followee_id = u.id
       )            AS following
     FROM comments c
     JOIN users u ON u.id = c.author_id
     JOIN articles a ON a.id = c.article_id
     WHERE a.slug = $1
     ORDER BY c.created_at DESC`,
    [articleSlug, currentUserId],
  );
  return rows;
};

const deleteComment = async (commentId) => {
  await db.query(`DELETE FROM comments WHERE id = $1`, [commentId]);
};

const getCommentAuthorId = async (commentId) => {
  const { rows } = await db.query(
    `SELECT author_id FROM comments WHERE id = $1`,
    [commentId],
  );
  return rows[0]?.author_id ?? null;
};

module.exports = {
  createComment,
  findCommentById,
  getComments,
  deleteComment,
  getCommentAuthorId,
};

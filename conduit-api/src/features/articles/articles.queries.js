const { Pool } = require("pg");
const db = require("../../db");
const slugify = require("slugify");
const { randomBytes } = require("crypto");

function generateSlug(title) {
  const base = slugify(title, { lower: true, strict: true });
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}

const createArticle = async (
  authorId,
  { title, description, body, tagList },
) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const slug = generateSlug(title);

    const { rows } = await client.query(
      `INSERT INTO articles (slug, title, description, body, author_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, title, description, body, created_at, updated_at`,
      [slug, title, description, body, authorId],
    );

    const article = rows[0];

    if (tagList && tagList.length > 0) {
      for (const tag of tagList) {
        await client.query(
          `INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [tag],
        );

        await client.query(
          `INSERT INTO article_tags (article_id, tag_id)
           SELECT $1, id FROM tags WHERE name = $2`,
          [article.id, tag],
        );
      }
    }

    await client.query("COMMIT");
    return article;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const findArticleBySlug = async (slug, currentUserId = null) => {
  const { rows } = await db.query(
    `SELECT
       a.slug,
       a.title,
       a.description,
       a.body,
       a.created_at,
       a.updated_at,
       u.username        AS author_username,
       u.bio             AS author_bio,
       u.image           AS author_image,
       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags,
       COUNT(DISTINCT f.user_id)::int                                       AS favorites_count,
       EXISTS(
         SELECT 1 FROM favorites
         WHERE article_id = a.id AND user_id = $2
       )                                                                    AS favorited,
       EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $2 AND followee_id = u.id
       )                                                                    AS following
     FROM articles a
     JOIN users u ON u.id = a.author_id
     LEFT JOIN article_tags at ON at.article_id = a.id
     LEFT JOIN tags t ON t.id = at.tag_id
     LEFT JOIN favorites f ON f.article_id = a.id
     WHERE a.slug = $1
     GROUP BY a.id, u.id`,
    [slug, currentUserId],
  );

  return rows[0] ?? null;
};

const listArticles = async (
  currentUserId = null,
  { tag, author, favorited, limit = 20, offset = 0 } = {},
) => {
  const params = [currentUserId, currentUserId];
  let paramIndex = 3;
  const conditions = [];

  if (tag) {
    conditions.push(`EXISTS (
      SELECT 1 FROM article_tags at2
      JOIN tags t2 ON t2.id = at2.tag_id
      WHERE at2.article_id = a.id AND t2.name = $${paramIndex}
    )`);
    params.push(tag);
    paramIndex++;
  }

  if (author) {
    conditions.push(`u.username = $${paramIndex}`);
    params.push(author);
    paramIndex++;
  }

  if (favorited) {
    conditions.push(`EXISTS (
      SELECT 1 FROM favorites f2
      JOIN users u2 ON u2.id = f2.user_id
      WHERE f2.article_id = a.id AND u2.username = $${paramIndex}
    )`);
    params.push(favorited);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  params.push(limit, offset);
  const limitIndex = paramIndex;
  const offsetIndex = paramIndex + 1;

  const { rows } = await db.query(
    `SELECT
       a.slug,
       a.title,
       a.description,
       a.body,
       a.created_at,
       a.updated_at,
       u.username        AS author_username,
       u.bio             AS author_bio,
       u.image           AS author_image,
       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags,
       COUNT(DISTINCT f.user_id)::int                                       AS favorites_count,
       EXISTS(
         SELECT 1 FROM favorites
         WHERE article_id = a.id AND user_id = $1
       )                                                                    AS favorited,
       EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $2 AND followee_id = u.id
       )                                                                    AS following
     FROM articles a
     JOIN users u ON u.id = a.author_id
     LEFT JOIN article_tags at ON at.article_id = a.id
     LEFT JOIN tags t ON t.id = at.tag_id
     LEFT JOIN favorites f ON f.article_id = a.id
     ${whereClause}
     GROUP BY a.id, u.id
     ORDER BY a.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    params,
  );

  return rows;
};

const countArticles = async ({ tag, author, favorited } = {}) => {
  const params = [];
  let paramIndex = 1;
  const conditions = [];

  if (tag) {
    conditions.push(`EXISTS (
      SELECT 1 FROM article_tags at2
      JOIN tags t2 ON t2.id = at2.tag_id
      WHERE at2.article_id = a.id AND t2.name = $${paramIndex}
    )`);
    params.push(tag);
    paramIndex++;
  }

  if (author) {
    conditions.push(`u.username = $${paramIndex}`);
    params.push(author);
    paramIndex++;
  }

  if (favorited) {
    conditions.push(`EXISTS (
      SELECT 1 FROM favorites f2
      JOIN users u2 ON u2.id = f2.user_id
      WHERE f2.article_id = a.id AND u2.username = $${paramIndex}
    )`);
    params.push(favorited);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT a.id)::int AS total
     FROM articles a
     JOIN users u ON u.id = a.author_id
     ${whereClause}`,
    params,
  );

  return rows[0].total;
};

const getFeedArticles = async (
  currentUserId,
  { limit = 20, offset = 0 } = {},
) => {
  const { rows } = await db.query(
    `SELECT
       a.slug,
       a.title,
       a.description,
       a.body,
       a.created_at,
       a.updated_at,
       u.username        AS author_username,
       u.bio             AS author_bio,
       u.image           AS author_image,
       COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags,
       COUNT(DISTINCT f.user_id)::int                                       AS favorites_count,
       EXISTS(
         SELECT 1 FROM favorites
         WHERE article_id = a.id AND user_id = $1
       )                                                                    AS favorited,
       true                                                                 AS following
     FROM articles a
     JOIN users u ON u.id = a.author_id
     JOIN follows fw ON fw.followee_id = a.author_id AND fw.follower_id = $1
     LEFT JOIN article_tags at ON at.article_id = a.id
     LEFT JOIN tags t ON t.id = at.tag_id
     LEFT JOIN favorites f ON f.article_id = a.id
     GROUP BY a.id, u.id
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [currentUserId, limit, offset],
  );

  return rows;
};

const countFeedArticles = async (currentUserId) => {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT a.id)::int AS total
     FROM articles a
     JOIN follows fw ON fw.followee_id = a.author_id AND fw.follower_id = $1`,
    [currentUserId],
  );

  return rows[0].total;
};

const updateArticle = async (slug, fields) => {
  const allowed = ["title", "description", "body"];
  const updates = [];
  const params = [];
  let paramIndex = 1;

  for (const field of allowed) {
    if (fields[field] !== undefined) {
      updates.push(`${field} = $${paramIndex}`);
      params.push(fields[field]);
      paramIndex++;
    }
  }

  if (fields.title) {
    updates.push(`slug = $${paramIndex}`);
    params.push(generateSlug(fields.title));
    paramIndex++;
  }

  updates.push(`updated_at = NOW()`);
  params.push(slug);

  const { rows } = await db.query(
    `UPDATE articles SET ${updates.join(", ")}
     WHERE slug = $${paramIndex}
     RETURNING slug`,
    params,
  );

  return rows[0] ?? null;
};

const deleteArticle = async (slug) => {
  await db.query(`DELETE FROM articles WHERE slug = $1`, [slug]);
};

const getArticleAuthorId = async (slug) => {
  const { rows } = await db.query(
    `SELECT author_id FROM articles WHERE slug = $1`,
    [slug],
  );
  return rows[0]?.author_id ?? null;
};

module.exports = {
  createArticle,
  findArticleBySlug,
  listArticles,
  countArticles,
  getFeedArticles,
  countFeedArticles,
  updateArticle,
  deleteArticle,
  getArticleAuthorId,
};

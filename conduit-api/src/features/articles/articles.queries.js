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

module.exports = { createArticle, findArticleBySlug };

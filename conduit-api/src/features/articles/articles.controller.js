const { createArticle, findArticleBySlug } = require("./articles.queries");

const formatArticle = (row) => ({
  slug: row.slug,
  title: row.title,
  description: row.description,
  body: row.body,
  tagList: row.tags ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  favorited: row.favorited ?? false,
  favoritesCount: row.favorites_count ?? 0,
  author: {
    username: row.author_username,
    bio: row.author_bio,
    image: row.author_image,
    following: row.following ?? false,
  },
});

const createArticleHandler = async (req, res, next) => {
  try {
    const { title, description, body, tagList } = req.body.article ?? {};

    if (!title || !description || !body) {
      return res.status(422).json({
        errors: { body: ["title, description and body are required"] },
      });
    }

    const article = await createArticle(req.user.id, {
      title,
      description,
      body,
      tagList,
    });
    const full = await findArticleBySlug(article.slug, req.user.id);

    return res.status(201).json({ article: formatArticle(full) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createArticleHandler, formatArticle };

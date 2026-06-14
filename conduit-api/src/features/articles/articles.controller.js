const {
  createArticle,
  findArticleBySlug,
  listArticles,
  countArticles,
  getFeedArticles,
  countFeedArticles,
  updateArticle,
  deleteArticle,
  getArticleAuthorId,
} = require("./articles.queries");

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

const listArticlesHandler = async (req, res, next) => {
  try {
    const { tag, author, favorited, limit = 20, offset = 0 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    const [articles, articlesCount] = await Promise.all([
      listArticles(currentUserId, { tag, author, favorited, limit, offset }),
      countArticles({ tag, author, favorited }),
    ]);

    return res.status(200).json({
      articles: articles.map(formatArticle),
      articlesCount,
    });
  } catch (err) {
    next(err);
  }
};

const getFeedHandler = async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const [articles, articlesCount] = await Promise.all([
      getFeedArticles(req.user.id, { limit, offset }),
      countFeedArticles(req.user.id),
    ]);

    return res.status(200).json({
      articles: articles.map(formatArticle),
      articlesCount,
    });
  } catch (err) {
    next(err);
  }
};

const getArticleHandler = async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const article = await findArticleBySlug(req.params.slug, currentUserId);

    if (!article) {
      return res.status(404).json({ errors: { body: ["article not found"] } });
    }

    return res.status(200).json({ article: formatArticle(article) });
  } catch (err) {
    next(err);
  }
};

const updateArticleHandler = async (req, res, next) => {
  try {
    const authorId = await getArticleAuthorId(req.params.slug);

    if (!authorId) {
      return res.status(404).json({ errors: { body: ["article not found"] } });
    }

    if (authorId !== req.user.id) {
      return res
        .status(403)
        .json({ errors: { body: ["you are not the author"] } });
    }

    const fields = req.body.article ?? {};
    const updated = await updateArticle(req.params.slug, fields);
    const article = await findArticleBySlug(updated.slug, req.user.id);

    return res.status(200).json({ article: formatArticle(article) });
  } catch (err) {
    next(err);
  }
};

const deleteArticleHandler = async (req, res, next) => {
  try {
    const authorId = await getArticleAuthorId(req.params.slug);

    if (!authorId) {
      return res.status(404).json({ errors: { body: ["article not found"] } });
    }

    if (authorId !== req.user.id) {
      return res
        .status(403)
        .json({ errors: { body: ["you are not the author"] } });
    }

    await deleteArticle(req.params.slug);

    return res.status(200).json({});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createArticleHandler,
  listArticlesHandler,
  getFeedHandler,
  getArticleHandler,
  updateArticleHandler,
  deleteArticleHandler,
  formatArticle,
};

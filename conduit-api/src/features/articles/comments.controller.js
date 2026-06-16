const {
  createComment,
  findCommentById,
  getComments,
  deleteComment,
  getCommentAuthorId,
} = require("./comments.queries");

const formatComment = (row) => ({
  id: row.id,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    username: row.author_username,
    bio: row.author_bio,
    image: row.author_image,
    following: row.following ?? false,
  },
});

const addCommentHandler = async (req, res, next) => {
  try {
    const { body } = req.body.comment ?? {};

    if (!body) {
      return res.status(422).json({ errors: { body: ["body is required"] } });
    }

    const comment = await createComment(req.params.slug, req.user.id, body);

    if (!comment) {
      return res.status(404).json({ errors: { body: ["article not found"] } });
    }

    const full = await findCommentById(comment.id, req.user.id);

    return res.status(201).json({ comment: formatComment(full) });
  } catch (err) {
    next(err);
  }
};

const getCommentsHandler = async (req, res, next) => {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const comments = await getComments(req.params.slug, currentUserId);

    return res.status(200).json({ comments: comments.map(formatComment) });
  } catch (err) {
    next(err);
  }
};

const deleteCommentHandler = async (req, res, next) => {
  try {
    const authorId = await getCommentAuthorId(req.params.id);

    if (!authorId) {
      return res.status(404).json({ errors: { body: ["comment not found"] } });
    }

    if (authorId !== req.user.id) {
      return res
        .status(403)
        .json({ errors: { body: ["you are not the author"] } });
    }

    await deleteComment(req.params.id);

    return res.status(200).json({});
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addCommentHandler,
  getCommentsHandler,
  deleteCommentHandler,
};

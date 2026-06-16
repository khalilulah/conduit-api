const { getAllTags } = require("./tags.queries");

const getTagsHandler = async (req, res, next) => {
  try {
    const tags = await getAllTags();
    return res.status(200).json({ tags });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTagsHandler };

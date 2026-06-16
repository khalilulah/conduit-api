const errorHandler = (err, req, res, next) => {
  console.error(err);

  return res.status(500).json({
    errors: { body: ["something went wrong"] },
  });
};

module.exports = { errorHandler };

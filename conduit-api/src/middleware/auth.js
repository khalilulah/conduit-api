const jwt = require("jsonwebtoken");

const authRequired = (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers["authorization"];

    // 2. Header must exist and start with "Token "
    if (!authHeader || !authHeader.startsWith("Token ")) {
      return res.status(401).json({
        errors: { body: ["no authorization token provided"] },
      });
    }

    // 3. Extract the JWT string (everything after "Token ")
    const token = authHeader.slice(6); // "Token " is 6 characters

    // 4. Verify — throws if invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the payload to req so controllers can use it
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      errors: { body: ["invalid or expired token"] },
    });
  }
};

const authOptional = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Token ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.slice(6);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Token was present but invalid — treat as unauthenticated
    req.user = null;
    next();
  }
};

module.exports = { authRequired, authOptional };

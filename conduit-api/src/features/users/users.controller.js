const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  findProfile,
  followUser,
  unfollowUser,
  findUserByUsername,
} = require("./users.queries");

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body.user ?? {};

    // 1. Validate
    if (!username || !email || !password) {
      return res.status(422).json({
        errors: { body: ["username, email and password are required"] },
      });
    }

    // 2. Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Insert — DB will throw if email/username already taken
    const user = await createUser(username, email, passwordHash);

    // 4. Sign a JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Respond
    return res.status(201).json({
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        image: user.image,
        token,
      },
    });
  } catch (err) {
    // PostgreSQL unique violation error code is '23505'
    if (err.code === "23505") {
      return res.status(422).json({
        errors: { body: ["email or username is already taken"] },
      });
    }
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body.user ?? {};

    // 1. Validate
    if (!email || !password) {
      return res.status(422).json({
        errors: { body: ["email and password are required"] },
      });
    }

    // 2. Find user
    const user = await findUserByEmail(email);

    // 3. Verify password — same error for missing user or wrong password
    const passwordValid =
      user && (await bcrypt.compare(password, user.password_hash));

    if (!passwordValid) {
      return res.status(401).json({
        errors: { body: ["invalid email or password"] },
      });
    }

    // 4. Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 5. Respond
    return res.status(200).json({
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        image: user.image,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);

    return res.status(200).json({
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        image: user.image,
        token: req.headers["authorization"].slice(6),
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateCurrentUser = async (req, res, next) => {
  try {
    const incoming = req.body.user ?? {};

    // Build the fields object — hash password if it was sent
    const fields = {};

    if (incoming.email !== undefined) fields.email = incoming.email;
    if (incoming.username !== undefined) fields.username = incoming.username;
    if (incoming.bio !== undefined) fields.bio = incoming.bio;
    if (incoming.image !== undefined) fields.image = incoming.image;

    if (incoming.password !== undefined) {
      fields.password_hash = await bcrypt.hash(incoming.password, 10);
    }

    const user = await updateUser(req.user.id, fields);

    return res.status(200).json({
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
        image: user.image,
        token: req.headers["authorization"].slice(6),
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(422).json({
        errors: { body: ["email or username is already taken"] },
      });
    }
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const profile = await findProfile(username, currentUserId);

    if (!profile) {
      return res.status(404).json({
        errors: { body: ["profile not found"] },
      });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

const follow = async (req, res, next) => {
  try {
    const { username } = req.params;

    // Find the user being followed
    const targetUser = await findUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ errors: { body: ["user not found"] } });
    }

    await followUser(req.user.id, targetUser.id);

    const profile = await findProfile(username, req.user.id);

    return res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

const unfollow = async (req, res, next) => {
  try {
    const { username } = req.params;

    // Find the user being followed
    const targetUser = await findUserByUsername(username);
    if (!targetUser) {
      return res.status(404).json({ errors: { body: ["user not found"] } });
    }

    await unfollowUser(req.user.id, targetUser.id);

    const profile = await findProfile(username, req.user.id);

    return res.status(200).json({ profile });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  getProfile,
  follow,
  unfollow,
};

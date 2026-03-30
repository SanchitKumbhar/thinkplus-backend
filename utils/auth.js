const jwt = require("jsonwebtoken");

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET || "change-this-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

module.exports = {
  signToken,
};

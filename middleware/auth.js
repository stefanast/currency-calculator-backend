require("dotenv").config();

const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

const auth = (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(401).json({
      ok: false,
      msg: "No token provided.",
    });
  }
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
  } catch {
    return res.status(401).json({
      ok: false,
      msg: "Invalid token.",
    });
  }

  next();
};

module.exports = auth;

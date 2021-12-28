require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const User = require("../models/user");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const router = express.Router();

let refreshTokens = [];

const generateAccessToken = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      roles: user.roles,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXP,
    }
  );
  return accessToken;
};

router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({
        ok: false,
        msg: "Login failed.",
      });
    }
    try {
      const valid = await bcrypt.compare(req.body.password, user.password);
      if (!valid) {
        throw new Error("Login failed.");
      }
    } catch {
      return res.status(401).json({
        ok: false,
        msg: "Login failed.",
      });
    }
    const accessToken = generateAccessToken({
      id: user._id,
      roles: user.roles,
    });
    const refreshToken = jwt.sign(
      {
        id: user._id,
      },
      REFRESH_TOKEN_SECRET
    );
    refreshTokens.push(refreshToken);
    return res.json({
      ok: true,
      user: {
        email: user.email,
        roles: user.roles,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  }
);

router.delete("/logout", (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.status(400).json({
      ok: false,
      msg: "No token provided.",
    });
  }
  if (!refreshTokens.includes(token)) {
    return res.status(400).json({
      ok: false,
      msg: "Invalid token.",
    });
  }
  refreshTokens = refreshTokens.filter((rToken) => rToken !== token);
  return res.status(204).send();
});

router.post("/refresh", async (req, res) => {
  const refreshToken = req.body.token;
  if (!refreshToken) {
    return res.status(401).json({
      ok: false,
      msg: "No token provided.",
    });
  }
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({
      ok: false,
      msg: "Invalid token.",
    });
  }
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ _id: decoded.id });
    const accessToken = generateAccessToken({
      id: user._id,
      roles: user.roles,
    });
    return res.json({
      ok: true,
      accessToken: accessToken,
    });
  } catch {
    return res.status(401).json({
      ok: false,
      msg: "Invalid token.",
    });
  }
});

router.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 5 })
    .withMessage("must be at least 5 chars long"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const email = req.body.email;
    const password = req.body.password;

    const anotherUser = await User.findOne({ email: email });
    if (anotherUser) {
      return res.status(400).json({
        ok: false,
        msg: `${email} already exists.`,
      });
    }
    const user = new User({
      email: email,
      password: await bcrypt.hash(password, 10),
      roles: ["viewer"],
    });
    try {
      const newUser = await user.save();
      return res.status(201).json({
        ok: true,
        msg: `Successful registration: ${newUser.email}`,
      });
    } catch {
      return res.status(400).json({
        ok: false,
        msg: "User registration failed.",
      });
    }
  }
);

module.exports = router;

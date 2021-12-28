const editor = (req, res, next) => {
  if (!req.user.roles.includes("editor")) {
    return res.status(403).json({
      ok: false,
      msg: "Editor permissions required. Access denied.",
    });
  }
  next();
};

const viewer = (req, res, next) => {
  if (!req.user.roles.includes("viewer")) {
    return res.status(403).json({
      ok: false,
      msg: "Viewer permissions required. Access denied.",
    });
  }
  next();
};

module.exports = {
  editor,
  viewer,
};

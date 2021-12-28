const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  email: String,
  password: String,
  roles: [String],
});

module.exports = mongoose.model("User", userSchema);

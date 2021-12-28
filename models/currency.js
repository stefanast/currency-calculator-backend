const mongoose = require("mongoose");

const currencySchema = mongoose.Schema({
  symbol: String,
  name: String,
  rates: Object,
});

module.exports = mongoose.model("Currency", currencySchema);

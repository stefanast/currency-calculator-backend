const express = require("express");
const { body, validationResult } = require("express-validator");

const auth = require("../middleware/auth");
const { editor, viewer } = require("../middleware/roles");

const Currency = require("../models/currency");

const router = express.Router();

router.get("/", [auth, viewer], async (req, res) => {
  const currencies = await Currency.find();
  const currenciesList = currencies.map((curr) => {
    return {
      symbol: curr.symbol,
      name: curr.name,
      rates: curr.rates,
    };
  });
  res.json({
    ok: true,
    count: currenciesList.length,
    result: currenciesList,
  });
});

router.post(
  "/",
  [auth, editor],
  body("symbol").not().isEmpty(),
  body("name").not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const symbol = req.body.symbol;
    const name = req.body.name;

    const anotherCurrency = await Currency.findOne({ symbol: symbol });
    if (anotherCurrency) {
      return res.status(400).json({
        ok: false,
        msg: `${symbol} already exists.`,
      });
    }
    const currency = new Currency({
      symbol: symbol,
      name: name,
      rates: {},
    });
    currency.rates[symbol] = 1;
    try {
      const newCurrency = await currency.save();
      return res.status(201).json({
        ok: true,
        msg: `Successfully added ${newCurrency.symbol}`,
      });
    } catch {
      return res.status(400).json({
        ok: false,
        msg: "Failed adding currency.",
      });
    }
  }
);

router.delete(
  "/",
  [auth, editor],
  body("symbol").not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const symbol = req.body.symbol;
    const { deletedCount } = await Currency.deleteOne({ symbol: symbol });
    if (!deletedCount) {
      return res.status(404).json({
        ok: false,
        msg: `${symbol} not found.`,
      });
    }
    const query = { [`rates.${symbol}`]: { $exists: true } };
    await Currency.updateMany(query, {
      $unset: { [`rates.${symbol}`]: 1 },
    });
    return res.status(204).send();
  }
);

router.put(
  "/rate",
  [auth, editor],
  body("base").not().isEmpty(),
  body("target").not().isEmpty(),
  body("rate").not().isEmpty().isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const base = req.body.base;
    const target = req.body.target;
    const rate = Number(req.body.rate);
    if (base === target) {
      return res.status(400).json({
        ok: false,
        msg: "Target and base should be different.",
      });
    }
    const fromCurrency = await Currency.findOne({ symbol: base });
    if (!fromCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${base} not found.`,
      });
    }
    const toCurrency = await Currency.findOne({ symbol: target });
    if (!toCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${target} not found.`,
      });
    }
    await Currency.updateOne({ symbol: base }, { [`rates.${target}`]: rate });
    await Currency.updateOne(
      { symbol: target },
      { [`rates.${base}`]: 1 / rate }
    );
    return res.status(201).json({
      ok: true,
      msg: `Successfully set: ${fromCurrency.name} -> ${toCurrency.name}: ${rate}`,
    });
  }
);

router.delete(
  "/rate",
  [auth, editor],
  body("base").not().isEmpty(),
  body("target").not().isEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const base = req.body.base;
    const target = req.body.target;
    if (base === target) {
      return res.status(400).json({
        ok: false,
        msg: "Target and base should be different.",
      });
    }
    const fromCurrency = await Currency.findOne({ symbol: base });
    if (!fromCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${base} not found.`,
      });
    }
    const toCurrency = await Currency.findOne({ symbol: target });
    if (!toCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${target} not found.`,
      });
    }
    const { modifiedCount } = await Currency.updateOne(
      { symbol: base },
      {
        $unset: { [`rates.${target}`]: 1 },
      }
    );
    if (!modifiedCount) {
      return res.status(404).json({
        ok: false,
        msg: `${fromCurrency.name} -> ${toCurrency.name} not found.`,
      });
    }
    await Currency.updateOne(
      { symbol: target },
      {
        $unset: { [`rates.${base}`]: 1 },
      }
    );
    return res.status(204).send();
  }
);

router.post(
  "/convert",
  [auth, viewer],
  body("base").not().isEmpty(),
  body("target").not().isEmpty(),
  body("amount").not().isEmpty().isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array(),
      });
    }
    const base = req.body.base;
    const target = req.body.target;
    const amount = Number(req.body.amount);
    const fromCurrency = await Currency.findOne({ symbol: base });
    if (!fromCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${base} not found.`,
      });
    }
    const toCurrency = await Currency.findOne({ symbol: target });
    if (!toCurrency) {
      return res.status(404).json({
        ok: false,
        msg: `${target} not found.`,
      });
    }
    if (!(target in fromCurrency.rates)) {
      return res.status(404).json({
        ok: false,
        msg: `${fromCurrency.name} -> ${toCurrency.name} not found.`,
      });
    }
    const exchangeRate = fromCurrency.rates[target];
    const convertedAmount = amount * exchangeRate;
    return res.json({
      ok: true,
      base: base,
      target: target,
      amount: amount,
      convertedAmount: convertedAmount,
    });
  }
);

module.exports = router;

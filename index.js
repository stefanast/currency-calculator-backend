require("dotenv").config();

const PORT = process.env.PORT || 3000;

const cors = require("cors");

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const DATABASE_URI = process.env.DATABASE_URI;
mongoose.connect(DATABASE_URI).catch((err) => console.log(err));

const db = mongoose.connection;
db.on("error", (err) => console.log(err));
db.once("open", () => console.log("Connected to Database"));

app.use(cors());
app.use(express.json());

const authRouter = require("./routes/auth");
const currenciesRouter = require("./routes/currencies");

app.use("/auth", authRouter);
app.use("/currencies", currenciesRouter);

app.get("/", (req, res) => {
  res.json({ msg: "Currency Calculator Backend" });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      ok: false,
      msg: "Bad request.",
    });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

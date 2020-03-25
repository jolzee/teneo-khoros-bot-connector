require("dotenv").config();
import "core-js/stable";
import "regenerator-runtime/runtime";
const morgan = require("morgan");
const winston = require("./../config/winston");
import { khorosInbound, khorosRegisterBot } from "../routes/routes";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const router = express.Router();

app.use(morgan("tiny", { stream: winston.stream }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/", router);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // include winston logging
  winston.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`
  );

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const port = 3000;

router.post("/", khorosInbound);
router.get("/register", khorosRegisterBot);

app.listen(port, () => {
  winston.info(`Server is listening on port ${port}`);
});

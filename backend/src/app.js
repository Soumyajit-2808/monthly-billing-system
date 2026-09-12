const express = require("express");
const healthRouter = require("./routes/health.routes");
const dbRouter = require("./routes/db.routes");
const usersRouter = require("./routes/users.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Monthly Billing System API is running");
});

app.use("/api/health", healthRouter);

app.use("/api/db", dbRouter);

app.use("/api/users", usersRouter);

module.exports = app;

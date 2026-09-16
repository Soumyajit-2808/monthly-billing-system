const express = require("express");
const healthRouter = require("./routes/health.routes");
const dbRouter = require("./routes/db.routes");
const usersRouter = require("./routes/users.routes");
const monthsRouter = require("./routes/months.routes");
const dailyRecordsRouter = require("./routes/daily-records.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Monthly Billing System API is running");
});

app.use("/api/health", healthRouter);

app.use("/api/db", dbRouter);

app.use("/api/users", usersRouter);

app.use("/api/months", monthsRouter);

app.use("/api/months/:monthId/daily-records", dailyRecordsRouter);

module.exports = app;

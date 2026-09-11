const express = require("express");
const pool = require("../db");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Monthly Billing System API is running");
});

app.get("/api/health", (req, res) => {
	res.json({
		status: "ok",
		message: "API is healthy",
	});
});

app.get("/api/db-test", async (req, res) => {
	try {
		const result = await pool.query("SELECT current_database()");

		res.json({
			status: "ok",
			database: result.rows[0].current_database,
		});
	} catch (error) {
		console.error("Database query failed:", error.message);

		res.status(500).json({
			status: "error",
			message: "Database connection failed",
		});
	}
});

module.exports = app;

const express = require("express");
const pool = require("../../db");

const router = express.Router();

router.get("/test", async (req, res) => {
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

module.exports = router;

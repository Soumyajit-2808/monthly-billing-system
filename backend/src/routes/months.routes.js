const express = require("express");
const pool = require("../../db");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
	const {
		month,
		year,
		opening_rice,
		opening_dal,
		opening_oil,
		opening_salt,
	} = req.body;

	if (
		month === undefined ||
		year === undefined ||
		opening_rice === undefined ||
		opening_dal === undefined ||
		opening_oil === undefined ||
		opening_salt === undefined
	) {
		return res.status(400).json({
			status: "error",
			message: "Month, year and all opening stock values are required",
		});
	}

	try {
		const result = await pool.query(
			`INSERT INTO months (
                month,
                year,
                opening_rice,
                opening_dal,
                opening_oil,
                opening_salt,
                user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                month,
                year,
                opening_rice,
                opening_dal,
                opening_oil,
                opening_salt,
                user_id`,
			[
				month,
				year,
				opening_rice,
				opening_dal,
				opening_oil,
				opening_salt,
				req.user.userId,
			],
		);

		return res.status(201).json({
			status: "ok",
			message: "Month created successfully",
			month: result.rows[0],
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				status: "error",
				message: "A bill already exists for this month",
			});
		}

		console.error("Month creation failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Failed to create month",
		});
	}
});

module.exports = router;

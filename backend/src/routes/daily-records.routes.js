const express = require("express");
const pool = require("../../db");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router({ mergeParams: true });

router.post("/", authenticateToken, async (req, res) => {
	const { monthId } = req.params;

	const {
		date,
		status,
		pregnant_mothers,
		lactating_mothers,
		boys_6m_3y,
		girls_6m_3y,
		boys_3y_6y,
		girls_3y_6y,
		rice_received,
		dal_received,
		oil_received,
		salt_received,
	} = req.body;

	if (!date || !status) {
		return res.status(400).json({
			status: "error",
			message: "Date and status are required",
		});
	}

	if (!["WORKING", "HOLIDAY"].includes(status)) {
		return res.status(400).json({
			status: "error",
			message: "Status must be WORKING or HOLIDAY",
		});
	}

	const numericFields = [
		"pregnant_mothers",
		"lactating_mothers",
		"boys_6m_3y",
		"girls_6m_3y",
		"boys_3y_6y",
		"girls_3y_6y",
		"rice_received",
		"dal_received",
		"oil_received",
		"salt_received",
	];

	for (const field of numericFields) {
		if (req.body[field] !== undefined) {
			const value = Number(req.body[field]);

			if (!Number.isFinite(value) || value < 0) {
				return res.status(400).json({
					status: "error",
					message: `${field} must be a non-negative number`,
				});
			}
		}
	}

	try {
		const monthResult = await pool.query(
			`SELECT id
             FROM months
             WHERE id = $1 AND user_id = $2`,
			[monthId, req.user.userId],
		);

		if (monthResult.rows.length === 0) {
			return res.status(404).json({
				status: "error",
				message: "Month not found",
			});
		}

		const result = await pool.query(
			`INSERT INTO daily_records (
                month_id,
                date,
                status,
                pregnant_mothers,
                lactating_mothers,
                boys_6m_3y,
                girls_6m_3y,
                boys_3y_6y,
                girls_3y_6y,
                rice_received,
                dal_received,
                oil_received,
                salt_received
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
            RETURNING *`,
			[
				monthId,
				date,
				status,
				pregnant_mothers ?? 0,
				lactating_mothers ?? 0,
				boys_6m_3y ?? 0,
				girls_6m_3y ?? 0,
				boys_3y_6y ?? 0,
				girls_3y_6y ?? 0,
				rice_received ?? 0,
				dal_received ?? 0,
				oil_received ?? 0,
				salt_received ?? 0,
			],
		);

		return res.status(201).json({
			status: "ok",
			message: "Daily record created successfully",
			dailyRecord: result.rows[0],
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				status: "error",
				message: "A daily record already exists for this date",
			});
		}

		console.error("Daily record creation failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Failed to create daily record",
		});
	}
});

module.exports = router;

const express = require("express");
const pool = require("../../db");
const { authenticateToken } = require("../middleware/auth.middleware");

const {
	calculateForm1MonthlySummary,
	calculateMonthlyForm2Summary,
} = require("../services/billing.service");

const router = express.Router({ mergeParams: true });

router.get("/", authenticateToken, async (req, res) => {
	const { monthId } = req.params;

	try {
		const monthResult = await pool.query(
			`SELECT
                id,
                month,
                year,
                opening_rice,
                opening_dal,
                opening_oil,
                opening_salt
             FROM months
             WHERE id = $1
               AND user_id = $2`,
			[monthId, req.user.userId],
		);

		if (monthResult.rows.length === 0) {
			return res.status(404).json({
				status: "error",
				message: "Month not found",
			});
		}

		const month = monthResult.rows[0];

		const recordsResult = await pool.query(
			`SELECT
        id,
        month_id,
        date::text AS date,
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
     FROM daily_records
     WHERE month_id = $1
     ORDER BY date`,
			[monthId],
		);

		const records = recordsResult.rows;

		const form1 = calculateForm1MonthlySummary(
			{
				rice: month.opening_rice,
				dal: month.opening_dal,
				oil: month.opening_oil,
				salt: month.opening_salt,
			},
			records,
		);

		const form2 = await calculateMonthlyForm2Summary(records, "CURRENT");

		return res.json({
			status: "ok",
			month: {
				id: month.id,
				month: month.month,
				year: month.year,
			},
			dailyRecordCount: records.length,
			form1,
			form2,
		});
	} catch (error) {
		console.error("Monthly billing summary failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Failed to calculate monthly billing summary",
		});
	}
});

module.exports = router;

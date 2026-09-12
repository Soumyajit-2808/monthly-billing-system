const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../db");

const router = express.Router();

router.post("/register", async (req, res) => {
	const { name, email, password } = req.body;

	if (!name || !email || !password) {
		return res.status(400).json({
			status: "error",
			message: "Name, email and password are required",
		});
	}

	try {
		const passwordHash = await bcrypt.hash(password, 12);

		const result = await pool.query(
			`INSERT INTO users (name, email, password_hash)
			 VALUES ($1, $2, $3)
			 RETURNING id, name, email`,
			[name.trim(), email.trim().toLowerCase(), passwordHash],
		);

		res.status(201).json({
			status: "ok",
			user: result.rows[0],
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				status: "error",
				message: "Email already registered",
			});
		}

		console.error("Registration failed:", error.message);

		res.status(500).json({
			status: "error",
			message: "Registration failed",
		});
	}
});

module.exports = router;

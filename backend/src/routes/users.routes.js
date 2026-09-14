const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../db");
const { generateOtp } = require("../utils/otp");
const { sendVerificationOtp } = require("../services/email.service");
const { generateToken } = require("../utils/jwt");

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

		const otp = generateOtp();
		const otpHash = await bcrypt.hash(otp, 10);

		const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

		const result = await pool.query(
			`INSERT INTO users (
			name,
			email,
			password_hash,
			verification_otp_hash,
			verification_otp_expires_at
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, name, email, email_verified`,
			[
				name.trim(),
				email.trim().toLowerCase(),
				passwordHash,
				otpHash,
				otpExpiresAt,
			],
		);
		await sendVerificationOtp(email.trim().toLowerCase(), otp);

		res.status(201).json({
			status: "ok",
			message: "Registration successful. Verify your email with the OTP.",
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

router.post("/login", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({
			status: "error",
			message: "Email and password are required",
		});
	}

	try {
		const result = await pool.query(
			`SELECT id, name, email, password_hash, email_verified
             FROM users
             WHERE email = $1`,
			[email.trim().toLowerCase()],
		);

		if (result.rows.length === 0) {
			return res.status(401).json({
				status: "error",
				message: "Invalid email or password",
			});
		}

		const user = result.rows[0];

		if (!user.email_verified) {
			return res.status(403).json({
				status: "error",
				message: "Please verify your email before logging in",
			});
		}

		const passwordMatches = await bcrypt.compare(
			password,
			user.password_hash,
		);

		if (!passwordMatches) {
			return res.status(401).json({
				status: "error",
				message: "Invalid email or password",
			});
		}

		const token = generateToken(user);

		return res.json({
			status: "ok",
			message: "Login successful",
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		console.error("Login failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Login failed",
		});
	}
});

router.post("/verify-email", async (req, res) => {
	const { email, otp } = req.body;

	if (!email || !otp) {
		return res.status(400).json({
			status: "error",
			message: "Email and OTP are required",
		});
	}

	try {
		const result = await pool.query(
			`SELECT
				id,
				email_verified,
				verification_otp_hash,
				verification_otp_expires_at,
				verification_otp_attempts
			FROM users
			WHERE email = $1`,
			[email.trim().toLowerCase()],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				status: "error",
				message: "User not found",
			});
		}

		const user = result.rows[0];

		if (user.email_verified) {
			return res.status(400).json({
				status: "error",
				message: "Email is already verified",
			});
		}

		if (!user.verification_otp_hash || !user.verification_otp_expires_at) {
			return res.status(400).json({
				status: "error",
				message: "No active verification OTP",
			});
		}
		if (user.verification_otp_attempts >= 5) {
			return res.status(400).json({
				status: "error",
				message:
					"Too many incorrect attempts. Please request a new OTP.",
			});
		}

		if (new Date() > new Date(user.verification_otp_expires_at)) {
			return res.status(400).json({
				status: "error",
				message: "OTP has expired",
			});
		}

		const otpMatches = await bcrypt.compare(
			otp,
			user.verification_otp_hash,
		);

		if (!otpMatches) {
			await pool.query(
				`UPDATE users
				 SET verification_otp_attempts = verification_otp_attempts + 1
				 WHERE id = $1`,
				[user.id],
			);

			return res.status(400).json({
				status: "error",
				message: "Invalid OTP",
			});
		}

		await pool.query(
			`UPDATE users
			 SET
				email_verified = TRUE,
				verification_otp_hash = NULL,
				verification_otp_expires_at = NULL,
				verification_otp_attempts = 0
			 WHERE id = $1`,
			[user.id],
		);

		return res.json({
			status: "ok",
			message: "Email verified successfully",
		});
	} catch (error) {
		console.error("Email verification failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Email verification failed",
		});
	}
});

router.post("/resend-verification", async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).json({
			status: "error",
			message: "Email is required",
		});
	}

	try {
		const result = await pool.query(
			`SELECT id, email_verified
             FROM users
             WHERE email = $1`,
			[email.trim().toLowerCase()],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				status: "error",
				message: "User not found",
			});
		}

		const user = result.rows[0];

		if (user.email_verified) {
			return res.status(400).json({
				status: "error",
				message: "Email is already verified",
			});
		}

		const otp = generateOtp();
		const otpHash = await bcrypt.hash(otp, 10);
		const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await sendVerificationOtp(email.trim().toLowerCase(), otp);

		await pool.query(
			`UPDATE users
     SET
        verification_otp_hash = $1,
        verification_otp_expires_at = $2,
        verification_otp_attempts = 0
     WHERE id = $3`,
			[otpHash, otpExpiresAt, user.id],
		);

		return res.json({
			status: "ok",
			message: "A new verification OTP has been sent to your email",
		});
	} catch (error) {
		console.error("Resend verification failed:", error.message);

		return res.status(500).json({
			status: "error",
			message: "Failed to resend verification OTP",
		});
	}
});

module.exports = router;

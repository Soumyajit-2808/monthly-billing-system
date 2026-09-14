const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({
			status: "error",
			message: "Authentication required",
		});
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		req.user = decoded;

		next();
	} catch (error) {
		return res.status(401).json({
			status: "error",
			message: "Invalid or expired token",
		});
	}
}

module.exports = {
	authenticateToken,
};

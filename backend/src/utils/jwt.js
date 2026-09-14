const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateToken(user) {
	return jwt.sign(
		{
			userId: user.id,
			email: user.email,
		},
		process.env.JWT_SECRET,
		{
			expiresIn: "7d",
		},
	);
}

module.exports = {
	generateToken,
};

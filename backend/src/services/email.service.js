require("dotenv").config();

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationOtp(email, otp) {
	const { data, error } = await resend.emails.send({
		from: "onboarding@resend.dev",
		to: [email],
		subject: "Verify your Monthly Billing System account",
		html: `
            <h2>Email Verification</h2>
            <p>Your verification OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP will expire in 10 minutes.</p>
        `,
	});

	if (error) {
		throw new Error(error.message);
	}

	return data;
}

module.exports = {
	sendVerificationOtp,
};

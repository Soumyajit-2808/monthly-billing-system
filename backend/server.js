const express = require("express");

const app = express();

const PORT = 3000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
	res.send("Monthly Billing System API is running");
});

app.get("/api/health", (req, res) => {
	res.json({
		status: "ok",
		message: "API is healthy",
	});
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});

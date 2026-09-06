const express = require("express");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
	res.send("Monthly Billing System API is running");
});

app.listen(PORT, () => {
	console.log(`Server running on https://localhost:${PORT}`);
});

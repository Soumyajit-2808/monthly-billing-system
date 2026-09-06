const pool = require("./db");

async function testDatabaseConnection() {
	try {
		const result = await pool.query("SELECT current_database()");
		console.log("Connected to database:", result.rows[0].current_database);
	} catch (error) {
		console.error("Database connection failed:", error.message);
	} finally {
		await pool.end();
	}
}

testDatabaseConnection();

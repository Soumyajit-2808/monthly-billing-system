const pool = require("../../db");

async function getForm2Rate(category, rateStatus, scheduleGroup) {
	const result = await pool.query(
		`SELECT
            category,
            rate_status,
            mother_rate,
            child_rate
         FROM form_2_rates
         WHERE category = $1
           AND rate_status = $2
           AND schedule_id = (
               SELECT id
               FROM schedules
               WHERE name = $3
           )`,
		[category, rateStatus, scheduleGroup],
	);

	if (result.rows.length === 0) {
		throw new Error(
			`Form 2 rate not found for ${category}, ${rateStatus}, ${scheduleGroup}`,
		);
	}

	return result.rows[0];
}

function roundToTwo(value) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotalPeople(record) {
	return (
		record.pregnant_mothers +
		record.lactating_mothers +
		record.boys_6m_3y +
		record.girls_6m_3y +
		record.boys_3y_6y +
		record.girls_3y_6y
	);
}

function calculateHeadcountGroups(record) {
	const mothers = record.pregnant_mothers + record.lactating_mothers;

	const children =
		record.boys_6m_3y +
		record.girls_6m_3y +
		record.boys_3y_6y +
		record.girls_3y_6y;

	return {
		mothers,
		children,
		total: mothers + children,
	};
}

function calculateRiceUsage(record) {
	if (record.status !== "WORKING") {
		return 0;
	}

	const { mothers, children } = calculateHeadcountGroups(record);

	return mothers * 0.11 + children * 0.05;
}

function getWeekday(date) {
	return new Date(`${date}T00:00:00`).getDay();
}

function isGroup2Day(date, status) {
	if (status !== "WORKING") {
		return false;
	}

	const weekday = getWeekday(date);

	// Tuesday, Thursday, Saturday
	if ([2, 4, 6].includes(weekday)) {
		return true;
	}

	// A Sunday manually marked as WORKING follows Group 2
	if (weekday === 0) {
		return true;
	}

	return false;
}

function getScheduleGroup(date, status) {
	if (status !== "WORKING") {
		return null;
	}

	const weekday = getWeekday(date);

	if ([1, 3, 5].includes(weekday)) {
		return "GROUP_1";
	}

	if ([0, 2, 4, 6].includes(weekday)) {
		return "GROUP_2";
	}

	return null;
}

function calculateDalUsage(record) {
	if (!isGroup2Day(record.date, record.status)) {
		return 0;
	}

	return calculateTotalPeople(record) * 0.03;
}

function calculateOilUsage(record) {
	if (record.status !== "WORKING") {
		return 0;
	}

	return calculateTotalPeople(record) * 2;
}

function calculateSaltUsage(record) {
	if (record.status !== "WORKING") {
		return 0;
	}

	return calculateTotalPeople(record) * 0.002;
}

function calculateForm1Usage(record) {
	return {
		rice: calculateRiceUsage(record),
		dal: calculateDalUsage(record),
		oil: calculateOilUsage(record),
		salt: calculateSaltUsage(record),
	};
}

function calculateMonthlyRiceUsage(records) {
	return records.reduce((total, record) => {
		return total + calculateRiceUsage(record);
	}, 0);
}

function calculateMonthlyDalUsage(records) {
	return records.reduce((total, record) => {
		return total + calculateDalUsage(record);
	}, 0);
}

function calculateMonthlyOilUsage(records) {
	return records.reduce((total, record) => {
		return total + calculateOilUsage(record);
	}, 0);
}

function calculateMonthlySaltUsage(records) {
	return records.reduce((total, record) => {
		return total + calculateSaltUsage(record);
	}, 0);
}

function calculateMonthlyRiceRemaining(openingRice, records) {
	const totalReceived = records.reduce((total, record) => {
		return total + Number(record.rice_received || 0);
	}, 0);

	const totalUsed = calculateMonthlyRiceUsage(records);

	return Number(openingRice) + totalReceived - totalUsed;
}

function calculateMonthlyDalRemaining(openingDal, records) {
	const totalReceived = records.reduce((total, record) => {
		return total + Number(record.dal_received || 0);
	}, 0);

	const totalUsed = calculateMonthlyDalUsage(records);

	return Number(openingDal) + totalReceived - totalUsed;
}

function calculateMonthlyOilRemaining(openingOil, records) {
	const totalReceived = records.reduce((total, record) => {
		return total + Number(record.oil_received || 0);
	}, 0);

	const totalUsed = calculateMonthlyOilUsage(records);

	return Number(openingOil) + totalReceived - totalUsed;
}

function calculateMonthlySaltRemaining(openingSalt, records) {
	const totalReceived = records.reduce((total, record) => {
		return total + Number(record.salt_received || 0);
	}, 0);

	const totalUsed = calculateMonthlySaltUsage(records);

	return Number(openingSalt) + totalReceived - totalUsed;
}

function calculateForm1MonthlySummary(openingStock, records) {
	return {
		rice: {
			used: calculateMonthlyRiceUsage(records),
			remaining: calculateMonthlyRiceRemaining(
				openingStock.rice,
				records,
			),
		},
		dal: {
			used: calculateMonthlyDalUsage(records),
			remaining: calculateMonthlyDalRemaining(openingStock.dal, records),
		},
		oil: {
			used: calculateMonthlyOilUsage(records),
			remaining: calculateMonthlyOilRemaining(openingStock.oil, records),
		},
		salt: {
			used: calculateMonthlySaltUsage(records),
			remaining: calculateMonthlySaltRemaining(
				openingStock.salt,
				records,
			),
		},
	};
}

async function calculateForm2Commodity(
	record,
	category,
	rateStatus = "CURRENT",
) {
	const scheduleGroup = getScheduleGroup(record.date, record.status);

	if (!scheduleGroup) {
		return 0;
	}

	const rate = await getForm2Rate(category, rateStatus, scheduleGroup);

	const { mothers, children } = calculateHeadcountGroups(record);

	return roundToTwo(
		mothers * Number(rate.mother_rate) + children * Number(rate.child_rate),
	);
}

async function calculateForm2DailySummary(record, rateStatus = "CURRENT") {
	const scheduleGroup = getScheduleGroup(record.date, record.status);

	if (!scheduleGroup) {
		return {
			schedule: null,
			vegetables: 0,
			potato: 0,
			egg: 0,
			chatu: 0,
			total: 0,
		};
	}

	let vegetables = 0;
	let potato = 0;
	let egg = 0;
	let chatu = 0;

	if (scheduleGroup === "GROUP_2") {
		vegetables = await calculateForm2Commodity(
			record,
			"VEGETABLE",
			rateStatus,
		);
	}

	if (scheduleGroup === "GROUP_1" || scheduleGroup === "GROUP_2") {
		potato = await calculateForm2Commodity(record, "POTATO", rateStatus);

		egg = await calculateForm2Commodity(record, "EGG", rateStatus);
	}

	if (scheduleGroup === "GROUP_1") {
		chatu = await calculateForm2Commodity(record, "CHATU", rateStatus);
	}

	return {
		schedule: scheduleGroup,
		vegetables,
		potato,
		egg,
		chatu,
		total: vegetables + potato + egg + chatu,
	};
}

async function calculateMonthlyForm2Summary(records, rateStatus = "CURRENT") {
	const summary = {
		vegetables: 0,
		potato: 0,
		egg: 0,
		chatu: 0,
		total: 0,
	};

	for (const record of records) {
		const daily = await calculateForm2DailySummary(record, rateStatus);

		summary.vegetables += daily.vegetables;
		summary.potato += daily.potato;
		summary.egg += daily.egg;
		summary.chatu += daily.chatu;
		summary.total += daily.total;
	}

	summary.vegetables = roundToTwo(summary.vegetables);
	summary.potato = roundToTwo(summary.potato);
	summary.egg = roundToTwo(summary.egg);
	summary.chatu = roundToTwo(summary.chatu);
	summary.total = roundToTwo(summary.total);

	return summary;
}

module.exports = {
	calculateTotalPeople,
	calculateHeadcountGroups,
	calculateRiceUsage,
	calculateDalUsage,
	calculateOilUsage,
	calculateSaltUsage,
	calculateForm1Usage,
	calculateMonthlyRiceUsage,
	calculateMonthlyDalUsage,
	calculateMonthlyOilUsage,
	calculateMonthlySaltUsage,
	calculateMonthlyRiceRemaining,
	calculateMonthlyDalRemaining,
	calculateMonthlyOilRemaining,
	calculateMonthlySaltRemaining,
	calculateForm1MonthlySummary,
	getScheduleGroup,
	getForm2Rate,
	calculateForm2Commodity,
	calculateForm2DailySummary,
	calculateMonthlyForm2Summary,
};

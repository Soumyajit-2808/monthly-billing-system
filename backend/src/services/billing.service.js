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
};

// Calculates new confirmed based on daily cumulative confirmed
function calcNewFromCumulative(count) {
    let newCount = [];

    // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
    if (count.length > 1 && count[0].x > count[1].x) {
        count.reverse();
    }

    // Start with 0
    newCount.push({ 
        x: count[0].x, 
        y: 0 });

    for (let i = 1; i < count.length; i++) {
        // If next day is less than previous day, use previous day
        newCount.push({
            x: count[i].x,
            y: count[i].y < count[i - 1].y ? 0 : count[i].y - count[i - 1].y
        });
    }

    return newCount;
}

function combineHospitalizations(nonIcu, icu) {
    let combined = [];
    for (let i=0; i<nonIcu.length; i++) {
        combined.push({x: nonIcu[i].x, y: nonIcu[i].y + icu[i].y});
    }

    return combined;
}

// Calculates moving average for specified number of days
function calcMovingAverage(count, days) {
    // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
    if (count.length > 1 && count[0].x > count[1].x) {
        count.reverse();
    }

    let movingAvg = [];

    // Start calc initially only when full days for period is present
    for (let i = days-1; i < count.length; i++) {
        movingAvg.push({
            x: count[i].x,
            y: calcMovingAverageForDay(i, count, days)
        });
    }

    return movingAvg;
}

// Calculates moving average for day
function calcMovingAverageForDay(i, count, days) {
    let avg = 0;
    for (let offset = 0; offset < days; offset++) {
        avg += count[i - offset].y;
    }

    avg /= days;
    return avg;
}

// Calculates exponential moving average for specified number of days
function calcExpMovingAverage(count, days) {
    // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
    if (count.length > 1 && count[0].x > count[1].x) {
        count.reverse();
    }

    let movingAvg = [];
    let prevEma = count.length >= days ? calcMovingAverageForDay(days-1, count, days) : 0;
    let mult = 2 / (days + 1);

    for (let i = days-1; i < count.length; i++) {
        let ema = ((count[i].y - prevEma) * mult) + prevEma;
        movingAvg.push({
            x: count[i].x,
            y: ema
        });
        prevEma = ema;
    }

    return movingAvg;
}
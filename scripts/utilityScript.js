const DAY_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Convert string to date, taking into account time zone diff
function stringToDate(dateString) {
    let parts = dateString.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0); 
}

// Returns if specified dates are equal
function dateEqual(date1, date2) {
    return date1.getMonth() == date2.getMonth() 
    && date1.getDate() == date2.getDate() 
    && date1.getFullYear() == date2.getFullYear();
}

// Convert milliseconds to date
function milliesToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// Calculates new confirmed based on daily cumulative confirmed
function calcNewFromCumulative(count) {
    let newCount = new Array(count.length);

    // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
    if (count.length > 1 && count[0].x > count[1].x) {
        count.reverse();
    }

    // Start with 0
    newCount[0] = { 
        x: count[0].x, 
        y: 0 };

    for (let i = 1; i < count.length; i++) {
        // If next day is less than previous day, use previous day
        newCount[i] = {
            x: count[i].x,
            y: count[i].y < count[i - 1].y ? 0 : count[i].y - count[i - 1].y
        };
    }

    return newCount;
}

function combineHospitalizations(nonIcu, icu) {
    let combined = new Array(nonIcu.length);
    for (let i=0; i<nonIcu.length; i++) {
        combined[i] = {x: nonIcu[i].x, y: nonIcu[i].y + icu[i].y};
    }

    return combined;
}

function findMax(data) {
    let max = 0;
    for (let i=0; i<data.count.length; i++) {
        if (max < data.count[i].y) {
            max = data.count[i].y;
        }

    }

    return max;
}

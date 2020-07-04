const COLOR = {
    NEW_CASES: '#9edafa',
    HOSP: '#a1dddd',
    DEATH: '#f6b4a2',
    ICU: '#d9d9d9',
    MA1: '#486c9d',
    MA2: '#cf5864',
    CARD_CASES: '#0b92da',
    CARD_DEATHS: '#ed6a45',
    CARD_NONICU: '#3da9a9',
    CARD_ICU: '#808080'
};
const DATE = {
    MIN: new Date(2020, 2, 15, 0, 0, 0, 0),  // mar 15, 2020
    MIN_HOSP: new Date(2020, 3, 1, 0, 0, 0, 0),  // apr 1, 2020
    MIN_CITIES: new Date(2020, 3, 1, 0, 0, 0, 0)  // apr 1, 2020
};
var cache = {
    newConfirmed: null,
    nonIcu: null,
    icu: null,
    newDeath: null
}; 
var dateMax;
var cardDataCases;
var cardDataDeaths;

// Initialize
var dateToday = new Date();
var dateYest = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate() -1);
var dateBefore = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate() -2);
const DAY_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

cardDataCases = {
    totalCount: null, 
    todayCount: null, 
    yestCount: null, 
    beforeCount: null};
cardDataDeaths = {
    totalCount: null, 
    todayCount: null, 
    yestCount: null,
    beforeCount: null};
cardDataHosp = {
    nonIcuTotalCount: null, 
    nonIcuTodayCount: null, 
    nonIcuYestCount: null,
    nonIcuBeforeCount: null,
    icuTotalCount: null, 
    icuTodayCount: null, 
    icuYestCount: null,
    icuBeforeCount: null};

// Convert string to date, taking into account time zone diff
function stringToDate(dateString) {
    let parts = dateString.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0); 
}

function dateEqual(d1, d2) {
    return d1.getMonth() == d2.getMonth() && d1.getDate() == d2.getDate() && d1.getFullYear() == d2.getFullYear();
}

function milliesToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// // Fetch csv from url, convert cvs to json, then create chart
// function createChartFromGit(countyName, chartName, avgType) {
//     if (newConfirmedJson != null) {
//         calcAveragesAndChart(newConfirmedJson, "chartDiv", chartName, avgType);
//         return;
//     }

//     $.ajax({
//         url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv',
//         type: 'GET',
//         success: function (data) {
//             let count = [];
//             // Filter only for specified county name and min date
//             newConfirmedJson = JSC.csv2Json(data)
//                 .filter(row => row.county == countyName && DATE.MIN <= stringToDate(row.date));

//             newConfirmedJson.forEach(row => {
//                     let newCases = row.new_confirmed_cases;
//                     count.push({ 
//                         x: stringToDate(row.date), 
//                         y: newCases == null || newCases == undefined ? 0 : parseInt(newCases, 10) });
//                 });

//             newConfirmedJson = count;
//             calcAveragesAndChart(count, "chartDiv", chartName, avgType);
//         }
//     })
// }

function readChartForCities(callback) {
    if (cache.newConfirmed == null) {
        console.log("reading from git");

        cache.newConfirmed = [];
        $.ajax({
            url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv',
            type: 'GET',
            success: function (data) {
                // convert to Json and filter only for min date
                cache.newConfirmed = JSC.csv2Json(data);

                callback(cache.newConfirmed);
            }
        });
    }
    else {
        callback(cache.newConfirmed);
    }
}

function chartForCities(cities, chartDiv, avgType) {
    readChartForCities(function(commulativeConfirmed) {
        cities.forEach(city => {
            let count = [];
            commulativeConfirmed
                .filter(row => row.place == city)
                .forEach(row => {
                    let cases = row.confirmed_cases;
                    count.push({
                        x: milliesToDate(row.date),
                        y: cases == null || cases == undefined ? 0 : parseInt(cases, 10)
                    });
                });

            let newCount = calcNewFromCumulative(count);

            let ma1 = [];
            let ma2 = [];
            if (avgType == "MA") {
                ma1 = calcMovingAverage(newCount, 7);
                ma2 = calcMovingAverage(newCount, 14);
            }
            else {
                ma1 = calcExpMovingAverage(newCount, 7);
                ma2 = calcExpMovingAverage(newCount, 14);
            }

            // Create chart for Cities New Cases, filter dates prior to Mar 15
            newCount = newCount.filter(row => DATE.MIN_CITIES <= row.x);
            ma1 = ma1.filter(row => DATE.MIN_CITIES <= row.x);
            ma2 = ma2.filter(row => DATE.MIN_CITIES <= row.x);
            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR.NEW_CASES, name: 'New Cases', points: newCount },
                { type: 'line spline', line_width: 2, color: COLOR.MA1, name: '7-Day ' + avgType, points: ma1 },
                { type: 'line spline', line_width: 2, color: COLOR.MA2, name: '14-Day ' + avgType, points: ma2 }
            ], chartDiv + city, city + " New Cases by Day", avgType);
        });
    });
}

function readNewConfirmedAndDeathFromSource(url, callback) {
    // Check if cached
    if (cache.newConfirmed == null) {
        console.log("reading from source " + "timeseries" + " " + url);

        cache.newConfirmed = [];
        cache.newDeath = [];
        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "timeseries") {

                        // parse json and filter for min date and data finalization
                        $.parseJSON(this.innerHTML)
                            .filter(row => (row.agencies_count == row.agencies_updated || row.in_progress == false ))
                            .forEach(row => {
                                let date = stringToDate(row.date);
                                cache.newConfirmed.push({
                                    x: date,
                                    y: row.new_confirmed_cases
                                });
                                cache.newDeath.push({
                                    x: date,
                                    y: row.deaths
                                });

                                // save max date so that can push into hosp if necessary
                                if (dateMax == null || dateMax < date) {
                                    dateMax = date;
                                }

                                saveDataForCasesAndDeathsCards(row);
                            });
                    }
                });

                callback(cache.newConfirmed, cache.newDeath);
            }
        });
    }
    else {
        callback(cache.newConfirmed, cache.newDeath);
    }
}

function readHospitalizationDataFromSource(url, callback) {
    // Check if cached
    if (cache.nonIcu == null) {
        console.log("reading from source " + "patients-timeseries" + " " + url);

        cache.nonIcu = [];
        cache.icu = [];
        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "patients-timeseries") {
                        let rawJson = $.parseJSON(this.innerHTML);

                        // Filter days before 4/1/2020
                        rawJson = rawJson.filter(row => DATE.MIN_HOSP <= stringToDate(row.date));

                        rawJson.forEach(row => {
                                cache.nonIcu.push({
                                    x: stringToDate(row.date),
                                    y: row.total_patients - row.total_icu_patients});
                                cache.icu.push({
                                    x: stringToDate(row.date),
                                    y: row.total_icu_patients});

                                saveDataForHospCard(row);
                        });

                        showCasesOrDeathsCard(cardDataCases, "Confirmed Cases", "#casesCard", COLOR.CARD_CASES);
                        showHospCard(cardDataHosp, "In Hospitals", "#hospCard", COLOR.CARD_NONICU, COLOR.CARD_ICU);
                        showCasesOrDeathsCard(cardDataDeaths, "Deaths", "#deathsCard", COLOR.CARD_DEATHS);

                        callback(cache.nonIcu, cache.icu);
                    }
                })
            }
        });
    }
    else {
        callback(cache.nonIcu, cache.icu);
    }
}

function chartFromPageSource(countyName, url, avgType) {
    readNewConfirmedAndDeathFromSource(url, function(newConfirmed, deathJson) {
        let ma1 = [];
        let ma2 = [];
        if (avgType == "MA") {
            ma1 = calcMovingAverage(newConfirmed, 7);
            ma2 = calcMovingAverage(newConfirmed, 14);
        }
        else {
            ma1 = calcExpMovingAverage(newConfirmed, 7);
            ma2 = calcExpMovingAverage(newConfirmed, 14);
        }

        // Create chart for New Cases, filter dates prior to Mar 15
        newConfirmed = newConfirmed.filter(row => DATE.MIN <= row.x);
        ma1 = ma1.filter(row => DATE.MIN <= row.x);
        ma2 = ma2.filter(row => DATE.MIN <= row.x);
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR.NEW_CASES, name: 'New Cases', points: newConfirmed },
            { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: ma1 },
            { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: ma2 }
        ], "chartDiv", countyName + " New Cases by Day", avgType);
    
        let newDeath = calcNewFromCumulative(deathJson);
        ma1 = [];
        ma2 = [];
        if (avgType == "MA") {
            ma1 = calcMovingAverage(newDeath, 7);
            ma2 = calcMovingAverage(newDeath, 14);
        }
        else {
            ma1 = calcExpMovingAverage(newDeath, 7);
            ma2 = calcExpMovingAverage(newDeath, 14);
        }

        // Create chart for New Deaths, filter dates prior to Mar 15
        newDeath = newDeath.filter(row => DATE.MIN <= row.x);
        ma1 = ma1.filter(row => DATE.MIN <= row.x);
        ma2 = ma2.filter(row => DATE.MIN <= row.x);
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR.DEATH, name: 'New Deaths', points: newDeath },
            { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: ma1 },
            { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: ma2 }
        ], "deathsChartDiv", countyName + " New Deaths by Day", avgType);

        readHospitalizationDataFromSource(url, function(hospCached, icuCached) {
            let nonIcu = [...hospCached];
            let icu = [...icuCached];

            let ma1 = [];
            let ma2 = [];
            let combinedHosp = combineHospitalizations(nonIcu, icu);

            if (avgType == "MA") {
                ma1 = calcMovingAverage(combinedHosp, 7);
                ma2 = calcMovingAverage(combinedHosp, 14);
            }
            else {
                ma1 = calcExpMovingAverage(combinedHosp, 7);
                ma2 = calcExpMovingAverage(combinedHosp, 14);
            }

            // Add min date so that all charts have same time scale
            if (DATE.MIN < nonIcu[0].x) {
                nonIcu.push({x: DATE.MIN, y: 0});
                icu.push({x: DATE.MIN, y: 0});
            }

            // Check if also need to add max date in case lagging from other charts
            if (dateMax != null && dateMax > nonIcu[nonIcu.length-1].x) {
                nonIcu.push({x: dateMax, y: 0});
                icu.push({x: dateMax, y: 0});
            }

            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR.HOSP, name: 'Non-ICU', points: nonIcu },
                { type: 'column', bar_width: 1, color: COLOR.ICU, name: 'ICU', points: icu },
                { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: ma1 },
                { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: ma2 }
            ], "hospitalizationChartDiv", countyName + " Hospitalizations (Confirmed + Suspected) by Day", avgType);
        });
    });
}

function saveDataForCasesAndDeathsCards(row) {
    let date = stringToDate(row.date);

    // save data for days
    if (dateEqual(dateBefore, date)) {
        cardDataCases.beforeCount = row.new_confirmed_cases;
        cardDataDeaths.beforeCount = row.new_deaths;

        cardDataCases.totalCount = row.confirmed_cases;
        cardDataDeaths.totalCount = row.deaths;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataCases.todayCount = row.new_confirmed_cases;
        cardDataDeaths.todayCount = row.new_deaths;

        cardDataCases.totalCount = row.confirmed_cases;
        cardDataDeaths.totalCount = row.deaths;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataCases.yestCount = row.new_confirmed_cases;
        cardDataDeaths.yestCount = row.new_deaths;

        cardDataCases.totalCount = row.confirmed_cases;
        cardDataDeaths.totalCount = row.deaths;
    }
}

function saveDataForHospCard(row) {
    let date = stringToDate(row.date);

    // Assume we are processing in date ascending order
    if (dateEqual(dateBefore, date)) {
        cardDataHosp.nonIcuBeforeCount = row.total_patients - row.total_icu_patients;
        cardDataHosp.nonIcuTotalCount = row.total_patients - row.total_icu_patients;

        cardDataHosp.icuBeforeCount = row.total_icu_patients;
        cardDataHosp.icuTotalCount = row.total_icu_patients;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataHosp.nonIcuYestCount = row.total_patients - row.total_icu_patients;
        cardDataHosp.nonIcuTotalCount = row.total_patients - row.total_icu_patients;

        cardDataHosp.icuYestCount = row.total_icu_patients;
        cardDataHosp.icuTotalCount = row.total_icu_patients;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataHosp.nonIcuTodayCount = row.total_patients - row.total_icu_patients;
        cardDataHosp.nonIcuTotalCount = row.total_patients - row.total_icu_patients;

        cardDataHosp.icuTodayCount = row.total_icu_patients;
        cardDataHosp.icuTotalCount = row.total_icu_patients;
    }
}

function showCasesOrDeathsCard(cardData, label, cardDiv, color) {
    render("<span class='card-big-num'>" + format(cardData.totalCount, color) + "</span><br><span class='card-label'>" + label + "</span><br><br>" 
        + formatPlus(cardData.todayCount, color) + " Today<br>"
        + formatPlus(cardData.yestCount, color) + " " + DAY_OF_WEEK[dateYest.getDay()] +"<br>"
        + formatPlus(cardData.beforeCount, color) + " " + DAY_OF_WEEK[dateBefore.getDay()], 
        cardDiv);
}
 
function showHospCard(cardData, label, cardDiv, nonIcuColor, icuColor) {
    render("<span class='card-big-num'>" + format(cardData.nonIcuTotalCount, nonIcuColor) 
        + "</span> Non-ICU / <span class='card-big-num'>" + format(cardData.icuTotalCount, icuColor) + "</span> ICU <br><span class='card-label'>" + label + "</span><br><br>" 
        + getHospCardDayString(cardData.nonIcuTodayCount, cardData.icuTodayCount, nonIcuColor, icuColor) + " Today<br>"
        + getHospCardDayString(cardData.nonIcuYestCount, cardData.icuYestCount, nonIcuColor, icuColor) + " " +DAY_OF_WEEK[dateYest.getDay()] +"<br>"
        + getHospCardDayString(cardData.nonIcuBeforeCount, cardData.icuBeforeCount, nonIcuColor, icuColor) + " " + DAY_OF_WEEK[dateBefore.getDay()], 
        cardDiv);
} 

function getHospCardDayString(nonIcuCount, icuCount, nonIcuColor, icuColor) {
    return nonIcuCount == null || icuCount == null 
    ? format(nonIcuCount, nonIcuColor) 
    : format(nonIcuCount, nonIcuColor) + " Non-ICU / " + format(icuCount, icuColor) + " ICU"; 
}
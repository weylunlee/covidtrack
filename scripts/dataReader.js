const MIN_DATE = new Date('2020-03-15 00:00:00');
const HOSP_MIN_DATE = new Date('2020-04-01 00:00:00');
const CITIES_MIN_DATE = new Date('2020-04-01 00:00:00');
const COLOR_NEWCASES = '#9edafa';
const COLOR_HOSP = '#a1dddd';
const COLOR_DEATH = '#f6b4a2';
const COLOR_ICU = '#d9d9d9';
const COLOR_MA1 = '#486c9d';
const COLOR_MA2 = '#cf5864';
var newConfirmedJson;
var nonIcuJson;
var icuJson;
var deathJson;

//Convert string to date, taking into account time zone diff
function stringToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// Fetch csv from url, convert cvs to json, then create chart
function createChartFromGit(countyName, chartName, avgType) {
    if (newConfirmedJson != null) {
        calcAveragesAndChart(newConfirmedJson, "chartDiv", chartName, avgType);
        return;
    }

    $.ajax({
        url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv',
        type: 'GET',
        success: function (data) {
            let count = [];
            // Filter only for specified county name and min date
            newConfirmedJson = JSC.csv2Json(data)
                .filter(row => row.county == countyName && MIN_DATE <= stringToDate(row.date).getTime());

            newConfirmedJson.forEach(row => {
                    let newCases = row.new_confirmed_cases;
                    count.push({ 
                        x: stringToDate(row.date), 
                        y: newCases == null || newCases == undefined ? 0 : parseInt(newCases, 10) });
                });

            newConfirmedJson = count;
            calcAveragesAndChart(count, "chartDiv", chartName, avgType);
        }
    })
}

function readChartForCities(callback) {
    if (newConfirmedJson == null) {
        console.log("reading from git");
        // cities.forEach(city => createChartForCity(newConfirmedJson, city, chartDiv + city, avgType));
        // return;
    // }

        newConfirmedJson = [];
        $.ajax({
            url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv',
            type: 'GET',
            success: function (data) {
                // convert to Json and filter only for min date
                newConfirmedJson = JSC.csv2Json(data);
                
                callback(newConfirmedJson);
            }
        });
    }

    callback(newConfirmedJson);
}

function chartForCities(cities, chartDiv, avgType) {
    readChartForCities(function(commulativeConfirmed) {
        cities.forEach(city => {
            let cityConfirmed = commulativeConfirmed.filter(row => row.place == city);
            let count = [];
            cityConfirmed.forEach(row => {
                let cases = row.confirmed_cases;
                count.push({
                    x: stringToDate(row.date),
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
            newCount = newCount.filter(row => CITIES_MIN_DATE <= stringToDate(row.x));
            ma1 = ma1.filter(row => CITIES_MIN_DATE <= stringToDate(row.x));
            ma2 = ma2.filter(row => CITIES_MIN_DATE <= stringToDate(row.x));
            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR_NEWCASES, name: 'New Cases', points: newCount },
                { type: 'line spline', line_width: 2, color: COLOR_MA1, name: '7-Day ' + avgType, points: ma1 },
                { type: 'line spline', line_width: 2, color: COLOR_MA2, name: '14-Day ' + avgType, points: ma2 }
            ], chartDiv + city, city + " New Cases by Day");
        });
    });
}

function readNewConfirmedAndDeathFromSource(url, callback) {
    // Check if cached
    if (newConfirmedJson == null) {
        console.log("reading from source " + "timeseries" + " " + url);

        newConfirmedJson = [];
        deathJson = [];
        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "timeseries") {

                        // parse json and filter for min date and data finalization
                        $.parseJSON(this.innerHTML)
                            .filter(row => /*minDate <= stringToDate(row.date) &&*/ (row.agencies_count == row.agencies_updated || row.in_progress == false ))
                            .forEach(row => {
                                newConfirmedJson.push({
                                    x: stringToDate(row.date),
                                    y: row.new_confirmed_cases
                                });
                                deathJson.push({
                                    x: stringToDate(row.date),
                                    y: row.deaths
                                });
                            });
                    }
                });
                callback(newConfirmedJson, deathJson);
            }
        });
    }

    callback(newConfirmedJson, deathJson);
}

function readHospitalizationDataFromSource(url, callback) {
    // Check if cached
    if (nonIcuJson == null) {
        console.log("reading from source " + "patients-timeseries" + " " + url);

        nonIcuJson = [];
        icuJson = [];
        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "patients-timeseries") {
                        let rawJson = $.parseJSON(this.innerHTML);

                        // Filter days before 4/1/2020
                        rawJson = rawJson.filter(row => HOSP_MIN_DATE <= stringToDate(row.date));
                        rawJson.forEach(row => {
                                nonIcuJson.push({
                                    x: stringToDate(row.date),
                                    y: row.total_patients - row.total_icu_patients});
                                icuJson.push({
                                    x: stringToDate(row.date),
                                    y: row.total_icu_patients});
                        });

                        callback(nonIcuJson, icuJson);
                    }
                })
            
            }
        });
    }
    callback(nonIcuJson, icuJson);
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
        newConfirmed = newConfirmed.filter(row => MIN_DATE <= stringToDate(row.x));
        ma1 = ma1.filter(row => MIN_DATE <= stringToDate(row.x));
        ma2 = ma2.filter(row => MIN_DATE <= stringToDate(row.x));
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR_NEWCASES, name: 'New Cases', points: newConfirmed },
            { type: 'line spline', line_width: 3, color: COLOR_MA1, name: '7-Day ' + avgType, points: ma1 },
            { type: 'line spline', line_width: 3, color: COLOR_MA2, name: '14-Day ' + avgType, points: ma2 }
        ], "chartDiv", countyName + " New Cases by Day");
    
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
        newDeath = newDeath.filter(row => MIN_DATE <= stringToDate(row.x));
        ma1 = ma1.filter(row => MIN_DATE <= stringToDate(row.x));
        ma2 = ma2.filter(row => MIN_DATE <= stringToDate(row.x));
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR_DEATH, name: 'New Deaths', points: newDeath },
            { type: 'line spline', line_width: 3, color: COLOR_MA1, name: '7-Day ' + avgType, points: ma1 },
            { type: 'line spline', line_width: 3, color: COLOR_MA2, name: '14-Day ' + avgType, points: ma2 }
        ], "deathsChartDiv", countyName + " New Deaths by Day");

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
            let startDate = new Date(MIN_DATE);
            if (startDate < stringToDate(nonIcu[0].x)) {
                nonIcu.push({x: new Date(startDate), y: 0});
                icu.push({x: new Date(startDate), y:0});
            }

            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR_HOSP, name: 'Non-ICU', points: nonIcu },
                { type: 'column', bar_width: 1, color: COLOR_ICU, name: 'ICU', points: icu },
                { type: 'line spline', line_width: 3, color: COLOR_MA1, name: '7-Day ' + avgType, points: ma1 },
                { type: 'line spline', line_width: 3, color: COLOR_MA2, name: '14-Day ' + avgType, points: ma2 }
            ], "hospitalizationChartDiv", countyName + " Hospitalizations (Confirmed + Suspected) by Day");
        });
    });
}

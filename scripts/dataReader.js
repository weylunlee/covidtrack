const DAY_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DATE = {
    MIN: new Date(2020, 2, 15, 0, 0, 0, 0),  // mar 15, 2020
    MIN_HOSP: new Date(2020, 3, 1, 0, 0, 0, 0),  // apr 1, 2020
    MIN_CITIES: new Date(2020, 3, 1, 0, 0, 0, 0)  // apr 1, 2020
};

// Initialize
var dateToday = new Date();
var dateYest = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate() -1);
var dateBefore = new Date(dateToday.getFullYear(), dateToday.getMonth(), dateToday.getDate() -2);
var dateMax = null;

class CardData {
    constructor() {
        let totalCount = null;
        let todayCount = null;
        let yestCount = null;
        let beforeCount = null;
    }
}

let cardDataCases = new CardData();
let cardDataDeaths = new CardData();
let cardDataNonIcu = new CardData();
let cardDataIcu = new CardData();

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

function readChartForCities(callback) {
    if (dataCases.count == null) {
        console.log("reading from git");

        dataCases.count = [];
        $.ajax({
            url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv',
            type: 'GET',
            success: function (data) {
                // convert to Json and filter only for min date
                dataCases.count = JSC.csv2Json(data);

                callback(dataCases.count);
            }
        });
    }
    else {
        callback(dataCases.count);
    }
}

function chartForCities(cities, chartDiv, avgType) {
    readChartForCities(function(cummulativeConfirmed) {
        cities.forEach(city => {
            let cityCummulative = cummulativeConfirmed.filter(row => row.place == city);
            let cityCases = new Data();
            cityCases.count = new Array(cityCummulative.length);

            for (let i=0; i<cityCummulative.length; i++) {
                let cases = cityCummulative[i].confirmed_cases;
                cityCases.count[i] = {
                    x: milliesToDate(cityCummulative[i].date),
                    y: cases == null || cases == undefined ? 0 : parseInt(cases, 10)
                };
            }

            cityCases.count = calcNewFromCumulative(cityCases.count);
            cityCases.calcMovingAverage();
            cityCases.truncateDatesPrior(DATE.MIN_CITIES);

            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR.NEW_CASES, name: 'New Cases', points: cityCases.count },
                { type: 'line spline', line_width: 2, color: COLOR.MA1, name: '7-Day ' + avgType, points: cityCases.getMa1(avgType) },
                { type: 'line spline', line_width: 2, color: COLOR.MA2, name: '14-Day ' + avgType, points: cityCases.getMa2(avgType) }
            ], chartDiv + city, city, avgType);
        });
    });
}

function readNewConfirmedAndDeathFromSource(url, callback) {
    // Check if cached
    if (dataCases.count == null) {
        console.log("reading from source " + "timeseries" + " " + url);

        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "timeseries") {

                        // parse json and filter for min date and data finalization
                        let rawJson = $.parseJSON(this.innerHTML)
                            .filter(row => (row.agencies_count == row.agencies_updated || row.in_progress == false ));

                        dataCases.count = new Array(rawJson.length);
                        dataDeaths.count = new Array(rawJson.length);

                        for (let i=0; i<rawJson.length; i++) {
                            let date = stringToDate(rawJson[i].date);

                            dataCases.count[i] = {x: date, y: rawJson[i].new_confirmed_cases};
                            dataDeaths.count[i] = {x: date, y: rawJson[i].new_deaths};

                            // save max date so that can push into hosp if necessary
                            if (dateMax == null || dateMax < date) {
                                dateMax = date;
                            }

                            saveDataForCasesAndDeathsCards(rawJson[i]);
                        }
                    }
                });

                dataCases.calcMovingAverage();
                dataCases.truncateDatesPrior(DATE.MIN);
                dataDeaths.calcMovingAverage();
                dataDeaths.truncateDatesPrior(DATE.MIN);
                
                callback(dataCases, dataDeaths);
            }
        });
    }
    else {
        callback(dataCases, dataDeaths);
    }
}

function readHospitalizationDataFromSource(url, callback) {
    // Check if cached
    if (dataNonIcu.count == null) {
        console.log("reading from source " + "patients-timeseries" + " " + url);

        $.ajax({
            url: url,
            type: 'GET',
            success: function (data) {
                $(data).filter('script').each(function () {
                    if (this.id == "patients-timeseries") {
                        let rawJson = $.parseJSON(this.innerHTML);

                        // Filter days before 4/1/2020
                        rawJson = rawJson.filter(row => DATE.MIN_HOSP <= stringToDate(row.date));

                        dataNonIcu.count = new Array(rawJson.length);
                        dataIcu.count = new Array(rawJson.length);

                        for (let i=0; i<rawJson.length; i++) {
                            dataNonIcu.count[i] = {x: stringToDate(rawJson[i].date), y: rawJson[i].total_patients - rawJson[i].total_icu_patients};
                            dataIcu.count[i] = {x: stringToDate(rawJson[i].date), y: rawJson[i].total_icu_patients};
                            saveDataForHospCard(rawJson[i]);
                        }

                        showCasesOrDeathsCard(cardDataCases, "Confirmed Cases", "#casesCard", COLOR.CARD_CASES);
                        showHospCard(cardDataNonIcu, cardDataIcu, "In Hospitals", "#hospCard", COLOR.CARD_NONICU, COLOR.CARD_ICU);
                        showCasesOrDeathsCard(cardDataDeaths, "Deaths", "#deathsCard", COLOR.CARD_DEATHS);

                        // Calc moving averages on the total hosp count
                        dataHospComb.count = combineHospitalizations(dataNonIcu.count, dataIcu.count);
                        dataHospComb.calcMovingAverage();

                        // Add min date so that all charts have same time scale
                        dataNonIcu.padDatePrior(DATE.MIN);
                        dataIcu.padDatePrior(DATE.MIN);

                        // Check if also need to add max date in case lagging from other charts
                        dataNonIcu.padDateAfter(dateMax);
                        dataIcu.padDateAfter(dateMax);

                        callback(dataNonIcu, dataIcu, dataHospComb);
                    }
                })
            }
        });
    }
    else {
        callback(dataNonIcu, dataIcu, dataHospComb);
    }
}

function chartFromPageSource(countyName, url, avgType) {
    readNewConfirmedAndDeathFromSource(url, function(dataCases, dataDeaths) {
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR.NEW_CASES, name: 'New Cases', points: dataCases.count },
            { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: dataCases.getMa1(avgType) },
            { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: dataCases.getMa2(avgType) }
        ], "chartDiv", countyName + " New Cases by Day", avgType);
    
        createChart( 
        [
            { type: 'column', bar_width: 1, color: COLOR.DEATH, name: 'New Deaths', points: dataDeaths.count },
            { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: dataDeaths.getMa1(avgType) },
            { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: dataDeaths.getMa2(avgType) }
        ], "deathsChartDiv", countyName + " New Deaths by Day", avgType);

        readHospitalizationDataFromSource(url, function(dataNonIcu, dataIcu, dataHospComb) {
            createChart( 
            [
                { type: 'column', bar_width: 1, color: COLOR.HOSP, name: 'Non-ICU', points: dataNonIcu.count },
                { type: 'column', bar_width: 1, color: COLOR.ICU, name: 'ICU', points: dataIcu.count },
                { type: 'line spline', line_width: 3, color: COLOR.MA1, name: '7-Day ' + avgType, points: dataHospComb.getMa1(avgType) },
                { type: 'line spline', line_width: 3, color: COLOR.MA2, name: '14-Day ' + avgType, points: dataHospComb.getMa2(avgType) }
            ], "hospitalizationChartDiv", countyName + " Hospitalizations (Confirmed + Suspected) by Day", avgType);
        });
    });
}

function saveDataForCasesAndDeathsCards(row) {

    // Since totals are cummulative, save the largest one
    if (cardDataCases.totalCount == null || cardDataCases.totalCount < row.confirmed_cases) {
        cardDataCases.totalCount = row.confirmed_cases;
    }

    if (cardDataDeaths.totalCount == null || cardDataDeaths.totalCount < row.deaths) {
        cardDataDeaths.totalCount = row.deaths;
    }

    let date = stringToDate(row.date);

    // save data for days
    if (dateEqual(dateBefore, date)) {
        cardDataCases.beforeCount = row.new_confirmed_cases;
        cardDataDeaths.beforeCount = row.new_deaths;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataCases.yestCount = row.new_confirmed_cases;
        cardDataDeaths.yestCount = row.new_deaths;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataCases.todayCount = row.new_confirmed_cases;
        cardDataDeaths.todayCount = row.new_deaths;
    }
}

function saveDataForHospCard(row) {
    let date = stringToDate(row.date);

    // Assume we are processing in date ascending order
    if (dateEqual(dateBefore, date)) {
        cardDataNonIcu.beforeCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.beforeCount = row.total_icu_patients;
        
        cardDataNonIcu.totalCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.totalCount = row.total_icu_patients;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataNonIcu.yestCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.yestCount = row.total_icu_patients;
        
        cardDataNonIcu.totalCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.totalCount = row.total_icu_patients;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataNonIcu.todayCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.todayCount = row.total_icu_patients;

        cardDataNonIcu.totalCount = row.total_patients - row.total_icu_patients;
        cardDataIcu.totalCount = row.total_icu_patients;
    }
}

function showCasesOrDeathsCard(cardData, label, cardDiv, color) {
    render("<span class='card-big-num'>" + format(cardData.totalCount, color) + "</span><br><span class='card-label'>" + label + "</span><br><br>" 
        + formatPlus(cardData.todayCount, color) + " Today<br>"
        + formatPlus(cardData.yestCount, color) + " " + DAY_OF_WEEK[dateYest.getDay()] +"<br>"
        + formatPlus(cardData.beforeCount, color) + " " + DAY_OF_WEEK[dateBefore.getDay()], 
        cardDiv);
}
 
function showHospCard(cardDataNonIcu, cardDataIcu, label, cardDiv, nonIcuColor, icuColor) {
    render("<span class='card-big-num'>" + format(cardDataNonIcu.totalCount, nonIcuColor) 
        + "</span> Non-ICU / <span class='card-big-num'>" + format(cardDataIcu.totalCount, icuColor) + "</span> ICU <br><span class='card-label'>" + label + "</span><br><br>" 
        + getHospCardDayString(cardDataNonIcu.todayCount, cardDataIcu.todayCount, nonIcuColor, icuColor) + " Today<br>"
        + getHospCardDayString(cardDataNonIcu.yestCount, cardDataIcu.yestCount, nonIcuColor, icuColor) + " " +DAY_OF_WEEK[dateYest.getDay()] +"<br>"
        + getHospCardDayString(cardDataNonIcu.beforeCount, cardDataIcu.beforeCount, nonIcuColor, icuColor) + " " + DAY_OF_WEEK[dateBefore.getDay()], 
        cardDiv);
} 

function getHospCardDayString(nonIcuCount, icuCount, nonIcuColor, icuColor) {
    return nonIcuCount == null || icuCount == null 
    ? format(nonIcuCount, nonIcuColor) 
    : format(nonIcuCount, nonIcuColor) + " Non-ICU / " + format(icuCount, icuColor) + " ICU"; 
}
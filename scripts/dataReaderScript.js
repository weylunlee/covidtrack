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

var dataCases = new Data();
var dataDeaths = new Data();
var dataNonIcu = new Data();
var dataIcu = new Data();
var dataHospComb = new Data();
var dataPfizer = new Data();
var dataModerna = new Data();
var dataJohnson = new Data();
var dataVacComb = new Data();

let cardDataCases = new CardData();
let cardDataDeaths = new CardData();
let cardDataNonIcu = new CardData();
let cardDataIcu = new CardData();

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
                            dataDeaths.count[i] = {x: date, y: rawJson[i].new_confirmed_deaths};

                            // save max date so that can push into hosp if necessary
                            if (dateMax == null || dateMax < date) {
                                dateMax = date;
                            }

                            saveDataForCasesAndDeathsCards(rawJson[i]);
                        }
                    }
                });

                dataCases.calcMovingAverages();
                dataCases.truncateDatesPrior(DATE.MIN);
                dataDeaths.calcMovingAverages();
                dataDeaths.truncateDatesPrior(DATE.MIN);

                callback(dataCases, dataDeaths);
            }
        });
    }
    else {
        callback(dataCases, dataDeaths);
    }
}

function readVaccinationDataFromFile(countyTag, gitUrl, callback) {
    // Check if cached
    if (dataPfizer.count == null) {
        console.log("reading from vac git" + gitUrl);

        let rawJson = [];
        $.ajax({
            url: gitUrl,
            type: 'GET',
            success: function (data) {
                // convert to Json
                rawJson = JSC.csv2Json(data);

                // Filter days before 4/1/2020
                rawJson = rawJson.filter(row => row.county == countyTag);

                dataPfizer.count = new Array(rawJson.length);
                dataModerna.count = new Array(rawJson.length);
                dataJohnson.count = new Array(rawJson.length);

                for (let i=0; i<rawJson.length; i++) {
                    dataPfizer.count[i] = {x: milliesToDate(rawJson[i].date), y: rawJson[i].pfizer_doses};
                    dataModerna.count[i] = {x: milliesToDate(rawJson[i].date), y: rawJson[i].moderna_doses};
                    dataJohnson.count[i] = {x: milliesToDate(rawJson[i].date), y: rawJson[i].jj_doses};
                }

                // // Calc moving averages on the total hosp count
                dataVacComb.count = combineHospitalizations(dataPfizer.count, dataModerna.count);
                dataVacComb.count = combineHospitalizations(dataVacComb.count, dataJohnson.count);
                // dataHospComb.calcMovingAverages();

                // Add min date so that all charts have same time scale
                dataPfizer.padDatePrior(DATE.MIN);
                dataModerna.padDatePrior(DATE.MIN);
                dataJohnson.padDatePrior(DATE.MIN);

                // Check if also need to add max date in case lagging from other charts
                dataPfizer.padDateAfter(dateMax);
                dataModerna.padDateAfter(dateMax);
                dataJohnson.padDateAfter(dateMax);

                callback(dataPfizer, dataModerna, dataJohnson, dataVacComb);
            }
        });
    }
    else {
        callback(dataPfizer, dataModerna, dataJohnson, dataVacComb);
    }
}

function readHospitilizationDataFromFile(countyTag, gitUrl, callback) {
    // Check if cached
    if (dataNonIcu.count == null) {
        console.log("reading from hosp git" + gitUrl);

        let rawJson = [];
        $.ajax({
            url: gitUrl,
            type: 'GET',
            success: function (data) {
                // convert to Json
                rawJson = JSC.csv2Json(data);

                // Filter days before 4/1/2020
                rawJson = rawJson.filter(row => DATE.MIN_HOSP <= milliesToDate(row.date) && row.county == countyTag);

                dataNonIcu.count = new Array(rawJson.length);
                dataIcu.count = new Array(rawJson.length);

                for (let i=0; i<rawJson.length; i++) {
                    dataNonIcu.count[i] = {x: milliesToDate(rawJson[i].date),
                        y: (rawJson[i].positive_patients + rawJson[i].suspected_patients) - (rawJson[i].icu_positive_patients + rawJson[i].icu_suspected_patients)};
                    dataIcu.count[i] = {x: milliesToDate(rawJson[i].date),
                        y: rawJson[i].icu_positive_patients + rawJson[i].icu_suspected_patients};

                    saveDataForHospCard(rawJson[i]);
                }

                // Calc moving averages on the total hosp count
                dataHospComb.count = combineHospitalizations(dataNonIcu.count, dataIcu.count);
                dataHospComb.calcMovingAverages();

                // Add min date so that all charts have same time scale
                dataNonIcu.padDatePrior(DATE.MIN);
                dataIcu.padDatePrior(DATE.MIN);

                // Check if also need to add max date in case lagging from other charts
                dataNonIcu.padDateAfter(dateMax);
                dataIcu.padDateAfter(dateMax);

                callback(dataNonIcu, dataIcu, dataHospComb);
            }
        });
    }
    else {
        callback(dataNonIcu, dataIcu, dataHospComb);
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

                        // Calc moving averages on the total hosp count
                        dataHospComb.count = combineHospitalizations(dataNonIcu.count, dataIcu.count);
                        dataHospComb.calcMovingAverages();

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

function chartFromPageSource(pageUrl, countyTag, hospUrl, vacUrl, avgType) {
    readNewConfirmedAndDeathFromSource(pageUrl, function(dataCases, dataDeaths) {
        createChart(
        [
            { type: 'bar', width: 1, color: COLOR.NEW_CASES, name: 'New Cases',
                pointsX: dataCases.count.map(p => p.x), pointsY: dataCases.count.map(p => p.y) },
            { type: 'line', width: 2, color: COLOR.MA1, name: '7-Day ' + avgType,
                pointsX: dataCases.getMa1(avgType).map(p => p.x), pointsY: dataCases.getMa1(avgType).map(p => p.y) },
            { type: 'line', width: 2, color: COLOR.MA2, name: '14-Day ' + avgType,
                pointsX: dataCases.getMa2(avgType).map(p => p.x), pointsY: dataCases.getMa2(avgType).map(p => p.y) }
        ], "chartDiv", avgType, findMax(dataCases));

        createChart(
        [
            { type: 'bar', bar_width: 1, color: COLOR.DEATH, name: 'New Deaths',
                pointsX: dataDeaths.count.map(p => p.x), pointsY: dataDeaths.count.map(p => p.y) },
            { type: 'line', line: 2, color: COLOR.MA1, name: '7-Day ' + avgType,
                pointsX: dataDeaths.getMa1(avgType).map(p => p.x), pointsY: dataDeaths.getMa1(avgType).map(p => p.y) },
            { type: 'line', line: 2, color: COLOR.MA2, name: '14-Day ' + avgType,
                pointsX: dataDeaths.getMa2(avgType).map(p => p.x), pointsY: dataDeaths.getMa2(avgType).map(p => p.y) }
        ], "deathsChartDiv", avgType, findMax(dataDeaths));

        readHospitilizationDataFromFile(countyTag, hospUrl, function(dataNonIcu, dataIcu, dataHospComb) {
            createChart(
            [
                { type: 'bar', width: 1, color: COLOR.ICU, name: 'ICU',
                    pointsX: dataIcu.count.map(p => p.x), pointsY: dataIcu.count.map(p => p.y) },
                { type: 'bar', width: 1, color: COLOR.HOSP, name: 'Non-ICU',
                    pointsX: dataNonIcu.count.map(p => p.x), pointsY: dataNonIcu.count.map(p => p.y) },
                { type: 'line', width: 2, color: COLOR.MA1, name: '7-Day ' + avgType,
                    pointsX: dataHospComb.getMa1(avgType).map(p => p.x), pointsY: dataHospComb.getMa1(avgType).map(p => p.y) },
                { type: 'line', width: 2, color: COLOR.MA2, name: '14-Day ' + avgType,
                    pointsX: dataHospComb.getMa2(avgType).map(p => p.x), pointsY: dataHospComb.getMa2(avgType).map(p => p.y) }
            ], "hospitalizationChartDiv", avgType, findMax(dataHospComb));

            showCasesOrDeathsCard(cardDataCases, "Confirmed Cases", "#casesCard", COLOR.CARD_CASES);
            showHospCard(cardDataNonIcu, cardDataIcu, "In Hospitals", "#hospCard", COLOR.CARD_NONICU, COLOR.CARD_ICU);
            showCasesOrDeathsCard(cardDataDeaths, "Deaths", "#deathsCard", COLOR.CARD_DEATHS);

            readVaccinationDataFromFile(countyTag, vacUrl, function(dataPfizer, dataModerna, dataJohnson, dataVacComb) {
                createChart(
                [
                    { type: 'bar', width: 1, color: COLOR.PFIZER, name: 'Pfizer',
                        pointsX: dataPfizer.count.map(p => p.x), pointsY: dataPfizer.count.map(p => p.y) },
                    { type: 'bar', width: 1, color: COLOR.MODERNA, name: 'Moderna',
                        pointsX: dataModerna.count.map(p => p.x), pointsY: dataModerna.count.map(p => p.y) },
                    { type: 'bar', width: 1, color: COLOR.JOHNSON, name: 'Johnson & Johnson',
                    pointsX: dataJohnson.count.map(p => p.x), pointsY: dataJohnson.count.map(p => p.y) },
                ], "vaccinationChartDiv", avgType, findMax(dataVacComb));
            });
        });
    });
}

function saveDataForCasesAndDeathsCards(row) {

    // Since totals are cummulative, save the largest one
    if (cardDataCases.totalCount == null || cardDataCases.totalCount < row.confirmed_cases) {
        cardDataCases.totalCount = row.confirmed_cases;
    }

    if (cardDataDeaths.totalCount == null || cardDataDeaths.totalCount < row.confirmed_deaths) {
        cardDataDeaths.totalCount = row.confirmed_deaths;
    }

    let date = stringToDate(row.date);

    // save data for days
    if (dateEqual(dateBefore, date)) {
        cardDataCases.beforeCount = row.new_confirmed_cases;
        cardDataDeaths.beforeCount = row.new_confirmed_deaths;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataCases.yestCount = row.new_confirmed_cases;
        cardDataDeaths.yestCount = row.new_confirmed_deaths;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataCases.todayCount = row.new_confirmed_cases;
        cardDataDeaths.todayCount = row.new_confirmed_deaths;
    }
}

function saveDataForHospCard(row) {
    let date = milliesToDate(row.date);

    // Use latest date for the main numbers
    if (cardDataNonIcu.date == null || cardDataNonIcu.date.getTime() < date.getTime()) {
        cardDataNonIcu.totalCount = row.positive_patients + row.suspected_patients - (row.icu_positive_patients + row.icu_suspected_patients);
        cardDataIcu.totalCount = row.icu_positive_patients + row.icu_suspected_patients;

        cardDataNonIcu.date = date;
        cardDataIcu.date = date;
    }

    // Assume we are processing in date ascending order
    if (dateEqual(dateBefore, date)) {
        cardDataNonIcu.beforeCount = row.positive_patients + row.suspected_patients - (row.icu_positive_patients + row.icu_suspected_patients);
        cardDataIcu.beforeCount = row.icu_positive_patients + row.icu_suspected_patients;
    }
    else if (dateEqual(dateYest, date)) {
        cardDataNonIcu.yestCount = row.positive_patients + row.suspected_patients - (row.icu_positive_patients + row.icu_suspected_patients);
        cardDataIcu.yestCount = row.icu_positive_patients + row.icu_suspected_patients;
    }
    else if (dateEqual(dateToday, date)) {
        cardDataNonIcu.todayCount = row.positive_patients + row.suspected_patients - (row.icu_positive_patients + row.icu_suspected_patients);
        cardDataIcu.todayCount = row.icu_positive_patients + row.icu_suspected_patients;
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
        + constructHospCardDayString(cardDataNonIcu.todayCount, cardDataIcu.todayCount, nonIcuColor, icuColor) + " Today<br>"
        + constructHospCardDayString(cardDataNonIcu.yestCount, cardDataIcu.yestCount, nonIcuColor, icuColor) + " " +DAY_OF_WEEK[dateYest.getDay()] +"<br>"
        + constructHospCardDayString(cardDataNonIcu.beforeCount, cardDataIcu.beforeCount, nonIcuColor, icuColor) + " " + DAY_OF_WEEK[dateBefore.getDay()],
        cardDiv);
}

function constructHospCardDayString(nonIcuCount, icuCount, nonIcuColor, icuColor) {
    return nonIcuCount == null || icuCount == null
        ? format(nonIcuCount, nonIcuColor)
        : format(nonIcuCount, nonIcuColor) + " Non-ICU / " + format(icuCount, icuColor) + " ICU";
}

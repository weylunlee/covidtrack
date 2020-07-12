const DATE = {
    MIN_CITIES: new Date(2020, 3, 1, 0, 0, 0, 0)  // apr 1, 2020
};

let dataList = null;

function readChartForCities(callback) {
    console.log("reading from git");

    let count = [];
    $.ajax({
        url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv',
        type: 'GET',
        success: function (data) {
            // convert to Json and filter only for min date
            count = JSC.csv2Json(data);

            callback(count);
        }
    });
}

function chartForCities(cities, chartDiv, avgType) {
    if (dataList == null) {
        readChartForCities(function(cummulativeConfirmed) {
            dataList = new Array();
            cities.forEach(city => {
                let cityCummulative = cummulativeConfirmed.filter(row => row.place == city);
                let cityCases = new CityData();
                dataList.push(cityCases);

                cityCases.city = city;
                cityCases.count = new Array(cityCummulative.length);

                for (let i=0; i<cityCummulative.length; i++) {
                    let cases = cityCummulative[i].confirmed_cases;
                    cityCases.count[i] = {
                        x: milliesToDate(cityCummulative[i].date),
                        y: cases == null || cases == undefined ? 0 : parseInt(cases, 10)
                    };
                }

                cityCases.total = cityCases.count[0].y;
                cityCases.count = calcNewFromCumulative(cityCases.count);
                cityCases.calcMovingAverages();
                cityCases.truncateDatesPrior(DATE.MIN_CITIES);
            });

            createChartForCities(chartDiv, avgType);
        });
    }
    else {
        createChartForCities(chartDiv, avgType);
    }
}

function createChartForCities(chartDiv, avgType) {
    dataList.forEach(cityCases => {
        createCityChart(
            [
                { type: 'column', bar_width: 1, color: COLOR.NEW_CASES, name: 'New Cases', points: cityCases.count },
                { type: 'line spline', line_width: 2, color: COLOR.MA1, name: '7-Day ' + avgType, points: cityCases.getMa1(avgType) },
                { type: 'line spline', line_width: 2, color: COLOR.MA2, name: '14-Day ' + avgType, points: cityCases.getMa2(avgType) }
            ], chartDiv + cityCases.city, cityCases.city, avgType, cityCases.total);        
    });
}
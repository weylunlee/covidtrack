// Ignore dates before this date
const minDate = new Date('2020-03-15').getTime();
var json;

//Convert string to date, taking into account time zone diff
function stringToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// Fetch csv from url, convert cvs to json, then create chart
function createChartFromGit(countyName, chartName, avgType) {
    if (json != null) {
        calcAveragesAndChart(json, "chartDiv", chartName, avgType);
        return;
    }

    $.ajax({
        url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv',
        type: 'GET',
        success: function (data) {
            let count = [];
            // Filter only for specified county name and min date
            json = JSC.csv2Json(data)
                .filter(row => row.county == countyName && minDate < stringToDate(row.date).getTime());

            json.forEach(row => {
                    let newCases = row.new_confirmed_cases;
                    count.push({ 
                        x: stringToDate(row.date), 
                        y: newCases == null || newCases == undefined ? 0 : parseInt(newCases, 10) });
                });

            json = count;
            calcAveragesAndChart(count, "chartDiv", chartName, avgType);
        }
    })
}

// Fetch csv from url, convert to json, loop to create chart for each city
function createChartForCities(cities, chartDiv, avgType) {
    if (json != null) {
        cities.forEach(city => createChartForCity(json, city, chartDiv + city, avgType));
        return;
    }

    $.ajax({
        url: 'https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv',
        type: 'GET',
        success: function (data) {
            // convert to Json and filter only for min date
            json = JSC.csv2Json(data)
                .filter(row => minDate < stringToDate(row.date).getTime());
            
            cities.forEach(city => createChartForCity(json, city, chartDiv + city, avgType));
        }
    });
}

// Given json data of all cities, create json for each city, create chart
function createChartForCity(dataAsJson, cityName, chartDiv, avgType) {
    let count = [];
    dataAsJson
        .filter(row => row.place == cityName)
        .forEach(row => {
            let cases = row.confirmed_cases;
            count.push({
                x: stringToDate(row.date),
                y: cases == null || cases == undefined ? 0 : parseInt(cases, 10)
            });
        });

    let newCount = calcNewConfirmed(count);

    calcAveragesAndChart(newCount, chartDiv, cityName + " New Cases by Day", avgType);
}

// Read page source, convert to json, create chart
// Data only available for Los Angeles County
function createChartFromPageSource(chartName, url, avgType) {
    if (json != null) {
        calcAveragesAndChart(json, "chartDiv", chartName, avgType);
        return;
    }

    $.ajax({
        url: url,
        type: 'GET',
        success: function (data) {
            let count = [];
            $(data).filter('script').each(function () {
                if (this.id == 'timeseries') {
                    $.parseJSON(this.innerHTML)
                        .filter(row => minDate < stringToDate(row.date)
                            && (row.agencies_count == row.agencies_updated || row.in_progress == false))
                        .forEach(row => count.push({
                            x: stringToDate(row.date),
                            y: row.new_confirmed_cases
                        }));
                }
            });

            json = count;
            calcAveragesAndChart(count, "chartDiv", chartName, avgType);
        }
    });
}

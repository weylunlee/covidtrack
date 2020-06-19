// Ignore dates before this date
const minDate = new Date('2020-03-15');

// Fetch csv from url, then convert cvs to series, then create chart
function createChartFromGit(countyName, chartName, avgType) {
    JSC.fetch('https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv')
    .then(function (response) {
        return response.text();
    })
    .then(function (text) {
        let dataAsJson = JSC.csv2Json(text);

        let count = [];
        dataAsJson.forEach(function (row) {
            
            // Filter only for specified county name
            if (row.county == countyName) {
                if (minDate.getTime() < stringToDate(row.date).getTime()) {

                    let newCases = row.new_confirmed_cases;
                    count.push({x: stringToDate(row.date), y: newCases == null || newCases == undefined ? 0 : parseInt(newCases, 10)});
                }
            }
        });
        calcAveragesAndChart(count, "chartDiv", chartName, avgType);
    })
    .catch(function (error) {
        console.log(error);
    });    
}

// Fetch csv from url, then convert csv to series, then create chart, given list of cities
function createChartForCities(cities, chartDiv, avgType) {
    JSC.fetch('https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-place-totals.csv')
    .then(function (response) {
        return response.text();    
    })
    .then(function (text) {
        let dataAsJson = JSC.csv2Json(text);
        for (let i=0; i<cities.length; i++) {
            createChartForCity(dataAsJson, cities[i], chartDiv+cities[i], avgType);
        }
    })
    .catch(function (error) {
    	console.log(error);
	});    
}

// Given json data, create series for each city, create chart
function createChartForCity(dataAsJson, cityName, chartDiv, avgType) {
     let count = [];
     dataAsJson.forEach(function (row) {
         
         // Filter only for specified county name
         if (row.place == cityName) {
             if (minDate.getTime() < stringToDate(row.date).getTime()) {

                 let cases = row.confirmed_cases;
                 count.push({x: stringToDate(row.date), y: cases == null || cases == undefined ? 0 : parseInt(cases, 10)});
             }
         }
     });
     
     let newCount = calcNewConfirmed(count);
     
     calcAveragesAndChart(newCount, chartDiv, cityName + " New Cases by Day", avgType);
}

// Read page source, convert to json, create chart
// Data only available for Los Angeles County
function createChartFromPageSource(chartName, url, avgType) {
    $.ajax({
        url: url,
        type: 'GET',
        success: function(data) {
            var dom = $(data); 
            
            let count = [];
            dom.filter('script').each(function() {
                if (this.id == 'timeseries') {
                    let json = $.parseJSON(this.innerHTML)
                    for (let i=0; i<json.length; i++) {
                        if (minDate.getTime() < stringToDate(json[i].date).getTime()) {
                            if (json[i].agencies_count == json[i].agencies_updated || json[i].in_progress == false) {
                                count.push({x: stringToDate(json[i].date), y: json[i].new_confirmed_cases});
                            }
                        }
                    }
                }
            });
            calcAveragesAndChart(count, "chartDiv", chartName, avgType);
        }
    });
}

//Convert string to date, taking into account time zone diff
function stringToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

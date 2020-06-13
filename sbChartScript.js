//Fetch csv from url, then convert cvs to series, then create chart
JSC.fetch('https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv')
.then(function (response) {
    return response.text();
})
.then(function (text) {
    let series = csvToSeries(text);
    createChart(series[0], "smaChartDiv");
    createChart(series[1], "emaChartDiv");
})
.catch(function (error) {
    console.log(error);
});

// Convert string to date, taking into account time zone diff
function stringToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

// Create the series
function csvToSeries(text) {
    let dataAsJson = JSC.csv2Json(text);
    let minDate = new Date('2020-03-15');

    let count = [];
    dataAsJson.forEach(function (row) {
        if (row.county === 'San Bernardino') {
            if (minDate.getTime() < stringToDate(row.date).getTime()) {
                count.push({x: stringToDate(row.date), y: row.new_confirmed_cases === '' ? 0 : parseInt(row.new_confirmed_cases, 10)});
            }
        }
    });

    let movingAvg1 = calcMovingAverage(count, 7);
    let movingAvg2 = calcMovingAverage(count, 14);
    let expMovingAvg1 = calcExpMovingAverage(count, 7);
    let expMovingAvg2 = calcExpMovingAverage(count, 14);

    return [[
        {type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
        {type: 'line spline', line_width: 3, color: '#3b577f', name: '7-Day MA', points: movingAvg1},
        {type: 'line spline', line_width: 3, color: '#CF5864', name: '14-Day MA', points: movingAvg2}
        ],
        [
            {type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
            {type: 'line spline', line_width: 3, color: '#3b577f', name: '7-Day EMA', points: expMovingAvg1},
            {type: 'line spline', line_width: 3, color: '#CF5864', name: '14-Day EMA', points: expMovingAvg2}
   
        ]];
}

// Calculates moving average for specified number of days
function calcMovingAverage(count, days) {
    let movingAvg = [];
    for (var i=0; i<count.length; i++) {
        var avg = 0;
        for (var offset=0; offset<days; offset++) {
            avg += i-offset < 0 ? 0 : count[i-offset].y;
        }
        avg /= days;
        movingAvg.push({x: count[i].x, y: Math.round(avg)});
    }

    return movingAvg;
}

// Calculates exponential moving average for specified number of days
function calcExpMovingAverage(count, days) {
    let movingAvg = [];
    let prevEma = 0;
    for (var i=0; i<count.length; i++) {
// let prevEma = i==0 ? 0 : movingAvg[i-1].y;
        let mult = 2/(days+1);
        let ema = ((count[i].y - prevEma) * mult) + prevEma;
        movingAvg.push({x: count[i].x, y: Math.round(ema)});
        
        prevEma = ema;
    }

    return movingAvg;
}

// Create the chart
function createChart(series, divName) {
    JSC.Chart(divName, {
        title: { 
            position: 'center', 
            label: { 
                text: 'San Bernardino County New Cases by Day', 
                style_fontSize: 25 
            } 
        }, 
        annotations: [ 
            { 
                label_text: 
                    'Raw data from LA Times', 
                    position: 'bottom left'
            } 
            ], 
            defaultPoint: { 
                marker_visible: false,
                tooltip: '<span style="width:75px">%seriesName</span> %icon %yvalue'
            }, 
            xAxis: {
                scale_type: "time",
                defaultTick_enabled: true,
                crosshair_enabled: true, 
                formatString: 'MMM d',
                scale: {
                  interval: {
                    unit: "day",
                    multiplier: 7
                  },
                }
            },
            legend: { 
                position: 'inside top', 
                template: '%icon %name'
            },
            series: series
    });
}
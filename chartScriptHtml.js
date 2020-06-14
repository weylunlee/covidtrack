parseHtmlToJson();

// Convert string to date, taking into account time zone diff
function stringToDate(millis) {
    let date = new Date(millis);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
}

function parseHtmlToJson() {
    let minDate = new Date('2020-03-15');
    
    $.ajax({
        url: 'https://www.latimes.com/projects/california-coronavirus-cases-tracking-outbreak/los-angeles-county/index.html',
        type: 'GET',
        success: function(data) {
            var dom = $(data); 
            
            let count = [];
            dom.filter('script').each(function() {
                if (this.id == 'timeseries') {
                    
                    let json = $.parseJSON(this.innerHTML)
//                    console.log(json);
//                    console.log(json[0].date);


                    for (let i=0; i<json.length; i++) {
                        if (minDate.getTime() < stringToDate(json[i].date).getTime()) {
                            count.push({x: stringToDate(json[i].date), y: json[i].new_confirmed_cases});
                        }
                    }
                }
            });
            
//            console.log(count);
            createSeriesForChart(count);
        }
    });
}

function createSeriesForChart(count) {
//    console.log(count);

    let movingAvg1 = calcMovingAverage(count, 7);
    let movingAvg2 = calcMovingAverage(count, 14);
    let expMovingAvg1 = calcExpMovingAverage(count, 7);
    let expMovingAvg2 = calcExpMovingAverage(count, 14);

    createChart(
    [
        {type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
        {type: 'line spline', line_width: 3, color: '#3b577f', name: '7-Day MA', points: movingAvg1},
        {type: 'line spline', line_width: 3, color: '#CF5864', name: '14-Day MA', points: movingAvg2}
    ], "smaChartDiv");
    
    createChart(
    [
        {type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
        {type: 'line spline', line_width: 3, color: '#3b577f', name: '7-Day EMA', points: expMovingAvg1},
        {type: 'line spline', line_width: 3, color: '#CF5864', name: '14-Day EMA', points: expMovingAvg2}
    ], "emaChartDiv");
}

// Calculates moving average for specified number of days
function calcMovingAverage(count, days) {
    
    // Check if ascending or descending order!
    // Assumes dates are not ordered randomly, and no missing dates!
    let ascending = true;
    if (count.length > 1 && count[0].x > count[1].x) {
        ascending = false;
    }
    
    let movingAvg = [];
    for (var i=0; i<count.length; i++) {
        var avg = 0;
        for (var offset=0; offset<days; offset++) {
          
            if (ascending) {
                avg += i-offset < 0 ? 0 : count[i-offset].y;
            }
            else {
                avg += i+offset >= count.length ? 0 : count[i+offset].y;
            }
        }
        avg /= days;
        movingAvg.push({x: count[i].x, y: Math.round(avg)});
    }

    return movingAvg;
}

// Calculates exponential moving average for specified number of days
function calcExpMovingAverage(count, days) {
    
    // Check if ascending or descending order!
    // Assumes dates are not ordered randomly, and no missing dates!
    let ascending = true;
    if (count.length > 1 && count[0].x > count[1].x) {
        ascending = false;
    }
    
    let movingAvg = [];

    // Save prev EMA to keep precision for subsequent calcs
    let prevEma = 0;
    let mult = 2/(days+1);
    
    if (ascending) {
        for (var i=0; i<count.length; i++) {        
            let ema = ((count[i].y - prevEma) * mult) + prevEma;
            movingAvg.push({x: count[i].x, y: Math.round(ema)});
            prevEma = ema;
        }
    }
    else {
        for (var i=count.length-1; i>=0; i--) {
            let ema = ((count[i].y - prevEma) * mult) + prevEma;
            movingAvg.push({x: count[i].x, y: Math.round(ema)});
            prevEma = ema;
        }
    }

    return movingAvg;
}

// Create the chart
function createChart(series, divName) {
    JSC.Chart(divName, {
        title: { 
            position: 'center', 
            label: { 
                text: 'LA County New Cases by Day', 
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

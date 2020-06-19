// Creates series and chart given array of array[date][new_confirmed_cases]
function calcAveragesAndChart(count, chartDiv, chartName, avgType) {
    var movingAvg1, movingAvg2;
    
    if(avgType == 'SMA') {
        movingAvg1 = calcMovingAverage(count, 7);
        movingAvg2 = calcMovingAverage(count, 14);
    }
    else {
        movingAvg1 = calcExpMovingAverage(count, 7);
        movingAvg2 = calcExpMovingAverage(count, 14);
    }

    createChart(
    [
        {type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
        {type: 'line spline', line_width: 3, color: '#3b577f', name: '7-Day ' + avgType, points: movingAvg1},
        {type: 'line spline', line_width: 3, color: '#CF5864', name: '14-Day ' + avgType, points: movingAvg2}
    ], chartDiv, chartName);
}

// Calculates new confirmed based on daily cumulative confirmed
function calcNewConfirmed(count) {
    let newConfirmed = [];
    
    // Check if ascending or descending order!
    // Assumes dates are not ordered randomly, and no missing dates!
    let ascending = true;
    if (count.length > 1 && count[0].x > count[1].x) {
        ascending = false;
    }
    
    if (ascending) {
        // Start with 0
        newConfirmed.push({x: count[0].x, y: 0});
        
        for (var i=1; i<count.length; i++) {
            // If next day is less than previous day, use previous day
            newConfirmed.push({x: count[i].x, y: count[i].y < count[i-1].y ? 0 : count[i].y - count[i-1].y});
        }
    }
    else {
        newConfirmed.push({x: count[count.length-1].x, y: 0});
        
        for (var i=count.length-2; i >= 0; i--) {
            // If next day is less than previous day, use previous day
            newConfirmed.push({x: count[i].x, y: count[i].y < count[i+1].y ? 0 : count[i].y - count[i+1].y});
        }
    }
    
    return newConfirmed;
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
        //movingAvg.push({x: count[i].x, y: Math.round(avg)});
        movingAvg.push({x: count[i].x, y: avg});
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
            //movingAvg.push({x: count[i].x, y: Math.round(ema)});
            movingAvg.push({x: count[i].x, y: ema});
           prevEma = ema;
        }
    }
    else {
        for (var i=count.length-1; i>=0; i--) {
            let ema = ((count[i].y - prevEma) * mult) + prevEma;
            //movingAvg.push({x: count[i].x, y: Math.round(ema)});
            movingAvg.push({x: count[i].x, y: ema});
            prevEma = ema;
        }
    }

    return movingAvg;
}

// Create the chart
function createChart(series, divName, chartName) {
    JSC.Chart(divName, {
        title: { 
            position: 'center', 
            label: { 
                text: chartName, 
                style_fontSize: 25 
            } 
        }, 
        defaultPoint: { 
            marker_visible: false,
            tooltip: '<span style="width:75px">%seriesName</span> %icon {%yvalue:n0}'
        },
        yAxis: [ 
                { id: 'mainY', formatString: 'n0' }, 
                { 
                  id: 'secondY', 
                  scale_syncWith: 'mainY', 
                  orientation: 'opposite', 
                  line_color: '#e2e2e2', 
                  defaultTick: { 
                    enabled: false, 
                    gridLine_visible: false
                  } 
                } 
              ], 
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

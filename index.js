// Fetch csv from url, then convert cvs to series, then create chart
JSC.fetch('https://raw.githubusercontent.com/datadesk/california-coronavirus-data/master/latimes-county-totals.csv')
.then(function (response) {
	return response.text();
})
.then(function (text) {
	let series = csvToSeries(text);
	createChart(series);
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
		if (row.county === 'Los Angeles') {
			if (minDate.getTime() < stringToDate(row.date).getTime()) {
				count.push({x: stringToDate(row.date), y: row.new_confirmed_cases === '' ? 0 : parseInt(row.new_confirmed_cases, 10)});
			}
		}
	});

	let movingAvg1 = calcMovingAverage(count, 7);
	let movingAvg2 = calcMovingAverage(count, 14);

	return [
		{type: 'column', bar_width: 1, color: '#7ecef9', name: 'New Cases', points: count},
		{type: 'line spline', line_width: 5, color: '#3b577f', name: '7-Day MA', points: movingAvg1},
		{type: 'line spline', line_width: 5, color: '#995261', name: '14-Day MA', points: movingAvg2}
		];
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

// Create the chart
function createChart(series) {
	JSC.Chart('chartDiv', {
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
						unit: "week",
						multiplier: 1
					}
				}
			},
			legend: { 
				position: 'inside top', 
				template: '%icon %name'
			},
			series: series
	});
}
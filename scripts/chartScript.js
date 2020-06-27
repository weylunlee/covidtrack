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
            tooltip: '<span style="width:125px">%seriesName</span> %icon {%yvalue:n0}'
        },
        yAxis: [{id: 'mainY', formatString: 'n0', scale_type: 'stacked'},
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

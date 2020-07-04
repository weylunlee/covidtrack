var cache_avgType;

// Create the chart
function createChart(series, divName, chartName, avgType) {
    cache_avgType = avgType;

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

// Capture image given div name
function printDiv(div, imageName, timestamp) {
    domtoimage.toPng($(div)[0])
        .then(function (dataUrl) {
            let img = dataUrl;
            downloadURI(img, imageName + "_" + cache_avgType + "_" + timestamp + ".png");
        })
        .catch(function (error) {
            console.error(error);
        });
}

// Download the image to local
function downloadURI(uri, name) {
    let link = document.createElement("a");

    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();  
}

// Get a timestamp string based on now
function getTimestampExt() {
    var d = new Date();
    var timestamp = d.getFullYear().toString()
        + "-" + pad((d.getMonth() + 1).toString())
        + "-" + pad(d.getDate().toString())
        + "_" + pad(d.getHours().toString())
        + pad(d.getMinutes().toString())
        + pad(d.getSeconds().toString());
    return timestamp;
}

// Zero pad single char string
function pad(x) {
    return x.length == 1 ? '0' + x : x;
}

function render(template, node) {
	$(node)[0].innerHTML = template;
}

function formatPlus(number, color) {
    return number == null ? "Not yet avail" :
        "<span style='color:" + color + "'><b>+" 
            + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
            + "</b></span>";
}

function format(number, color) {
    return number == null ? "Not yet avail" :
        "<span style='color:" + color + "'><b>" 
            + number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
            + "</b></span>";
}
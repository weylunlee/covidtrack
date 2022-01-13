const COLOR = {
    NEW_CASES: '#9edafa',
    HOSP: '#a1dddd',
    DEATH: '#f6b4a2',
    ICU: '#d9d9d9',
    PFIZER: '#b39ddb',
    MODERNA: '#9575cd',
    JOHNSON: '#673ab7',
    MA1: '#486c9d',
    MA2: '#cf5864',
    CARD_CASES: '#0b92da',
    CARD_DEATHS: '#ed6a45',
    CARD_NONICU: '#3da9a9',
    CARD_ICU: '#808080'
};

var cache_avgType;

function createTrace(seriesElem) {
    return {
        x: seriesElem.pointsX,
        y: seriesElem.pointsY,
        name: seriesElem.name,
        type: seriesElem.type,
        marker: {
            color: seriesElem.color,
            line: {
              color: seriesElem.color,
              width: seriesElem.width
            }
        },
        hovertemplate: "%{y:,.0f}"
    };
}

// Create the chart
function createChart(series, divName, avgType, maxY) {
    cache_avgType = avgType;

    var data = series.map(e => createTrace(e));

    var layout = {
        barmode: 'stack',
        showlegend: true,
        legend: {
            orientation: 'h',
            side: 'top',
            x: 0.5,
            xanchor: 'center',
            y: 1,
            traceorder: 'normal',
        },
        xaxis: {
            showgrid: true,
            ticks: 'outside',
            tickformat: '%b %d', dtick: "1209600000", tickfont: { size: 10 }
        },
        yaxis: {
            range: [0, maxY * 1.05]
        },
        margin: {
            t: 50,
            r: 0,
            l: 31
        }
    };

    Plotly.newPlot(divName, data, layout, {displayModeBar: false, responsive: true});
}

// Create the chart for city
function createCityChart(series, divName, chartName, avgType, total, maxY) {
    cache_avgType = avgType;

    var data = series.map(e => createTrace(e));

    var layout = {
        barmode: 'stack',
        showlegend: true,
        legend: {
            orientation: 'h',
            side: 'top',
            x: 0.5,
            xanchor: 'center',
            y: 1,
            traceorder: 'normal',
        },
        title: {
            text: chartName
                + '<span style="font-size: 22px; fill: #0b92da; font-weight: bold"> ' + total
                + '</span><span style="font-size: 12px"> Confirmed Cases</span>',
            font: {
                size: 21
            }
        },
        xaxis: {
            showgrid: true,
            ticks: 'outside',
            tickformat: '%b %d', dtick: "1209600000", tickfont: { size: 10 }
        },
        yaxis: {
            range: [0, maxY * 1.05]
        },
        margin: {
            t: 34,
            r: 0,
            l: 23
        }
    };

    Plotly.newPlot(divName, data, layout, {displayModeBar: false, responsive: true});
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
        + formatNumberWithComma(number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        + "</b></span>";
}

function format(number, color) {
    return number == null ? "Not yet avail" :
        "<span style='color:" + color + "'><b>"
        + formatNumberWithComma(number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","))
        + "</b></span>";
}

function formatNumberWithComma(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

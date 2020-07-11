class Data {
    constructor() {
        let count = null;
        let maSimple1 = null;
        let maSimple2 = null;
        let maExponential1 = null;
        let maExponential2 = null;
    }

    calcMovingAverage() {
        this.maSimple1 = this.calcSimpleMovingAverage(7);
        this.maSimple2 = this.calcSimpleMovingAverage(14);
        this.maExponential1 = this.calcExponentialMovingAverage(7);
        this.maExponential2 = this.calcExponentialMovingAverage(14);
    }

    truncateDatesPrior(date) {
        this.count = this.count.filter((row) => date <= row.x);
        this.maSimple1 = this.maSimple1.filter((row) => date <= row.x);
        this.maSimple2 = this.maSimple2.filter((row) => date <= row.x);
        this.maExponential1 = this.maExponential1.filter(
            (row) => date <= row.x
        );
        this.maExponential2 = this.maExponential2.filter(
            (row) => date <= row.x
        );
    }

    padDatePrior(date) {
        if (date < this.count[0].x) {
            this.count.push({ x: date, y: 0 });
        }
    }

    padDateAfter(date) {
        if (date != null && date > this.count[this.count.length - 1].x) {
            this.count.push({ x: date, y: 0 });
        }
    }

    getMa1(avgType) {
        return avgType == "MA" ? this.maSimple1 : this.maExponential1;
    }

    getMa2(avgType) {
        return avgType == "MA" ? this.maSimple2 : this.maExponential2;
    }

    // Calculates moving average for specified number of days
    calcSimpleMovingAverage(days) {
        // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
        if (this.count.length > 1 && this.count[0].x > this.count[1].x) {
            this.count.reverse();
        }

        let movingAvg = new Array(this.count.length - (days - 1));

        // Start calc initially only when full days for period is present
        let dayI = 0;
        for (let i = days - 1; i < this.count.length; i++) {
            movingAvg[dayI] = {
                x: this.count[i].x,
                y: this.calcSimpleMovingAverageForDay(i, days),
            };

            dayI++;
        }

        return movingAvg;
    }

    // Calculates moving average for day
    calcSimpleMovingAverageForDay(i, days) {
        let avg = 0;
        for (let offset = 0; offset < days; offset++) {
            avg += this.count[i - offset].y;
        }

        avg /= days;
        return avg;
    }

    // Calculates exponential moving average for specified number of days
    calcExponentialMovingAverage(days) {
        // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
        if (this.count.length > 1 && this.count[0].x > this.count[1].x) {
            this.count.reverse();
        }

        let movingAvg = new Array(this.count.length - (days - 1));
        let prevEma =
            this.count.length >= days
                ? this.calcSimpleMovingAverageForDay(days - 1, days)
                : 0;
        let mult = 2 / (days + 1);

        let dayI = 0;
        for (let i = days - 1; i < this.count.length; i++) {
            let ema = (this.count[i].y - prevEma) * mult + prevEma;
            movingAvg[dayI] = {
                x: this.count[i].x,
                y: ema,
            };
            prevEma = ema;

            dayI++;
        }

        return movingAvg;
    }
} // end class data
 
var dataCases = new Data();
var dataDeaths = new Data();
var dataNonIcu = new Data();
var dataIcu = new Data();
var dataHospComb = new Data();

// Calculates new confirmed based on daily cumulative confirmed
function calcNewFromCumulative(count) {
    let newCount = new Array(count.length);

    // Check if descending order. Assumes dates are not ordered randomly, and no missing dates!
    if (count.length > 1 && count[0].x > count[1].x) {
        count.reverse();
    }

    // Start with 0
    newCount[0] = { 
        x: count[0].x, 
        y: 0 };

    for (let i = 1; i < count.length; i++) {
        // If next day is less than previous day, use previous day
        newCount[i] = {
            x: count[i].x,
            y: count[i].y < count[i - 1].y ? 0 : count[i].y - count[i - 1].y
        };
    }

    return newCount;
}

function combineHospitalizations(nonIcu, icu) {
    let combined = new Array(nonIcu.length);
    for (let i=0; i<nonIcu.length; i++) {
        combined[i] = {x: nonIcu[i].x, y: nonIcu[i].y + icu[i].y};
    }

    return combined;
}


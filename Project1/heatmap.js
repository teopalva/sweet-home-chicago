function heatAge(data, cols, allCols) {

    var areas = [];
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;

    for (var d in data) {
        if (d < 1)
            continue;

        var id = data[d].AREA;

        // Calculate the value
        var sum = 0;
        var total = 0;
        for (var c in cols) {
            sum += +data[d][cols[c]];
        }
        for (c in allCols) {
            total += +data[d][allCols[c]];
        }

        // Normalize the sum
        sum /= total;

        // Update temp max and min
        if (sum > max)
            max = sum;
        if (sum < min)
            min = sum;

        areas.push({
            id: id,
            value: sum
        });
    }

    return {
        max: max,
        min: min,
        areas: areas,
    };
}

function heatDensity(data, allCols) {

    var areas = [];
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;

    for (var d in data) {

        var id = data[d].AREA;
        var area = data[d].AREASQ;

        // Sum the population of each area
        var sum = 0;
        for (var c in allCols) {
            sum += +data[d][allCols[c]];
        }

        // Find the density value
        sum /= area;

        if (sum > max)
            max = sum;
        if (sum < min)
            min = sum;

        areas.push({
            id: id,
            value: sum
        });
    }

    return {
        max: max,
        min: min,
        areas: areas
    };

}

function heatEducation(data) {

    var areas = [];
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;

    for (var d in data) {

        var id = data[d].AREA;
        var value = +data[d].TOT_BACHELOR;

        if (value > max)
            max = value;
        if (value < min)
            min = value;

        areas.push({
            id: id,
            value: value,
        });
    }

    return {
        max: max,
        min: min,
        areas: areas,
    };

}

function heatIncome(data) {

    var areas = [];
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;

    for (var d in data) {

        var id = data[d].AREA;
        var value = +data[d].HOUSEHOLDS_OVER_100K;

        if (value > max)
            max = value;
        if (value < min)
            min = value;

        areas.push({
            id: id,
            value: value,
        });
    }

    return {
        max: max,
        min: min,
        areas: areas,
    };

}
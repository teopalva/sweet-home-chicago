/* global $:true, d3:true, topojson:true, console:true, document:true, BarPlot, PieChart, Table:true; */
///////////////////////////////////////////////////////////////////////

function Class() {}

Class.prototype.construct = function () {};

Class.extend = function (def) {
    var classDef = function () {
        if (arguments[0] !== Class) {
            this.construct.apply(this, arguments);
        }
    };

    var proto = new this(Class);
    var superClass = this.prototype;

    for (var n in def) {
        var item = def[n];
        if (item instanceof Function) item.superClass = superClass;
        proto[n] = item;
    }

    classDef.prototype = proto;

    //Give this new class the same static extend method    
    classDef.extend = this.extend;
    return classDef;
};

///////////////////////////////////////////////////////////////////////

var ChicagoApp = Class.extend({

    construct: function () {
        this.root = {};

        this.root.margin = {
            top: 30,
            right: 30,
            bottom: 40,
            left: 50
        };

        this.root.svgMap = null;
        this.root.map = null;
        this.root.svgControls = null;
        this.root.svgMapPlot = null;
        this.root.svgR1 = null;
        this.root.svgR2 = null;
        this.root.svgR3 = null;

        // STORED DATA from external files
        this.root.features = null;
        this.root.topoJson = null;
        this.root.areas = null;
        this.root.gender = null;
        this.root.gender_district = null;
        this.root.age = null;
        this.root.age_district = null;
        this.root.race = null;
        this.root.race_district = null;
        this.root.origin1 = null;
        this.root.origin1_district = null;
        this.root.origin2 = null;
        this.root.origin2_district = null;

        this.root.projectionL = d3.geo.mercator();
        this.root.pathL = d3.geo.path().projection(this.root.projectionL);

        this.root.height = document.getElementById('container').offsetHeight;
        this.root.width = document.getElementById('container').offsetWidth / 2;
        //this.root.width = 409.8 * 2;
        //this.root.height = 218.8 * 2;
        this.root.height_detail = this.root.height / 2.5;
        this.root.width_detail = this.root.width / 3;
        this.root.colorCA = null;

        this.root.projectionR = d3.geo.mercator();
        this.root.projectionR_ = d3.geo.mercator();
        this.root.pathR = d3.geo.path().projection(this.root.projectionR);
        this.root.pathR_ = d3.geo.path().projection(this.root.projectionR_);

        this.root.counter = 0;
        this.root.tooltip = null;

        // Chart types
        this.root.barplot = [];
        this.root.piechart = [];
        this.root.table = [];

        this.root.ids = []; // int  id, boolean district

        // CHART TYPES:
        // 1: bar chart
        // 2: pie chart
        // 3: raw data table
        this.root.chartType = 1;

        // DATA TYPES:
        // 1: gender
        // 2: age
        // 3: race
        // 4: place of origin 1
        // 5: place of origin 2
        this.root.dataType = 1;

        this.root.refresh = false;
        this.root.populate = false;

    },

    ///////////////////////////////////////////////////////////////////////

    drawMap: function () {
        var self = this; //to keep the reference to this when changing context

        var width = this.root.width / 3;
        var height = this.root.height * 0.8;

        this.root.svgMap = d3.select('#map').append('svg')
            .style('display', 'block')
            .style('margin', 'auto')
            .attr('width', width)
            .attr('height', height)
            .attr("viewBox", '0 0 ' + width + ' ' + height)
            .attr("preserveAspectRatio", "xMidYMax meet");

        this.root.colorCA = d3.scale.quantize()
            .range(["rgb(141,211,199)", "rgb(253,180,98)", "rgb(190,186,218)",
                    "rgb(217,217,217)", "rgb(128,177,211)", "rgb(255,255,179)",
                    "rgb(179,222,105)", "rgb(252,205,229)", "rgb(251,128,114)"])
            .domain([01, 09]);

        d3.json('data/maps/per_capita_income.json', function (json) {
            //Store data
            self.root.features = json.features;
            var features = self.root.features;

            self.root.projectionL
                .scale(1)
                .translate([0, 0]);

            d3.csv("data/areas.csv", function (error, data) {

                if (error) {
                    console.log("Error while reading areas.csv");
                    return;
                }

                //Store data
                self.root.areas = data;

                //Merge the ag. data and GeoJSON
                //Loop through once for each ag. data value 
                for (var i = 0; i < data.length; i++) {
                    //Grab CA number
                    var dataCA = parseInt(data[i].CA_number);
                    //Grab data value, and convert from string to float
                    var dataDistrict = parseInt(data[i].District_number);
                    //Find the corresponding CA inside the GeoJSON
                    for (var j = 0; j < features.length; j++) {
                        var jsonCA = features[j].id;
                        if (dataCA === jsonCA) {
                            //Copy the data value into the JSON
                            features[j].properties.district_num = dataDistrict;
                            features[j].properties.district_name = data[i].District_name;
                            break;
                        }
                    }
                }

                // Callbacks:
                self.drawTitleFunc();
                self.drawFromTopojsonFunc();
                self.drawDistrictSelectorFunc();
                self.drawCaSelectorFunc();
                self.drawButtonsFunc();
                self.drawChartFunc(0, false); // draw gender barplot for Chicago
            });
        });

    },

    ///////////////////////////////////////////////////////////////////////

    drawFromTopojson: function () {

        var self = this;
        var width = this.root.width / 3;
        var height = this.root.height * 0.8;

        d3.json('data/maps/topo.json', function (tjson) {

            //Store data
            self.root.topoJson = tjson;

            var b = self.root.pathL.bounds(topojson.merge(tjson, tjson.objects.per_capita_income.geometries));
            var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
            var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

            self.root.projectionL
                .scale(s)
                .translate(t);

            var tempColor, tempCA = null;

            self.root.map = self.root.svgMap.selectAll('path')
                .data(self.root.features)
                .enter()
                .append('path')
                .attr('d', self.root.pathL)
                .style({
                    stroke: "#000",
                    'stroke-width': "0.2"
                })
                .style("fill", function (d) {
                    //Get data value
                    var value = d.properties.district_num;
                    if (value) {
                        return self.root.colorCA(value);
                    } else {
                        return "#ccc";
                    }
                })
                .on('click', function (d) {

                    // TOOLTIP:
                    //Clean previous selection
                    d3.selectAll('.tooltip').remove();
                    try {
                        d3.select(tempCA)
                            .style('opacity', 1)
                        //.style('fill', tempColor);
                        .style({
                            stroke: "#000",
                            'stroke-width': "0.2" // back to old
                        });
                    } catch (e) {
                        //do nothing
                    }

                    /*self.root.svgMapPlot = d3.select('#section2').append('svg')
                        .attr('class', 'tooltip')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('height', height / 2)
                        .attr('width', width)
                        .attr("viewBox", '0 0 ' + width * 1.1 + ' ' + height * (1.1 / 2))
                        .attr("preserveAspectRatio", "xMidYMax meet");
*/
                    var tooltip = d3.select('#svg_topMap');

                    var selector = tooltip.append('rect')
                        .attr('class', 'tooltip')
                        .attr('id', 'tooltipRect')
                        .attr('x', -250)
                        .attr('y', 50)
                        .attr('width', width)
                        .attr('height', height * (0.9 / 4))
                        .style('fill', '#E7E0CB')
                        .style('opacity', 0)
                        .style("cursor", "pointer")
                        .style('pointer-events', 'all');

                    var rectDims = d3.select('#tooltipRect').node().getBBox();
                    var marginX = rectDims.width / 20;

                    var text = tooltip.append('text')
                        .attr('class', 'tooltip')
                        .attr('id', 'tooltipText')
                        .attr('x', rectDims.x + marginX)
                        .attr('y', rectDims.y + rectDims.height / 2.8)
                        .style("font-size", "2em")
                        .style('opacity', 0)
                        .style("cursor", "default")
                        .text(function () {
                            return d.properties.name;
                        });

                    var textDims = d3.select('#tooltipText').node().getBBox();

                    //Reset font for animation
                    text.style("font-size", "0");

                    //Adjust rect's size based on the text size
                    selector.attr('width', textDims.width + marginX * 2);

                    rectDims = d3.select('#tooltipRect').node().getBBox();

                    //Adjust text position
                    var symbol = tooltip.append('text')
                        .attr('class', 'tooltip')
                        .style("font-size", "2em")
                        .style('opacity', 0)
                        .style("cursor", "pointer")
                        .text("+")
                        .style('text-anchor', 'middle')
                        .attr('x', rectDims.x + (rectDims.width / 2))
                        .attr('y', rectDims.y + rectDims.height / 1.25)
                        .style('pointer-events', 'none');

                    //Apply transitions
                    text.transition()
                        .style('opacity', 0.8)
                        .style("font-size", "2em");
                    selector.transition()
                        .style('opacity', 0.8);
                    symbol.transition()
                        .style('opacity', 0.8);

                    // CA HIGHLIGHTER:
                    //Save current color and CA reference
                    tempColor = this.style.fill;
                    tempCA = this;
                    //Highlight selected area
                    d3.select(this)
                    //.style('opacity', 0.5)
                    .style({
                        stroke: "#000",
                        'stroke-width': "1",
                        'stroke-linecap': "round",
                        'stroke-linejoin': "round"
                    });

                    //On click display the selected area
                    selector.on('click', function () {
                        self.drawCAdetailFunc(d.id);
                        self.drawChartFunc(d.id, false);
                    });
                });

            // DRAW MINI CHICAGO MAP
            var minimap_svg = d3.select('#slot0_map').append('svg')
                .style('display', 'block')
                .style('margin', 'auto')
                .attr('width', '100%')
                .attr('height', '115%')
                .attr("viewBox", '0 0 770 770')
                .attr("preserveAspectRatio", "xMidYMin meet");

            var minimap = minimap_svg.selectAll('path')
                .data(self.root.features)
                .enter()
                .append('path')
                .attr('d', self.root.pathL)
                .style({
                    stroke: 'white',
                    'stroke-width': "0.6"
                })
                .style("fill", '#475B62');

            // CA LABEL:
            //Add label with id number to each CA
            self.root.svgMap.selectAll('.label')
                .data(self.root.features)
                .enter()
                .append('text')
                .attr('class', 'label')
                .attr("transform", function (d) {
                    return "translate(" + self.root.pathL.centroid(d) + ")";
                })
                .attr("dy", ".35em")
                .style("font-size", "0.7em")
                .style("cursor", "pointer")
                .style('pointer-events', 'none')
                .style('text-anchor', 'middle')
                .text(function (d) {
                    return d.id;
                });

        });
    },

    ///////////////////////////////////////////////////////////////////////

    drawCAdetail: function (CA_id) {

        var self = this;
        var slot = this.assignSlot();
        var map = '#' + slot + '_map';
        var div = slot + '_map';
        var title = '#' + slot + '_title';

        //Clear before drawing new map
        d3.select(map).select("svg").remove();
        //Clear before drawing new title
        d3.select(title).select("svg").remove();

        var feature = this.root.features.filter(function (d) {
            return d.id === CA_id; // select a single CA by id
        });

        // Draw CA name
        var svg_title = d3.select(title)
            .data(feature)
            .append('svg')
            .style('width', '100%')
            .style('height', '100%')
            .attr("viewBox", '0 0 100 100')
            .attr("preserveAspectRatio", "xMidYMin meet")
            .append('g')
            .attr('transform', 'translate(50,60)')
            .append('text')
            .classed('blu_text', true)
            .style("font-size", "20")
            .style("text-anchor", "middle")
            .style("cursor", "default")
            .text(function (d) {
                return d.properties.name + " " + "(" + d.id + ")";
            });

        var height = document.getElementById(div).offsetHeight;
        var width = document.getElementById(div).offsetWidth;

        var svg = d3.select(map)
            .append('svg')
            .style('display', 'block')
            .style('margin', '0 auto')
            .style('width ', width)
            .style('height', height)
            .attr("viewBox", '0 0 ' + width + ' ' + height)
            .attr("preserveAspectRatio", "xMidYMin meet");

        this.root.projectionR
            .scale(1)
            .translate([0, 0]);

        var b = this.root.pathR.bounds(feature[0]);
        var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

        this.root.projectionR
            .scale(s)
            .translate(t);

        svg.selectAll('path')
            .data(feature)
            .enter()
            .append('path')
            .attr('d', this.root.pathR)
            .style({
                stroke: "#000",
                'stroke-width': "1.5"
            })
            .style("fill", function (d) {
                //Get data value
                var value = d.properties.district_num;
                if (value) {
                    return self.root.colorCA(value);
                } else {
                    return "#ccc";
                }
            });

    },


    ///////////////////////////////////////////////////////////////////////

    drawDistrictDetail: function (districtNum) {

        var self = this;
        var slot = this.assignSlot();
        var map = '#' + slot + '_map';
        var div = slot + '_map';
        var title = '#' + slot + '_title';
        var data = this.root.areas;

        //Clear before drawing new map
        d3.select(map).selectAll("svg").remove();
        //Clear before drawing new title
        d3.select(title).select("svg").remove();

        var height = document.getElementById(div).offsetHeight;
        var width = document.getElementById(div).offsetWidth;

        var svg = d3.select(map)
            .append('svg')
            .style('display', 'block')
            .style('margin', '0 auto')
            .style('width ', width)
            .style('height', height)
            .attr("viewBox", '0 0 ' + width + ' ' + height)
            .attr("preserveAspectRatio", "xMidYMin meet");

        // Draw district name
        var svg_title = d3.select(title)
            .append('svg')
            .style('width', '100%')
            .style('height', '100%')
            .attr("viewBox", '0 0 100 100')
            .attr("preserveAspectRatio", "xMidYMin meet")
            .append('g')
            .attr('transform', 'translate(50,60)')
            .append('text')
            .classed('blu_text', true)
            .style("font-size", "20")
            .style("text-anchor", "middle")
            .style("cursor", "default")
            .text(function () {
                for (var i = 0; i < data.length; i++) {
                    if (districtNum === parseInt(data[i].District_number)) {
                        return data[i].District_name;
                    }
                }
            });

        var listCA = [];
        var tjson = this.root.topoJson;
        var tjson_ = [];

        //Fill listCA with the numbers of the CAs inside this district
        for (var i = 0; i < data.length; i++) {
            if (districtNum === parseInt(data[i].District_number)) {
                if (!(listCA.indexOf(parseInt(data[i].CA_number)) > -1))
                    listCA.push(parseInt(data[i].CA_number));
            }
        }

        //Keep in the topoJson only the geometries of the selected CAs (info to center the projection)
        for (var x = tjson.objects.per_capita_income.geometries.length - 1; x >= 0; x--) {
            if ((listCA.indexOf(tjson.objects.per_capita_income.geometries[x].id) > -1)) {
                tjson_.push(tjson.objects.per_capita_income.geometries[x]);
            }
        }

        //Retrieve the selected features for this district (info for drawing)
        var district = self.root.features.filter(function (d) {
            return listCA.indexOf(d.id) > -1; // select a single CA by id
        });

        //Reset the projection
        self.root.projectionR_
            .scale(1)
            .translate([0, 0]);

        //Compute the parameters to center the projection
        var b = self.root.pathR_.bounds(topojson.merge(tjson, tjson_));
        var s = 0.95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
        var t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

        self.root.projectionR_
            .scale(s)
            .translate(t);

        //Draw the new svg
        svg.selectAll('path')
            .data(district)
            .enter()
            .append('path')
            .attr('d', self.root.pathR_)
            .style({
                stroke: "#000",
                'stroke-width': "1.5"
            })
            .style("fill", function (d) {
                //Get data value
                var value = d.properties.district_num;
                if (value) {
                    return self.root.colorCA(value);
                } else {
                    return "#ccc";
                }
            });

    },

    ///////////////////////////////////////////////////////////////////////

    drawDistrictSelector: function () {
        var self = this;
        var districts = d3.range(1, 10);

        var height = document.getElementById('districtLegend').offsetHeight;
        var width = document.getElementById('districtLegend').offsetWidth;

        var dl = d3.select('#districtLegend').append('svg')
            .style('display', 'block')
            .style('margin', 'auto')
            .style('width', '100%')
            .style('height', '100%')
            .attr("viewBox", '0 0 160 160')
            .attr("preserveAspectRatio", "xMidYMin meet");

        var legend = dl.append("g")
            .attr("class", "legend")
            .attr('transform', 'translate(20,50)');

        var w = 500;

        legend.selectAll('rect')
            .data(districts)
            .enter()
            .append("rect")
            .attr("x", w - 500)
            .attr("y", function (d, i) {
                return i * 20;
            })
            .attr("width", 10)
            .attr("height", 10)
            .style("cursor", "pointer")
            .style("fill", function (d) {
                if (d) {
                    return self.root.colorCA(d);
                } else {
                    return "#ccc";
                }
            })
            .style("stroke", 0.3)
            .on('click', function (d) {
                self.drawDistrictDetailFunc(d);
                self.drawChartFunc(d, true); //it is a district
            });

        var data = this.root.areas;
        legend.selectAll('text')
            .data(districts)
            .enter()
            .append("text")
            .attr("x", w - 480)
            .attr("y", function (d, i) {
                return i * 20 + 9;
            })
            .text(function (d) {
                for (var i = 0; i < data.length; i++) {
                    if (d === parseInt(data[i].District_number)) {
                        return data[i].District_name;
                    }
                }
                return "Error";
            })
            .style("font-size", "12")
            .style("text-anchor", "left")
            .style("cursor", "pointer")
            .on('click', function (d) {
                self.drawDistrictDetailFunc(d);
                self.drawChartFunc(d, true); //it is a district
            });

    },

    ///////////////////////////////////////////////////////////////////////

    drawCaSelector: function () {
        var self = this;

        var height = document.getElementById("caLegend").offsetHeight * 8.58;
        var width = document.getElementById("caLegend").offsetWidth;

        var cal = d3.select("#caLegend").append('svg')
            .style('display', 'block')
            .style('margin', 'auto')
            .style('width', width)
            .style('height', height / 8.6)
            .attr("viewBox", '0 -47.5 160 160')
            .attr("preserveAspectRatio", "xMidYMin meet");

        var legend = cal.append("g")
            .attr('transform', 'translate(20,51)');

        var w = 500;

        // Use d3.nest to sort the CAs alphabetically
        var sortedData = d3.nest()
            .key(function (d) {
                return d.CA_name;
            })
            .sortKeys(d3.ascending)
            .entries(this.root.areas);

        var start = 0;
        var end = 8;
        var tempArray = [];
        for (var i = start; i <= end; i++) {
            tempArray.push(sortedData[i]);
        }

        legend.selectAll('text')
            .data(tempArray)
            .enter()
            .append("text")
            .attr("x", -10)
            .attr("y", function (d, i) {
                return i * 20 - 40;
            })
            .text(function (d) {
                return d.values[0].CA_name + "  " + "(" + d.values[0].CA_number + ")";
            })
            .style("font-size", "12")
            .style("text-anchor", "left")
            .style("cursor", "pointer")
            .on('click', function (d) {
                self.drawCAdetailFunc(+d.values[0].CA_number);
                self.drawChartFunc(+d.values[0].CA_number, false);
            });

        d3.select('#arrow_down')
            .on('click', function () {

                start += 9;
                end += 9;
                tempArray = [];
                for (var i = start; i <= end; i++) {
                    if (i === 77) {
                        start = -9;
                        end = -1;
                        break;
                    }
                    tempArray.push(sortedData[i]);
                }

                legend.selectAll('text').remove();

                legend.selectAll('text')
                    .data(tempArray)
                    .enter()
                    .append("text")
                    .attr("x", -10)
                    .attr("y", function (d, i) {
                        return i * 20 - 40;
                    })
                    .text(function (d) {
                        return d.values[0].CA_name + "  " + "(" + d.values[0].CA_number + ")";
                    })
                    .style("font-size", "12")
                    .style("text-anchor", "left")
                    .style("cursor", "pointer")
                    .on('click', function (d) {
                        self.drawCAdetailFunc(+d.values[0].CA_number);
                        self.drawChartFunc(+d.values[0].CA_number, false);
                    });

            });

    },

    ///////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////

    assignSlot: function () {

        this.root.counter++;
        if (this.root.counter === 4) this.root.counter = 1;

        var slot;
        switch (this.root.counter) {
        case 1:
            slot = 'slot1';
            break;
        case 2:
            slot = 'slot2';
            break;
        case 3:
            slot = 'slot3';
            break;
        default:
            slot = 'slot4';
        }
        return slot;

    },

    ///////////////////////////////////////////////////////////////////////

    createPlot: function (data, id, district, yName, xName, xNames, cols) {

        switch (this.root.chartType) {
            // bar chart
        case 1:
            {
                // Save slot for Chicago's chart
                if (id === 0) {
                    this.root.barplot[0] = new BarPlot(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.barplot[arguments[7]] = new BarPlot(this, data, id, district, yName, xName, xNames, cols, arguments[7]);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.barplot[this.root.counter] = new BarPlot(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
            break;
            // pie chart
        case 2:
            {
                // Save slot for Chicago's chart
                if (id === 0) {
                    this.root.piechart[0] = new PieChart(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.piechart[arguments[7]] = new PieChart(this, data, id, district, yName, xName, xNames, cols, arguments[7]);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.piechart[this.root.counter] = new PieChart(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
            break;
            // data table
        case 3:
            {
                // Save slot for Chicago's chart
                if (id === 0) {
                    this.root.table[0] = new Table(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.table[arguments[7]] = new Table(this, data, id, district, yName, xName, xNames, cols, arguments[7]);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.table[this.root.counter] = new Table(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
        }

    },

    ///////////////////////////////////////////////////////////////////////


    updatePlot: function (data, id, district, yName, xName, xNames, cols) {

        switch (this.root.chartType) {
            // bar chart
        case 1:
            {
                if (id === 0) {
                    this.root.barplot[0].update(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.barplot[arguments[7]].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.barplot[this.root.counter].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
            break;
            // pie chart
        case 2:
            {
                if (id === 0) {
                    this.root.piechart[0].update(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.piechart[arguments[7]].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.piechart[this.root.counter].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
            break;
            // data table
        case 3:
            {
                if (id === 0) {
                    this.root.table[0].update(this, data, id, district, yName, xName, xNames, cols);
                    this.root.ids[0] = [id, district];
                } else {
                    if (arguments[7]) {
                        this.root.table[arguments[7]].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[arguments[7]] = [id, district];
                    } else {
                        this.root.table[this.root.counter].update(this, data, id, district, yName, xName, xNames, cols);
                        this.root.ids[this.root.counter] = [id, district];
                    }
                }
            }
            break;
        }

    },

    ///////////////////////////////////////////////////////////////////////

    drawChart: function (id, district) {

        // NOTE: the extra parameter passed through arguments specifies the index of the plot in the storage array:
        // its double function is to keep track of the chart object instantiated in each slot and of the information
        // present in the slot itself

        // Call functions based on data type
        switch (this.root.dataType) {
        case 1:
            this.genderFunc(id, district, arguments[2]);
            break;
        case 2:
            this.ageFunc(id, district, arguments[2]);
            break;
        case 3:
            this.raceFunc(id, district, arguments[2]);
            break;
        case 4:
            this.origin1Func(id, district, arguments[2]);
            break;
        case 5:
            this.origin2Func(id, district, arguments[2]);
            break;
        default:
            break;
        }

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *  Called when the user requests a change of dataset or of chart type.
     *  It dynamically refreshes all the present charts and instantiates new charts if needed.
     */
    refreshCharts: function () {

        this.root.refresh = true;

        try {
            switch (this.root.chartType) {
            case 1:
                {
                    for (var i = 0; i < 4; i++) {
                        if (this.root.populate)
                            this.drawChart(this.root.ids[i][0], this.root.ids[i][1], i);
                        else
                            this.drawChart(this.root.barplot[i].root.id, this.root.barplot[i].root.district, i);
                    }
                }
                break;
            case 2:
                {
                    for (var j = 0; j < 4; j++) {
                        if (this.root.populate)
                            this.drawChart(this.root.ids[j][0], this.root.ids[j][1], j);
                        else
                            this.drawChart(this.root.piechart[j].root.id, this.root.piechart[j].root.district, j);
                    }
                }
                break;
            case 3:
                {
                    for (var k = 0; k < 4; k++) {
                        if (this.root.populate)
                            this.drawChart(this.root.ids[k][0], this.root.ids[k][1], k);
                        else
                            this.drawChart(this.root.table[k].root.id, this.root.table[k].root.district, k);
                    }
                }
                break;
            }
        } catch (e) {
            // there is no chart in some slot, do nothing
        }

        this.root.refresh = false;

    },

    ///////////////////////////////////////////////////////////////////////

    emptySlots: function () {

        d3.selectAll('.slot_plot').selectAll('.chart').remove();
        d3.selectAll('#map_plot').selectAll('.chart').remove();

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *
     */
    gender: function (id, district) {

        var self = this;
        var selfArguments = arguments;

        // Load data only the first time
        if (this.root.gender === null) {
            d3.csv("data/demographic/01_gender.csv", function (error, data1) {
                d3.csv("data/demographic/01_gender_district.csv", function (error, data2) {

                    // Store data
                    self.root.gender = data1;
                    self.root.gender_district = data2;

                    if (district)
                        self.genderRoutine(self.root.gender_district, id, district, selfArguments[2]);
                    else
                        self.genderRoutine(self.root.gender, id, district, selfArguments[2]);
                });
            });
        } else {
            if (district)
                self.genderRoutine(self.root.gender_district, id, district, selfArguments[2]);
            else {
                self.genderRoutine(self.root.gender, id, district, selfArguments[2]);
            }
        }
    },

    genderRoutine: function (data, id, district) {

        if ((d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() && !this.root.refresh) || (this.root.populate)) {
            this.createPlot(data, id, district, "People", "Gender", ["Male", "Female"], ["MALE", "FEMALE"], arguments[3]);
        } else if (!d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() || (this.root.refresh && arguments[3])) {
            this.updatePlot(data, id, district, "People", "Gender", ["Male", "Female"], ["MALE", "FEMALE"], arguments[3]);
        }

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *
     */
    age: function (id, district) {

        var self = this;
        var selfArguments = arguments;

        // Load data only the first time
        if (this.root.age === null) {
            d3.csv("data/demographic/02_age_groups.csv", function (error, data1) {
                d3.csv("data/demographic/02_age_groups_district.csv", function (error, data2) {

                    // Store data
                    self.root.age = data1;
                    self.root.age_district = data2;

                    if (district)
                        self.ageRoutine(self.root.age_district, id, district, selfArguments[2]);
                    else
                        self.ageRoutine(self.root.age, id, district, selfArguments[2]);
                });
            });
        } else {
            if (district)
                self.ageRoutine(self.root.age_district, id, district, selfArguments[2]);
            else
                self.ageRoutine(self.root.age, id, district, selfArguments[2]);
        }
    },

    ageRoutine: function (data, id, district) {

        /* NEST ATTEMPT - for future reference
        // If this is a district, group data accordingly
        if (district) {
            var data_district = d3.nest()
                .key(function (d) {
                    return d.DISTRICT;
                })
                .rollup(function (leaves) {
                    return {
                        "total": d3.sum(leaves, function (d) {
                            return +d.T0004;
                        })
                    };
                })
                .entries(this.root.age);
            console.log(data_district);
        }
        */

        if ((d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() && !this.root.refresh) || this.root.populate) {
            this.createPlot(data, id, district, "People", "Age", ["0-4", "5-12", "13-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"], ["0_4", "5_12", "13_19", "20_29", "30_39", "40_49", "50_59", "60_69", "70_OVER"], arguments[3]);
        } else if (!d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() || (this.root.refresh && arguments[3])) {
            this.updatePlot(data, id, district, "People", "Age", ["0-4", "5-12", "13-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+"], ["0_4", "5_12", "13_19", "20_29", "30_39", "40_49", "50_59", "60_69", "70_OVER"], arguments[3]);
        }

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *
     */
    race: function (id, district) {

        var self = this;
        var selfArguments = arguments;

        // Load data only the first time
        if (this.root.race === null) {
            d3.csv("data/demographic/03_race.csv", function (error, data1) {
                d3.csv("data/demographic/03_race_district.csv", function (error, data2) {

                    // Store data
                    self.root.race = data1;
                    self.root.race_district = data2;

                    if (district)
                        self.raceRoutine(self.root.race_district, id, district, selfArguments[2]);
                    else
                        self.raceRoutine(self.root.race, id, district, selfArguments[2]);
                });
            });
        } else {
            if (district)
                self.raceRoutine(self.root.race_district, id, district, selfArguments[2]);
            else {
                self.raceRoutine(self.root.race, id, district, selfArguments[2]);
            }
        }
    },

    raceRoutine: function (data, id, district) {

        if ((d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() && !this.root.refresh) || this.root.populate) {
            this.createPlot(data, id, district, "People", "Race", ["Latino", "White", "Black", "Asian"], ["LATINO", "WHITE", "BLACK", "ASIAN"], arguments[3]);
        } else if (!d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() || (this.root.refresh && arguments[3])) {
            this.updatePlot(data, id, district, "People", "Race", ["Latino", "White", "Black", "Asian"], ["LATINO", "WHITE", "BLACK", "ASIAN"], arguments[3]);
        }

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *
     */
    origin1: function (id, district) {

        var self = this;
        var selfArguments = arguments;

        // Load data only the first time
        if (this.root.origin1 === null) {
            d3.csv("data/demographic/04_origin_general.csv", function (error, data1) {
                d3.csv("data/demographic/04_origin_general_district.csv", function (error, data2) {

                    // Store data
                    self.root.origin1 = data1;
                    self.root.origin1_district = data2;

                    if (district)
                        self.origin1Routine(self.root.origin1_district, id, district, selfArguments[2]);
                    else
                        self.origin1Routine(self.root.origin1, id, district, selfArguments[2]);
                });
            });
        } else {
            if (district)
                self.origin1Routine(self.root.origin1_district, id, district, selfArguments[2]);
            else {
                self.origin1Routine(self.root.origin1, id, district, selfArguments[2]);
            }
        }
    },

    origin1Routine: function (data, id, district) {

        if ((d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() && !this.root.refresh) || this.root.populate) {
            this.createPlot(data, id, district, "People", "Place of Origin", ["Not Hispanic", "Hispanic"], ["NOT_HISPANIC", "HISPANIC"], arguments[3]);
        } else if (!d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() || (this.root.refresh && arguments[3])) {
            this.updatePlot(data, id, district, "People", "Place of Origin", ["Not Hispanic", "Hispanic"], ["NOT_HISPANIC", "HISPANIC"], arguments[3]);
        }

    },

    ///////////////////////////////////////////////////////////////////////

    /**
     *
     */
    origin2: function (id, district) {

        var self = this;
        var selfArguments = arguments;

        // Load data only the first time
        if (this.root.origin2 === null) {
            d3.csv("data/demographic/05_origin_hispanic.csv", function (error, data1) {
                d3.csv("data/demographic/05_origin_hispanic_district.csv", function (error, data2) {

                    // Store data
                    self.root.origin2 = data1;
                    self.root.origin2_district = data2;

                    if (district)
                        self.origin2Routine(self.root.origin2_district, id, district, selfArguments[2]);
                    else
                        self.origin2Routine(self.root.origin2, id, district, selfArguments[2]);
                });
            });
        } else {
            if (district)
                self.origin2Routine(self.root.origin2_district, id, district, selfArguments[2]);
            else {
                self.origin2Routine(self.root.origin2, id, district, selfArguments[2]);
            }
        }
    },

    origin2Routine: function (data, id, district) {

        if ((d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() && !this.root.refresh) || this.root.populate) {
            this.createPlot(data, id, district, "People", "Place of Origin - Hispanics", ["Central America (Mexican)", "Central America (Other)", "South America", "Other"], ["CENTRAL_AMERICA_MEXICAN", "CENTRAL_AMERICA_OTHER", "SOUTH_AMERICA", "OTHER"], arguments[3]);
        } else if (!d3.select('#slot' + this.root.counter + '_plot').selectAll('.chart').empty() || (this.root.refresh && arguments[3])) {
            this.updatePlot(data, id, district, "People", "Place of Origin - Hispanics", ["Central America (Mexican)", "Central America (Other)", "South America", "Other"], ["CENTRAL_AMERICA_MEXICAN", "CENTRAL_AMERICA_OTHER", "SOUTH_AMERICA", "OTHER"], arguments[3]);
        }

    },

    ///////////////////////////////////////////////////////////////////////

    drawTitle: function () {

        var self = this;

        var height = document.getElementById("section2").offsetHeight / 4;
        var width = document.getElementById("section2").offsetWidth * 2;

        var cal = d3.select("#section2").append('svg')
            .attr('id', 'svg_topMap')
            .style('display', 'block')
            .style('margin', 'auto')
            .style('width', width)
            .style('height', height)
            .attr("viewBox", '0 0 270 270')
            .attr("preserveAspectRatio", "xMidYMin meet");

        var legend = cal.append("g")
            .attr('transform', 'translate(320,130)')
            .append('text')
            .text("Chicago") // Community Explorer")
            .classed('title', true)
            .style("text-anchor", "left")
            .style("cursor", "default");

    },

    ///////////////////////////////////////////////////////////////////////


    drawButtons: function () {

        var self = this;

        var height = document.getElementById('controls').offsetHeight;
        var width = document.getElementById('controls').offsetWidth;

        d3.select('#icons_container')
            .style({
                width: width,
                height: height / 2.4,
            });

        // BARS
        d3.select('#icon_bars')
        //.attr('transform', 'translate(10,50)') // + (height / 10) + ')')
        .on('click', function (d) {
            self.onChartChange(1);
        });

        // PIE
        d3.select('#icon_pie')
            .on('click', function (d) {
                self.onChartChange(2);
            });

        // TABLE
        d3.select('#icon_table')
            .on('click', function (d) {
                self.onChartChange(3);
            });

        // Gender
        d3.select('#sel_gender')
            .on('click', function (d) {
                self.onDataChange(1);
            });

        // Age
        d3.select('#sel_age')
            .on('click', function (d) {
                self.onDataChange(2);
            });

        // Race
        d3.select('#sel_race')
            .on('click', function (d) {
                self.onDataChange(3);
            });

        // Origin1
        d3.select('#sel_origin1')
            .on('click', function (d) {
                self.onDataChange(4);
            });

        // Origin2
        d3.select('#sel_origin2')
            .on('click', function (d) {
                self.onDataChange(5);
            });

        // Heat1
        d3.select('#heat_under21')
            .on('click', function (d) {
                d3.csv("data/demographic/02_age_groups.csv", function (error, data) {
                    self.drawHeat21(data);
                });
            });

        // Heat2
        d3.select('#heat_over100')
            .on('click', function (d) {
                d3.csv("data/demographic/02_age_groups.csv", function (error, data) {
                    self.drawHeat70(data);
                });
            });

        // Heat3
        d3.select('#heat_density')
            .on('click', function (d) {
                d3.csv("data/areasq.csv", function (error, data) {
                    self.drawHeatDensity(data);
                });
            });

        // Heat4
        d3.select('#heat_income')
            .on('click', function (d) {
                d3.csv("data/income_over100k.csv", function (error, data) {
                    self.drawHeatIncome(data);
                });
            });

        // Heat5
        d3.select('#heat_education')
            .on('click', function (d) {
                d3.csv("data/education.csv", function (error, data) {
                    self.drawHeatEducation(data);
                });
            });

    },

    onChartChange: function (option) {
        this.root.chartType = option;
        this.emptySlots();
        this.root.populate = true;
        this.refreshCharts();
        this.root.populate = false;
    },

    onDataChange: function (option) {
        this.root.dataType = option;
        this.refreshCharts();
    },

    ///////////////////////////////////////////////////////////////////////

    applyHeatMap: function (result, title, d3format) {

        var self = this;

        var heatColor = d3.scale.quantize()
            .range(['rgb(239,243,255)', 'rgb(198,219,239)', 'rgb(158,202,225)',
                    'rgb(107,174,214)', 'rgb(49,130,189)', 'rgb(8,81,156)'])
            .domain([result.min, result.max]);

        this.root.map
            .style("fill", function (d) {
                var ca = result.areas.filter(function (e) {
                    return +e.id === +d.id;
                });
                var value = ca[0].value;
                if (value) {
                    return heatColor(value);
                } else {
                    return "#ccc";
                }
            });

        // Remove any previous legend
        d3.selectAll('#heatLegend').remove();

        // Add legend
        var legend = this.root.svgMap.selectAll('g')
            .data(heatColor.range())
            .enter()
            .append('g')
            .attr('id', 'heatLegend');

        legend.append('rect')
            .attr("x", 45)
            .attr("y", function (d, i) {
                return i * 25 + 600;
            })
            .attr("width", 20)
            .attr("height", 20)
            .style("stroke", "black")
            .style("stroke-width", 1)
            .style("fill", function (d) {
                return d;
            });

        legend.append('text')
            .attr("x", 75)
            .attr("y", function (d, i) {
                return i * 25 + 600;
            })
            .attr("dy", "0.8em")
            .style("cursor", "default")
            .text(function (d, i) {
                var extent = heatColor.invertExtent(d);
                var format = d3.format(d3format);
                return format(+extent[0]) + " - " + format(+extent[1]);
            });

        // Title
        legend.append('text')
            .attr("x", 35)
            .attr("y", 570)
            .attr("dy", "0.8em")
            .style("cursor", "default")
            .text(title);

        // Disable heatmap
        legend.append('text')
            .attr("x", 35)
            .attr("y", 755)
            .attr("dy", "0.8em")
            .style("cursor", "pointer")
            .text("Disable heatmap mode")
            .on('click', function (d) {

                // Back to normal fill
                self.root.map
                    .style("fill", function (d) {
                        //Get data value
                        var value = d.properties.district_num;
                        if (value) {
                            return self.root.colorCA(value);
                        } else {
                            return "#ccc";
                        }
                    });
                d3.selectAll('#heatLegend').remove();

            });

    },

    drawHeat21: function (data) {
        var result = heatAge(data, ["0_4", "5_12", "13_19"], ["0_4", "5_12", "13_19", "20_29", "30_39", "40_49", "50_59", "60_69", "70_OVER"]);
        this.applyHeatMap(result, "Percentage people under 21", "%");
    },

    drawHeat70: function (data) {
        var result = heatAge(data, ["70_OVER"], ["0_4", "5_12", "13_19", "20_29", "30_39", "40_49", "50_59", "60_69", "70_OVER"]);
        this.applyHeatMap(result, "Percentage people over 70", "%");
    },

    drawHeatDensity: function (data) {
        var result = heatDensity(data, ["TOT_POP"]);
        this.applyHeatMap(result, "Density of population /sq mi", ",.0f");
    },

    drawHeatIncome: function (data) {
        var result = heatIncome(data);
        this.applyHeatMap(result, "Households income over 100K", ",.0f");
    },

    drawHeatEducation: function (data) {
        var result = heatEducation(data);
        this.applyHeatMap(result, "Bachelor's degree or higher", ",.0f");
    },

    ///////////////////////////////////////////////////////////////////////

    init: function () {

        // Functions to manage the drawing of stuff
        this.drawTitleFunc = this.drawTitle.bind(this);
        this.drawFromTopojsonFunc = this.drawFromTopojson.bind(this);
        this.drawCAdetailFunc = this.drawCAdetail.bind(this);
        this.drawDistrictSelectorFunc = this.drawDistrictSelector.bind(this);
        this.drawCaSelectorFunc = this.drawCaSelector.bind(this);
        this.drawDistrictDetailFunc = this.drawDistrictDetail.bind(this);
        this.drawChartFunc = this.drawChart.bind(this);

        // Functions to manage data input and elaboration
        this.genderFunc = this.gender.bind(this);
        this.ageFunc = this.age.bind(this);
        this.raceFunc = this.race.bind(this);
        this.origin1Func = this.origin1.bind(this);
        this.origin2Func = this.origin2.bind(this);

        this.drawButtonsFunc = this.drawButtons.bind(this);

        // First call to start the actual execution
        this.drawMap.call(this);

    },

    ///////////////////////////////////////////////////////////////////////

});
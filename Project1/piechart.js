/* global $:true, d3:true, topojson:true, console:true, document:true, Class:true */
///////////////////////////////////////////////////////////////////////

var PieChart = Class.extend({

    construct: function (App, data, id, district, x, title, xNames, cols) {

        this.root = {};

        // To keep track of the identity of the data of this chart
        this.root.id = id;
        this.root.district = district;

        this.root.margin = {
            top: 70,
            right: 20,
            bottom: 70,
            left: 80,
        };

        // Retrieve dimensions from the container
        this.root.height = document.getElementById('slot1_plot').offsetHeight * 0.9;
        this.root.height = this.root.height - this.root.margin.top - this.root.margin.bottom;
        this.root.width = document.getElementById('slot1_plot').offsetWidth * 0.95;
        this.root.width = this.root.width - this.root.margin.left - this.root.margin.right;
        this.root.outerRadius = Math.min(this.root.height - this.root.margin.top - this.root.margin.bottom, this.root.width - this.root.margin.left - this.root.margin.right) / 1.2;
        this.root.innerRadius = this.root.width / 6;

        this.root.svg = null;
        this.root.svgChicago = null;

        this.root.color = d3.scale.ordinal()
            .range(['rgb(179,205,227)', 'rgb(251,180,174)', 'rgb(204,235,197)', 'rgb(222,203,228)', 'rgb(254,217,166)', 'rgb(255,255,204)', 'rgb(229,216,189)', 'rgb(253,218,236)', 'rgb(242,242,242)']);

        this.root.data = data;
        this.root.slot = arguments[8] ? 'slot' + arguments[8] : 'slot' + App.root.counter;
        this.root.plot = '#' + this.root.slot + '_plot';

        // Draw the main canvas for the chart
        this.plot(id);
        // Apply the starting parameters
        this.update(App, data, id, district, x, title, xNames, cols);

    },

    ///////////////////////////////////////////////////////////////////////

    plot: function (id) {

        var area;
        switch (id) {
            //Chicago
        case 0:
            area = "#map_plot";
            break;
        default:
            area = this.root.plot;
            break;
        }

        this.root.svg = d3.select(area).append('svg')
            .style('display', 'block')
            .style('position', 'absolute')
            .attr('class', 'chart')
            .attr('width', this.root.width + this.root.margin.left + this.root.margin.right)
            .attr('height', this.root.height + this.root.margin.top + this.root.margin.bottom + 10)
        //.attr("viewBox", '0 0 ' + this.root.height + ' ' + this.root.height)
        //.attr("preserveAspectRatio", "xMidYMax meet")
        .append("g")
            .attr("transform", "translate(" + ((this.root.width) / 1.6 - this.root.outerRadius) + "," +
                ((this.root.height) / 1.45 - this.root.outerRadius) + ")");

        // TITLE
        this.root.svg.append("text")
            .attr("class", "pietitle")
            .style("text-anchor", "middle")
            .style("cursor", "default")
            .attr("x", (this.root.width) / 2)
            .attr("y", this.root.height * 1.2)
            .text(this.root.title);

    },

    ///////////////////////////////////////////////////////////////////////

    update: function (App, data, id, district, x, title, xNames, cols) {

        var self = this;

        // To keep track of the identity of the data of this chart
        this.root.id = id;
        this.root.district = district;

        this.root.title = title;
        this.root.xNames = xNames;
        this.root.cols = cols;

        // Array to hold only the data we are visualizing
        var bardata = [];
        for (var k = 0; k <= this.root.cols.length - 1; k++) {
            bardata.push(+data[id][this.root.cols[k]]);
        }

        var outerRadius = this.root.outerRadius;
        var innerRadius = this.root.innerRadius;
        var color = this.root.color;
        var width = this.root.width;
        var height = this.root.height;

        var arc = d3.svg.arc()
            .innerRadius(innerRadius)
            .outerRadius(outerRadius);

        var pie = d3.layout.pie();

        pie.sort(null);

        this.root.svg
            .selectAll("g.arc").remove();

        // Set up groups
        var arcs = this.root.svg
            .selectAll("g.arc")
            .data(pie(bardata));

        arcs.enter()
            .append("g")
            .attr("class", "arc")
            .append("path")
            .style("fill", function (d, i) {
                return color(i);
            })
            .attr("d", arc)
            .each(function (d) {
                this._current = d;
            });

        // Update already existing arc paths
        arcs.select("path")
            .attr("fill", function (d, i) {
                return color(i);
            })
            .transition()
            .duration(750)
            .attrTween("d", arcTween);

        // Remove old labels
        arcs.selectAll("text")
            .remove();

        // Insert new labels
        arcs.append("text")
            .attr("opacity", "0")
            .attr("transform", function (d) {
                return "translate(" + arc.centroid(d) + ")";
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(function (d, i) {
                return xNames[i];
            })
            .transition()
            .duration(300)
            .attr("opacity", "1");

        arcs.attr("transform", "translate(" + outerRadius + "," + outerRadius + ")");

        /////////////////////

        /*
        // Remove the legend
        this.root.svg.selectAll(".legend").remove();

        // Append the legend
        var legend = this.root.svg.selectAll(".legend")
            .data(xNames.slice())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) {
                return "translate(0," + (20 + i * 20) + ")";
            });

        legend.append("rect")
            .attr("x", width / 2 + outerRadius / 1.1)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", function (d, i) {
                return color(i);
            });

        legend.append("text")
            .attr("x", width / 2 + outerRadius / 1.1 - 6)
            .attr("y", 9)
        //.attr("dy", ".35em")
        .attr("class", "legend")
            .style("text-anchor", "end")
            .text(function (d) {
                return d;
            });
*/

        /////////////////////

        // Update the title of the graphic
        if (title.substr(title.length - 2) == "%s") {
            title = title.substr(0, title.length - 2);
            title += data[id].NAME;
        }

        this.root.svg.selectAll(".pietitle")
            .text(title)
            .attr("class", "pietitle")
            .classed('axisLabel', true)
            .attr("x", (this.root.width) / 2.2)
            .attr("y", this.root.height * 1.2);

        /////////////////////

        // Calculate radial movement using interpolation
        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return function (t) {
                return arc(i(t));
            };

        }
    },

});
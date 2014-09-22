/* global $:true, d3:true, topojson:true, console:true, document:true, Class:true */
///////////////////////////////////////////////////////////////////////

var BarPlot = Class.extend({

    construct: function (App, data, id, district, yName, xName, xNames, cols) {

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
        this.root.barWidth = 50;
        this.root.barOffset = 5;
        this.root.svg = null;
        this.root.svgChicago = null;

        this.root.data = data;
        this.root.slot = arguments[8] ? 'slot' + arguments[8] : 'slot' + App.root.counter;
        this.root.plot = '#' + this.root.slot + '_plot';
        this.root.div = this.root.slot + '_plot';

        // Draw the main canvas for the chart
        this.plot(id);
        // Apply the starting parameters
        this.update(App, data, id, district, yName, xName, xNames, cols);

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
            .attr('class', 'chart')
            .style('display', 'block')
            .style('position', 'absolute')
            .style('margin', 'auto')
            .style({
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
            })
            .attr('width', this.root.width + this.root.margin.left + this.root.margin.right)
            .attr('height', this.root.height + this.root.margin.top + this.root.margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + this.root.margin.left + ', ' + this.root.margin.top + ')');

        this.root.xGuide = this.root.svg.append('g')
            .attr('class', 'x_axis')
            .attr('transform', 'translate(0,' + (this.root.height) + ')');

        this.root.yGuide = this.root.svg.append('g')
            .attr('class', 'y_axis');

        /*
        var tooltip = d3.select('body').append('div')
            .style('position', 'absolute')
            .style('padding', '0 10px')
            .style('background', 'white')
            .style('opacity', 0);
        
            .on('mouseover', function (d) {

            tooltip.transition()
                .style('opacity', 0.9);

            tooltip.html(d)
                .style('left', (d3.event.pageX - 35) + 'px')
                .style('top', (d3.event.pageY - 30) + 'px');


            tempColor = this.style.fill;
            d3.select(this)
                .style('opacity', 0.5)
                .style('fill', 'yellow');
        })

        .on('mouseout', function (d) {
            d3.select(this)
                .style('opacity', 1)
                .style('fill', tempColor);
        });
*/

    },

    ///////////////////////////////////////////////////////////////////////

    update: function (App, data, id, district, yName, xName, xNames, cols) {

        var self = this;

        // To keep track of the identity of the data of this chart
        this.root.id = id;
        this.root.district = district;

        this.root.yName = yName;
        this.root.xName = xName;
        this.root.xNames = xNames;
        this.root.cols = cols;

        // Array to hold only the data we are visualizing
        var bardata = [];
        for (var k = 0; k <= this.root.cols.length - 1; k++) {
            bardata.push(+data[id][this.root.cols[k]]);
        }

        // Filtered dataset to compute the max value:
        var dataCA = [];
        // Flatten the representation
        for (var i = 1; i <= data.length - 1; i++) {
            for (var j = 0; j <= this.root.cols.length - 1; j++) {
                dataCA.push(+data[i][this.root.cols[j]]);
            }
        }

        var x = d3.scale.ordinal()
            .domain(d3.range(0, bardata.length))
            .rangeBands([0, this.root.width], 0.1);

        var y;

        // Different scale for city and areas
        switch (id) {
            //Chicago
        case 0:
            {
                y = d3.scale.linear()
                    .domain([d3.max(bardata), 0])
                    .range([0, this.root.height]);
            }
            break;
        default:
            {
                y = d3.scale.linear()
                    .domain([d3.max(dataCA, function (d) {
                        return +d;
                    }), 0])
                    .range([0, this.root.height]);
            }

        }

        // Clear previous axis labels
        this.root.yGuide.select('#yguide').remove();
        this.root.xGuide.select('#xguide').remove();

        // Y axis label
        this.root.yGuide.append('text')
            .classed('axisLabel', true)
            .attr('id', 'yguide')
            .attr('y', -20)
            .attr('dy', '.20em')
            .style('text-anchor', 'end')
            .text(this.root.yName);

        // X axis label
        this.root.xGuide.append('text')
            .classed('axisLabel', true)
            .attr('id', 'xguide')
            .attr("y", this.root.margin.left / 2)
            .attr("x", (this.root.height / 1.6))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(this.root.xName);

        var formatLabels = function (d) {
            return self.root.xNames[d];
        };

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(d3.range(0, bardata.length))
            .tickFormat(formatLabels);

        var ticks = 12;
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left')
            .ticks(ticks)
            .tickFormat(d3.format(",.3d"));

        //////////////////////

        // Remove old grid lines
        this.root.svg.selectAll("line.horizontalGrid").remove();

        // Add grid lines
        this.root.svg.selectAll("line.horizontalGrid")
            .data(y.ticks(ticks))
            .enter()
            .append("line")
            .attr({
                "class": "horizontalGrid",
                "x1": 0,
                "x2": this.root.width,
                "y1": function (d) {
                    return y(d);
                },
                "y2": function (d) {
                    return y(d);
                },
                "fill": "none",
                "shape-rendering": "crispEdges",
                "stroke": "black",
                "stroke-width": "0.5px"
            });

        // DATA UPDATE
        var bars = this.root.svg.selectAll('.bar')
            .data(bardata);

        // ENTER
        // Create new elements
        bars.enter().append('rect')
            .attr('class', 'bar')
            .attr('width', x.rangeBand())
            .attr('y', y(0))
            .attr('height', 0);

        bars.transition()
            .duration(300)
            .attr('x', function (d, i) {
                return x(i);
            })
            .attr('width', x.rangeBand())
            .attr('height', function (d) {
                return self.root.height - y(d);
            })
            .attr('y', function (d) {
                return y(d);
            });

        // EXIT
        // Remove old elements
        bars.exit()
            .transition()
            .duration(300)
            .attr('y', y(0))
            .attr('height', this.root.height - y(0))
            .remove();

        // Magic trick to bring in front the rects over the gridlines
        var node = d3.selectAll('.bar')[0];
        for (var r = 0; r < node.length; r++) {
            node[r].parentNode.appendChild(node[r]);
        }

        // Format the tick text to go to new line if too long
        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.1, // ems
                    y = text.attr("y"),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        }

        //Draw axis
        this.root.svg.select('.x_axis')
            .transition().duration(300).call(xAxis)
            .selectAll(".tick text")
            .call(wrap, x.rangeBand());

        this.root.svg.select('.y_axis')
            .transition().duration(300).call(yAxis);

        //Adjust style of guides
        this.root.xGuide.selectAll('path')
            .style({
                fill: 'none',
                stroke: '#000',
                'stroke-width': "1.0"
            });
        this.root.xGuide.selectAll('line')
            .style({
                stroke: '#000'
            });

        this.root.yGuide.selectAll('path')
            .style({
                fill: 'none',
                stroke: '#000',
                'stroke-width': "0.5"
            });
        this.root.yGuide.selectAll('line')
            .style({
                stroke: '#000'
            });

    },

});
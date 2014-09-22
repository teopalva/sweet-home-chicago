/* global $:true, d3:true, topojson:true, console:true, document:true, Class:true */
///////////////////////////////////////////////////////////////////////

var Table = Class.extend({

    construct: function (App, data, id, district, x, title, xNames, cols) {

        this.root = {};

        // To keep track of the identity of the data of this chart
        this.root.id = id;
        this.root.district = district;

        this.root.data = data;
        this.root.slot = arguments[8] ? 'slot' + arguments[8] : 'slot' + App.root.counter;
        this.root.plot = '#' + this.root.slot + '_plot';
        this.root.div = this.root.slot + '_plot';

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

        this.root.table = d3.select(area).append("table")
            .attr("style", "width: 60%")
            .style('margin-top', '20%')
            .attr("class", "chart container");

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

        var tabdata = [];
        tabdata.push(data[id]);

        this.root.table.selectAll("thead").remove();
        this.root.table.selectAll("tbody").remove();

        this.root.thead = this.root.table.append("thead");
        this.root.tbody = this.root.table.append("tbody");

        // Append column names
        var keys = d3.keys(tabdata[0]);
        var element = {};
        for (var k in keys) {
            element[keys[k]] = keys[k];
        }
        element["" + keys[0]] = this.root.title;
        tabdata.unshift(element);

        this.root.thead.append("tr")
            .selectAll("th")
            .data(tabdata)
            .enter()
            .append("th")
            .text(function (d) {
                return d.AREA;
            });

        // Add rows
        var rows = this.root.tbody.selectAll("tr")
            .data(cols)
            .enter()
            .append("tr");

        // Add columns
        var cells = rows.selectAll("td")
            .data(function (row) {
                return tabdata.map(function (column) {
                    return {
                        column: column,
                        value: column[row]
                    };
                });
            })
            .enter()
            .append("td")
            .style("font-family", "Roboto Slab")
            .html(function (d) {
                return d.value;
            });

        this.root.table.selectAll("thead th")
            .text(function (column) {
                return (column.AREA !== title) ? "People" : title;
            });

        this.root.table
            .selectAll("td").text(function (d, i) {
                if (i % 2 === 0) {
                    return d.value;
                } else {
                    return d3.format(",.3d")(+d.value);
                }
            });

    },

});
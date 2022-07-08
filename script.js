async function draw() {
    let olympic_dataset = await d3.csv('./athlete_events.csv');
    const teamAccessor = d => d.Team;
    const medalAccessor = d => d.Medal;
    const yearAccessor = d => d.Year;

    olympic_dataset = olympic_dataset.filter(d => {
        const country = teamAccessor(d);
        const medal = medalAccessor(d);
        return country == 'United States' && medal != 'NA';
    });

    let perYear = {};
    placeholder = olympic_dataset.filter(d => {
        const year = yearAccessor(d);
        if (perYear[year]) {
            perYear[year].push(d);
        } else {
            perYear[year] = [];
            perYear[year].push(d);
        }
    });

    const yAccessor = d => d.length;

    // Chart dimensions and setting up the canvas
    const width = 1400;
    let dimensions = {
        width: width,
        height: width * 0.5,
        margin: {
            top: 50,
            right: 150,
            bottom: 50,
            left: 150,
        },
    };
    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const wrapper = d3.select("#wrapper")
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);

    const boundaries = wrapper.append("g")
        .style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`);

    const background = boundaries.append("g");

    boundaries.append("g")
        .attr("class", "bins");
    boundaries.append("line")
        .attr("class", "mean");
    boundaries.append("g")
        .attr("class", "x-axis")
        .style("transform", `translateY(${dimensions.boundedHeight}px)`)
        .append("text")
        .attr("class", "x-axis-label");
    boundaries.append("g")
        .attr("class", "y-axis")
        .style("transform", `translateX(${dimensions.boundedWidth}px)`)
        .append("text")
        .attr("class", "y-axis-label");

    const xScale = d3.scaleLinear()
        .domain(d3.extent(olympic_dataset, yearAccessor))
        .range([0, dimensions.boundedWidth])
        .nice();

    const binsCreator = d3.histogram()
        .domain(xScale.domain())
        .value(yearAccessor)
        .thresholds(20);

    const bins = binsCreator(olympic_dataset);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, yAccessor)])
        .range([dimensions.boundedHeight, 0])
        .nice();

    // actually drawing the bins
    const barPadding = 1;

    let groups = boundaries.select(".bins")
        .selectAll(".bin")
        .data(bins);

    groups.exit().remove();

    const newGroups = groups.enter().append("g")
        .attr("class", "bin");

    newGroups.append("rect");

    // update binGroups to include new points
    groups = newGroups.merge(groups);

    const rects = groups.select("rect")
        .attr("key", (d, i) => i)
        .attr("x", d => xScale(d.x0) + barPadding)
        .attr("y", d => yScale(yAccessor(d)))
        .attr("height", d => dimensions.boundedHeight - yScale(yAccessor(d)))
        .attr("width", d => d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding]));

    // calculate the average amount of medals the US have for the years that it participated in Olympics
    let totalMedals = 0;
    for (const [key, value] of Object.entries(perYear)) {
        totalMedals += value.length;
    }
    const meanMedal = totalMedals / Object.keys(perYear).length;

    const meanMedalLine = boundaries.selectAll(".mean")
        .attr("x1", -0)
        .attr("x2", dimensions.boundedWidth)
        .attr("y1", yScale(meanMedal))
        .attr("y2", yScale(meanMedal));

    const meanMedalLabel = boundaries.append("text")
        .attr("class", "mean-label")
        .attr("x", -25)
        .attr("y", yScale(meanMedal))
        .text("mean");

    // draw other things
    const xAxisGenerator = d3.axisBottom()
        .scale(xScale);

    const yAxisGenerator = d3.axisRight()
        .scale(yScale);

    const xAxis = boundaries.select(".x-axis")
        .call(xAxisGenerator);

    const xAxisLabel = xAxis.select(".x-axis-label")
        .attr("x", dimensions.boundedWidth / 2)
        .attr("y", dimensions.margin.bottom - 10)
        .text("Hours over-estimated");

    const yAxis = boundaries.select(".y-axis")
        .call(yAxisGenerator);

    const yAxisLabel = yAxis.select(".y-axis-label")
        .attr("x", 30)
        .attr("y", dimensions.boundedHeight / 2)
        .text("Number of medals");

    const bg = background.append("rect")
        .attr("class", "background chart-background")
        .attr("y", 0)
        .attr("width", dimensions.boundedWidth)
        .attr("height", dimensions.boundedHeight);

    // 7. Set up interactions

    const rectsListeners = boundaries.selectAll(".listeners")
        .data(bins)
        .enter().append("rect")
        .attr("class", "listeners")
        .attr("x", d => xScale(d.x0))
        .attr("y", -dimensions.margin.top)
        .attr("height", dimensions.boundedHeight + dimensions.margin.top)
        .attr("width", d => d3.max([0, xScale(d.x1) - xScale(d.x0)]))
        .on("mouseenter", onMouseEnter)
        .on("mouseleave", onMouseLeave);

    const tooltip = d3.select("#tooltip");

    function onMouseEnter(d, i) {
        tooltip.select("#yearRange").text([
            "Olympic medals won from year ",
            Math.abs(d.x0),
            "to year",
            Math.abs(d.x1),
            "by the US:",
            yAccessor(d)
        ].join(" "));

        function mode(array) {
            if (array.length == 0)
                return null;
            var modeMap = {};
            var maxEl = array[0], maxCount = 1;
            for (var i = 0; i < array.length; i++) {
                var el = array[i];
                if (modeMap[el.Sport] == null)
                    modeMap[el.Sport] = 1;
                else
                    modeMap[el.Sport]++;
                if (modeMap[el.Sport] > maxCount) {
                    maxEl = el.Sport;
                    maxCount = modeMap[el.Sport];
                }
            }
            result = {};
            result[maxEl] = maxCount;
            return result;
        }
        topSport = mode(d);
        if (topSport != undefined) {
            tooltip.select("#mostMedalSports").text("Most medals won: " + Object.keys(topSport) + ", " + Object.values(topSport) + " medals");
        } else {
            tooltip.select("#mostMedalSports").text("Not participated");
        }
        tooltip.select("#tooltip-bar-value").text((d.length / totalMedals * 100).toFixed(2));
        tooltip.select("#tooltip-bar-item-1").style("width", `${d.length / totalMedals * 100}%`);

        const x = xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2 + dimensions.margin.left;
        const y = yScale(yAccessor(d)) + dimensions.margin.top;

        tooltip.style("transform", `translate(` + `calc( -50% + ${x}px),` + `calc(-100% + ${y}px)` + `)`);

        tooltip.style("opacity", 1);

        const hoveredBar = groups.select(`rect[key='${i}']`);
        hoveredBar.classed("hovered", true);
    }

    function onMouseLeave() {
        tooltip.style("opacity", 0);
        rects.classed("hovered", false);
    }

    // annotation stuff

    const annotationsConclusion1 = [
        {
            note: {
                label: "The number of Olympics medals earned every 5 years increases overtime",
                title: "Overall increase in medals per year",
                wrap: 250,
                align: "middle"
            },
            connector: {
                end: "arrow"
            },
            x: 1200,
            y: 100,
            dx: -1000,
            dy: 200,
        },
    ].map(function (d) { d.color = "black"; return d; });
    const makeAnnotationsConclusion1 = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(annotationsConclusion1);

    const annotationsConclusion2 = [
        {
            note: {
                label: "Only 9 sports in 1896 Summer Olympics",
                title: "Fewer sports",
                wrap: 250,
                align: "middle"
            },
            connector: {
                end: "arrow"
            },
            x: 215,
            y: 620,
            dx: -100,
            dy: -300,
        },
        {
            note: {
                label: "50+ sports in 2020 Summer Olympics",
                title: "Many more sports",
                wrap: 250,
                align: "middle"
            },
            connector: {
                end: "arrow"
            },
            x: 1230,
            y: 380,
            dx: -250,
            dy: -200,
        },
    ].map(function (d) { d.color = "black"; return d; });
    const makeAnnotationsConclusion2 = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(annotationsConclusion2);

    const annotationsConclusion3 = [
        {
            note: {
                label: "Even with a significant increase in medals over the year, the Olympics are increasing meh by the general population",
                title: "Significant decrease in popularity within US population.",
                wrap: 400,
                align: "middle"
            },
            connector: {
                end: "arrow"
            },
            x: 170,
            y: 620,
            dx: 500,
            dy: -400,
        },
        {
            note: {
                label: "",
                title: "",
                wrap: 250,
                align: "middle"
            },
            connector: {
                end: "arrow"
            },
            x: 1230,
            y: 380,
            dx: -350,
            dy: -200,
        },
    ].map(function (d) { d.color = "black"; return d; });
    const makeAnnotationsConclusion3 = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(annotationsConclusion3);

    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group")
        .attr("id", "firstConclusion")
        .attr("opacity", 0)
        .call(makeAnnotationsConclusion1);

    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group")
        .attr("id", "secondConclusion")
        .attr("opacity", 0)
        .call(makeAnnotationsConclusion2);

    d3.select("svg")
        .append("g")
        .attr("class", "annotation-group")
        .attr("id", "thirdConclusion")
        .attr("opacity", 0)
        .call(makeAnnotationsConclusion3);

    d3.select("#conclusionButton1")
        .on("click", function () {
            if (d3.select("#firstConclusion").style("opacity") != 0) {
                d3.select("#firstConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0);
            } else {
                d3.select("#firstConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 1);;
            }
            d3.select("#secondConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
            d3.select("#thirdConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
        });

    d3.select("#conclusionButton2")
        .on("click", function () {
            if (d3.select("#secondConclusion").style("opacity") != 0) {
                d3.select("#secondConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0);
            } else {
                d3.select("#secondConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 1);
            }
            d3.select("#firstConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
            d3.select("#thirdConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
        });

    d3.select("#conclusionButton3")
        .on("click", function () {
            if (d3.select("#thirdConclusion").style("opacity") != 0) {
                d3.select("#thirdConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0);
            } else {
                d3.select("#thirdConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 1);
            }
            d3.select("#firstConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
            d3.select("#secondConclusion").transition().duration(400).ease(d3.easeLinear).style("opacity", 0)
        });
}
draw();
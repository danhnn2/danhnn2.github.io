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
            perYear[year].push(d)
        } else {
            perYear[year] = []
            perYear[year].push(d);
        }
    })

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
        .attr("class", "y-axis-label")

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
    let total = 0;
    for (const [key, value] of Object.entries(perYear)) {
        total += value.length
    }
    const meanMedal = total / Object.keys(perYear).length;

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
        .call(yAxisGenerator)
    
    const yAxisLabel = yAxis.select(".y-axis-label")
        .attr("x", 30)
        .attr("y", dimensions.boundedHeight / 2)
        .text("Number of medals");

    const backgroundLeft = background.append("rect")
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
        .attr("width", d => d3.max([
            0,
            xScale(d.x1) - xScale(d.x0)
        ]))
        .on("mouseenter", onMouseEnter)
        .on("mouseleave", onMouseLeave);

    const tooltip = d3.select("#tooltip");
    function onMouseEnter(datum, index) {
        tooltip.select("#range")
            .text([
                datum.x0 < 0 ? `Under-estimated by` : `Over-estimated by`,
                Math.abs(datum.x0),
                "to",
                Math.abs(datum.x1),
                "hours",
            ].join(" "));
        tooltip.select("#examples")
            .html(
                datum
                    .slice(0, 3)
                    .map(summaryAccessor)
                    .join("<br />")
            );

        tooltip.select("#count")
            .text(Math.max(0, yAccessor(datum) - 2));

        const percentDeveloperHoursValues = datum.map(d => (
            (developerHoursAccessor(d) / actualHoursAccessor(d)) || 0
        ));
        const percentDeveloperHours = d3.mean(percentDeveloperHoursValues);
        const formatHours = d => d3.format(",.2f")(Math.abs(d));
        tooltip.select("#tooltip-bar-value")
            .text(formatHours(percentDeveloperHours));
        tooltip.select("#tooltip-bar-item-1")
            .style("width", `${percentDeveloperHours * 100}%`);

        const x = xScale(datum.x0)
            + (xScale(datum.x1) - xScale(datum.x0)) / 2
            + dimensions.margin.left;
        const y = yScale(yAccessor(datum))
            + dimensions.margin.top;

        tooltip.style("transform", `translate(`
            + `calc( -50% + ${x}px),`
            + `calc(-100% + ${y}px)`
            + `)`);

        tooltip.style("opacity", 1);

        const hoveredBar = binGroups.select(`rect[key='${index}']`);
        hoveredBar.classed("hovered", true);
    }

    function onMouseLeave() {
        tooltip.style("opacity", 0);
        rects.classed("hovered", false);
    }
}
draw();
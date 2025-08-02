

async function init(){

    var parseDate = d3.timeParse("%m/%d/%Y")
    var formatDate = d3.timeFormat("%b %Y")

    const data = await d3.csv("cta.csv", d => ({
        stationame : d.stationame,
        month_beginning : parseDate(d.month_beginning), 
        avg_weekday_rides : +d.avg_weekday_rides,
        avg_saturday_rides : +d.avg_saturday_rides,
        avg_sunday_holiday_rides : +d.avg_sunday_holiday_rides,
        monthtotal : +d.monthtotal,
        line : d.line
    })); 

    // console.log(data);

    // set up ability to change graphs
    let curr = 0;
    let scenes = ['#start', '#overall-ridership', '#line-ridership', '#postcov-ridership', '#explore']

    function display(i) {
    scenes.forEach(selector => {
        d3.select(selector).style("display", "none");
    });
    d3.select(scenes[i]).style("display", "block");
}
    display(curr)

    document.getElementById('next').addEventListener('click', () => {
        if (curr < scenes.length - 1) {
            curr++;
            display(curr)
        }
    });

    document.getElementById('previous').addEventListener('click', () => {
        if (curr > 0) {
            curr--;
            display(curr);
        }
    });

    // set up first line graph (overall ridership)
    // start by filtering and grouping data to get overall monthly aggregate of riders
    
    var filteredData = data.filter(function(d){ return d.month_beginning.getFullYear() >= 2010 })
    
    var overallGrouped = d3.nest()
        .key(d => d.month_beginning)
        .rollup(total => d3.sum(total, d => d.monthtotal))
        .entries(filteredData)
        .map(d => ({
            month_beginning : new Date(d.key),
            monthtotal : d.value
        }));
    
    overallGrouped.sort((a, b) => a.month_beginning - b.month_beginning);

    console.log(overallGrouped);


    var svg1 = d3.select("#overall-ridership").append("svg").attr("width", 800).attr("height", 600);
    var width = 700;
    var height = 500;
    var margin = {top: 50, right: 50, bottom: 550, left: 100}

    // set up graph elements - x is year, y is riders, line is monthly ridership totals
    var x = d3.scaleTime()
        .domain([new Date(2010, 0, 1), new Date()])
        .range([0, width]);  
    var y = d3.scaleLinear()
            .domain([0, d3.max(overallGrouped, d => +d.monthtotal)])
            .range([height, 0]);
    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg1.append("g")
        .attr("transform", `translate(${margin.left},${margin.bottom})`)
        .call(d3.axisBottom(x)
                .tickFormat(d3.timeFormat("%Y"))
                .ticks(d3.timeYear.every(1))
                .tickSize(0));
        
    svg1.append("g").attr("transform", `translate(${margin.left},${margin.right})`).call(d3.axisLeft(y));

    svg1.append("g")
        .append("path")
        .datum(overallGrouped)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.right})`)
        .attr("d", line);

    // annotations 

    // max peak
    var maxTotal = d3.max(overallGrouped, d => d.monthtotal);
    var peak = overallGrouped.find(d => d.monthtotal == maxTotal);

    svg1.append("g")
        .append("circle")
        .attr("cx", margin.left + x(peak.month_beginning))
        .attr('cy', margin.top + y(peak.monthtotal))
        .attr('r', 3)
        .attr('fill', 'black');

    svg1.append("g")
        .append("text")
        .attr("x", margin.left + x(peak.month_beginning))
        .attr('y', margin.top + y(peak.monthtotal) - 10)
        .text("CTA ridership peaked in " + peak.monthtotal.toLocaleString() + " on " + formatDate(peak.month_beginning))
        .attr('font-size', '14px');

    // min peak
    var minTotal = d3.min(overallGrouped, d => d.monthtotal);
    var minPeak = overallGrouped.find(d => d.monthtotal == minTotal);

    svg1.append("g")
        .append("circle")
        .attr("cx", margin.left + x(minPeak.month_beginning))
        .attr('cy', margin.top + y(minPeak.monthtotal))
        .attr('r', 3)
        .attr('fill', 'black');

    svg1.append("g")
        .append("text")
        .attr("x", margin.left + x(minPeak.month_beginning) - 100)
        .attr('y', margin.top + y(minPeak.monthtotal) + 20)
        .text("CTA ridership hit its lowest at " + minPeak.monthtotal.toLocaleString() + " in " + formatDate(minPeak.month_beginning))
        .attr('font-size', '14px');

    // post covid peak
    var postCovidGrouped = overallGrouped.filter(function(d){ return d.month_beginning.getFullYear() >= 2020 && d.month_beginning.getMonth() >= 4});

    var covMax = d3.max(postCovidGrouped, d => d.monthtotal);
    var covPeak = postCovidGrouped.find(d => d.monthtotal == covMax);

    svg1.append("g")
        .append("circle")
        .attr("cx", margin.left + x(covPeak.month_beginning))
        .attr('cy', margin.top + y(covPeak.monthtotal))
        .attr('r', 3)
        .attr('fill', 'black');

    svg1.append("g")
        .append("text")
        .attr("x", margin.left + x(covPeak.month_beginning) - 300)
        .attr('y', margin.top + y(covPeak.monthtotal) - 10)
        .text("Post-Covid CTA Ridership has peaked at" + covPeak.monthtotal.toLocaleString() + " in " + formatDate(covPeak.month_beginning))
        .attr('font-size', '14px');

    
    // LINE RIDERSHIP GRAPH

    // set up grouped by line data 
    
    var nested = d3.nest()
        .key(d => d.line)
        .key(d => d.month_beginning)
        .rollup(total => d3.sum(total, d => d.monthtotal))
        .entries(filteredData);
    
    var lineGrouped = [];
    nested.forEach(lineGroup => {
        lineGroup.values.forEach(monthGroup => {
            lineGrouped.push({
                line: lineGroup.key,
                month_beginning: new Date(monthGroup.key),
                monthtotal: monthGroup.value
            });
        });
    });


    // Sort by line and date if needed
    lineGrouped.sort((a, b) => {
        if (a.line !== b.line) return d3.ascending(a.line, b.line);
        return a.month_beginning - b.month_beginning;
    });

    console.log(lineGrouped);

    var svg2 = d3.select("#line-ridership").append("svg").attr("width", 800).attr("height", 600);
    var width = 700;
    var height = 500;
    var margin = {top: 50, right: 50, bottom: 550, left: 100}

    var x = d3.scaleTime()
        .domain([new Date(2010, 0, 1), new Date()])
        .range([0, width]);  
    var y = d3.scaleLinear()
            .domain([0, d3.max(lineGrouped, d => +d.monthtotal)])
            .range([height, 0]);

    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg2.append("g")
        .attr("transform", `translate(${margin.right}, ${margin.bottom})`)
        .call(d3.axisBottom(x)
                .tickFormat(d3.timeFormat("%Y"))
                .tickSize(0));
        
    svg2.append("g").attr("transform", `translate(${margin.right}, ${margin.top})`).call(d3.axisLeft(y));

    // color by line
    var lines = d3.map(lineGrouped, function(d){ return d.line });

    var color = d3.scaleOrdinal()
        .domain(lines)
        .range(["#0000FF","#A52A2A", "#008000", "#FFA500", "#FF6EC7", "#800080", "#FF0000", "#FFFF00"]);

    var dataByLine = d3.nest()
    .key(d => d.line)
    .entries(lineGrouped);

    dataByLine.forEach(function(lineData) {
    svg2.append("path")
        .datum(lineData.values)
        .attr("fill", "none")
        .attr("stroke", color(lineData.key))
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.right}, ${margin.top})`)
        .attr("d", line);

    svg2.append("g")
        .append("text")
        .attr("x", width - 300)
        .attr('y', margin.top + 40)
        .text("Overall, the red line is the most popular CTA line.")
        .attr('font-size', '14px');
});

    var svg3 = d3.select("#postcov-ridership").append("svg").attr("width", 800).attr("height", 600);
    var width = 700;
    var height = 500;
    var margin = {top: 50, right: 50, bottom: 550, left: 100}

    var x = d3.scaleTime()
        .domain([new Date(2020, 4, 0), new Date(2025, 6, 0)])
        .range([0, width]);  
    var y = d3.scaleLinear()
            .domain([0, d3.max(lineGrouped, d => +d.monthtotal)])
            .range([height, 0]);

    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg3.append("g")
        .attr("transform", `translate(${margin.right}, ${margin.bottom})`)
        .call(d3.axisBottom(x)
                .tickFormat(d3.timeFormat("%Y"))
                .tickSize(0));
        
    svg3.append("g").attr("transform", `translate(${margin.right}, ${margin.top})`).call(d3.axisLeft(y));

    // color by line

    var postCovidLines = lineGrouped.filter(function(d){ return d.month_beginning.getFullYear() >= 2020 && d.month_beginning.getMonth() >= 4});
    
    var dataByLine = d3.nest()
    .key(d => d.line)
    .entries(postCovidLines);

    dataByLine.forEach(function(lineData) {
    svg3.append("path")
        .datum(lineData.values)
        .attr("fill", "none")
        .attr("stroke", color(lineData.key))
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.right}, ${margin.top})`)
        .attr("d", line);

    svg3.append("g")
        .append("text")
        .attr("x", width - 300)
        .attr('y', margin.top + 40)
        .text("Overall, the red line is the most popular CTA line.")
        .attr('font-size', '14px');
});

};




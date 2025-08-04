

async function init(){

    var parseDate = d3.timeParse("%m/%d/%Y")
    var cutParseDate = d3.timeParse("%Y-%m-%d")
    var formatDate = d3.timeFormat("%b %Y")

    var data = await d3.csv("cta.csv", d => ({
        month_beginning : parseDate(d.month_beginning), 
        monthtotal : +d.monthtotal,
        line : d.line
    })); 

    var cutData = await d3.csv("cut.csv", d => ({
        month_beginning : cutParseDate(d.month_beginning), 
        monthtotal : +d.monthtotal,
        line : d.line
    })); 

    console.log(data);

    // set up ability to change graphs
    let curr = 0;
    let scenes = ['#start', '#overall-ridership', '#line-ridership', '#cuts', '#explore']

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


    var svg1 = d3.select("#overall-ridership").append("svg").attr("width", 900).attr("height", 600);
    var margin = {top: 50, right: 550, bottom: 550, left: 125}
    var width = 900 - margin.left - 50;
    var height = 600 - margin.top - 50;


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
        
    svg1.append("g").attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y));

    // add axis labels 
    svg1.append("text")
    .attr("text-anchor", "end")
    .attr("x", margin.left + width/2)
    .attr("y", margin.bottom + 30)
    .text("Year")
    .attr('font-size', '14px');

    svg1.append("text")
    .attr("text-anchor", "end")
    .attr("x", -(margin.top + height / 2 - 50))
    .attr("y", margin.left - 80)
    .attr("transform", `rotate(-90)`)
    .text("Total Riders")
    .attr('font-size', '14px');

    // add line
    svg1.append("g")
        .append("path")
        .datum(overallGrouped)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);

    // annotations 

    // max peak
    var maxTotal = d3.max(overallGrouped, d => d.monthtotal);
    var peak = overallGrouped.find(d => d.monthtotal == maxTotal);
    
    // min peak
    var minTotal = d3.min(overallGrouped, d => d.monthtotal);
    var minPeak = overallGrouped.find(d => d.monthtotal == minTotal);

    // post cov peak
    var postCovidGrouped = overallGrouped.filter(function(d){ return d.month_beginning.getFullYear() >= 2020 && d.month_beginning.getMonth() >= 4});

    var covMax = d3.max(postCovidGrouped, d => d.monthtotal);
    var covPeak = postCovidGrouped.find(d => d.monthtotal == covMax);

    const annotations = [
    {
        note: {
        label: "Pre COVID peak of " + peak.monthtotal.toLocaleString() + " riders"
        },
        x: margin.left + x(peak.month_beginning),
        y: margin.top + y(peak.monthtotal),
        dy: -30,
        dx: 50,
        color: "black"
    }, 

    {
        note: {
        label: "CTA ridership reached its lowest at " + minPeak.monthtotal.toLocaleString() + " riders",
        align: "center",
        wrap: 100,
        padding: 10
        },
        x: margin.left + x(minPeak.month_beginning),
        y: margin.top + y(minPeak.monthtotal),
        dy: 10,
        dx: -400,
        color: "black"
    },

    {
        note: {
        label: "Post COVID peak of " + covPeak.monthtotal.toLocaleString() + " riders",
        align: "center",
        wrap: 10,
        padding: 10
        },
        connector: {
            end: "dot"
        },
        x: margin.left + x(covPeak.month_beginning),
        y: margin.top + y(covPeak.monthtotal),
        dy: -30,
        dx: -200,
        color: "black"
    }
    ];

    const makeAnnotations = d3.annotation()
        .annotations(annotations)
    
    svg1.append("g")
        .call(makeAnnotations);

    
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

    lineGrouped.sort((a, b) => {
        if (a.line !== b.line) return d3.ascending(a.line, b.line);
        return a.month_beginning - b.month_beginning;
    });

    console.log(lineGrouped);

    var svg2 = d3.select("#line-ridership").append("svg").attr("width", 900).attr("height", 600);
    var margin = {top: 50, right: 550, bottom: 550, left: 125}
    var width = 900 - margin.left - 50;
    var height = 600 - margin.top - 50;

    var x = d3.scaleTime()
        .domain([new Date(2010, 0, 1), new Date()])
        .range([0, width]);  
    var y = d3.scaleLinear()
            .domain([0, d3.max(overallGrouped, d => +d.monthtotal)])
            .range([height, 0]);

    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg2.append("g")
        .attr("transform", `translate(${margin.left},${margin.bottom})`)
        .call(d3.axisBottom(x)
                .tickFormat(d3.timeFormat("%Y"))
                .ticks(d3.timeYear.every(1))
                .tickSize(0));
        
    svg2.append("g").attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y));

    // add axis labels 
    svg2.append("text")
    .attr("text-anchor", "end")
    .attr("x", margin.left + width/2)
    .attr("y", margin.bottom + 30)
    .text("Year")
    .attr('font-size', '14px');

    svg2.append("text")
    .attr("text-anchor", "end")
    .attr("x", -(margin.top + height / 2 - 50))
    .attr("y", margin.left - 80)
    .attr("transform", `rotate(-90)`)
    .text("Total Riders")
    .attr('font-size', '14px');

    svg2.append("g")
        .append("path")
        .datum(overallGrouped)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);

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
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);
    });

    svg2.append("g")
        .append("text")
        .attr("x", 210)
        .attr('y', margin.top + 250)
        .text("The red line is the most popular CTA line serving approximately")
        .attr('font-size', '14px');

    svg2.append("g")
        .append("text")
        .attr("x", 250)
        .attr('y', margin.top + 270)
        .text("2.5 million monthly riders on average post COVID")
        .attr('font-size', '14px');

    var svg3 = d3.select("#cuts").append("svg").attr("width", 1200).attr("height", 600);
    var margin = {top: 50, right: 550, bottom: 550, left: 125}
    var width = 900 - margin.left - 50;
    var height = 600 - margin.top - 50;

    console.log(cutData)

    var cutGrouped = d3.nest()
        .key(d => d.month_beginning)
        .rollup(total => d3.sum(total, d => d.monthtotal))
        .entries(cutData)
        .map(d => ({
            month_beginning : new Date(d.key),
            monthtotal : d.value
        }));
    
    cutGrouped.sort((a, b) => a.month_beginning - b.month_beginning);

    // set up grouped cut data
    var cutnested = d3.nest()
        .key(d => d.line)
        .key(d => d.month_beginning)
        .rollup(total => d3.sum(total, d => d.monthtotal))
        .entries(cutData);
    
    var cutlineGrouped = [];
    cutnested.forEach(lineGroup => {
        lineGroup.values.forEach(monthGroup => {
            cutlineGrouped.push({
                line: lineGroup.key,
                month_beginning: new Date(monthGroup.key),
                monthtotal: monthGroup.value
            });
        });
    });

    cutlineGrouped.sort((a, b) => {
        if (a.line !== b.line) return d3.ascending(a.line, b.line);
        return a.month_beginning - b.month_beginning;
    });

    var x = d3.scaleTime()
        .domain([new Date(2010, 0, 1), new Date()])
        .range([0, width]);  
    var y = d3.scaleLinear()
            .domain([0, d3.max(overallGrouped, d => +d.monthtotal)])
            .range([height, 0]);

    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg3.append("g")
        .attr("transform", `translate(${margin.left},${margin.bottom})`)
        .call(d3.axisBottom(x)
                .tickFormat(d3.timeFormat("%Y"))
                .ticks(d3.timeYear.every(1))
                .tickSize(0));
        
    svg3.append("g").attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y));

    // add axis labels 
    svg3.append("text")
    .attr("text-anchor", "end")
    .attr("x", margin.left + width/2)
    .attr("y", margin.bottom + 30)
    .text("Year")
    .attr('font-size', '14px');

    svg3.append("text")
    .attr("text-anchor", "end")
    .attr("x", -(margin.top + height / 2 - 50))
    .attr("y", margin.left - 80)
    .attr("transform", `rotate(-90)`)
    .text("Total Riders")
    .attr('font-size', '14px');

    // color by line
    var lightColor = d3.scaleOrdinal()
        .domain(lines)
        .range(["#ADD8E6","#C4A484", "#D1FFBD", "#D3D3D3", "#D3D3D3", "#D3D3D3", "#FFCCCB", "#D3D3D3"]);

    // original vals
    dataByLine.forEach(function(lineData) {
    svg3.append("path")
        .datum(lineData.values)
        .attr("fill", "none")
        .attr("stroke", lightColor(lineData.key))
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);
    });

    console.log(cutlineGrouped);

    var cutdataByLine = d3.nest()
    .key(d => d.line)
    .entries(cutlineGrouped);

    //cut rider vals
    cutdataByLine.forEach(function(lineData) {
    svg3.append("path")
        .datum(lineData.values)
        .attr("fill", "none")
        .attr("stroke", color(lineData.key))
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);
    });

    svg3.append("g")
        .append("path")
        .datum(overallGrouped)
        .attr("fill", "none")
        .attr("stroke", "#D3D3D3")
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);

    svg3.append("g")
        .append("path")
        .datum(cutGrouped)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("d", line);

    svg3.append("g")
        .append("text")
        .attr("x", width + 120)
        .attr('y', margin.bottom - 40)
        .text("Cutting the pink, orange, brown, & yellow lines")
        .attr('font-size', '14px');
    
    svg3.append("g")
        .append("text")
        .attr("x", width + 130)
        .attr('y', margin.bottom - 20)
        .text("results in an average 737,800 monthly ridership cut")
        .attr('font-size', '14px');

    // post covid peak diff
    svg3.append("g")
        .append("circle")
        .attr("cx", margin.left + x(covPeak.month_beginning))
        .attr('cy', margin.top + y(covPeak.monthtotal))
        .attr('r', 3)
        .attr('fill', '#D3D3D3');

    // post covid peak
    var postCovidCutGrouped = cutGrouped.filter(function(d){ return d.month_beginning.getFullYear() >= 2020 && d.month_beginning.getMonth() >= 4});

    var cutMax = d3.max(postCovidCutGrouped, d => d.monthtotal);
    var cutPeak = postCovidCutGrouped.find(d => d.monthtotal == cutMax);
    var diff = covMax - cutMax;

    svg3.append("g")
        .append("circle")
        .attr("cx", margin.left + x(cutPeak.month_beginning))
        .attr('cy', margin.top + y(cutPeak.monthtotal))
        .attr('r', 3)
        .attr('fill', 'black');

    const annotations2 = [
    {
        note: {
        label: "These cuts result in a " + diff.toLocaleString() + " monthly riders difference at the post COVID peak"
        },
        x: margin.left + x(cutPeak.month_beginning),
        y: margin.top + y(cutPeak.monthtotal),
        dy: -60,
        dx: -200,
        color: "black"
    }, 

    ];

    const makeAnnotations2 = d3.annotation()
        .annotations(annotations2)
    
    svg3.append("g")
        .call(makeAnnotations2);


    var svg4 = d3.select("#explore").append("svg").attr("width", 900).attr("height", 600);
    var margin = {top: 50, right: 550, bottom: 550, left: 125}
    var width = 900 - margin.left - 50;
    var height = 600 - margin.top - 50;

    // drop downs
    var linesList = Array.from(new Set(data.map(d => d.line)));
    var lineSelect = d3.select("#line-select");
    lineSelect.selectAll("option")
        .data(linesList)
        .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

    var yearList = Array.from(new Set(filteredData.map(d => d.month_beginning.getFullYear())));
    var yearSelect = d3.select("#year-select");
    yearSelect.selectAll("option")
        .data(yearList)
        .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

    var currLine = null;
    var currYear = null;

    d3.select("#line-select").on("change", function() {
        currLine = d3.select(this).property("value");
        updateGraph();
    });

    d3.select("#year-select").on("change", function() {
        currYear = d3.select(this).property("value");
        updateGraph();
    });

    function updateGraph() {
        svg4.selectAll('svg > *').remove()

        if (!currYear && currLine) {
            var filtered = lineGrouped.filter(d => d.line === currLine);
            var x = d3.scaleTime()
                    .domain([new Date(2010, 0, 1), new Date()])
                    .range([0, width]); 
        } else if (!currLine && currYear) {
            var filtered = overallGrouped.filter((d => d.month_beginning.getFullYear() == currYear));
            var x = d3.scaleTime()
                .domain([new Date(currYear, 0, 1), new Date(currYear, 12, 1)])
                .range([0, width]); 
            svg4.append("g")
            .attr("transform", `translate(${margin.left},${margin.bottom})`)
            .call(d3.axisBottom(x)
                    .tickFormat(d3.timeFormat("%m"))
                    .ticks(d3.timeMonth.every(1))
                    .tickSize(0));
        } else if (currLine && currYear) {
            var filteredone = lineGrouped.filter(d => d.line === currLine);
            var filtered = filteredone.filter(d => d.month_beginning.getFullYear() == currYear)
            filtered.sort((a, b) => a.month_beginning - b.month_beginning);
            var x = d3.scaleTime()
                .domain([new Date(currYear, 0, 1), new Date(currYear, 12, 1)])
                .range([0, width]); 
            svg4.append("g")
            .attr("transform", `translate(${margin.left},${margin.bottom})`)
            .call(d3.axisBottom(x)
                    .tickFormat(d3.timeFormat("%m"))
                    .ticks(d3.timeMonth.every(1))
                    .tickSize(0));
        } else {
            return;
        }
        
        console.log(filtered)

        var y = d3.scaleLinear()
                .domain([0, d3.max(filtered, d => +d.monthtotal)])
                .range([height, 0]);

        var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

        svg4.append("g")
            .attr("transform", `translate(${margin.left},${margin.bottom})`)
            .call(d3.axisBottom(x)
                    .tickFormat(d3.timeFormat("%Y"))
                    .ticks(d3.timeYear.every(1))
                    .tickSize(0));
            
        svg4.append("g").attr("transform", `translate(${margin.left},${margin.top})`).call(d3.axisLeft(y));
        
        svg4.append("text")
            .attr("text-anchor", "end")
            .attr("x", margin.left + width/2)
            .attr("y", margin.bottom + 30)
            .text("Year")
            .attr('font-size', '14px');

        svg4.append("text")
            .attr("text-anchor", "end")
            .attr("x", -(margin.top + height / 2 - 50))
            .attr("y", margin.left - 80)
            .attr("transform", `rotate(-90)`)
            .text("Total Riders")
            .attr('font-size', '14px');
        
        svg4.append("g")
            .append("path")
            .datum(filtered)
            .attr("fill", "none")
            .attr("stroke", function(d){if (currLine) {return color(currLine)} else {return 'black'}})
            .attr("stroke-width", 1.5)
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .attr("d", line);

        // max peak annotation
        var currMax = d3.max(filtered, d => d.monthtotal);
        var currPeak = filtered.find(d => d.monthtotal == currMax);

        const filterAnnotations = [
        {
            note: {
            label: "Ridership peaked at " + currMax.toLocaleString() + " monthly riders in " + formatDate(currPeak.month_beginning)
            },
            x: margin.left + x(currPeak.month_beginning),
            y: margin.top + y(currPeak.monthtotal),
            dy: 200,
            dx: 10,
            color: "black"
        }]

        const makefilterAnnotations = d3.annotation()
        .annotations(filterAnnotations)
    
        svg4.append("g")
            .call(makefilterAnnotations);

        }


};

    




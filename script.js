

async function init(){

    var parseDate = d3.time.format("%m/%d/%Y").parse

    const data = await d3.csv("cta.csv", d => ({
        stationame : d.stationame,
        month_beginning : parseDate(d.monthstart), 
        avg_weekday_rides : +d.avg_weekday_rides,
        avg_saturday_rides : +d.avg_saturday_rides,
        avg_sunday_holiday_rides : +d.avg_sunday-holiday_rides,
        monthtotal : +d.monthtotal,
        line : d.line
    })); 

    console.log(data);

    // set up first line graph (overall ridership)
    var svg = d3.select("body").append("svg").attr("width", 600).attr("height", 600);

    var width = 500;
    var height = 500;

    var x = d3.scaleTime()
        .domain([new Date(2001, 0, 1), new Date()])
        .range([0, width]);  
    var y = d3.scaleLinear().domain([0, d3.max(data, d => +d.monthtotal)]).range([height, 0]);

    var line = d3.line()
            .x(d => x(d.month_beginning))
            .y(d => y(d.monthtotal));

    svg.append("g")
        .attr("transform", "translate(50,550)")
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")).tickSize(0));
        
    svg.append("g").attr("transform", "translate(50,50)").call(d3.axisLeft(y));

    svg.append("g")
        .append("path")
        .data(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
}




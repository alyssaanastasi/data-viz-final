<script src="//d3js.org/d3.v3.min.js"></script>

const data = await d3.csv("cta.csv");

var x = d3.scaleBand().base(10).domain([2001, 2025]).range([0, 200]);
var y = d3.scaleLog().base(10).domain([0, 20000]).range([200, 0]);
export default class BubbleChart {
  #scaleX;
  #scaleY;
  #scaleR;

  constructor(
    container,
    width,
    height,
    fill,
    margin = { top: 20, right: 20, bottom: 30, left: 40 }
  ) {
    this.container = d3.select(container);
    this.width = width;
    this.height = height;
    this.margin = margin;
    this.fill = fill;

    this.innerWidth = this.width - margin.left - margin.right;
    this.innerHeight = this.height - margin.top - margin.bottom;

    this.svg = this.container
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .classed("bubbleChart", true);

    this.chartArea = this.svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  }

  #updateScales() {
    let chartWidth = this.innerWidth;
    let chartHeight = this.innerHeight;

    let rangeX = [0, chartWidth];
    let rangeY = [chartHeight, 0];
    let rangeR = [2, 25];

    let domainX = [
      Math.min(
        0,
        d3.min(this.data, (d) => d.g)
      ),
      d3.max(this.data, (d) => d.g),
    ];

    let domainY = [
      Math.min(
        0,
        d3.min(this.data, (d) => d.v)
      ),
      d3.max(this.data, (d) => d.v),
    ];

    let domainR = [0, d3.max(this.data, (d) => d.a)];

    this.#scaleX = d3.scaleLinear().domain(domainX).range(rangeX).nice();

    this.#scaleY = d3.scaleLinear().domain(domainY).range(rangeY).nice();

    this.#scaleR = d3.scaleSqrt().domain(domainR).range(rangeR);
  }

  render(data) {
    this.data = data;

    this.#updateScales();

    this.chartArea
      .selectAll("circle")
      .data(this.data, (d) => d.k)
      .join("circle")
      .attr("cx", (d) => this.#scaleX(d.g))
      .attr("cy", (d) => this.#scaleY(d.v))
      .attr("r", (d) => this.#scaleR(d.a))
      .attr("fill", this.fill)
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    this.chartArea
      .append("g")
      .attr("transform", `translate(0, ${this.innerHeight})`)
      .call(d3.axisBottom(this.#scaleX));

    this.chartArea.append("g").call(d3.axisLeft(this.#scaleY));
  }
}

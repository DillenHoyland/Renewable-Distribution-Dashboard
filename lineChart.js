export default class LineChart {
  #scaleX;
  #scaleY;

  constructor(
    container,
    stroke = "coral",
    margin = { top: 20, right: 20, bottom: 40, left: 40 },
  ) {
    this.container = d3.select(container);
    this.margin = margin;
    this.stroke = stroke;
    this.labelToGroup = {};

    this.svg = this.container
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%");

    this.titleArea = this.svg
      .append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "15px")
      .style("font-weight", "bold");

    this.chartArea = this.svg.append("g");

    this.onHighlight = null;
    this.onClearHighlight = null;

    this.tooltip = d3
      .select(this.container.node())
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "11px")
      .style("z-index", 9999)
      .style("opacity", 0);
  }

  setColourScale(scale) {
    this.scaleC = scale;
  }
  setLabelToGroup(map) {
    this.labelToGroup = map;
  }

  #getDimensions() {
    const rect = this.container.node().getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    return { width, height, innerWidth, innerHeight };
  }

  highlight(groupName) {
    if (!this.labels) return;
    this.chartArea
      .selectAll(".line")
      .attr("stroke-width", (d, i) => {
        const fullName = this.labelToGroup[this.labels[i]] || this.labels[i];
        return fullName === groupName ? 6 : 3;
      })
      .attr("filter", (d, i) => {
        const fullName = this.labelToGroup[this.labels[i]] || this.labels[i];
        return fullName === groupName ? "brightness(1.4)" : null;
      });
  }

  clearHighlight() {
    this.chartArea
      .selectAll(".line")
      .attr("stroke-width", 3)
      .attr("filter", null);
  }

  render(
    data2D,
    labels = [],
    seriesKeys = [],
    seriesColours = [],
    title = "Renewable Energy Trends - (Chart B)",
    renewables = [],
    year = null,
  ) {
    this.data = data2D;
    this.labels = labels;
    this.seriesKeys = seriesKeys;
    this.seriesColours = seriesColours;
    this.lastTitle = title;

    const row = renewables.find((d) => d.Year === year) || {};

    const { width, height, innerWidth, innerHeight } = this.#getDimensions();

    this.titleArea
      .attr("x", width / 2)
      .attr("y", this.margin.top / 2)
      .style("text-decoration", "underline")
      .text(title);

    this.chartArea.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`,
    );

    const allPoints = data2D.flat();

    this.#scaleX = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.y))
      .range([0, innerWidth]);

    this.#scaleY = d3
      .scaleLinear()
      .domain([0, d3.max(allPoints, (d) => d.c) * 1.1])
      .range([innerHeight, 0])
      .nice();

    const lineGen = d3
      .line()
      .x((d) => this.#scaleX(d.y))
      .y((d) => this.#scaleY(d.c))
      .curve(d3.curveMonotoneX);

    this.chartArea.selectAll("*").remove();

    const lines = this.chartArea
      .selectAll(".line")
      .data(data2D)
      .join("path")
      .attr("class", "line")
      .attr("stroke", (d, i) => seriesColours[i] || this.stroke)
      .attr("stroke-width", 3)
      .attr("fill", "none")
      .attr("d", lineGen)
      .style("cursor", "pointer")
      .on("mouseenter", (event) => {
        const i = lines.nodes().indexOf(event.currentTarget);
        const fullName = this.labelToGroup[this.labels[i]] || this.labels[i];
        const keys = this.seriesKeys[i] || [];
        const total = keys.reduce((sum, k) => sum + (row[k] || 0), 0);
        const keyDetails = keys
          .map((k) => `${k} (${(row[k] || 0).toFixed(3)})`)
          .join(", ");
        lines
          .attr("stroke-width", (l, j) => (j === i ? 6 : 3))
          .attr("filter", (l, j) => (j === i ? "brightness(1.4)" : null));
        this.tooltip
          .html(
            `<strong>${fullName}</strong>: ${total.toFixed(3)}<br/>
            <em>Includes: ${keyDetails}</em>`,
          )
          .style("opacity", 1)
          .style("left", event.offsetX + 10 + "px")
          .style("top", event.offsetY - 28 + "px");
        if (this.onHighlight) this.onHighlight(fullName);
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", event.offsetX + 10 + "px")
          .style("top", event.offsetY - 28 + "px");
      })
      .on("mouseleave", () => {
        lines.attr("stroke-width", 3).attr("filter", null);
        this.tooltip.style("opacity", 0);
        if (this.onClearHighlight) this.onClearHighlight();
      });

    this.chartArea
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(this.#scaleX)
          .tickFormat(d3.format("d"))
          .ticks(Math.floor(innerWidth / 40)),
      )
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("dy", "0.5em")
      .attr("dx", "-0.6em")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    this.chartArea.append("g").call(d3.axisLeft(this.#scaleY));
  }
}

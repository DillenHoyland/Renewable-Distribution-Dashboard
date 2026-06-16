export default class BarChart {
  #scaleX;
  #scaleY;
  #scaleC = () => "#2ca02c";
  currentTooltipKey = null;

  constructor(
    container,
    fill = "#2ca02c",
    margin = { top: 40, right: 20, bottom: 140, left: 40 },
    title = "",
  ) {
    this.container = d3.select(container);
    this.fill = fill;
    this.margin = margin;
    this.title = title;

    const rect = this.container.node().getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.innerWidth = this.width - margin.left - margin.right;
    this.innerHeight = this.height - margin.top - margin.bottom;

    this.svg = this.container
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .classed("barChart", true);

    this.titleG = this.svg
      .append("g")
      .attr("class", "chart-title")
      .attr("transform", `translate(${this.width / 2}, 20)`);

    this.titleText = this.titleG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text(this.title);

    this.chartArea = this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.tooltip = d3
      .select(this.container.node())
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    window.addEventListener("resize", () => this.resize());
  }

  setColourScale(scale) {
    this.#scaleC = scale;
    return this;
  }

  setTitle(title) {
    this.title = title;
    this.titleText.text(title);
  }

  resize() {
    const rect = this.container.node().getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.svg.attr("width", this.width).attr("height", this.height);
    this.titleG.attr("transform", `translate(${this.width / 2}, 20)`);

    if (this.data) this.renderData(this.data);
  }

  getContainerPosition() {
    return this.container.node().getBoundingClientRect();
  }

  showTooltip(key) {
    const barData = this.data.find((d) => d.k === key);
    if (!barData) return;

    this.chartArea
      .selectAll("rect")
      .attr("fill", (d) =>
        d.k === key
          ? d3.color(this.#scaleC(d.k)).brighter(1.5)
          : this.#scaleC(d.k),
      );

    const containerPos = this.getContainerPosition();
    const x =
      containerPos.left + this.#scaleX(key) + this.#scaleX.bandwidth() / 2;
    const y = containerPos.top + this.#scaleY(barData.v);

    this.tooltip
      .style("opacity", 1)
      .html(`<strong>${barData.k}</strong>: ${barData.v}`)
      .style("left", `${x}px`)
      .style("top", `${y - 28}px`);
  }

  hideTooltip() {
    this.chartArea
      .selectAll("rect")
      .attr("fill", (d) => this.#scaleC(d.k) || this.fill);
    this.tooltip.style("opacity", 0);
  }

  renderData(data, linkedChart = null) {
    this.data = data;
    const chartWidth = this.innerWidth;
    const chartHeight = this.innerHeight;

    const domainX = data.map((d) => d.k);
    const maxV = d3.max(data, (d) => d.v);

    this.#scaleX = d3
      .scaleBand()
      .domain(domainX)
      .range([0, chartWidth])
      .padding(0.1);
    this.#scaleY = d3
      .scalePow()
      .exponent(0.5)
      .domain([0, maxV])
      .range([chartHeight, 0])
      .nice();

    this.chartArea.selectAll("*").remove();

    this.chartArea
      .selectAll("rect")
      .data(data, (d) => d.k)
      .join("rect")
      .attr("x", (d) => this.#scaleX(d.k))
      .attr("y", (d) => this.#scaleY(d.v))
      .attr("width", this.#scaleX.bandwidth())
      .attr("height", (d) => chartHeight - this.#scaleY(d.v))
      .attr("fill", (d) => this.#scaleC(d.k) || this.fill)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => this.showTooltip(d.k))
      .on("mousemove", (event, d) => this.showTooltip(d.k))
      .on("mouseout", () => this.hideTooltip())
      .on("click", (event, d) => {
        if (!linkedChart) return;

        if (linkedChart.currentTooltipKey === d.k) {
          linkedChart.hideTooltip();
          linkedChart.currentTooltipKey = null;
        } else {
          linkedChart.showTooltip(d.k);
          linkedChart.currentTooltipKey = d.k;
        }
      });

    this.chartArea
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(this.#scaleX))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "8.5px");

    this.chartArea.append("g").call(d3.axisLeft(this.#scaleY));
  }
}

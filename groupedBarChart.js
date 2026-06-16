export default class GroupedBarChart {
  #scaleX;
  #scaleY;
  #scaleXInner;

  constructor(
    container,
    colours = ["#2ca02c", "#1f77b4"],
    margin = { top: 30, right: 10, bottom: 80, left: 50 },
    title = "Renewable Energy Use by Industry - (Chart A)",
  ) {
    this.container = d3.select(container);
    this.colours = colours;
    this.margin = margin;
    this.title = title;

    this.activeKeys = new Set(["direct", "reallocated"]);

    this.svg = this.container
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%");

    this.titleG = this.svg.append("g");
    this.titleText = this.titleG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .style("text-decoration", "underline")
      .text(this.title);

    this.chartArea = this.svg.append("g");

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
      .style("opacity", 0);

    window.addEventListener("resize", () => {
      if (this.data1 && this.data2) this.renderData(this.data1, this.data2);
    });
  }

  #getDimensions() {
    const rect = this.container.node().getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const innerWidth = width - this.margin.left - this.margin.right;
    const innerHeight = height - this.margin.top - this.margin.bottom;
    return { width, height, innerWidth, innerHeight };
  }

  renderData(data1, data2) {
    this.data1 = data1;
    this.data2 = data2;

    const { width, height, innerWidth, innerHeight } = this.#getDimensions();

    this.titleG.attr("transform", `translate(${width / 2}, 20)`);
    this.chartArea.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`,
    );

    const merged = data1.map((d) => ({
      k: d.k,
      direct: d.v,
      reallocated: (data2.find((r) => r.k === d.k) || { v: 0 }).v,
    }));

    const allKeys = ["direct", "reallocated"];
    const activeKeys = allKeys.filter((k) => this.activeKeys.has(k));

    const maxVal = d3.max(merged, (d) => d3.max(activeKeys, (k) => d[k]));

    this.#scaleX = d3
      .scaleBand()
      .domain(merged.map((d) => d.k))
      .range([0, innerWidth])
      .padding(0.15);

    this.#scaleXInner = d3
      .scaleBand()
      .domain(activeKeys)
      .range([0, this.#scaleX.bandwidth()])
      .padding(0.05);

    this.#scaleY = d3
      .scalePow()
      .exponent(0.5)
      .domain([0, maxVal * 1.05])
      .range([innerHeight, 0])
      .nice();

    this.chartArea.selectAll("*").remove();

    const colourMap = {
      direct: this.colours[0],
      reallocated: this.colours[1],
    };

    const groups = this.chartArea
      .selectAll(".bar-group")
      .data(merged)
      .join("g")
      .attr("class", "bar-group")
      .attr("transform", (d) => `translate(${this.#scaleX(d.k)},0)`);

    groups
      .selectAll("rect")
      .data((d) => activeKeys.map((k) => ({ k, v: d[k], sector: d.k })))
      .join("rect")
      .attr("x", (d) => this.#scaleXInner(d.k))
      .attr("y", (d) => this.#scaleY(d.v))
      .attr("width", this.#scaleXInner.bandwidth())
      .attr("height", (d) => Math.max(0, innerHeight - this.#scaleY(d.v)))
      .attr("fill", (d) => colourMap[d.k])
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseenter", (event, d) => {
        const label = d.k === "direct" ? "Direct" : "Reallocated";
        this.tooltip
          .html(`<strong>${d.sector}</strong>: ${d.v.toFixed(3)}<br/>${label}`)
          .style("opacity", 1)
          .style("left", event.offsetX - 125 + "px")
          .style("top", event.offsetY - 28 + "px");
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", event.offsetX - 125 + "px")
          .style("top", event.offsetY - 28 + "px");
      })
      .on("mouseleave", () => this.tooltip.style("opacity", 0));

    this.chartArea
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(this.#scaleX))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("dy", "0.3em")
      .attr("dx", "-0.6em")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    this.chartArea.append("g").call(d3.axisLeft(this.#scaleY));

    this.chartArea
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -38)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("fill", "#666");

    this.svg.selectAll(".bar-legend").remove();

    const legendData = [
      { key: "direct", label: "Direct Use", colour: this.colours[0] },
      {
        key: "reallocated",
        label: "Reallocated Use",
        colour: this.colours[1],
      },
    ];

    const legendX = this.margin.left + innerWidth - 5;
    const legendY = this.margin.top + 8;

    const legend = this.svg
      .append("g")
      .attr("class", "bar-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const items = legend
      .selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 22})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (this.activeKeys.size === 1 && this.activeKeys.has(d.key)) {
          this.activeKeys = new Set(["direct", "reallocated"]);
        } else {
          this.activeKeys = new Set([d.key]);
        }
        this.renderData(this.data1, this.data2);
      });

    items
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("x", -155)
      .attr("fill", (d) => d.colour)
      .attr("stroke", (d) =>
        this.activeKeys.size === 1 && this.activeKeys.has(d.key)
          ? "#000"
          : "none",
      )
      .attr("stroke-width", 2)
      .attr("opacity", (d) =>
        this.activeKeys.size === 2 || this.activeKeys.has(d.key) ? 1 : 0.3,
      );

    items
      .append("text")
      .attr("x", -139)
      .attr("y", 10)
      .style("font-size", "10px")
      .attr("opacity", (d) =>
        this.activeKeys.size === 2 || this.activeKeys.has(d.key) ? 1 : 0.3,
      )
      .text((d) => d.label);
  }
}

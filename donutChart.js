export default class DonutChart {
  #innerRadius;
  #outerRadius;

  constructor(
    container,
    width = 280,
    height = 220,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
  ) {
    this.container = d3.select(container);
    this.width = width;
    this.height = height;
    this.margin = margin;

    this.innerWidth = this.width - margin.left - margin.right;
    this.innerHeight = this.height - margin.top - margin.bottom;

    this.#outerRadius = Math.min(this.innerWidth, this.innerHeight) / 2.5;
    this.#innerRadius = this.#outerRadius * 0.2;

    this.svg = this.container
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .classed("donutChart", true);

    this.chartArea = this.svg.append("g");
    this.legendArea = this.svg.append("g");

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

    this.titleArea = this.svg
      .append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .style("text-decoration", "underline")
      .style("font-weight", "bold");

    this.selectedKeys = new Set();
    this.onSelectionChange = null;
    this.onHighlight = null;
    this.onClearHighlight = null;
  }

  setColourScale(scale) {
    this.scaleC = scale;
  }
  getSelectedKeys() {
    return Array.from(this.selectedKeys);
  }

  highlight(groupName) {
    this.chartArea
      .selectAll("path")
      .attr("stroke-width", (d) => (d.data.fullName === groupName ? 4 : 1))
      .attr("filter", (d) =>
        d.data.fullName === groupName ? "brightness(1.4)" : null,
      );
  }

  clearHighlight() {
    this.chartArea
      .selectAll("path")
      .attr("stroke-width", 1)
      .attr("filter", null);
  }

  render(csvData, year) {
    const row = csvData.find((d) => d.Year === year);
    if (!row) return;

    const containerW = this.container.node().getBoundingClientRect().width;
    const containerH = this.container.node().getBoundingClientRect().height;

    this.titleArea
      .attr("x", containerW / 2)
      .attr("y", 9)
      .text("Renewable Energy Breakdown - (Chart C)");

    const legendHeight = 50;
    const titleHeight = 20;
    const donutAreaH = containerH - legendHeight - titleHeight;

    this.chartArea.attr(
      "transform",
      `translate(${containerW / 2}, ${titleHeight + donutAreaH / 2})`,
    );

    const maxR = Math.min(containerW, donutAreaH) / 2 - 10;
    this.#outerRadius = maxR;
    this.#innerRadius = maxR * 0.2;

    const groups = {
      Hydroelectric: ["Hydroelectric"],
      "Wind, Wave & Tidal": ["WindWaveTidal"],
      Solar: ["SolarPhotovoltaic"],
      "Wood & Logs": [
        "Wood",
        "WoodDry",
        "WoodSeasoned",
        "WoodWet",
        "CoffeeLogs",
        "Woodchip",
        "WoodPellets",
        "WoodBriquettes",
        "Charcoal",
      ],
      "Plant & Crop Biomass": ["PlantBiomass", "AnimalBiomass", "Straw"],
      Biofuels: ["LiquidBioFuels", "Bioethanol", "Biodiesel", "SAF"],
      Waste: [
        "MunicipalSolidWaste",
        "NonMunicipalSolidWaste",
        "Biogas",
        "LandfillGas",
        "SewageGas",
      ],
    };

    const legendNames = {
      Hydroelectric: "Hydro",
      "Wind, Wave & Tidal": "Wind",
      Solar: "Solar",
      "Wood & Logs": "Wood",
      "Plant & Crop Biomass": "Plant",
      Biofuels: "Biofuels",
      Waste: "Waste",
    };

    const rawData = Object.entries(groups).map(([k, keys]) => ({
      fullName: k,
      k: legendNames[k],
      v: keys.reduce((s, key) => s + (row[key] || 0), 0),
      subKeys: keys,
    }));

    const pieData = rawData.filter((d) => d.v > 0);

    const data =
      this.selectedKeys.size > 0
        ? pieData.filter((d) => this.selectedKeys.has(d.fullName))
        : pieData;

    const pie = d3
      .pie()
      .value((d) => d.v)
      .sort(null);
    const arcGen = d3
      .arc()
      .innerRadius(this.#innerRadius)
      .outerRadius(this.#outerRadius);
    const arcs = pie(data);

    this.chartArea.selectAll("path").remove();

    const paths = this.chartArea
      .selectAll("path")
      .data(arcs, (d) => d.data.fullName)
      .join("path")
      .attr("d", arcGen)
      .attr("fill", (d) => this.scaleC(d.data.fullName))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseenter", (event, d) => {
        paths
          .attr("stroke-width", (p) =>
            p.data.fullName === d.data.fullName ? 4 : 1,
          )
          .attr("filter", (p) =>
            p.data.fullName === d.data.fullName ? "brightness(1.4)" : null,
          );
        this.tooltip
          .html(
            `<strong>${d.data.fullName}</strong>: ${d.data.v.toFixed(3)}<br/>
 <em>Includes: ${d.data.subKeys.map((k) => `${k} (${(row[k] || 0).toFixed(3)})`).join(", ")}</em>`,
          )
          .style("opacity", 1)
          .style("left", event.offsetX + 10 + "px")
          .style("top", event.offsetY - 28 + "px");
        if (this.onHighlight) this.onHighlight(d.data.fullName);
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", event.offsetX + 10 + "px")
          .style("top", event.offsetY - 28 + "px");
      })
      .on("mouseleave", () => {
        paths.attr("stroke-width", 1).attr("filter", null);
        this.tooltip.style("opacity", 0);
        if (this.onClearHighlight) this.onClearHighlight();
      });

    this.legendArea.selectAll("*").remove();

    const xOffset = 45;
    const itemWidth = (containerW - xOffset) / 4;
    const legendY = containerH - legendHeight + 8;

    this.legendArea.attr("transform", `translate(${xOffset}, ${legendY})`);

    const legendItems = this.legendArea
      .selectAll(".legend-item")
      .data(rawData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return `translate(${col * itemWidth}, ${row * 18})`;
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (this.selectedKeys.has(d.fullName))
          this.selectedKeys.delete(d.fullName);
        else this.selectedKeys.add(d.fullName);
        this.render(csvData, year);
        if (this.onSelectionChange) this.onSelectionChange();
      })
      .on("mouseenter", (event, d) => {
        paths
          .attr("stroke-width", (p) => (p.data.fullName === d.fullName ? 4 : 1))
          .attr("filter", (p) =>
            p.data.fullName === d.fullName ? "brightness(1.4)" : null,
          );
        if (this.onHighlight) this.onHighlight(d.fullName);
      })
      .on("mouseleave", () => {
        paths.attr("stroke-width", 1).attr("filter", null);
        if (this.onClearHighlight) this.onClearHighlight();
      });

    legendItems
      .append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", (d) => this.scaleC(d.fullName))
      .attr("stroke", (d) =>
        this.selectedKeys.has(d.fullName) ? "#000" : "none",
      )
      .attr("stroke-width", 2)
      .attr("opacity", (d) =>
        this.selectedKeys.size === 0 || this.selectedKeys.has(d.fullName)
          ? 1
          : 0.3,
      );

    legendItems
      .append("text")
      .attr("x", 14)
      .attr("y", 9)
      .style("font-size", "9px")
      .attr("opacity", (d) =>
        this.selectedKeys.size === 0 || this.selectedKeys.has(d.fullName)
          ? 1
          : 0.3,
      )
      .text((d) => d.k);
  }
}

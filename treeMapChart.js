export default class TreemapChart {
  constructor(
    container,
    margin = { top: 30, right: 10, bottom: 10, left: 10 },
  ) {
    this.container = d3.select(container);
    this.margin = margin;

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

    this.onHighlight = null;
    this.onClearHighlight = null;
  }

  setColourScale(scale) {
    this.scaleC = scale;
    return this;
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
    this.chartArea
      .selectAll(".leaf-cell rect")
      .attr("stroke-width", (d) => (d.parent.data.name === groupName ? 3 : 0.5))
      .attr("filter", (d) =>
        d.parent.data.name === groupName ? "brightness(1.4)" : null,
      );
  }

  clearHighlight() {
    this.chartArea
      .selectAll(".leaf-cell rect")
      .attr("stroke-width", 0.5)
      .attr("filter", null);
  }

  render(renewables, year) {
    const row = renewables.find((d) => d.Year === year);
    if (!row) return;

    const { width, height, innerWidth, innerHeight } = this.#getDimensions();
    if (innerWidth <= 0 || innerHeight <= 0) return;

    this.titleArea
      .attr("x", width / 2)
      .attr("y", this.margin.top / 2)
      .style("text-decoration", "underline")
      .text("Renewables Map - (Chart D)");

    this.chartArea.attr(
      "transform",
      `translate(${this.margin.left},${this.margin.top})`,
    );

    const groups = {
      Hydroelectric: { cols: ["Hydroelectric"] },
      "Wind, Wave & Tidal": { cols: ["WindWaveTidal"] },
      Solar: { cols: ["SolarPhotovoltaic"] },
      "Wood & Logs": {
        cols: [
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
      },
      "Plant & Crop Biomass": {
        cols: ["PlantBiomass", "AnimalBiomass", "Straw"],
      },
      Biofuels: { cols: ["LiquidBioFuels", "Bioethanol", "Biodiesel", "SAF"] },
      Waste: {
        cols: [
          "MunicipalSolidWaste",
          "NonMunicipalSolidWaste",
          "Biogas",
          "LandfillGas",
          "SewageGas",
        ],
      },
    };

    const LEAF_THRESHOLD = 0.15;
    const GROUP_THRESHOLD = 0.02;

    const totalRenewables = Object.entries(groups)
      .flatMap(([, { cols }]) => cols)
      .reduce((s, col) => s + (row[col] || 0), 0);

    if (totalRenewables === 0) return;

    const hierarchyData = {
      name: "Renewables",
      children: Object.entries(groups)
        .map(([groupName, { cols }]) => {
          const leaves = cols
            .map((col) => ({ name: col, value: row[col] || 0 }))
            .filter((d) => d.value > 0 && d.value != null);

          if (leaves.length === 0) return null;

          const groupTotal = leaves.reduce((s, d) => s + d.value, 0);
          if (groupTotal === 0) return null;

          if (groupTotal / totalRenewables < GROUP_THRESHOLD) return null;

          const visible = leaves.filter(
            (d) => d.value / groupTotal >= LEAF_THRESHOLD,
          );
          const hidden = leaves.filter(
            (d) => d.value / groupTotal < LEAF_THRESHOLD,
          );

          if (hidden.length > 0) {
            const otherValue = hidden.reduce((s, d) => s + d.value, 0);
            visible.push({
              name: `Other (${hidden.length})`,
              value: Math.max(otherValue, groupTotal * 0.15),
              isOther: true,
              subItems: hidden,
            });
          }

          if (visible.length === 0) return null;

          return { name: groupName, children: visible };
        })
        .filter((g) => g !== null && g.children.length > 0),
    };

    if (!hierarchyData.children || hierarchyData.children.length === 0) return;

    const root = d3
      .hierarchy(hierarchyData)
      .sum((d) => (d.children ? 0 : d.value || 0));

    root.sort((a, b) => b.value - a.value);

    if (!root.children || root.children.length === 0) return;

    d3
      .treemap()
      .size([innerWidth, innerHeight])
      .paddingOuter(4)
      .paddingInner(2)
      .paddingTop(18)(root);

    this.chartArea.selectAll("*").remove();

    const groups_sel = this.chartArea
      .selectAll(".group-cell")
      .data(root.children)
      .join("g")
      .attr("class", "group-cell")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    groups_sel
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => (this.scaleC ? this.scaleC(d.data.name) : "#ccc"))
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => (this.scaleC ? this.scaleC(d.data.name) : "#999"))
      .attr("stroke-width", 1.5);

    groups_sel
      .append("text")
      .attr("x", 4)
      .attr("y", 12)
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .attr("fill", (d) => (this.scaleC ? this.scaleC(d.data.name) : "#333"))
      .text((d) => {
        const w = d.x1 - d.x0;
        if (w < 40) return "";
        const maxChars = Math.floor(w / 8);
        const name = d.data.name;
        return name.length > maxChars
          ? name.slice(0, maxChars - 1) + "…"
          : name;
      });

    const leaves = this.chartArea
      .selectAll(".leaf-cell")
      .data(root.leaves())
      .join("g")
      .attr("class", "leaf-cell")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    leaves
      .append("rect")
      .attr("width", (d) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d) => Math.max(0, d.y1 - d.y0))
      .attr("fill", (d) =>
        this.scaleC ? this.scaleC(d.parent.data.name) : "#69b3a2",
      )
      .attr("fill-opacity", (d) => (d.data.isOther ? 0.35 : 0.75))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget)
          .attr("stroke-width", 2.5)
          .attr("filter", "brightness(1.4)");

        const detail = d.data.isOther
          ? `<br/><em>Includes: ${d.data.subItems
              .map((s) => `${s.name} (${s.value.toFixed(3)})`)
              .join(", ")}</em>`
          : "";
        this.tooltip
          .html(
            `<strong>${d.data.name}</strong>: ${d.data.value.toFixed(3)} <br/>
       Group: ${d.parent.data.name}${detail}`,
          )
          .style("opacity", 1)
          .style("left", event.offsetX - 125 + "px")
          .style("top", event.offsetY - 28 + "px");
        if (this.onHighlight) this.onHighlight(d.parent.data.name);
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", event.offsetX - 125 + "px")
          .style("top", event.offsetY - 28 + "px");
      })
      .on("mouseleave", (event) => {
        d3.select(event.currentTarget)
          .attr("stroke-width", 0.5)
          .attr("filter", null);
        this.tooltip.style("opacity", 0);
        if (this.onClearHighlight) this.onClearHighlight();
      });

    leaves
      .append("text")
      .attr("x", 3)
      .attr("y", 11)
      .style("font-size", "11px")
      .attr("fill", "#111")
      .text((d) => {
        const w = d.x1 - d.x0,
          h = d.y1 - d.y0;
        if (w <= 30 || h <= 14) return "";
        const maxChars = Math.floor(w / 8);
        const name = d.data.name;
        return name.length > maxChars
          ? name.slice(0, maxChars - 1) + "…"
          : name;
      });
  }
}

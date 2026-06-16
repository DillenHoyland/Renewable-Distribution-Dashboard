import GroupedBarChart from "./groupedBarChart.js";
import LineChart from "./lineChart.js";
import DonutChart from "./donutChart.js";
import TreemapChart from "./treeMapChart.js";

const columnMap = {
  Agriculture: "Agri",
  Mining: "Mining",
  Manufacturing: "Mfg",
  Energy: "Energy",
  Water: "Water",
  Construction: "Constr",
  Retail: "Retail",
  Transport: "Trans",
  Accommodation: "Accom",
  Info: "Info",
  Finance: "Finance",
  RE: "RE",
  Prof: "Prof",
  Admin: "Admin",
  Public: "Public",
  Edu: "Edu",
  Health: "Health",
  Arts: "Arts",
  Other: "Other",
  ConsExp: "ConsExp",
  Total: "Total",
};

const aggNames = {
  Hydroelectric: "Hydroelectric",
  "Wind, Wave & Tidal": "Wind & Wave",
  Solar: "Solar",
  "Wood & Logs": "Wood",
  "Plant & Crop Biomass": "Plant",
  Biofuels: "Biofuels",
  Waste: "Waste",
};

const labelToGroup = Object.fromEntries(
  Object.entries(aggNames).map(([full, short]) => [short, full]),
);

const donutGroups = [
  "Hydroelectric",
  "Wind, Wave & Tidal",
  "Solar",
  "Wood & Logs",
  "Plant & Crop Biomass",
  "Biofuels",
  "Waste",
];

const donutColours = [
  "#377eb8",
  "#4daf4a",
  "#ffff33",
  "#a65628",
  "#ff7f00",
  "#984ea3",
  "#e41a1c",
];

const donutToLineMap = {
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

function formatData(val) {
  if (val === null || val === undefined) return 0;
  const str = val.toString().trim();
  if (str === "" || str.startsWith("[")) return 0;
  return +str.replace(/,/g, "") || 0;
}

function cleanCSV(data) {
  return data.map((row) => {
    const newRow = { Year: +row.Year };
    for (let key in row) {
      if (key === "Year" || key === "Household") continue;
      newRow[columnMap[key.trim()] || key.trim()] = formatData(row[key]);
    }
    return newRow;
  });
}

function cleanRenewables(data) {
  return data.map((row) => {
    const newRow = { Year: +row.Year };
    for (let key in row) {
      if (key === "Year") continue;
      newRow[key.trim()] = formatData(row[key]);
    }
    return newRow;
  });
}

requestAnimationFrame(() => {
  const GroupedBarChartBar = new GroupedBarChart(".GroupedBarChart-bar");
  const treemap = new TreemapChart(".treemap");
  const line = new LineChart(".lineChart");
  const donut = new DonutChart(".donutContainer", 120, 200);

  Promise.all([
    d3.csv("data/table-1.csv"),
    d3.csv("data/table-2.csv"),
    d3.csv("data/table-3.csv"),
  ]).then(([data1, data2, renewableData]) => {
    const csv1 = cleanCSV(data1);
    const csv2 = cleanCSV(data2);
    const renewables = cleanRenewables(renewableData);

    const categories = Object.values(columnMap).filter(
      (c) => c !== "Household" && c !== "Total" && c !== "ConsExp",
    );

    const donutColourScale = d3
      .scaleOrdinal()
      .domain(donutGroups)
      .range(donutColours);

    donut.setColourScale(donutColourScale);
    line.setColourScale(donutColourScale);
    treemap.setColourScale(donutColourScale);
    line.setLabelToGroup(labelToGroup);
    donut.onSelectionChange = renderCharts;

    donut.onHighlight = (g) => {
      treemap.highlight(g);
      line.highlight(g);
    };
    donut.onClearHighlight = () => {
      treemap.clearHighlight();
      line.clearHighlight();
    };

    treemap.onHighlight = (g) => {
      donut.highlight(g);
      line.highlight(g);
    };
    treemap.onClearHighlight = () => {
      donut.clearHighlight();
      line.clearHighlight();
    };

    line.onHighlight = (g) => {
      donut.highlight(g);
      treemap.highlight(g);
    };
    line.onClearHighlight = () => {
      donut.clearHighlight();
      treemap.clearHighlight();
    };

    const checkboxCont = d3.select("#filterControls");
    categories.forEach((cat) => {
      const id = `filter-${cat}`;
      const div = checkboxCont.append("div");
      div
        .append("input")
        .attr("type", "checkbox")
        .attr("id", id)
        .property("checked", false)
        .on("change", renderCharts);
      div.append("label").attr("for", id).text(cat);
    });

    d3.select("#yearInput").on("input", renderCharts);
    renderCharts();

    function renderCharts() {
      const year = +d3.select("#yearInput").property("value");

      const row1 = csv1.find((d) => +d.Year === year);
      const row2 = csv2.find((d) => +d.Year === year);
      const renewableRow = renewables.find((r) => +r.Year === year);

      const activeChecks = categories.filter((cat) =>
        d3.select(`#filter-${cat}`).property("checked"),
      );
      const active = activeChecks.length ? activeChecks : categories;

      if (row1 && row2) {
        GroupedBarChartBar.renderData(
          active.map((c) => ({ k: c, v: row1[c] })),
          active.map((c) => ({ k: c, v: row2[c] })),
        );
        d3.select("#totalsValuesBar1").html(`
          <strong>Direct Total:</strong> ${row1.Total}<br/><br/>
          <strong>Reallocated Total:</strong> ${row2.Total}<br/><br/>
          <strong>Direct ConsExp:</strong> ${row1.ConsExp}<br/><br/><br/>
          <strong>Reallocated ConsExp:</strong> ${row2.ConsExp}
        `);
      }

      treemap.render(renewables, year);

      let selectedGroups = donut.getSelectedKeys();
      if (!selectedGroups.length) selectedGroups = donutGroups;

      const lineData = selectedGroups.map((groupName) =>
        renewables.map((row) => ({
          y: row.Year,
          c: donutToLineMap[groupName].reduce(
            (sum, col) => sum + (row[col] || 0),
            0,
          ),
        })),
      );

      line.render(
        lineData,
        selectedGroups.map((g) => aggNames[g] || g),
        selectedGroups.map((g) => donutToLineMap[g]),
        selectedGroups.map((g) => donutColourScale(g)),
        "Renewable Energy Trends - (Chart B)",
        renewables,
        year,
      );

      donut.render(renewables, year);

      if (renewableRow) {
        d3.select("#totalsValuesDonut").html(`
          <strong>Energy from Renewables:</strong> ${renewableRow.EnergyRenewableWaste.toFixed(3)}<br><br>
         <strong>Total Energy Consumption:</strong> ${renewableRow.TotalPrimaryEnergy.toFixed(3)}<br><br>
          <strong>Percentage from Renewables:</strong> ${renewableRow.PercentRenewable.toFixed(1)}%
        `);
      }
    }
  });
});

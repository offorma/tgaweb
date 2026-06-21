import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./chart";

const config = {
  desktop: { label: "Desktop", color: "#2563eb" },
  mobile: { label: "Mobile", color: "#60a5fa" },
} satisfies ChartConfig;

const data = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
];

describe("<Chart />", () => {
  it("renders the chart container with config-driven styles", () => {
    cy.mount(
      <div style={{ width: 500, height: 300 }}>
        <ChartContainer config={config} className="my-chart">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" />
            <Bar dataKey="mobile" fill="var(--color-mobile)" />
          </BarChart>
        </ChartContainer>
      </div>
    );

    cy.get('[data-slot="chart"]').should("have.class", "my-chart");
    // ChartStyle injects a <style> for the data-chart id.
    cy.get('[data-slot="chart"]').should("have.attr", "data-chart");
    cy.get('[data-slot="chart"] style').should("exist");
  });

  it("renders ChartLegendContent with config labels", () => {
    const legendPayload = [
      { value: "desktop", dataKey: "desktop", color: "#2563eb" },
      { value: "mobile", dataKey: "mobile", color: "#60a5fa" },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 300 }}>
        <>
          <ChartLegendContent payload={legendPayload} />
          <ChartLegendContent payload={legendPayload} verticalAlign="top" hideIcon />
          <ChartLegendContent payload={[]} />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "Desktop");
    cy.get('[data-slot="chart"]').should("contain.text", "Mobile");
  });

  it("renders ChartTooltipContent directly with active payload", () => {
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 186,
        color: "#2563eb",
        payload: { fill: "#2563eb", month: "Jan", desktop: 186 },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 300 }}>
        <BarChart data={data} width={300} height={150}>
          <Bar dataKey="desktop" />
        </BarChart>
      </ChartContainer>
    );
    // Render the tooltip content out-of-band via the chart context provider.
    cy.mount(
      <ChartContainer config={config} style={{ width: 300 }}>
        <>
          <ChartTooltipContent active payload={payload} label="Jan" />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "186");
  });

  it("renders ChartTooltipContent variants (line indicator, formatter, hidden label)", () => {
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 186,
        color: "#2563eb",
        payload: { fill: "#2563eb", month: "Jan" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 300 }}>
        <>
          <ChartTooltipContent
            active
            payload={payload}
            indicator="line"
            hideLabel
            labelFormatter={(v) => `Label: ${String(v)}`}
          />
          <ChartTooltipContent
            active
            payload={payload}
            indicator="dashed"
            hideIndicator
          />
          <ChartTooltipContent active payload={[]} />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("exist");
  });

  it("renders a custom item formatter for tooltip rows", () => {
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 186,
        color: "#2563eb",
        payload: { fill: "#2563eb", month: "Jan" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          {/* formatter present + value !== undefined + name -> custom row */}
          <ChartTooltipContent
            active
            payload={payload}
            formatter={(value, name) => (
              <span data-testid="fmt-row">
                {String(name)}={String(value)}
              </span>
            )}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-testid="fmt-row"]').should("contain.text", "desktop=186");
  });

  it("falls back to item.name when the config has no label", () => {
    // config key has no label -> `itemConfig?.label || item.name` right side.
    const noLabelConfig = { desktop: { color: "#2563eb" } } satisfies ChartConfig;
    const payload = [
      {
        dataKey: "desktop",
        name: "Desktop Name",
        value: 5,
        color: "#2563eb",
        payload: { fill: "#2563eb" },
      },
    ];
    cy.mount(
      <ChartContainer config={noLabelConfig} style={{ width: 320 }}>
        <>
          <ChartTooltipContent active payload={payload} hideLabel />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "Desktop Name");
  });

  it("renders a labelFormatter without hideLabel (formatted label shown)", () => {
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 186,
        color: "#2563eb",
        payload: { fill: "#2563eb", month: "Jan" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          {/* labelFormatter active and NOT hidden -> the formatted-label div */}
          <ChartTooltipContent
            active
            payload={payload}
            label="Jan"
            labelFormatter={(v) => `Month: ${String(v)}`}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "Month:");
  });

  it("renders theme-based color config in ChartStyle", () => {
    const themeConfig = {
      desktop: {
        label: "Desktop",
        theme: { light: "#2563eb", dark: "#1e40af" },
      },
      // No color and no theme color resolves to null in the style map.
      mobile: { label: "Mobile", theme: { light: "", dark: "" } },
    } satisfies ChartConfig;
    cy.mount(
      <div style={{ width: 500, height: 300 }}>
        <ChartContainer config={themeConfig}>
          <BarChart data={data}>
            <Bar dataKey="desktop" />
          </BarChart>
        </ChartContainer>
      </div>
    );
    cy.get('[data-slot="chart"] style').should("exist");
    cy.get('[data-slot="chart"] style').should("contain.text", "--color-desktop");
  });

  it("uses an explicit container id for the chart data attribute", () => {
    cy.mount(
      <div style={{ width: 500, height: 300 }}>
        <ChartContainer id="custom" config={config}>
          <BarChart data={data}>
            <Bar dataKey="desktop" fill="var(--color-desktop)" />
          </BarChart>
        </ChartContainer>
      </div>
    );
    cy.get('[data-slot="chart"]').should("have.attr", "data-chart", "chart-custom");
    cy.get('[data-slot="chart"] style').should("contain.text", "chart-custom");
  });

  it("renders nestLabel, nameKey/labelKey resolution and value formatting", () => {
    // nameKey + labelKey resolve config via getPayloadConfigFromPayload string keys.
    const keyedConfig = {
      a: { label: "Alpha", color: "#111" },
      b: { label: "Beta", color: "#222" },
    } satisfies ChartConfig;
    // payload whose nested payload carries the config key strings.
    const payload = [
      {
        dataKey: "value",
        name: "x",
        value: 1234,
        color: undefined,
        payload: { fill: undefined, group: "a", series: "a" },
      },
      {
        dataKey: "value2",
        name: "y",
        value: 0,
        color: "#222",
        payload: { fill: "#abc", group: "b", series: "b" },
      },
    ];
    cy.mount(
      <ChartContainer config={keyedConfig} style={{ width: 320 }}>
        <>
          {/* single-item + non-dot indicator triggers nestLabel branch and
              label resolution through labelKey */}
          <ChartTooltipContent
            active
            indicator="line"
            nameKey="series"
            labelKey="group"
            payload={[payload[0]]}
          />
          {/* multi-item path, dashed indicator, value toLocaleString on 1234 */}
          <ChartTooltipContent
            active
            indicator="dashed"
            nameKey="series"
            payload={payload}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "Alpha");
    cy.get('[data-slot="chart"]').should("contain.text", "1,234");
  });

  it("renders config icons in tooltip and legend", () => {
    const Icon = () => <svg data-testid="cfg-icon" />;
    const iconConfig = {
      desktop: { label: "Desktop", color: "#2563eb", icon: Icon },
    } satisfies ChartConfig;
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 99,
        color: "#2563eb",
        payload: { fill: "#2563eb" },
      },
    ];
    cy.mount(
      <ChartContainer config={iconConfig} style={{ width: 320 }}>
        <>
          <ChartTooltipContent active payload={payload} />
          <ChartLegendContent
            payload={[{ value: "desktop", dataKey: "desktop", color: "#2563eb" }]}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-testid="cfg-icon"]').should("have.length.greaterThan", 0);
  });

  it("renders nestLabel dashed indicator with explicit color and a label config", () => {
    const payload = [
      {
        dataKey: "desktop",
        name: "desktop",
        value: 500,
        // no color/fill so indicatorColor falls back through to the `color` prop
        color: undefined,
        payload: { fill: undefined, month: "Mar" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          {/* single item + dashed => nestLabel true; explicit color prop used */}
          <ChartTooltipContent
            active
            indicator="dashed"
            color="#ff0000"
            label="desktop"
            payload={payload}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "500");
  });

  it("renders tooltip label from string config label and missing-value items", () => {
    const payload = [
      {
        // value undefined exercises the `item.value &&` falsy branch
        dataKey: "desktop",
        name: "desktop",
        value: undefined,
        color: "#2563eb",
        payload: { fill: "#2563eb" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          {/* label is a string that maps to a config key => config[label].label */}
          <ChartTooltipContent active payload={payload} label="desktop" />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("contain.text", "Desktop");
  });

  it("resolves keys through the dataKey and 'value' fallbacks", () => {
    // item with no name -> key falls to dataKey; the label item has neither
    // labelKey, dataKey nor name -> falls through to "value".
    const payload = [
      {
        dataKey: "desktop",
        name: undefined,
        value: 7,
        color: "#2563eb",
        payload: { fill: "#2563eb" },
      },
    ];
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          {/* tooltip: nameKey absent, item.name absent -> dataKey */}
          <ChartTooltipContent active payload={payload} />
          {/* legend: no nameKey, no dataKey -> "value" */}
          <ChartLegendContent
            payload={[{ value: "v", color: "#2563eb" }]}
          />
          {/* legend: dataKey fallback */}
          <ChartLegendContent
            payload={[{ value: "d", dataKey: "desktop", color: "#2563eb" }]}
          />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("exist");
  });

  it("returns null tooltip when inactive", () => {
    cy.mount(
      <ChartContainer config={config} style={{ width: 320 }}>
        <>
          <ChartTooltipContent active={false} payload={[]} />
          <BarChart data={data} width={300} height={150}>
            <Bar dataKey="desktop" />
          </BarChart>
        </>
      </ChartContainer>
    );
    cy.get('[data-slot="chart"]').should("exist");
  });

  it("returns null ChartStyle when no colors are configured", () => {
    cy.mount(
      <div style={{ width: 500, height: 300 }}>
        <ChartContainer config={{ desktop: { label: "Desktop" } }}>
          <BarChart data={data}>
            <Bar dataKey="desktop" />
          </BarChart>
        </ChartContainer>
      </div>
    );
    cy.get('[data-slot="chart"]').should("exist");
  });
});

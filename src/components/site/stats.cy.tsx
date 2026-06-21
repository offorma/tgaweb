import { Stats } from "./stats";
import type { Stat } from "@prisma/client";

const stats = [
  { id: "s1", value: 16, suffix: "+", label: "Years of Excellence", description: "Since 2009", order: 0 },
  { id: "s2", value: 850, suffix: "+", label: "Happy Pupils", description: "Nursery to P6", order: 1 },
  { id: "s3", value: 45, suffix: "", label: "Educators", description: "Certified teachers", order: 2 },
  { id: "s4", value: 98, suffix: "%", label: "Placement Rate", description: "Top schools", order: 3 },
] as unknown as Stat[];

describe("<Stats />", () => {
  it("renders nothing when the stats array is empty", () => {
    cy.mountWithIntl(<Stats stats={[]} />);
    cy.get("section").should("not.exist");
  });

  it("renders each stat label and animates the counter to its final value", () => {
    cy.mountWithIntl(<Stats stats={stats} />);
    cy.contains("Years of Excellence").should("be.visible");
    cy.contains("Happy Pupils").should("be.visible");
    cy.contains("Placement Rate").should("be.visible");
    // The AnimatedCounter eases up to the target value + suffix.
    cy.contains("16+", { timeout: 4000 }).should("exist");
    cy.contains("98%", { timeout: 4000 }).should("exist");
    cy.contains("850", { timeout: 4000 }).should("exist");
  });

  it("renders a stat with a single entry and no suffix string", () => {
    // A single stat (suffix "") exercises the counter with an empty suffix.
    const single = [
      { id: "x1", value: 12, suffix: "", label: "Clubs", description: "Active clubs", order: 0 },
    ] as unknown as Stat[];
    cy.mountWithIntl(<Stats stats={single} />);
    cy.contains("Clubs").should("be.visible");
    cy.contains("12", { timeout: 4000 }).should("exist");
  });
});

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("<ToggleGroup />", () => {
  it("renders items and toggles selection (single)", () => {
    cy.mount(
      <ToggleGroup type="single" variant="outline" size="sm" className="my-group">
        <ToggleGroupItem value="left">L</ToggleGroupItem>
        <ToggleGroupItem value="center">C</ToggleGroupItem>
        <ToggleGroupItem value="right">R</ToggleGroupItem>
      </ToggleGroup>
    );

    cy.get('[data-slot="toggle-group"]')
      .should("have.class", "my-group")
      .and("have.attr", "data-variant", "outline");
    cy.get('[data-slot="toggle-group-item"]').should("have.length", 3);

    cy.contains('[data-slot="toggle-group-item"]', "C").click().should("have.attr", "data-state", "on");
  });

  it("supports multiple selection and per-item variant", () => {
    cy.mount(
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="a" variant="outline" size="lg">
          A
        </ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    cy.contains('[data-slot="toggle-group-item"]', "A").click().should("have.attr", "data-state", "on");
    cy.contains('[data-slot="toggle-group-item"]', "B").click().should("have.attr", "data-state", "on");
  });
});

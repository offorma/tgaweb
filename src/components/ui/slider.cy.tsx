import { Slider } from "./slider";

describe("<Slider />", () => {
  it("renders track, range and a single thumb from defaultValue", () => {
    cy.mount(<Slider defaultValue={[50]} min={0} max={100} className="my-slider" />);
    cy.get('[data-slot="slider"]').should("have.class", "my-slider");
    cy.get('[data-slot="slider-track"]').should("exist");
    cy.get('[data-slot="slider-range"]').should("exist");
    cy.get('[data-slot="slider-thumb"]').should("have.length", 1);
  });

  it("renders two thumbs for a range value and reflects aria-valuenow", () => {
    cy.mount(<Slider value={[20, 80]} min={0} max={100} />);
    cy.get('[data-slot="slider-thumb"]').should("have.length", 2);
    cy.get('[role="slider"]').first().should("have.attr", "aria-valuenow", "20");
  });

  it("renders default min/max thumbs when no value supplied", () => {
    cy.mount(<Slider min={0} max={100} />);
    cy.get('[data-slot="slider-thumb"]').should("have.length", 2);
  });

  it("updates value on keyboard interaction", () => {
    cy.mount(<Slider defaultValue={[50]} min={0} max={100} />);
    cy.get('[role="slider"]').focus().type("{rightarrow}");
    cy.get('[role="slider"]').should("have.attr", "aria-valuenow", "51");
  });

  it("supports vertical orientation and disabled state", () => {
    cy.mount(<Slider defaultValue={[30]} orientation="vertical" disabled />);
    cy.get('[data-slot="slider"]').should("have.attr", "data-orientation", "vertical");
    cy.get('[data-slot="slider"]').should("have.attr", "data-disabled");
  });
});

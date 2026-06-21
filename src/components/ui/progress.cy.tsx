import { Progress } from "./progress";

describe("<Progress />", () => {
  it("renders indicator with transform reflecting value", () => {
    cy.mount(<Progress value={60} className="my-progress" />);
    cy.get('[data-slot="progress"]').should("have.class", "my-progress");
    cy.get('[data-slot="progress-indicator"]')
      .should("have.attr", "style")
      .and("include", "translateX(-40%)");
  });

  it("defaults to 0 when no value is given", () => {
    cy.mount(<Progress />);
    cy.get('[data-slot="progress-indicator"]')
      .should("have.attr", "style")
      .and("include", "translateX(-100%)");
  });
});

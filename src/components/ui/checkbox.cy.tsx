import { Checkbox } from "./checkbox";

describe("<Checkbox />", () => {
  it("renders and toggles checked state showing the indicator", () => {
    cy.mount(<Checkbox className="my-checkbox" />);
    cy.get('[data-slot="checkbox"]')
      .should("have.class", "my-checkbox")
      .and("have.attr", "data-state", "unchecked");
    cy.get('[data-slot="checkbox-indicator"]').should("not.exist");
    cy.get('[data-slot="checkbox"]').click();
    cy.get('[data-slot="checkbox"]').should("have.attr", "data-state", "checked");
    cy.get('[data-slot="checkbox-indicator"]').should("exist");
  });

  it("renders a default-checked checkbox", () => {
    cy.mount(<Checkbox defaultChecked />);
    cy.get('[data-slot="checkbox-indicator"]').should("exist");
  });
});

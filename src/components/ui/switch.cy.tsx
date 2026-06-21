import { Switch } from "./switch";

describe("<Switch />", () => {
  it("renders unchecked by default and toggles on click", () => {
    cy.mount(<Switch className="my-switch" />);
    cy.get('[data-slot="switch"]')
      .should("have.class", "my-switch")
      .and("have.attr", "data-state", "unchecked");
    cy.get('[data-slot="switch-thumb"]').should("exist");
    cy.get('[data-slot="switch"]').click().should("have.attr", "data-state", "checked");
  });

  it("respects defaultChecked and disabled", () => {
    cy.mount(<Switch defaultChecked disabled />);
    cy.get('[data-slot="switch"]')
      .should("have.attr", "data-state", "checked")
      .and("be.disabled");
  });
});

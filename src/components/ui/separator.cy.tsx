import { Separator } from "./separator";

describe("<Separator />", () => {
  it("renders a horizontal separator by default", () => {
    cy.mount(<Separator />);
    cy.get('[data-slot="separator"]').should("have.attr", "data-orientation", "horizontal");
  });

  it("supports vertical orientation and custom className", () => {
    cy.mount(<Separator orientation="vertical" className="my-sep" />);
    cy.get('[data-slot="separator"]')
      .should("have.attr", "data-orientation", "vertical")
      .and("have.class", "my-sep");
  });
});

import { Label } from "./label";

describe("<Label />", () => {
  it("renders text and custom className", () => {
    cy.mount(
      <Label className="my-label" htmlFor="field">
        My Label
      </Label>
    );
    cy.get('[data-slot="label"]')
      .should("have.class", "my-label")
      .and("contain.text", "My Label")
      .and("have.attr", "for", "field");
  });
});

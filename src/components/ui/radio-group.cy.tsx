import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("<RadioGroup />", () => {
  it("renders items and selects one on click", () => {
    cy.mount(
      <RadioGroup defaultValue="a" className="my-radio">
        <RadioGroupItem value="a" id="a" className="item-a" />
        <RadioGroupItem value="b" id="b" />
        <RadioGroupItem value="c" id="c" />
      </RadioGroup>
    );
    cy.get('[data-slot="radio-group"]').should("have.class", "my-radio");
    cy.get('[data-slot="radio-group-item"]').should("have.length", 3);

    cy.get("#a").should("have.attr", "data-state", "checked");
    cy.get("#b").click().should("have.attr", "data-state", "checked");
    cy.get("#a").should("have.attr", "data-state", "unchecked");
    cy.get('[data-slot="radio-group-indicator"]').should("exist");
  });
});

import { Textarea } from "./textarea";

describe("<Textarea />", () => {
  it("renders and accepts typed input", () => {
    cy.mount(<Textarea placeholder="Type here" className="my-area" />);
    cy.get('[data-slot="textarea"]')
      .should("have.attr", "placeholder", "Type here")
      .and("have.class", "my-area")
      .type("hello world")
      .should("have.value", "hello world");
  });

  it("supports disabled state", () => {
    cy.mount(<Textarea disabled defaultValue="locked" />);
    cy.get('[data-slot="textarea"]')
      .should("be.disabled")
      .and("have.value", "locked");
  });
});

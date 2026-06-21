import { Input } from "./input";

describe("<Input />", () => {
  it("renders and accepts typed text", () => {
    cy.mount(<Input className="my-input" placeholder="email" type="text" />);
    cy.get('[data-slot="input"]')
      .should("have.class", "my-input")
      .and("have.attr", "placeholder", "email")
      .type("hello")
      .should("have.value", "hello");
  });

  it("supports disabled state", () => {
    cy.mount(<Input disabled />);
    cy.get('[data-slot="input"]').should("be.disabled");
  });
});

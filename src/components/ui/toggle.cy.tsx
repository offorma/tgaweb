import { Toggle, toggleVariants } from "./toggle";

describe("<Toggle />", () => {
  it("renders and toggles pressed state on click", () => {
    cy.mount(<Toggle className="my-toggle">B</Toggle>);
    cy.get('[data-slot="toggle"]')
      .should("have.class", "my-toggle")
      .and("have.attr", "data-state", "off")
      .click()
      .should("have.attr", "data-state", "on");
  });

  it("supports variant and size props", () => {
    cy.mount(
      <Toggle variant="outline" size="lg" defaultPressed>
        Bold
      </Toggle>
    );
    cy.get('[data-slot="toggle"]').should("have.attr", "data-state", "on");
  });

  it("exposes toggleVariants helper", () => {
    expect(toggleVariants({ variant: "outline", size: "sm" })).to.be.a("string");
  });
});

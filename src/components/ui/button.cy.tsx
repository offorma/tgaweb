import { Button } from "./button";

describe("<Button />", () => {
  (["default", "destructive", "outline", "secondary", "ghost", "link"] as const).forEach(
    (variant) => {
      it(`renders the ${variant} variant`, () => {
        cy.mount(<Button variant={variant}>{variant}</Button>);
        cy.get('[data-slot="button"]').should("contain.text", variant);
      });
    }
  );

  (["default", "sm", "lg", "icon"] as const).forEach((size) => {
    it(`renders the ${size} size`, () => {
      cy.mount(<Button size={size}>x</Button>);
      cy.get('[data-slot="button"]').should("exist");
    });
  });

  it("handles clicks", () => {
    const onClick = cy.stub().as("onClick");
    cy.mount(<Button onClick={onClick}>click me</Button>);
    cy.get('[data-slot="button"]').click();
    cy.get("@onClick").should("have.been.calledOnce");
  });

  it("supports asChild rendering", () => {
    cy.mount(
      <Button asChild>
        <a href="#go">anchor button</a>
      </Button>
    );
    cy.get('a[data-slot="button"]').should("contain.text", "anchor button");
  });
});

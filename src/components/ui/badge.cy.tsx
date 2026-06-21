import { Badge } from "./badge";

describe("<Badge />", () => {
  (["default", "secondary", "destructive", "outline"] as const).forEach(
    (variant) => {
      it(`renders the ${variant} variant`, () => {
        cy.mount(<Badge variant={variant}>{variant}</Badge>);
        cy.get('[data-slot="badge"]').should("contain.text", variant);
      });
    }
  );

  it("supports asChild to render a custom element", () => {
    cy.mount(
      <Badge asChild>
        <a href="#link">link badge</a>
      </Badge>
    );
    cy.get('a[data-slot="badge"]').should("contain.text", "link badge");
  });
});

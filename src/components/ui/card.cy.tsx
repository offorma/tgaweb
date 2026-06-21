import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card";

describe("<Card />", () => {
  it("renders every card sub-component", () => {
    cy.mount(
      <Card className="my-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );
    cy.get('[data-slot="card"]').should("have.class", "my-card");
    cy.get('[data-slot="card-header"]').should("exist");
    cy.get('[data-slot="card-title"]').should("contain.text", "Card Title");
    cy.get('[data-slot="card-description"]').should(
      "contain.text",
      "Card Description"
    );
    cy.get('[data-slot="card-action"]').should("contain.text", "Action");
    cy.get('[data-slot="card-content"]').should("contain.text", "Card Content");
    cy.get('[data-slot="card-footer"]').should("contain.text", "Card Footer");
  });
});

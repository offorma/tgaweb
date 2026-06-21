import { Alert, AlertTitle, AlertDescription } from "./alert";

describe("<Alert />", () => {
  it("renders the default variant with title and description", () => {
    cy.mount(
      <Alert className="my-alert">
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app.</AlertDescription>
      </Alert>
    );
    cy.get('[data-slot="alert"]')
      .should("have.attr", "role", "alert")
      .and("have.class", "my-alert");
    cy.get('[data-slot="alert-title"]').should("contain.text", "Heads up!");
    cy.get('[data-slot="alert-description"]').should(
      "contain.text",
      "You can add components to your app."
    );
  });

  it("renders the destructive variant", () => {
    cy.mount(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
    );
    cy.get('[data-slot="alert"]').should("contain.text", "Error");
  });
});

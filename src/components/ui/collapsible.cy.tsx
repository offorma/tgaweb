import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./collapsible";

describe("<Collapsible />", () => {
  it("toggles content visibility when triggered", () => {
    cy.mount(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden details</CollapsibleContent>
      </Collapsible>
    );
    cy.get('[data-slot="collapsible"]').should("exist");
    cy.get('[data-slot="collapsible-trigger"]').should("contain.text", "Toggle");
    cy.get('[data-slot="collapsible-content"]').should("not.be.visible");
    cy.get('[data-slot="collapsible-trigger"]').click();
    cy.get('[data-slot="collapsible-content"]').should(
      "contain.text",
      "Hidden details"
    );
  });
});

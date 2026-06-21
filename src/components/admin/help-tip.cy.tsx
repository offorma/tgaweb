import { HelpTip } from "./help-tip";
import { Button } from "@/components/ui/button";

describe("<HelpTip />", () => {
  it("renders the default (?) icon trigger and shows tooltip text on hover", () => {
    cy.mount(<HelpTip content="Explains the field" />);
    cy.get('button[aria-label="More information"]').should("exist");
    // lucide HelpCircle icon present
    cy.get('button[aria-label="More information"] svg').should("exist");
    // Radix opens tooltips on focus (and pointer); focus is reliable in cypress.
    cy.get('button[aria-label="More information"]').focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Explains the field");
  });

  it("falls back to string children when no content prop is given", () => {
    cy.mount(<HelpTip>Child text tip</HelpTip>);
    cy.get('button[aria-label="More information"]').focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Child text tip");
  });

  it("renders non-string children inside the tooltip content when no content/string child", () => {
    cy.mount(
      <HelpTip>
        <span data-cy="node-child">node child</span>
      </HelpTip>
    );
    cy.get('button[aria-label="More information"]').focus();
    cy.get('[data-cy="node-child"]').should("exist");
  });

  it("applies className and iconClassName", () => {
    cy.mount(<HelpTip content="x" className="my-trigger" iconClassName="my-icon" />);
    cy.get("button.my-trigger").should("exist");
    cy.get("button.my-trigger svg.my-icon").should("exist");
  });

  it("supports asChild rendering with a custom trigger element", () => {
    cy.mount(
      <HelpTip content="Deletes this item" asChild side="right">
        <Button>Delete</Button>
      </HelpTip>
    );
    // The button is the trigger; no extra help icon button rendered.
    cy.get('button[aria-label="More information"]').should("not.exist");
    cy.contains("button", "Delete").should("exist").focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Deletes this item");
  });

  it("ignores asChild when no children are provided (falls back to icon)", () => {
    cy.mount(<HelpTip content="fallback" asChild />);
    cy.get('button[aria-label="More information"]').should("exist");
  });
});

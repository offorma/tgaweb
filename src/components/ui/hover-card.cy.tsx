import { HoverCard, HoverCardTrigger, HoverCardContent } from "./hover-card";

describe("<HoverCard />", () => {
  it("opens on trigger hover and renders content", () => {
    cy.mount(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger data-cy="trigger">Hover me</HoverCardTrigger>
        <HoverCardContent className="my-hovercard">
          Hover card body
        </HoverCardContent>
      </HoverCard>
    );

    cy.get('[data-slot="hover-card-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').trigger("pointerover").trigger("mouseover");
    cy.get('[data-slot="hover-card-content"]')
      .should("be.visible")
      .and("have.class", "my-hovercard")
      .and("contain.text", "Hover card body");
  });
});

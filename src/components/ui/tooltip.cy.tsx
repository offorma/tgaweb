import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";

describe("<Tooltip />", () => {
  it("shows content on hover/focus of the trigger", () => {
    cy.mount(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
        <TooltipContent className="my-tip">Tooltip text</TooltipContent>
      </Tooltip>
    );

    cy.get('[data-slot="tooltip-trigger"]').focus();
    cy.get('[data-slot="tooltip-content"]')
      .should("be.visible")
      .and("have.class", "my-tip")
      .and("contain.text", "Tooltip text");
  });

  it("works with an explicit TooltipProvider wrapper", () => {
    cy.mount(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Provided</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    cy.get('[data-slot="tooltip-trigger"]').focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Provided");
  });
});

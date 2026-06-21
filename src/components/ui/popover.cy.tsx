import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from "./popover";

describe("<Popover />", () => {
  it("opens on trigger click and renders content", () => {
    cy.mount(
      <Popover>
        <PopoverAnchor />
        <PopoverTrigger data-cy="trigger">Open</PopoverTrigger>
        <PopoverContent className="my-popover">Popover body</PopoverContent>
      </Popover>
    );

    cy.get('[data-slot="popover-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').click();
    cy.get('[data-slot="popover-content"]')
      .should("be.visible")
      .and("have.class", "my-popover")
      .and("contain.text", "Popover body");
  });
});

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";

describe("<Dialog />", () => {
  it("opens on trigger click and renders all content parts", () => {
    cy.mount(
      <Dialog>
        <DialogTrigger data-cy="trigger">Open</DialogTrigger>
        <DialogContent className="my-content">
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description text.</DialogDescription>
          </DialogHeader>
          <p>Body content</p>
          <DialogFooter>
            <DialogClose data-cy="close">Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    cy.get('[data-slot="dialog-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').click();

    cy.get('[data-slot="dialog-overlay"]').should("exist");
    cy.get('[data-slot="dialog-content"]')
      .should("be.visible")
      .and("have.class", "my-content");
    cy.get('[data-slot="dialog-header"]').should("exist");
    cy.get('[data-slot="dialog-title"]').should("contain.text", "Dialog Title");
    cy.get('[data-slot="dialog-description"]').should(
      "contain.text",
      "Dialog description text."
    );
    cy.get('[data-slot="dialog-footer"]').should("exist");

    cy.get('[data-cy="close"]').click();
    cy.get('[data-slot="dialog-content"]').should("not.exist");
  });
});

import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet";

describe("<Sheet />", () => {
  it("opens on trigger, renders all parts, and closes", () => {
    cy.mount(
      <Sheet>
        <SheetTrigger data-testid="open">Open sheet</SheetTrigger>
        <SheetContent side="left" className="my-content">
          <SheetHeader>
            <SheetTitle>Sheet title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose data-testid="close">Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );

    cy.get('[data-slot="sheet-trigger"]').click();
    cy.get('[data-slot="sheet-overlay"]').should("exist");
    cy.get('[data-slot="sheet-content"]').should("be.visible").and("have.class", "my-content");
    cy.get('[data-slot="sheet-header"]').should("exist");
    cy.get('[data-slot="sheet-title"]').should("have.text", "Sheet title");
    cy.get('[data-slot="sheet-description"]').should("have.text", "Sheet description");
    cy.get('[data-slot="sheet-footer"]').should("exist");

    cy.get('[data-testid="close"]').click();
    cy.get('[data-slot="sheet-content"]').should("not.exist");
  });

  it("renders each side variant", () => {
    (["top", "right", "bottom"] as const).forEach((side) => {
      cy.mount(
        <Sheet defaultOpen>
          <SheetContent side={side}>
            <SheetTitle>{side}</SheetTitle>
            <SheetDescription>desc</SheetDescription>
          </SheetContent>
        </Sheet>
      );
      cy.get('[data-slot="sheet-content"]').should("be.visible");
    });
  });

  it("defaults to the right side when no side prop is given", () => {
    cy.mount(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Default side</SheetTitle>
          <SheetDescription>desc</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    cy.get('[data-slot="sheet-content"]')
      .should("be.visible")
      .and("have.class", "inset-y-0");
  });
});

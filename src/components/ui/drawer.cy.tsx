import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "./drawer";

describe("<Drawer />", () => {
  it("opens on trigger click and renders all content parts", () => {
    cy.mount(
      <Drawer>
        <DrawerTrigger data-cy="trigger">Open</DrawerTrigger>
        <DrawerContent className="my-drawer">
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer description text.</DrawerDescription>
          </DrawerHeader>
          <p>Drawer body</p>
          <DrawerFooter>
            <DrawerClose data-cy="close">Close</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );

    cy.get('[data-slot="drawer-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').click();

    cy.get('[data-slot="drawer-content"]')
      .should("be.visible")
      .and("have.class", "my-drawer");
    cy.get('[data-slot="drawer-overlay"]').should("exist");
    cy.get('[data-slot="drawer-header"]').should("exist");
    cy.get('[data-slot="drawer-title"]').should("contain.text", "Drawer Title");
    cy.get('[data-slot="drawer-description"]').should(
      "contain.text",
      "Drawer description text."
    );
    cy.get('[data-slot="drawer-footer"]').should("exist");

    cy.get('[data-cy="close"]').click();
    cy.get('[data-slot="drawer-content"]').should("not.exist");
  });
});

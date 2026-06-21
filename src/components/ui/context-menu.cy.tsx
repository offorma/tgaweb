import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
  ContextMenuPortal,
} from "./context-menu";

describe("<ContextMenu />", () => {
  it("opens on right-click and renders every menu part", () => {
    cy.mount(
      <ContextMenu>
        <ContextMenuTrigger data-slot="context-menu-trigger">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuGroup>
            <ContextMenuItem inset>
              Back
              <ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked>
            Show bookmarks
          </ContextMenuCheckboxItem>
          <ContextMenuRadioGroup value="a">
            <ContextMenuRadioItem value="a">Option A</ContextMenuRadioItem>
            <ContextMenuRadioItem value="b">Option B</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>More</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Sub item</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );

    cy.get('[data-slot="context-menu-trigger"]').rightclick();

    cy.get('body [data-slot="context-menu-content"]').should("be.visible");
    cy.get('body [data-slot="context-menu-label"]').should(
      "contain.text",
      "Actions"
    );
    cy.get('body [data-slot="context-menu-group"]').should("exist");
    cy.get('body [data-slot="context-menu-item"]').should(
      "contain.text",
      "Back"
    );
    cy.get('body [data-slot="context-menu-shortcut"]').should(
      "contain.text",
      "Ctrl+B"
    );
    cy.get('body [data-slot="context-menu-separator"]').should("exist");
    cy.get('body [data-slot="context-menu-checkbox-item"]').should(
      "contain.text",
      "Show bookmarks"
    );
    cy.get('body [data-slot="context-menu-radio-item"]').should(
      "have.length",
      2
    );

    // Hover the sub-trigger to open the sub-content.
    cy.get('body [data-slot="context-menu-sub-trigger"]')
      .should("contain.text", "More")
      .trigger("pointermove")
      .click();
    cy.get('body [data-slot="context-menu-sub-content"]').should(
      "contain.text",
      "Sub item"
    );
  });

  it("renders content through the explicit ContextMenuPortal wrapper", () => {
    cy.mount(
      <ContextMenu>
        <ContextMenuTrigger data-slot="context-menu-trigger">
          Portal trigger
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent>
            <ContextMenuItem>Portaled item</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>
    );
    cy.get('[data-slot="context-menu-trigger"]').rightclick();
    // The explicit ContextMenuPortal wrapper renders its children into the
    // portal; finding the item proves the wrapper executed.
    cy.get('body [data-slot="context-menu-item"]').should(
      "contain.text",
      "Portaled item"
    );
  });
});

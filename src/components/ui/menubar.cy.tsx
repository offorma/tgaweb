import { useState } from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarPortal,
} from "./menubar";

function Demo() {
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("one");
  return (
    <Menubar className="my-menubar">
      <MenubarMenu>
        <MenubarTrigger data-cy="trigger">File</MenubarTrigger>
        <MenubarContent className="my-content">
          <MenubarLabel inset>Actions</MenubarLabel>
          <MenubarSeparator />
          <MenubarGroup>
            <MenubarItem inset>
              New
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem variant="destructive">Delete</MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarCheckboxItem checked={checked} onCheckedChange={setChecked}>
            Show toolbar
          </MenubarCheckboxItem>
          <MenubarRadioGroup value={radio} onValueChange={setRadio}>
            <MenubarRadioItem value="one">One</MenubarRadioItem>
            <MenubarRadioItem value="two">Two</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSub>
            <MenubarSubTrigger inset>More</MenubarSubTrigger>
            <MenubarPortal>
              <MenubarSubContent className="my-sub">
                <MenubarItem>Sub Item</MenubarItem>
              </MenubarSubContent>
            </MenubarPortal>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("<Menubar />", () => {
  it("opens and renders all menu parts including a submenu", () => {
    cy.mount(<Demo />);

    cy.get('[data-slot="menubar"]').should("have.class", "my-menubar");
    cy.get('[data-slot="menubar-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').click();

    cy.get('[data-slot="menubar-content"]')
      .should("be.visible")
      .and("have.class", "my-content");
    cy.get('[data-slot="menubar-label"]').should("contain.text", "Actions");
    cy.get('[data-slot="menubar-separator"]').should("have.length", 2);
    cy.get('[data-slot="menubar-item"]').should("have.length.at.least", 2);
    cy.get('[data-slot="menubar-shortcut"]').should("contain.text", "⌘N");
    cy.get('[data-slot="menubar-checkbox-item"]').should(
      "contain.text",
      "Show toolbar"
    );
    cy.get('[data-slot="menubar-radio-item"]').should("have.length", 2);

    cy.get('[data-slot="menubar-sub-trigger"]')
      .should("contain.text", "More")
      .trigger("pointermove")
      .click();
    cy.get('[data-slot="menubar-sub-content"]')
      .should("be.visible")
      .and("contain.text", "Sub Item");
  });
});

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "./dropdown-menu";

function Demo() {
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState("one");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-cy="trigger">Open</DropdownMenuTrigger>
      <DropdownMenuContent className="my-content">
        <DropdownMenuLabel inset>Menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem inset>
            Item One
            <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={checked}
          onCheckedChange={setChecked}
        >
          Toggle me
        </DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value={radio} onValueChange={setRadio}>
          <DropdownMenuRadioItem value="one">One</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="two">Two</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="my-sub">
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("<DropdownMenu />", () => {
  it("opens and renders all menu parts including a submenu", () => {
    cy.mount(<Demo />);

    cy.get('[data-slot="dropdown-menu-content"]').should("not.exist");
    cy.get('[data-cy="trigger"]').click();

    cy.get('[data-slot="dropdown-menu-content"]')
      .should("be.visible")
      .and("have.class", "my-content");
    cy.get('[data-slot="dropdown-menu-label"]').should("contain.text", "Menu");
    cy.get('[data-slot="dropdown-menu-separator"]').should("have.length", 2);
    cy.get('[data-slot="dropdown-menu-item"]').should(
      "have.length.at.least",
      2
    );
    cy.get('[data-slot="dropdown-menu-shortcut"]').should("contain.text", "⌘1");
    cy.get('[data-slot="dropdown-menu-checkbox-item"]').should(
      "contain.text",
      "Toggle me"
    );
    cy.get('[data-slot="dropdown-menu-radio-item"]').should("have.length", 2);

    cy.get('[data-slot="dropdown-menu-sub-trigger"]')
      .should("contain.text", "More")
      .trigger("pointermove")
      .click();
    cy.get('[data-slot="dropdown-menu-sub-content"]')
      .should("be.visible")
      .and("contain.text", "Sub Item");
  });
});

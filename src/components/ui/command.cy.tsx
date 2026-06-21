import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./command";

describe("<Command />", () => {
  it("renders the command palette and filters items via input", () => {
    cy.mount(
      <Command className="my-command">
        <CommandInput placeholder="Type a command..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              Calendar
              <CommandShortcut>Cal</CommandShortcut>
            </CommandItem>
            <CommandItem>Search Emoji</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>Profile</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    cy.get('[data-slot="command"]').should("have.class", "my-command");
    cy.get('[data-slot="command-input-wrapper"]').should("exist");
    cy.get('[data-slot="command-input"]').should("exist");
    cy.get('[data-slot="command-list"]').should("exist");
    cy.get('[data-slot="command-group"]').should("have.length", 2);
    cy.get('[data-slot="command-separator"]').should("exist");
    cy.get('[data-slot="command-shortcut"]').should("contain.text", "Cal");
    cy.get('[data-slot="command-item"]').should("contain.text", "Calendar");

    // Type a query that matches nothing so CommandEmpty renders.
    cy.get('[data-slot="command-input"]').type("zzzzzz");
    cy.get('[data-slot="command-empty"]').should(
      "contain.text",
      "No results found."
    );

    // Narrow then widen the query to exercise the filter-to-matches branch.
    cy.get('[data-slot="command-input"]').clear().type("Cal");
    cy.get('[data-slot="command-item"]').should("contain.text", "Calendar");
  });

  it("renders CommandDialog with default title/description and close button", () => {
    cy.mount(
      <CommandDialog open>
        <CommandInput placeholder="Type..." />
        <CommandList>
          <CommandEmpty>Nothing</CommandEmpty>
          <CommandGroup heading="Group">
            <CommandItem>Alpha</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    );
    // Dialog renders into a portal; the default title/description are sr-only.
    cy.get('[data-slot="command-input"]').should("exist");
    cy.get('[data-slot="command-item"]').should("contain.text", "Alpha");
  });

  it("renders CommandDialog with explicit props and no close button", () => {
    cy.mount(
      <CommandDialog
        open
        title="My Palette"
        description="My description"
        showCloseButton={false}
        className="dialog-extra"
      >
        <CommandInput placeholder="Type..." />
        <CommandList>
          <CommandItem>Beta</CommandItem>
        </CommandList>
      </CommandDialog>
    );
    cy.get('[data-slot="command-item"]').should("contain.text", "Beta");
  });
});

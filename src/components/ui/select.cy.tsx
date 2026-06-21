import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

describe("<Select />", () => {
  it("renders trigger, opens content and selects an item", () => {
    cy.mount(
      <Select>
        <SelectTrigger className="my-trigger" size="sm">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectSeparator />
            <SelectItem value="banana">Banana</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    cy.get('[data-slot="select-trigger"]')
      .should("have.class", "my-trigger")
      .and("have.attr", "data-size", "sm")
      .click();

    cy.get('[data-slot="select-content"]').should("be.visible");
    cy.get('[data-slot="select-label"]').should("have.text", "Fruits");
    cy.get('[data-slot="select-separator"]').should("exist");
    cy.get('[data-slot="select-item"]').should("have.length", 2);

    cy.contains('[data-slot="select-item"]', "Banana").click();
    cy.get('[data-slot="select-trigger"]').should("contain.text", "Banana");
  });

  it("uses the default trigger size when size is omitted", () => {
    cy.mount(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );
    cy.get('[data-slot="select-trigger"]').should(
      "have.attr",
      "data-size",
      "default"
    );
  });
});

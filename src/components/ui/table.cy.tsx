import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";

describe("<Table />", () => {
  it("renders every table part", () => {
    cy.mount(
      <Table className="my-table">
        <TableCaption>A list of items</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Alpha</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );

    cy.get('[data-slot="table-container"]').should("exist");
    cy.get('[data-slot="table"]').should("have.class", "my-table");
    cy.get('[data-slot="table-header"]').should("exist");
    cy.get('[data-slot="table-body"]').should("exist");
    cy.get('[data-slot="table-footer"]').should("exist");
    cy.get('[data-slot="table-row"]').should("have.length", 3);
    cy.get('[data-slot="table-head"]').should("have.length", 2);
    cy.get('[data-slot="table-cell"]').should("have.length", 4);
    cy.get('[data-slot="table-caption"]').should("have.text", "A list of items");
  });
});

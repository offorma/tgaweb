import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "./pagination";

describe("<Pagination />", () => {
  it("renders all pagination parts", () => {
    cy.mount(
      <Pagination className="my-pagination">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );

    cy.get('[data-slot="pagination"]').should("have.class", "my-pagination");
    cy.get('[data-slot="pagination-content"]').should("exist");
    cy.get('[data-slot="pagination-item"]').should("have.length", 5);
    cy.get('[data-slot="pagination-link"]').should("have.length.at.least", 4);
    cy.get('[data-slot="pagination-link"][data-active="true"]')
      .should("have.attr", "aria-current", "page")
      .and("contain.text", "2");
    cy.get('[aria-label="Go to previous page"]').should("exist");
    cy.get('[aria-label="Go to next page"]').should("exist");
    cy.get('[data-slot="pagination-ellipsis"]').should("exist");
  });
});

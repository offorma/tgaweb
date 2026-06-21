import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./breadcrumb";

describe("<Breadcrumb />", () => {
  it("renders every breadcrumb sub-component", () => {
    cy.mount(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    cy.get('[data-slot="breadcrumb"]').should("have.attr", "aria-label", "breadcrumb");
    cy.get('[data-slot="breadcrumb-list"]').should("exist");
    cy.get('[data-slot="breadcrumb-link"]').should("contain.text", "Home");
    cy.get('[data-slot="breadcrumb-separator"]').should("have.length", 2);
    cy.get('[data-slot="breadcrumb-ellipsis"]').should("exist");
    cy.get('[data-slot="breadcrumb-page"]')
      .should("contain.text", "Current")
      .and("have.attr", "aria-current", "page");
  });

  it("supports BreadcrumbLink with asChild", () => {
    cy.mount(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/x">As Child</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    cy.get('a[data-slot="breadcrumb-link"]').should("contain.text", "As Child");
  });
});

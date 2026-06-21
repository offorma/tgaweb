import { Skeleton } from "./skeleton";

describe("<Skeleton />", () => {
  it("renders with default classes", () => {
    cy.mount(<Skeleton />);
    cy.get('[data-slot="skeleton"]')
      .should("exist")
      .and("have.class", "animate-pulse")
      .and("have.class", "rounded-md");
  });

  it("merges custom className and forwards props", () => {
    cy.mount(<Skeleton className="h-10 w-20 my-skel" data-testid="sk" />);
    cy.get('[data-slot="skeleton"]')
      .should("have.class", "my-skel")
      .and("have.attr", "data-testid", "sk");
  });
});

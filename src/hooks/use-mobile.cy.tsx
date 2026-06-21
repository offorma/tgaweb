import { useIsMobile } from "./use-mobile";

function Harness() {
  const isMobile = useIsMobile();
  return <div data-cy="is-mobile">{String(isMobile)}</div>;
}

describe("useIsMobile", () => {
  it("returns true on a narrow (mobile) viewport", () => {
    cy.viewport(375, 667);
    cy.mount(<Harness />);
    cy.get('[data-cy="is-mobile"]').should("have.text", "true");
  });

  it("returns false on a wide (desktop) viewport", () => {
    cy.viewport(1280, 800);
    cy.mount(<Harness />);
    cy.get('[data-cy="is-mobile"]').should("have.text", "false");
  });

  it("reacts to a viewport change via the matchMedia listener", () => {
    cy.viewport(1280, 800);
    cy.mount(<Harness />);
    cy.get('[data-cy="is-mobile"]').should("have.text", "false");
    cy.viewport(375, 667);
    cy.get('[data-cy="is-mobile"]').should("have.text", "true");
  });
});

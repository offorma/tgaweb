import { QuickActionLink, StatCardLink } from "./dashboard-links";
import { GraduationCap } from "lucide-react";

describe("<QuickActionLink />", () => {
  it("renders the link with label, href, icon and shows tooltip on hover", () => {
    cy.mount(
      <QuickActionLink
        href="/admin/programs"
        label="Manage Programs"
        color="from-orange-400 to-orange-600"
        tip="Edit the academic programs"
        icon={<GraduationCap data-cy="qa-icon" />}
      />
    );
    cy.contains("a", "Manage Programs").should("have.attr", "href", "/admin/programs");
    cy.get('[data-cy="qa-icon"]').should("exist");
    cy.contains("a", "Manage Programs").focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Edit the academic programs");
  });
});

describe("<StatCardLink />", () => {
  it("renders the stat value, label, href, icon and shows tooltip on hover", () => {
    cy.mount(
      <StatCardLink
        href="/admin/faculty"
        value={42}
        label="Faculty"
        tip="Total faculty members"
        icon={<GraduationCap data-cy="stat-icon" />}
      />
    );
    cy.contains("a", "Faculty").should("have.attr", "href", "/admin/faculty");
    cy.contains("42").should("exist");
    cy.get('[data-cy="stat-icon"]').should("exist");
    cy.contains("a", "Faculty").focus();
    cy.get('[data-slot="tooltip-content"]').should("contain.text", "Total faculty members");
  });
});

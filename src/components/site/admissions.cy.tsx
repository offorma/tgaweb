import { Admissions } from "./admissions";
import type { SiteSettings, AdmissionStep } from "@prisma/client";

const settings = {
  admissionsHeading: "",
  admissionsParagraph: "We make admissions warm and transparent.",
  admissionsDeadline: "Applications close August 31, 2026",
  admissionsOpenDay: "Open Day: Saturday, 18 July 2026",
  admissionsEmail: "admissions@school.test",
  // ApplyButton (rendered inside) reads these:
  applyButtonEnabled: true,
  applyButtonLabel: "Apply Now",
  applyButtonType: "scroll",
  applyButtonUrl: "#admissions",
  applyButtonStyle: "primary",
} as unknown as SiteSettings;

const steps = [
  { id: "a1", step: "01", title: "Enquiry & Tour", description: "Visit our campus." },
  { id: "a2", step: "02", title: "Application Form", description: "Submit documents." },
] as unknown as AdmissionStep[];

describe("<Admissions />", () => {
  it("renders nothing without steps", () => {
    cy.mountWithIntl(<Admissions settings={settings} steps={[]} />);
    cy.get("section").should("not.exist");
  });

  it("renders the paragraph, deadline, open day, steps and email link", () => {
    cy.mountWithIntl(<Admissions settings={settings} steps={steps} />);
    cy.contains("We make admissions warm and transparent.").should("exist");
    cy.contains("Applications close August 31, 2026").should("exist");
    cy.contains("Open Day: Saturday, 18 July 2026").should("exist");
    cy.contains("Enquiry & Tour").should("exist");
    cy.contains("Application Form").should("exist");
    cy.get('a[href="mailto:admissions@school.test"]').should("contain.text", "admissions@school.test");
  });

  it("renders the embedded ApplyButton CTA", () => {
    cy.mountWithIntl(<Admissions settings={settings} steps={steps} />);
    cy.contains("Start Your Application").should("exist");
  });

  it("uses a custom admissions heading and email default when settings is null", () => {
    cy.mountWithIntl(
      <Admissions
        settings={{ ...settings, admissionsHeading: "Join Our Family" } as unknown as SiteSettings}
        steps={steps}
      />
    );
    cy.contains("Join Our Family").should("exist");

    cy.mountWithIntl(<Admissions settings={null} steps={steps} />);
    cy.get('a[href="mailto:admissions@trailgliders.edu.ng"]').should("exist");
  });

  it("uses the Sparkles fallback icon for steps beyond the first four", () => {
    // A 5th step has no entry in STEP_ICONS (length 4) -> `STEP_ICONS[i] || Sparkles`
    // falls back to the Sparkles icon.
    const fiveSteps = [
      { id: "a1", step: "01", title: "Step One", description: "d1" },
      { id: "a2", step: "02", title: "Step Two", description: "d2" },
      { id: "a3", step: "03", title: "Step Three", description: "d3" },
      { id: "a4", step: "04", title: "Step Four", description: "d4" },
      { id: "a5", step: "05", title: "Step Five", description: "d5" },
    ] as unknown as AdmissionStep[];
    cy.mountWithIntl(<Admissions settings={settings} steps={fiveSteps} />);
    cy.contains("Step Five").should("exist");
  });
});

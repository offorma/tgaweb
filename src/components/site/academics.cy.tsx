import { Academics } from "./academics";
import type { Program } from "@prisma/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

// next/link needs an App Router context to mount outside a Next app.
const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  refresh: () => {},
} as never;
function withRouter(node: React.ReactNode) {
  return <AppRouterContext.Provider value={mockRouter}>{node}</AppRouterContext.Provider>;
}

const programs = [
  {
    id: "p1",
    slug: "early-years",
    name: "Early Years",
    ages: "Ages 3 - 5",
    image: "/images/library.jpg",
    color: "orange",
    tagline: "Where wonder takes flight",
    description: "A play-based foundation.",
    features: "Phonics\nNumeracy\nCreative arts",
  },
  {
    id: "p2",
    slug: "lower-primary",
    name: "Lower Primary",
    ages: "Primary 1 - 3",
    image: "/images/computer-lab.jpg",
    color: "navy",
    tagline: "Building foundations",
    description: "Structured literacy and numeracy.",
    features: "English\nMaths\nScience",
  },
  {
    id: "p3",
    slug: "upper-primary",
    name: "Upper Primary",
    ages: "Primary 4 - 6",
    image: "/images/science.jpg",
    color: "unknowncolor",
    tagline: "Gliding beyond limits",
    description: "Critical thinking and leadership.",
    features: "Coaching\nLeadership",
  },
] as unknown as Program[];

describe("<Academics />", () => {
  it("renders nothing when there are no programs", () => {
    cy.mountWithIntl(withRouter(<Academics programs={[]} />));
    cy.get("section").should("not.exist");
  });

  it("shows the first program's details and its parsed feature list", () => {
    cy.mountWithIntl(withRouter(<Academics programs={programs} />));
    cy.contains("A play-based foundation.").should("exist");
    cy.contains("Phonics").should("exist");
    cy.contains("Numeracy").should("exist");
    cy.contains("Creative arts").should("exist");
    // The detail "Learn more" link points at the active program slug.
    cy.get('a[href="/academics/early-years"]').should("exist");
  });

  it("switches the active program when a tab is clicked", () => {
    cy.mountWithIntl(withRouter(<Academics programs={programs} />));
    cy.contains("button", "Lower Primary").click();
    cy.contains("Structured literacy and numeracy.").should("exist");
    cy.contains("English").should("exist");
    cy.get('a[href="/academics/lower-primary"]').should("exist");

    // Unknown color falls back to the orange style without crashing.
    cy.contains("button", "Upper Primary").click();
    cy.contains("Critical thinking and leadership.").should("exist");
  });

  it("scrolls to #contact when 'book consultation' is clicked", () => {
    cy.mountWithIntl(
      withRouter(
        <div>
          <Academics programs={programs} />
          <div id="contact">contact target</div>
        </div>
      )
    );
    cy.get("#contact").then(($el) => cy.stub($el[0], "scrollIntoView").as("scrollSpy"));
    cy.get("button").contains(/book|consultation/i).click();
    cy.get("@scrollSpy").should("have.been.called");
  });
});

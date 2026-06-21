import { WhyUs } from "./why-us";

// NOTE: cards use framer-motion `whileInView`, which keeps them at opacity:0
// until they enter the viewport. In the mounted component harness that
// in-view trigger does not fire reliably, so we assert presence/text rather
// than CSS visibility.

describe("<WhyUs />", () => {
  it("renders the section and all six selling points", () => {
    cy.mountWithIntl(<WhyUs />);
    cy.get("section").should("exist");
    cy.contains("Top-Ranked in Nsukka").should("exist");
    cy.contains("Small Class Sizes").should("exist");
    cy.contains("Modern STEM Labs").should("exist");
    cy.contains("Safe & Secure Campus").should("exist");
    cy.contains("Door-to-Door Transport").should("exist");
    cy.contains("Healthy Meal Plans").should("exist");
    cy.get("h3").should("have.length", 6);
  });
});

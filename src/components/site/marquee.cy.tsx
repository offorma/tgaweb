import { Marquee } from "./marquee";
import type { SiteSettings } from "@prisma/client";

const settings = {
  motto: "Knowledge First",
  tagline: "Glide Beyond Limits",
  founded: 2009,
  location: "Nsukka, Enugu State",
} as unknown as SiteSettings;

describe("<Marquee />", () => {
  it("renders settings-derived items (duplicated for the scrolling loop)", () => {
    cy.mountWithIntl(<Marquee settings={settings} />);
    // Each item is duplicated (two passes) for the seamless marquee loop.
    cy.contains("Knowledge First").should("exist");
    cy.contains("Glide Beyond Limits").should("exist");
    cy.contains("Since 2009").should("exist");
    cy.contains("Nsukka, Enugu State").should("exist");
    cy.get(".animate-marquee > div").should("have.length", 2);
  });

  it("falls back to translated/default copy when settings are null", () => {
    cy.mountWithIntl(<Marquee settings={null} />);
    cy.contains("Since 2009").should("exist");
    cy.contains("Excellence as You Glide Beyond Limits").should("exist");
  });
});

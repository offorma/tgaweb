import { About } from "./about";
import type { SiteSettings, Value } from "@prisma/client";

// Section content is wrapped in framer-motion `whileInView` (opacity:0 until in
// view), so we assert presence/text rather than CSS visibility here.

const settings = {
  aboutHeading: "",
  aboutParagraph: "We nurture confident, curious learners.",
  missionText: "Our mission is to teach character.",
  visionText: "Our vision is global excellence.",
  founded: 2009,
} as unknown as SiteSettings;

const values = [
  { id: "v1", icon: "BookOpen", title: "Academic Excellence", description: "Rigorous curriculum." },
  { id: "v2", icon: "Heart", title: "Character Formation", description: "Value-based discipline." },
  { id: "v3", icon: "UnknownIcon", title: "Creative Expression", description: "Art and music." },
] as unknown as Value[];

describe("<About />", () => {
  it("renders mission, vision, paragraph and the values grid", () => {
    cy.mountWithIntl(<About settings={settings} values={values} />);
    cy.contains("We nurture confident, curious learners.").should("exist");
    cy.contains("Our mission is to teach character.").should("exist");
    cy.contains("Our vision is global excellence.").should("exist");
    cy.contains("Academic Excellence").should("exist");
    cy.contains("Character Formation").should("exist");
    // Unknown icon name still renders (falls back to the Sparkles icon).
    cy.contains("Creative Expression").should("exist");
  });

  it("uses the settings aboutHeading when provided", () => {
    cy.mountWithIntl(
      <About settings={{ ...settings, aboutHeading: "A Custom Heading" } as unknown as SiteSettings} values={[]} />
    );
    cy.contains("A Custom Heading").should("exist");
  });

  it("falls back to the translated heading and defaults when settings is null", () => {
    cy.mountWithIntl(<About settings={null} values={[]} />);
    cy.get("#about").should("exist");
    cy.get("h2").should("exist");
  });
});

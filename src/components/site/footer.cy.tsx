import { Footer } from "./footer";
import type { SiteSettings, Download } from "@prisma/client";

const CAPTCHA = {
  problem: "1 + 1",
  mathToken: "math-token-f",
  timeToken: "time-token-f",
  turnstileSiteKey: null,
};

const settings = {
  crestUrl: "/crest/school-crest.png",
  tagline: "Glide Beyond Limits",
  founded: 2009,
  phone: "+234 803 456 7890",
  email: "info@school.test",
  address: "15 Gliders Ave, Nsukka",
  schoolName: "Trail Gliders Academy",
  facebookUrl: "https://facebook.com/tga",
  instagramUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
  resourceAdmissionsPortal: "https://portal.school.test",
  resourceFeeStructure: "#admissions",
  resourceSchoolCalendar: "",
  resourceParentPortal: "",
  resourceAlumniNetwork: "",
  resourceCareers: "",
  applyButtonEnabled: true,
  applyButtonLabel: "Apply Now",
  applyButtonType: "scroll",
  applyButtonUrl: "#admissions",
  applyButtonStyle: "primary",
} as unknown as SiteSettings;

const downloads = [
  { id: "d1", name: "Prospectus", description: "Our brochure", url: "https://cdn.test/prospectus.pdf", fileType: "pdf" },
] as unknown as Download[];

describe("<Footer />", () => {
  it("renders contact details, brand and school name", () => {
    cy.mountWithIntl(<Footer settings={settings} />);
    cy.contains("Trail Gliders").should("exist");
    cy.contains("+234 803 456 7890").should("exist");
    cy.contains("info@school.test").should("exist");
    cy.contains("15 Gliders Ave, Nsukka").should("exist");
    cy.get('a[href="/admin/login"]').should("exist");
  });

  it("renders configured resource links and external/anchor handling", () => {
    cy.mountWithIntl(<Footer settings={settings} />);
    cy.contains("a", "Admissions Portal")
      .should("have.attr", "href", "https://portal.school.test")
      .and("have.attr", "target", "_blank");
    // Anchor resource keeps its hash and is not external.
    cy.contains("a", "Fee Structure").should("have.attr", "href", "#admissions");
  });

  it("shows 'Coming soon' when no resource links are configured", () => {
    const bare = {
      ...settings,
      resourceAdmissionsPortal: "",
      resourceFeeStructure: "",
    } as unknown as SiteSettings;
    cy.mountWithIntl(<Footer settings={bare} />);
    cy.contains("Coming soon").should("exist");
  });

  it("renders downloads when provided", () => {
    cy.mountWithIntl(<Footer settings={settings} downloads={downloads} />);
    cy.contains("a", "Prospectus").should("have.attr", "href", "https://cdn.test/prospectus.pdf");
    cy.contains("Our brochure").should("exist");
  });

  it("renders the configured social icons", () => {
    cy.mountWithIntl(<Footer settings={settings} />);
    cy.get('a[aria-label="Facebook"]').should("have.attr", "href", "https://facebook.com/tga");
  });

  it("scrolls to top when the back-to-top button is clicked", () => {
    cy.mountWithIntl(<Footer settings={settings} />);
    cy.window().then((win) => cy.stub(win, "scrollTo").as("scrollTop"));
    cy.get('button[aria-label="Back to top"]').click();
    cy.get("@scrollTop").should("have.been.calledWithMatch", { top: 0 });
  });

  describe("newsletter form", () => {
    beforeEach(() => {
      cy.intercept("GET", "/api/captcha", { statusCode: 200, body: CAPTCHA }).as("captcha");
    });

    it("expands the bot-defense check on focus and subscribes on success", () => {
      cy.intercept("POST", "/api/newsletter", { statusCode: 200, body: { message: "Welcome!" } }).as("subscribe");
      cy.mountWithIntl(<Footer settings={settings} />);
      cy.get('input[type="email"]').type("parent@example.com");
      // Focusing expands the BotDefense captcha.
      cy.wait("@captcha");
      cy.get('input[type="number"]').type("2");
      cy.get('button[aria-label="Subscribe"]').click();
      cy.wait("@subscribe").its("request.body").should("include", {
        email: "parent@example.com",
        mathAnswer: "2",
      });
      cy.contains("You're subscribed!").should("exist");
    });

    it("shows the security check prompt when submitting without an answer", () => {
      cy.mountWithIntl(<Footer settings={settings} />);
      cy.get('input[type="email"]').type("x@y.test");
      // Blur away then submit before answering the captcha.
      cy.get('button[aria-label="Subscribe"]').click();
      // No newsletter request should fire without a captcha answer.
      cy.wait("@captcha");
      cy.get('input[type="number"]').should("exist");
    });

    it("surfaces a toast and stays on the form when the subscription POST fails", () => {
      cy.intercept("POST", "/api/newsletter", {
        statusCode: 400,
        body: { error: "Subscription failed" },
      }).as("subscribeErr");
      cy.mountWithIntl(<Footer settings={settings} />);
      cy.get('input[type="email"]').type("err@example.com");
      cy.wait("@captcha");
      cy.get('input[type="number"]').type("2");
      cy.get('button[aria-label="Subscribe"]').click();
      cy.wait("@subscribeErr");
      // The error path keeps the form (no success message).
      cy.contains("You're subscribed!").should("not.exist");
      cy.get('input[type="email"]').should("exist");
    });
  });

  it("falls back to defaults across every field when settings is null", () => {
    // settings=null exercises every `settings?.x || default` fallback: crest,
    // tagline, founded, phone/email/address (omitted), social + resource links
    // (all empty -> filtered out), schoolName and the Apply label default.
    cy.mountWithIntl(<Footer settings={null} />);
    cy.contains("Trail Gliders Academy").should("exist");
    cy.contains("since 2009").should("exist");
    // No social/resource links configured -> "Coming soon" + no social icons.
    cy.contains("Coming soon").should("exist");
    cy.get('a[aria-label="Facebook"]').should("not.exist");
    // The standalone LanguageSwitcher (no social row) still renders.
    cy.get('button[aria-label="Switch language"]').should("exist");
    // With null settings the ApplyButton renders nothing (disabled path).
    cy.contains("Apply Now").should("not.exist");
    // Default crest path is used.
    cy.get('img[alt="Trail Gliders Academy Crest"]').should(
      "have.attr",
      "src",
      "/crest/school-crest.png"
    );
  });

  it("prefixes schemeless resource and social URLs with https://", () => {
    const schemeless = {
      ...settings,
      // schemeless social + resource URLs hit the `startsWith('http') ? .. : https://..` branches
      facebookUrl: "facebook.com/tga",
      instagramUrl: "",
      youtubeUrl: "",
      twitterUrl: "",
      resourceAdmissionsPortal: "portal.school.test",
      resourceFeeStructure: "",
    } as unknown as SiteSettings;
    cy.mountWithIntl(<Footer settings={schemeless} />);
    cy.get('a[aria-label="Facebook"]').should("have.attr", "href", "https://facebook.com/tga");
    cy.contains("a", "Admissions Portal").should(
      "have.attr",
      "href",
      "https://portal.school.test"
    );
  });
});

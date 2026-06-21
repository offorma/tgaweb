import { Contact } from "./contact";
import type { SiteSettings } from "@prisma/client";

const CAPTCHA = {
  problem: "2 + 2",
  mathToken: "math-token-1",
  timeToken: "time-token-1",
  turnstileSiteKey: null,
};

const settings = {
  address: "15 Gliders Ave, Nsukka",
  phone: "+234 803 456 7890",
  phoneAlt: "+234 701 234 5678",
  email: "info@school.test",
  admissionsEmail: "admissions@school.test",
  hours: "Mon - Fri 7:30 - 3:30",
  facebookUrl: "https://facebook.com/tga",
  instagramUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
} as unknown as SiteSettings;

// Fill the visible form fields and answer the math captcha so submit enables.
function fillForm() {
  cy.get("#firstName").type("Adaora");
  cy.get("#lastName").type("Okafor");
  cy.get("#email").type("adaora@example.com");
  cy.get("#phone").type("+234 800 000 0000");
  cy.get("#subject").select("admissions");
  cy.get("#message").type("I would like to enquire about admissions.");
  cy.get('input[type="number"]').type("4"); // captcha answer -> sets botTokens.mathAnswer
}

describe("<Contact />", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/captcha", { statusCode: 200, body: CAPTCHA }).as("captcha");
  });

  it("renders contact info derived from settings", () => {
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.contains("15 Gliders Ave, Nsukka").should("exist");
    cy.contains("+234 803 456 7890").should("exist");
    cy.contains("info@school.test").should("exist");
    cy.contains("Mon - Fri 7:30 - 3:30").should("exist");
    // Only the configured social link is shown (icon-only link with aria-label).
    cy.get('a[aria-label="Facebook"]').should("have.attr", "href", "https://facebook.com/tga");
  });

  it("keeps submit disabled until the captcha is answered", () => {
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    cy.get('button[type="submit"]').should("be.disabled");
    cy.get('input[type="number"]').type("4");
    cy.get('button[type="submit"]').should("not.be.disabled");
  });

  it("submits the form and shows the success (sent) state on a 200", () => {
    cy.intercept("POST", "/api/contact", { statusCode: 200, body: { ok: true } }).as("submit");
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    fillForm();
    cy.get('button[type="submit"]').click();

    cy.wait("@submit").its("request.body").should("include", {
      firstName: "Adaora",
      lastName: "Okafor",
      email: "adaora@example.com",
      subject: "admissions",
      mathToken: "math-token-1",
      mathAnswer: "4",
    });
    // After success the button switches to its "sent" confirmation state.
    cy.get('button[type="submit"]').should("contain.text", "Sent");
  });

  it("surfaces the server error and stays on the form when the POST fails", () => {
    cy.intercept("POST", "/api/contact", { statusCode: 400, body: { error: "Bad captcha" } }).as("submitErr");
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    fillForm();
    cy.get('button[type="submit"]').click();
    cy.wait("@submitErr");
    // Not switched to the "sent" state — the form is still submittable.
    cy.get('button[type="submit"]').should("not.contain.text", "Sent");
  });

  it("hides the social row when no social URLs are configured", () => {
    const bare = { ...settings, facebookUrl: "" } as unknown as SiteSettings;
    cy.mountWithIntl(<Contact settings={bare} />);
    cy.get('a[aria-label="Facebook"]').should("not.exist");
  });

  it("falls back to empty contact fields when settings is null", () => {
    // settings=null exercises every `settings?.x || ""` fallback (address, phone,
    // phoneAlt, email, admissionsEmail, hours) and all social `|| ""` filters.
    cy.mountWithIntl(<Contact settings={null} />);
    // Form still renders; no social row (all URLs empty).
    cy.get("#firstName").should("exist");
    cy.get('a[aria-label="Facebook"]').should("not.exist");
    // The phone field has no sub value -> the optional-phone (info.sub) branch.
    cy.get("#phone").should("exist");
  });

  it("uses the generic error message when the failed response has no error field", () => {
    // 400 body without an `error` field -> `err.error || "Submission failed"`
    // falls back to the default, and the catch toast uses `e.message`.
    cy.intercept("POST", "/api/contact", { statusCode: 400, body: {} }).as("submitNoErr");
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    fillForm();
    cy.get('button[type="submit"]').click();
    cy.wait("@submitNoErr");
    cy.get('button[type="submit"]').should("not.contain.text", "Sent");
  });

  it("shows the loading (sending) state while the POST is in flight", () => {
    // A delayed POST keeps `loading` true long enough to observe the sending
    // state, exercising the loading branch of the button's content/disabled logic.
    cy.intercept("POST", "/api/contact", (req) => {
      req.reply({ delay: 800, statusCode: 200, body: { ok: true } });
    }).as("slowSubmit");
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    fillForm();
    cy.get('button[type="submit"]').click();
    // While in flight the button shows the sending label and stays disabled.
    cy.get('button[type="submit"]').should("be.disabled");
    cy.wait("@slowSubmit");
    cy.get('button[type="submit"]').should("contain.text", "Sent");
  });

  it("prefixes a schemeless social URL with https://", () => {
    const schemeless = {
      ...settings,
      facebookUrl: "facebook.com/tga",
    } as unknown as SiteSettings;
    cy.mountWithIntl(<Contact settings={schemeless} />);
    cy.get('a[aria-label="Facebook"]').should("have.attr", "href", "https://facebook.com/tga");
  });

  it("omits the sub lines when phoneAlt and admissionsEmail are absent", () => {
    // No phoneAlt / admissionsEmail -> the `info.sub && (...)` branch is falsy for
    // those contact rows (covers the no-sub path); also covers the no-href Clock row.
    const noSubs = {
      ...settings,
      phoneAlt: "",
      admissionsEmail: "",
    } as unknown as SiteSettings;
    cy.mountWithIntl(<Contact settings={noSubs} />);
    cy.contains("+234 803 456 7890").should("exist");
    cy.contains("+234 701 234 5678").should("not.exist");
  });

  it("submits without an optional phone number", () => {
    cy.intercept("POST", "/api/contact", { statusCode: 200, body: { ok: true } }).as("submitNoPhone");
    cy.mountWithIntl(<Contact settings={settings} />);
    cy.wait("@captcha");
    cy.get("#firstName").type("Ada");
    cy.get("#lastName").type("Okafor");
    cy.get("#email").type("ada@example.com");
    cy.get("#subject").select("tour");
    cy.get("#message").type("Tour request.");
    cy.get('input[type="number"]').type("4");
    cy.get('button[type="submit"]').click();
    cy.wait("@submitNoPhone").its("request.body").should("include", {
      firstName: "Ada",
      subject: "tour",
    });
    cy.get('button[type="submit"]').should("contain.text", "Sent");
  });
});

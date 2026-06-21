import { LanguageSwitcher } from "./language-switcher";

describe("<LanguageSwitcher />", () => {
  it("shows the current locale and is collapsed by default", () => {
    cy.mountWithIntl(<LanguageSwitcher />);
    cy.get('button[aria-label="Switch language"]')
      .should("have.attr", "aria-expanded", "false")
      .and("contain.text", "English");
    cy.contains("Français").should("not.exist");
  });

  it("opens the menu listing every locale and marks the active one", () => {
    cy.mountWithIntl(<LanguageSwitcher />);
    cy.get('button[aria-label="Switch language"]').click();
    cy.get('button[aria-label="Switch language"]').should("have.attr", "aria-expanded", "true");
    cy.contains("Français").should("be.visible");
    cy.contains("Hausa").should("be.visible");
    cy.contains("Igbo").should("be.visible");
    cy.contains("Yorùbá").should("be.visible");
    // The active (English) row shows a check icon.
    cy.get(".lucide-check").should("exist");
  });

  it("posts the chosen locale to /api/set-locale (then triggers a reload)", () => {
    cy.mountWithIntl(<LanguageSwitcher />);
    // The component POSTs the locale to /api/set-locale and then, in a
    // .finally(), calls window.location.reload(). In the Cypress component-test
    // iframe window.location.reload is an own, non-configurable, non-writable
    // property, so it cannot be stubbed (cy.stub throws "Cannot stub
    // non-existent own property"); letting the real reload run reloads the
    // iframe and crashes the runner mid-spec.
    //
    // We therefore stub window.fetch to return a never-resolving promise: the
    // request is still issued (so we can assert its URL + body), but the
    // .finally() that would call reload never runs. This verifies the click is
    // wired to a POST of the chosen locale — the meaningful, verifiable
    // behaviour — without the un-stubbable hard reload.
    cy.window().then((win) => {
      cy.stub(win, "fetch").returns(new Promise(() => {})).as("fetch");
    });
    cy.get('button[aria-label="Switch language"]').click();
    cy.contains("Français").click();
    cy.get("@fetch").should("have.been.calledWithMatch", "/api/set-locale");
    cy.get("@fetch").then((stub: any) => {
      const opts = stub.getCall(0).args[1];
      expect(opts.method).to.eq("POST");
      expect(JSON.parse(opts.body)).to.deep.equal({ locale: "fr" });
    });
  });

  it("falls back to English labels for an unknown locale", () => {
    // An unrecognised locale -> `localeNames[currentLocale] || localeNames.en`
    // falls back to the English entry.
    cy.mountWithIntl(<LanguageSwitcher />, "xx");
    cy.get('button[aria-label="Switch language"]').should("contain.text", "English");
  });

  it("closes when clicking outside the switcher", () => {
    cy.mountWithIntl(
      <div>
        <LanguageSwitcher />
        <div data-cy="outside" style={{ height: 50 }}>outside</div>
      </div>
    );
    cy.get('button[aria-label="Switch language"]').click();
    cy.contains("Igbo").should("be.visible");
    cy.get('[data-cy="outside"]').click();
    cy.contains("Igbo").should("not.exist");
  });
});

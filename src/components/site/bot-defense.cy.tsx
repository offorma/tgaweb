import { BotDefense } from "./bot-defense";

const CAPTCHA = {
  problem: "3 + 4",
  mathToken: "math-token-abc",
  timeToken: "time-token-xyz",
  turnstileSiteKey: null,
};

describe("<BotDefense />", () => {
  beforeEach(() => {
    // Reset any Turnstile global / injected script leaked from a prior test so
    // each test controls the turnstile environment deterministically.
    cy.window().then((win) => {
      delete (win as any).turnstile;
    });
    cy.document().then((doc) => {
      doc
        .querySelectorAll('script[src*="challenges.cloudflare.com"]')
        .forEach((n) => n.remove());
    });
  });

  it("shows a loading state then the math captcha after fetching /api/captcha", () => {
    // Delay the response so the loading branch is observable.
    cy.intercept("GET", "/api/captcha", (req) => {
      req.reply({ delay: 150, statusCode: 200, body: CAPTCHA });
    }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.contains("Loading security check...").should("exist");
    cy.wait("@captcha");
    cy.contains("3 + 4").should("be.visible");
    cy.get('input[type="number"]').should("exist");
  });

  it("reports the math token and the typed answer through onTokensChange", () => {
    cy.intercept("GET", "/api/captcha", { statusCode: 200, body: CAPTCHA }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.wait("@captcha");
    // Tokens are pushed up after the fetch resolves.
    cy.get("@onTokens").should("have.been.calledWithMatch", {
      mathToken: "math-token-abc",
      timeToken: "time-token-xyz",
    });

    cy.get('input[type="number"]').type("7");
    cy.get("@onTokens").should("have.been.calledWithMatch", { mathAnswer: "7" });
  });

  it("refetches a fresh captcha when the refresh button is clicked", () => {
    let call = 0;
    cy.intercept("GET", "/api/captcha", (req) => {
      call += 1;
      req.reply({
        statusCode: 200,
        body: { ...CAPTCHA, problem: call === 1 ? "3 + 4" : "9 - 2", mathToken: `tok-${call}` },
      });
    }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.wait("@captcha");
    cy.contains("3 + 4").should("exist");
    cy.get('button[aria-label="New question"]').click();
    cy.wait("@captcha");
    cy.contains("9 - 2").should("exist");
  });

  it("renders custom labels and stays usable when the captcha fetch fails", () => {
    cy.intercept("GET", "/api/captcha", { statusCode: 500, body: {} }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(
      <BotDefense
        onTokensChange={onTokensChange}
        securityCheckLabel="Solve this"
        protectedSpamLabel="Spam shield active"
      />
    );
    cy.wait("@captcha");
    // Even on failure the component exits the loading state and shows its UI.
    cy.contains("Solve this").should("exist");
    cy.contains("Spam shield active").should("exist");
  });

  it("answers the math question and reports honeypot edits through onTokensChange", () => {
    cy.intercept("GET", "/api/captcha", { statusCode: 200, body: CAPTCHA }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.wait("@captcha");

    // Answer the visible math captcha.
    cy.get('input[type="number"]').type("7");
    cy.get("@onTokens").should("have.been.calledWithMatch", { mathAnswer: "7" });

    // The three honeypot fields are present (hidden) and editable; typing into
    // them flows through updateHoneypot -> onTokensChange.honeypots.
    cy.get('input[name="company"]').type("Acme", { force: true });
    cy.get("@onTokens").should("have.been.calledWithMatch", {
      honeypots: { company: "Acme", website_url: "", fax_number: "" },
    });
    cy.get('input[name="website_url"]').type("http://x", { force: true });
    cy.get("@onTokens").should("have.been.calledWithMatch", {
      honeypots: { company: "Acme", website_url: "http://x", fax_number: "" },
    });
    cy.get('input[name="fax_number"]').type("555", { force: true });
    cy.get("@onTokens").should("have.been.calledWithMatch", {
      honeypots: { company: "Acme", website_url: "http://x", fax_number: "555" },
    });
  });

  it("injects the Cloudflare script when it is not already present, then renders on load", () => {
    // No turnstile global yet -> renderTurnstile(on load) hits its early-return.
    cy.document().then((doc) => {
      doc
        .querySelectorAll('script[src*="challenges.cloudflare.com"]')
        .forEach((n) => n.remove());
    });
    cy.window().then((win) => {
      delete (win as any).turnstile;
    });

    cy.intercept("GET", "/api/captcha", {
      statusCode: 200,
      body: { ...CAPTCHA, turnstileSiteKey: "0xANOTHERKEY" },
    }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.wait("@captcha");

    // The widget container renders only when a site key is present.
    cy.get(".min-h-\\[65px\\]").should("exist");
    // The effect appended the Cloudflare api.js script tag.
    cy.get('script[src*="challenges.cloudflare.com"]').should("exist");

    // Fire onload while window.turnstile is absent -> renderTurnstile early-returns
    // at the `!(window).turnstile` guard.
    cy.get('script[src*="challenges.cloudflare.com"]').then(($s) => {
      const el = $s[0] as HTMLScriptElement;
      if (typeof el.onload === "function") el.onload(new Event("load"));
    });
  });

  it("renders the Turnstile widget via the already-loaded-script path and wires its callbacks", () => {
    // Ensure exactly one Cloudflare script is present so the
    // `document.querySelector(script)` truthy branch (script already loaded) runs,
    // and provide a fake global Turnstile so renderTurnstile proceeds to .render().
    cy.document().then((doc) => {
      doc
        .querySelectorAll('script[src*="challenges.cloudflare.com"]')
        .forEach((n) => n.remove());
      const s = doc.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      doc.head.appendChild(s);
    });
    cy.window().then((win) => {
      let cbs: any = {};
      (win as any).turnstile = {
        render: (_el: HTMLElement, opts: any) => {
          cbs = opts;
          return "widget-1";
        },
      };
      (win as any).__turnstileCbs = () => cbs;
    });

    cy.intercept("GET", "/api/captcha", {
      statusCode: 200,
      body: { ...CAPTCHA, turnstileSiteKey: "0xTESTSITEKEY" },
    }).as("captcha");
    const onTokensChange = cy.stub().as("onTokens");

    cy.mountWithIntl(<BotDefense onTokensChange={onTokensChange} />);
    cy.wait("@captcha");
    cy.get(".min-h-\\[65px\\]").should("exist");

    // Drive the Turnstile callbacks to cover the token set / clear branches.
    cy.window().then((win) => (win as any).__turnstileCbs().callback("turnstile-token-123"));
    cy.get("@onTokens").should("have.been.calledWithMatch", { turnstileToken: "turnstile-token-123" });
    cy.window().then((win) => (win as any).__turnstileCbs()["expired-callback"]());
    cy.window().then((win) => (win as any).__turnstileCbs()["error-callback"]());
    cy.get("@onTokens").should("have.been.calledWithMatch", { turnstileToken: null });
  });

  it("no-ops the Turnstile render when the global turnstile API has not loaded", () => {
    // Stub the real Cloudflare script so it does NOT define window.turnstile.
    // (Without this, the browser fetches the real api.js and a genuine
    // window.turnstile appears, so the `!(window).turnstile` guard never fires.)
    cy.intercept("GET", "https://challenges.cloudflare.com/turnstile/v0/api.js", {
      statusCode: 200,
      headers: { "content-type": "application/javascript" },
      body: "/* stubbed: no turnstile global */",
    });
    // Script already present so the effect takes the already-loaded path and
    // calls renderTurnstile synchronously, but window.turnstile is absent.
    cy.document().then((doc) => {
      const s = doc.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      doc.head.appendChild(s);
    });
    cy.window().then((win) => {
      delete (win as any).turnstile;
    });

    cy.intercept("GET", "/api/captcha", {
      statusCode: 200,
      body: { ...CAPTCHA, turnstileSiteKey: "0xNOGLOBAL" },
    }).as("captcha");

    cy.mountWithIntl(<BotDefense onTokensChange={cy.stub()} />);
    cy.wait("@captcha");
    // Container renders, but no widget is mounted (render no-ops at the
    // `!(window).turnstile` guard).
    cy.get(".min-h-\\[65px\\]").should("exist");
  });

  it("no-ops the Turnstile render once the container ref is gone (after unmount)", () => {
    // Stub the real script so it never auto-renders / defines turnstile.
    cy.intercept("GET", "https://challenges.cloudflare.com/turnstile/v0/api.js", {
      statusCode: 200,
      headers: { "content-type": "application/javascript" },
      body: "/* stubbed */",
    });
    cy.intercept("GET", "/api/captcha", {
      statusCode: 200,
      body: { ...CAPTCHA, turnstileSiteKey: "0xUNMOUNT" },
    }).as("captcha");

    cy.mountWithIntl(<BotDefense onTokensChange={cy.stub()} />);
    cy.wait("@captcha");
    cy.get(".min-h-\\[65px\\]").should("exist");

    // Capture the injected script's onload, unmount the component (ref.current
    // becomes null), then fire onload -> renderTurnstile hits the
    // `!turnstileContainerRef.current` early-return.
    cy.get('script[src*="challenges.cloudflare.com"]').then(($s) => {
      const el = $s[0] as HTMLScriptElement;
      const onload = el.onload as ((e: Event) => void) | null;
      // Provide a turnstile global so we get PAST the !window.turnstile guard,
      // isolating the ref guard. The render() should never be reached because
      // ref.current is null after unmount.
      cy.window().then((win) => {
        (win as any).turnstile = { render: () => "should-not-be-called" };
      });
      cy.then(() => {
        // Unmount by remounting an empty fragment into the same root.
        cy.mountWithIntl(<span data-cy="unmounted" />);
      });
      cy.get('[data-cy="unmounted"]').should("exist");
      cy.then(() => {
        if (typeof onload === "function") onload(new Event("load"));
      });
    });
  });
});

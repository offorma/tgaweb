import Page from "./page";

describe("<ForgotPasswordPage />", () => {
  it("renders the form with disabled submit until email entered", () => {
    cy.mount(<Page />);
    cy.contains("Reset Password").should("be.visible");
    cy.contains("Admin Portal").should("be.visible");
    cy.get("button[type=submit]").should("be.disabled");
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("button[type=submit]").should("not.be.disabled");
  });

  it("shows the success state after a successful request", () => {
    cy.intercept("POST", "/api/auth/forgot-password", {
      statusCode: 200,
      body: { ok: true },
    }).as("forgot");
    cy.mount(<Page />);
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("button[type=submit]").click();
    cy.wait("@forgot")
      .its("request.body")
      .should("deep.equal", { email: "admin@trailgliders.edu.ng" });
    cy.contains("Check your email").should("be.visible");
    cy.contains("admin@trailgliders.edu.ng").should("be.visible");
    // form is gone
    cy.get("#email").should("not.exist");
  });

  it("shows an error message when the request fails with an error body", () => {
    cy.intercept("POST", "/api/auth/forgot-password", {
      statusCode: 400,
      body: { error: "Rate limit exceeded" },
    }).as("forgot");
    cy.mount(<Page />);
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("button[type=submit]").click();
    cy.wait("@forgot");
    cy.contains("Rate limit exceeded").should("be.visible");
    // stays on the form
    cy.get("#email").should("exist");
  });

  it("falls back to a generic error when the body has no error field", () => {
    cy.intercept("POST", "/api/auth/forgot-password", {
      statusCode: 500,
      body: {},
    }).as("forgot");
    cy.mount(<Page />);
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("button[type=submit]").click();
    cy.wait("@forgot");
    cy.contains("Request failed").should("be.visible");
  });

  it("links back to sign in", () => {
    cy.mount(<Page />);
    cy.get('a[href="/admin/login"]').should("contain.text", "Back to sign in");
  });
});

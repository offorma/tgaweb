import React from "react";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { ReadonlyURLSearchParams } from "next/navigation";
import Page from "./page";

function mountWithToken(token: string | null) {
  const params = new URLSearchParams();
  if (token !== null) params.set("token", token);
  const readonly = new ReadonlyURLSearchParams(params);
  cy.mount(
    <SearchParamsContext.Provider value={readonly}>
      <Page />
    </SearchParamsContext.Provider>
  );
}

describe("<ResetPasswordPage />", () => {
  it("shows the invalid-token state when no token is present", () => {
    mountWithToken(null);
    cy.contains("Invalid Reset Link").should("be.visible");
    cy.get('a[href="/admin/forgot-password"]').should("exist");
    cy.get("#newPassword").should("not.exist");
  });

  it("renders the form when a token is present and gates submit on rules", () => {
    mountWithToken("valid-token-123");
    cy.contains("Set New Password").should("be.visible");
    cy.get("button[type=submit]").should("be.disabled");

    // Weak password — not all checks pass
    cy.get("#newPassword").type("short");
    cy.contains("At least 12 characters")
      .parent()
      .should("have.text", "At least 12 characters");
    cy.get("button[type=submit]").should("be.disabled");
  });

  it("toggles password visibility", () => {
    mountWithToken("valid-token-123");
    cy.get("#newPassword").should("have.attr", "type", "password");
    cy.get('button[tabindex="-1"]').click();
    cy.get("#newPassword").should("have.attr", "type", "text");
    cy.get('button[tabindex="-1"]').click();
    cy.get("#newPassword").should("have.attr", "type", "password");
  });

  it("enables submit when all strength checks pass and submits successfully", () => {
    cy.intercept("POST", "/api/auth/reset-password", {
      statusCode: 200,
      body: { ok: true },
    }).as("reset");
    mountWithToken("valid-token-123");

    const strong = "Abcdef12345!@#";
    cy.get("#newPassword").type(strong);
    cy.get("#confirmPassword").type(strong);
    cy.get("button[type=submit]").should("not.be.disabled").click();

    cy.wait("@reset").its("request.body").should("deep.equal", {
      token: "valid-token-123",
      newPassword: strong,
    });
    cy.contains("All set!").should("be.visible");
    cy.get('a[href="/admin/login"]').should("exist");
  });

  it("shows an error when the reset request fails", () => {
    cy.intercept("POST", "/api/auth/reset-password", {
      statusCode: 400,
      body: { error: "Token expired" },
    }).as("reset");
    mountWithToken("valid-token-123");

    const strong = "Abcdef12345!@#";
    cy.get("#newPassword").type(strong);
    cy.get("#confirmPassword").type(strong);
    cy.get("button[type=submit]").click();

    cy.wait("@reset");
    cy.contains("Token expired").should("be.visible");
  });

  it("falls back to a generic error when no error field is returned", () => {
    cy.intercept("POST", "/api/auth/reset-password", {
      statusCode: 500,
      body: {},
    }).as("reset");
    mountWithToken("valid-token-123");

    const strong = "Abcdef12345!@#";
    cy.get("#newPassword").type(strong);
    cy.get("#confirmPassword").type(strong);
    cy.get("button[type=submit]").click();

    cy.wait("@reset");
    cy.contains("Reset failed").should("be.visible");
  });
});

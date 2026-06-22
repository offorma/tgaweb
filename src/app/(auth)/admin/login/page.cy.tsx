// Shim process.env for next-auth/react — MUST be first.
import "@/test-utils-next-auth-env";
import React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  SearchParamsContext,
  PathnameContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { ReadonlyURLSearchParams } from "next/navigation";
import Page from "./page";

function mountLogin(search = "") {
  const pushSpy = cy.stub().as("push");
  const refreshSpy = cy.stub().as("refresh");
  const router = {
    push: pushSpy,
    replace: () => {},
    refresh: refreshSpy,
    back: () => {},
    forward: () => {},
    prefetch: () => Promise.resolve(),
  } as any;
  const params = new ReadonlyURLSearchParams(new URLSearchParams(search));
  cy.mount(
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value="/admin/login">
        <SearchParamsContext.Provider value={params}>
          <Page />
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

function stubCsrf() {
  cy.intercept("GET", "**/api/auth/csrf", {
    statusCode: 200,
    body: { csrfToken: "test-csrf" },
  }).as("csrf");
  cy.intercept("GET", "**/api/auth/session", {
    statusCode: 200,
    body: { user: { email: "admin@trailgliders.edu.ng" } },
  }).as("session");
  cy.intercept("GET", "**/api/auth/providers", {
    statusCode: 200,
    body: { credentials: { id: "credentials", name: "Credentials", type: "credentials" } },
  }).as("providers");
}

describe("<AdminLoginPage />", () => {
  beforeEach(() => {
    // next-auth background fetches must not hang/404.
    stubCsrf();
  });

  it("renders the login form and gates the submit button", () => {
        mountLogin();
    cy.contains("Trail Gliders Academy").should("be.visible");
    cy.get("button[type=submit]").should("be.disabled");
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("button[type=submit]").should("be.disabled");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").should("not.be.disabled");
  });

  it("toggles password visibility", () => {
        mountLogin();
    cy.get("#password").should("have.attr", "type", "password");
    cy.get('button[tabindex="-1"]').click();
    cy.get("#password").should("have.attr", "type", "text");
  });

  it("navigates to the dashboard on successful sign in", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 200,
      body: { url: "http://localhost:8080/admin/dashboard" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.get("@push").should("have.been.calledWith", "/admin/dashboard");
    cy.get("@refresh").should("have.been.called");
  });

  it("honours a safe 'from' redirect param", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 200,
      body: { url: "http://localhost:8080/admin/news" },
    }).as("callback");
    mountLogin("from=/admin/news");
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.get("@push").should("have.been.calledWith", "/admin/news");
  });

  it("ignores an unsafe (open-redirect) 'from' param", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 200,
      body: { url: "http://localhost:8080/admin/dashboard" },
    }).as("callback");
    mountLogin("from=//evil.com");
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.get("@push").should("have.been.calledWith", "/admin/dashboard");
  });

  it("shows an error message on invalid credentials", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=CredentialsSignin" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("wrongpass");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.contains("Invalid email or password").should("be.visible");
    cy.get("@push").should("not.have.been.called");
  });

  it("reveals the 2FA challenge when the server requires it", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=2FA_REQUIRED" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.contains("Two-Factor Authentication").should("be.visible");
    cy.get("#totp").should("exist");
  });

  it("can switch to backup code and go back from the 2FA screen", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=2FA_REQUIRED" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");

    cy.contains("Use a backup code instead").click();
    cy.contains("Backup Code").should("be.visible");
    cy.contains("Use authenticator code instead").click();
    cy.contains("Authentication Code").should("be.visible");

    cy.contains("button", "Back").click();
    cy.get("#email").should("exist");
    cy.get("#totp").should("not.exist");
  });

  it("shows a 2FA-specific error when the code is wrong", () => {
        cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=2FA_REQUIRED" },
    }).as("callback1");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback1");
    cy.get("#totp").should("exist");

    cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=INVALID_2FA" },
    }).as("callback2");
    cy.get("#totp").type("000000");
    cy.get("button[type=submit]").click();
    cy.wait("@callback2");
    cy.contains("Invalid or expired code").should("be.visible");
    // stays on the 2FA step
    cy.get("#totp").should("exist");
  });

  it("shows a lockout message with the remaining minutes", () => {
    cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=ACCOUNT_LOCKED:15" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.contains("locked").should("be.visible");
    cy.contains("15 minutes").should("be.visible");
    cy.get("@push").should("not.have.been.called");
  });

  it("shows a deactivated-account message", () => {
    cy.intercept("POST", "**/api/auth/callback/credentials*", {
      statusCode: 401,
      body: { url: "http://localhost:8080/api/auth/error?error=ACCOUNT_INACTIVE" },
    }).as("callback");
    mountLogin();
    cy.get("#email").type("admin@trailgliders.edu.ng");
    cy.get("#password").type("password123");
    cy.get("button[type=submit]").click();
    cy.wait("@callback");
    cy.contains("deactivated").should("be.visible");
  });
});

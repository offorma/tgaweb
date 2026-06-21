import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const SECRETS = [
  {
    id: "se1",
    key: "SMTP_PASSWORD",
    category: "email",
    description: "Mail server password",
    previewHint: "••••abcd",
    lastRotatedAt: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function stats(masterKeyConfigured = true) {
  return {
    total: SECRETS.length,
    byCategory: { email: 1 },
    lastRotatedAt: "2026-05-01T00:00:00.000Z",
    masterKeyConfigured,
  };
}

function stubLoad(body: any) {
  cy.intercept("GET", "/api/admin/secrets", { statusCode: 200, body }).as("load");
}

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminSecretsPage />", () => {
  it("renders the stats cards and the secret in the email tab", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("h1", "Secrets Vault").should("be.visible");
    cy.contains("Total Secrets").should("be.visible");
    cy.contains("SMTP_PASSWORD").should("be.visible");
    cy.contains("Active").should("be.visible");
  });

  it("warns when the master key is not configured", () => {
    stubLoad({ secrets: [], stats: stats(false) });
    mountPage();
    cy.wait("@load");
    cy.contains("Master key not configured").should("be.visible");
    cy.contains("Missing").should("be.visible");
  });

  it("shows the per-category empty state", () => {
    stubLoad({ secrets: [], stats: { total: 0, byCategory: {}, lastRotatedAt: null, masterKeyConfigured: true } });
    mountPage();
    cy.wait("@load");
    cy.contains("No email / smtp secrets yet").should("be.visible");
  });

  it("handles a load response missing secrets and stats fields", () => {
    // data.secrets and data.stats are undefined -> falls back to [] and null
    cy.intercept("GET", "/api/admin/secrets", { statusCode: 200, body: {} }).as("load");
    mountPage();
    cy.wait("@load");
    // With no stats, the status cards/banner are not rendered, but the header is.
    cy.contains("h1", "Secrets Vault").should("be.visible");
    cy.contains("Total Secrets").should("not.exist");
    // Empty secrets -> empty state for the default (email) tab.
    cy.contains("No email / smtp secrets yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", "/api/admin/secrets", { statusCode: 500, body: {} }).as("load");
    mountPage();
    cy.wait("@load");
    cy.contains("Load failed").should("be.visible");
  });

  it("opens the templates dialog and starts a custom secret", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Add from Template").should("be.visible");
    cy.contains("SMTP Credentials").should("be.visible");
    cy.contains("Custom Secret").click();
    cy.contains("Add Secret").should("be.visible");
    cy.get("#key").should("exist");
  });

  it("requires a value before creating a new secret, then creates it", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets", { statusCode: 201, body: { id: "se2" } }).as("create");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#key").type("NEW_KEY");
    cy.get("#description").type("A new secret");
    // No value yet -> validation error
    cy.contains("button", "Save Secret").click();
    cy.contains("Value is required for new secrets").should("be.visible");
    cy.get("#value").type("super-secret-value");
    cy.contains("button", "Save Secret").click();
    cy.wait("@create").its("request.body").should("include", { key: "NEW_KEY", value: "super-secret-value" });
    cy.contains("Secret created").should("be.visible");
  });

  it("edits a secret (PUT) and refetches", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("PUT", "/api/admin/secrets/se1", { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@load");
    // Card action buttons in order: Reveal, Rotate, Edit(pencil), Delete(trash).
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").eq(2).click();
      });
    cy.contains("Edit Secret").should("be.visible");
    cy.get("#description").clear().type("Updated description");
    cy.contains("button", "Save Secret").click();
    cy.wait("@update").its("request.body").should("include", { key: "SMTP_PASSWORD", description: "Updated description" });
    cy.contains("Secret updated").should("be.visible");
  });

  it("reveals a secret value via the reveal endpoint", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/reveal", { statusCode: 200, body: { value: "plaintext-pw" } }).as("reveal");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Reveal").click();
    cy.wait("@reveal");
    cy.contains("Secret revealed").should("be.visible");
    cy.contains("plaintext-pw").should("be.visible");
    cy.contains("button", "Copy").should("be.visible");
  });

  it("rotates a secret after confirmation", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/rotate", { statusCode: 200, body: { value: "rotated-value" } }).as("rotate");
    mountPage();
    cy.wait("@load");
    cy.on("window:confirm", () => true);
    cy.contains("button", "Rotate").click();
    cy.wait("@rotate");
    cy.contains("rotated-value", { timeout: 6000 }).should("exist");
  });

  it("deletes a secret after confirmation and refetches", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("DELETE", "/api/admin/secrets/se1", { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@load");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").last().click();
      });
    cy.contains("Delete this secret?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Secret deleted").should("be.visible");
  });

  // ====== Added coverage ======

  const SECRET_NO_HINT = {
    id: "se3",
    key: "PAYSTACK_SECRET_KEY",
    category: "payment",
    description: null,
    previewHint: null,
    lastRotatedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("renders payment-category card with no preview hint, no description, no last-rotated", () => {
    stubLoad({
      secrets: [SECRET_NO_HINT],
      stats: { total: 1, byCategory: { payment: 1 }, lastRotatedAt: null, masterKeyConfigured: true },
    });
    mountPage();
    cy.wait("@load");
    // Switch to the Payments tab
    cy.contains("button", "Payments").click();
    cy.contains("PAYSTACK_SECRET_KEY").should("be.visible");
    // Masked value with no previewHint -> generic dots, no trailing hint chars
    cy.contains("PAYSTACK_SECRET_KEY")
      .closest(".bg-white")
      .within(() => {
        cy.contains("••••••••••••").should("be.visible");
      });
    // No "Last rotated" text since lastRotatedAt is null
    cy.contains("Last rotated").should("not.exist");
  });

  it("shows the Payment Keys stat count", () => {
    stubLoad({
      secrets: [SECRET_NO_HINT],
      stats: { total: 1, byCategory: { payment: 3 }, lastRotatedAt: null, masterKeyConfigured: true },
    });
    mountPage();
    cy.wait("@load");
    cy.contains("Payment Keys").should("be.visible");
  });

  it("surfaces the server error message when creating fails (error field present)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets", {
      statusCode: 400,
      body: { error: "Key already exists" },
    }).as("createFail");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#key").type("DUP_KEY");
    cy.get("#value").type("v");
    cy.contains("button", "Save Secret").click();
    cy.wait("@createFail");
    // Error shown inside the form (not a toast)
    cy.contains("Key already exists").should("be.visible");
  });

  it("falls back to a generic error message when the error body has no error field", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets", { statusCode: 422, body: {} }).as("createFail");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#key").type("BAD_KEY");
    cy.get("#value").type("v");
    cy.contains("button", "Save Secret").click();
    cy.wait("@createFail");
    cy.contains("Save failed (422)").should("be.visible");
  });

  it("falls back to a generic error message when the error body is not JSON", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets", {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "boom",
    }).as("createFail");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#key").type("BAD_KEY2");
    cy.get("#value").type("v");
    cy.contains("button", "Save Secret").click();
    cy.wait("@createFail");
    cy.contains("Save failed (500)").should("be.visible");
  });

  it("edits a secret leaving the value blank (no value in payload)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("PUT", "/api/admin/secrets/se1", { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@load");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").eq(2).click();
      });
    cy.contains("Edit Secret").should("be.visible");
    cy.contains("button", "Save Secret").click();
    cy.wait("@update").then((interception) => {
      expect(interception.request.body).to.not.have.property("value");
    });
    cy.contains("Secret updated").should("be.visible");
  });

  it("edits a secret providing a new value (value included in payload)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("PUT", "/api/admin/secrets/se1", { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@load");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").eq(2).click();
      });
    cy.get("#value").type("brand-new-value");
    cy.contains("button", "Save Secret").click();
    cy.wait("@update").its("request.body").should("include", { value: "brand-new-value" });
  });

  it("shows a delete failure toast when the delete request fails", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("DELETE", "/api/admin/secrets/se1", { statusCode: 500, body: {} }).as("delFail");
    mountPage();
    cy.wait("@load");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").last().click();
      });
    cy.contains("button", "Delete").click();
    cy.wait("@delFail");
    cy.contains("Delete failed").should("be.visible");
  });

  it("shows a reveal failure toast when the reveal request fails", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/reveal", { statusCode: 500, body: {} }).as("revealFail");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Reveal").click();
    cy.wait("@revealFail");
    cy.contains("Reveal failed").should("be.visible");
  });

  it("copies the revealed value to the clipboard (success path)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/reveal", { statusCode: 200, body: { value: "plaintext-pw" } }).as("reveal");
    mountPage();
    cy.wait("@load");
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").resolves().as("writeText");
    });
    cy.contains("button", "Reveal").click();
    cy.wait("@reveal");
    cy.contains("button", "Copy").click();
    cy.get("@writeText").should("have.been.calledWith", "plaintext-pw");
    cy.contains("Copied to clipboard").should("be.visible");
  });

  it("shows a copy failure toast when clipboard access is blocked", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/reveal", { statusCode: 200, body: { value: "plaintext-pw" } }).as("reveal");
    mountPage();
    cy.wait("@load");
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").rejects(new Error("blocked"));
    });
    cy.contains("button", "Reveal").click();
    cy.wait("@reveal");
    cy.contains("button", "Copy").click();
    cy.contains("Copy failed").should("be.visible");
  });

  it("hides the revealed value when the eye-off button is clicked", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/reveal", { statusCode: 200, body: { value: "plaintext-pw" } }).as("reveal");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Reveal").click();
    cy.wait("@reveal");
    cy.contains("plaintext-pw").should("be.visible");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get('button[aria-label="Hide"]').click();
      });
    cy.contains("plaintext-pw").should("not.exist");
  });

  it("does not rotate when the confirm dialog is cancelled", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/rotate", cy.spy().as("rotateSpy"));
    mountPage();
    cy.wait("@load");
    cy.on("window:confirm", () => false);
    cy.contains("button", "Rotate").click();
    // Give it a beat; the rotate endpoint should never be hit
    cy.wait(200);
    cy.get("@rotateSpy").should("not.have.been.called");
  });

  it("shows a rotation failure toast when rotate fails", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets/se1/rotate", { statusCode: 500, body: {} }).as("rotateFail");
    mountPage();
    cy.wait("@load");
    cy.on("window:confirm", () => true);
    cy.contains("button", "Rotate").click();
    cy.wait("@rotateFail");
    cy.contains("Rotation failed").should("be.visible");
  });

  it("starts the SMTP template (email category) and the Paystack template (payment category)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("SMTP Credentials").click();
    cy.contains("Add Secret").should("be.visible");
    cy.get("#key").should("have.value", "SMTP_HOST");
    // category select should default to "email" for the smtp template
    cy.get("#category").should("have.value", "email");
    cy.contains("button", "Cancel").click();

    cy.contains("button", "Add from Template").click();
    cy.contains("Paystack Payment Keys").click();
    cy.get("#key").should("have.value", "PAYSTACK_PUBLIC_KEY");
    cy.get("#category").should("have.value", "payment");
  });

  it("starts the App Config template (app category)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    // "App Config" is also a (disabled) tab label, so scope to the template button.
    cy.get('[role="dialog"]').contains("button", "App Config").click();
    cy.get("#key").should("have.value", "NEXTAUTH_SECRET");
    cy.get("#category").should("have.value", "app");
  });

  it("generates a random value and toggles value visibility in the form", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#value").should("have.attr", "type", "password");
    // Generate random -> value populated and shown as text
    cy.contains("button", "Generate random").click();
    cy.get("#value").should("have.attr", "type", "text");
    cy.get("#value").invoke("val").should("have.length", 40);
    // Toggle back to hidden via the eye button inside the value wrapper
    cy.get("#value").parent().find("button").click();
    cy.get("#value").should("have.attr", "type", "password");
  });

  it("changes the category via the select dropdown", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    cy.intercept("POST", "/api/admin/secrets", { statusCode: 201, body: { id: "seX" } }).as("create");
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.get("#key").type("SOME_KEY");
    cy.get("#value").type("val");
    cy.get("#category").select("sms");
    cy.get("#category").should("have.value", "sms");
    cy.contains("button", "Save Secret").click();
    cy.wait("@create").its("request.body").should("include", { category: "sms" });
  });

  it("starts a new secret from the per-category empty-state button", () => {
    stubLoad({ secrets: [], stats: { total: 0, byCategory: {}, lastRotatedAt: null, masterKeyConfigured: true } });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add Email / SMTP Secret").click();
    cy.contains("Add Secret").should("be.visible");
    cy.get("#category").should("have.value", "email");
  });

  it("starts a new secret from the in-grid Add Secret tile", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add Secret").click();
    cy.contains("Add Secret").should("be.visible");
    cy.get("#category").should("have.value", "email");
  });

  it("cancels the editor dialog without saving", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.contains("Add Secret").should("be.visible");
    cy.contains("button", "Cancel").click();
    // Editor dialog closed -> its unique description text is gone.
    cy.contains("The value is encrypted with AES-256-GCM before storage").should("not.exist");
  });

  it("closes the editor dialog via the dialog onOpenChange (Escape)", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("button", "Add from Template").click();
    cy.contains("Custom Secret").click();
    cy.contains("Add Secret").should("be.visible");
    // Pressing Escape triggers the Dialog's onOpenChange(false) handler.
    cy.get("body").type("{esc}");
    cy.contains("The value is encrypted with AES-256-GCM before storage").should("not.exist");
  });

  it("closes the delete confirmation via onOpenChange (Escape) without deleting", () => {
    stubLoad({ secrets: SECRETS, stats: stats() });
    mountPage();
    cy.wait("@load");
    cy.contains("SMTP_PASSWORD")
      .closest(".bg-white")
      .within(() => {
        cy.get("button").last().click();
      });
    cy.contains("Delete this secret?").should("be.visible");
    // Escape triggers the AlertDialog onOpenChange(false) -> setDeleteTarget(null).
    cy.get("body").type("{esc}");
    cy.contains("Delete this secret?").should("not.exist");
  });
});

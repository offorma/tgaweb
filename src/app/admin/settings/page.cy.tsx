import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const SETTINGS = {
  schoolName: "Trail Gliders Academy",
  shortName: "TGA",
  tagline: "Excellence as You Glide",
  motto: "Knowledge • Character • Service",
  founded: 2008,
  crestUrl: "/crest/school-crest.png",
  heroBadge: "Admissions Open",
  heroTitle1: "Where Young Minds",
  heroTitle2: "Glide Beyond Limits",
  heroDescription: "A nurturing school.",
  address: "1 School Road",
  location: "Enugu, Nigeria",
  phone: "+234 800 000 0000",
  email: "info@tga.edu.ng",
  admissionsEmail: "admissions@tga.edu.ng",
  hours: "Mon-Fri 8am-3pm",
  facebookUrl: "https://facebook.com/tga",
  applyButtonEnabled: true,
  applyButtonLabel: "Apply Now",
  applyButtonType: "scroll",
  applyButtonUrl: "#admissions",
  applyButtonStyle: "primary",
};

const POLICY = {
  enforceTwoFactorForAdmins: true,
  enforceTwoFactorForEditors: false,
  minPasswordLength: 12,
  sessionTimeoutHours: 8,
};

function stubAll(settings = SETTINGS, twoFactorEnabled = false) {
  cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: { settings } }).as("settings");
  cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: { user: { twoFactorEnabled } } }).as("me");
  cy.intercept("GET", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("policy");
}

function openSecurity() {
  cy.contains('[role="tab"]', "Security").click();
  cy.wait("@me");
}

const SETUP_DATA = {
  secret: "JBSWY3DPEHPK3PXP",
  qrCode: "data:image/png;base64,QRCODE",
  otpauth: "otpauth://totp/TGA?secret=JBSWY3DPEHPK3PXP",
};
const BACKUP_CODES = ["AAAA-1111", "BBBB-2222", "CCCC-3333", "DDDD-4444"];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

const STRONG = "Abcdef12345!@#";

describe("<AdminSettingsPage />", () => {
  it("loads and renders the General tab fields", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.contains("h1", "Site Settings").should("be.visible");
    cy.get("#schoolName").should("have.value", "Trail Gliders Academy");
    cy.get("#shortName").should("have.value", "TGA");
    cy.contains("button", "Save General").should("be.visible");
  });

  it("shows a load-failed toast when settings fail to load", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 500, body: {} }).as("settings");
    mountPage();
    cy.wait("@settings");
    cy.contains("Load failed").should("be.visible");
  });

  it("saves the General section (PUT) and shows a success toast", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("save");
    mountPage();
    cy.wait("@settings");
    cy.get("#schoolName").clear().type("New School Name");
    cy.contains("button", "Save General").click();
    cy.wait("@save").its("request.body").should("include", { schoolName: "New School Name", founded: 2008 });
    cy.contains("General saved").should("be.visible");
  });

  it("shows a save-failed toast when the PUT errors", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/settings", { statusCode: 400, body: { error: "Validation failed" } }).as("save");
    mountPage();
    cy.wait("@settings");
    cy.contains("button", "Save General").click();
    cy.wait("@save");
    cy.contains("Validation failed").should("be.visible");
  });

  it("switches to the Contact tab and shows contact fields", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Contact Info").click();
    cy.get("#phone").should("have.value", "+234 800 000 0000");
    cy.get("#email").should("have.value", "info@tga.edu.ng");
  });

  it("searches settings and shows matching fields, then a no-match message", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.get('input[placeholder^="Search settings"]').type("phone");
    cy.contains("result").should("be.visible");
    cy.get("#phone").should("exist");
    cy.get('input[placeholder^="Search settings"]').clear().type("zzzznomatch");
    cy.contains("No settings found").should("be.visible");
  });

  it("gates the change-password form and submits successfully (Security tab)", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/change-password", { statusCode: 200, body: { ok: true } }).as("change");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security").click();
    cy.wait("@me");

    cy.contains("button", "Update Password").should("be.disabled");
    cy.get("#current").type("OldPass123!@#");
    cy.get("#next").type(STRONG);
    cy.get("#confirm").type(STRONG);
    cy.contains("button", "Update Password").should("not.be.disabled").click();
    cy.wait("@change").its("request.body").should("deep.equal", {
      currentPassword: "OldPass123!@#",
      newPassword: STRONG,
    });
    cy.contains("Password changed").should("be.visible");
  });

  it("shows an error toast when the password change fails", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/change-password", { statusCode: 400, body: { error: "Current password incorrect" } }).as("change");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security").click();
    cy.wait("@me");
    cy.get("#current").type("WrongPass123!");
    cy.get("#next").type(STRONG);
    cy.get("#confirm").type(STRONG);
    cy.contains("button", "Update Password").click();
    cy.wait("@change");
    cy.contains("Current password incorrect").should("be.visible");
  });

  it("shows the 2FA status (disabled) in the Security tab", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security").click();
    cy.wait("@me");
    cy.contains(/Two-Factor|2FA/i).should("be.visible");
  });

  it("loads the Security Policy tab", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    cy.contains(/Security Policy|Password|2FA|Two-Factor/i).should("be.visible");
  });

  // ---- General tab: number field, checkbox, select, image field ----

  it("edits a number field, a select and a checkbox across tabs", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("save");
    mountPage();
    cy.wait("@settings");
    // number field on General
    cy.get("#founded").type("{selectall}2010");
    // checkbox + select on Apply Button tab
    cy.contains('[role="tab"]', "Apply Button").click();
    cy.get("#applyButtonEnabled").should("exist");
    cy.contains("label", "Enabled").should("exist");
    cy.get("#applyButtonEnabled").uncheck();
    cy.contains("label", "Disabled").should("exist");
    cy.get("#applyButtonType").select("external");
    cy.get("#applyButtonStyle").select("outline");
    cy.contains("button", "Save Apply Button").click();
    cy.wait("@save").its("request.body").should((b) => {
      expect(b.founded).to.eq(2010);
      expect(b.applyButtonEnabled).to.eq(false);
      expect(b.applyButtonType).to.eq("external");
      expect(b.applyButtonStyle).to.eq("outline");
    });
    cy.contains("Apply Button saved").should("be.visible");
  });

  it("falls back to the default error message when the save body has no error field", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/settings", { statusCode: 500, body: {} }).as("save");
    mountPage();
    cy.wait("@settings");
    cy.contains("button", "Save General").click();
    cy.wait("@save");
    cy.contains("Save failed").should("be.visible");
  });

  // ---- Search results: clear button, fields rendered, save hint ----

  it("clears the search via the X button and exercises search-result field types", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    // "apply" matches the Apply Button section -> select + checkbox + text fields in results
    cy.get('input[placeholder^="Search settings"]').type("apply");
    cy.contains(/results? for/i).should("be.visible");
    cy.get("#applyButtonType").should("exist");
    cy.get("#applyButtonEnabled").should("exist");
    // Edit a result field
    cy.get("#applyButtonLabel").clear().type("Start Now");
    cy.get('button[aria-label="Clear search"]').click();
    cy.get('input[placeholder^="Search settings"]').should("have.value", "");
    // Tabs are back
    cy.contains("button", "Save General").should("be.visible");
  });

  it("renders the image field in search results with a preview", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    cy.get('input[placeholder^="Search settings"]').type("crest");
    cy.get("#crestUrl").should("have.value", "/crest/school-crest.png");
    // preview <img> shown because data has a value
    cy.get('img[alt="Preview"]').should("exist");
  });

  // ---- Change password: show/hide toggle, no-op submit, default error ----

  it("toggles password visibility and ignores submit when checks fail", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/change-password", cy.spy().as("changeSpy"));
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.get("#current").type("OldPass123!");
    cy.get("#next").type("short"); // fails strength
    cy.get("#confirm").type("short");
    cy.get("#current").should("have.attr", "type", "password");
    // toggle visibility (eye button next to current password)
    cy.get("#current").parent().find("button").click();
    cy.get("#current").should("have.attr", "type", "text");
    // submit is disabled and would no-op anyway
    cy.contains("button", "Update Password").should("be.disabled");
  });

  it("shows the default failure message when change-password returns no error body", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/change-password", { statusCode: 500, body: {} }).as("change");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.get("#current").type("OldPass123!");
    cy.get("#next").type(STRONG);
    cy.get("#confirm").type(STRONG);
    cy.contains("button", "Update Password").click();
    cy.wait("@change");
    cy.contains("Failed to change password").should("be.visible");
  });

  // ---- 2FA: status load error ----

  it("shows a toast when the 2FA status (me) fails to load", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("settings");
    cy.intercept("GET", "/api/admin/me", { statusCode: 500, body: {} }).as("me");
    cy.intercept("GET", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("policy");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("Failed to load 2FA status").should("be.visible");
  });

  // ---- 2FA enable flow: setup -> verify -> backup codes ----

  it("runs the full 2FA enable flow and shows backup codes", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 200, body: { backupCodes: BACKUP_CODES } }).as("enable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.contains("Set Up Two-Factor Authentication").should("be.visible");
    cy.get('img[alt="2FA QR Code"]').should("exist");
    cy.contains(SETUP_DATA.secret).should("be.visible");
    // verify button disabled until 6 digits; strips non-digits
    cy.contains("button", "Verify & Enable").should("be.disabled");
    cy.get("#setup-token").type("12ab34cd56"); // non-digits stripped -> "123456"
    cy.get("#setup-token").should("have.value", "123456");
    cy.contains("button", "Verify & Enable").should("not.be.disabled").click();
    cy.wait("@enable").its("request.body").should("deep.equal", {
      secret: SETUP_DATA.secret,
      token: "123456",
    });
    cy.contains("2FA enabled!").should("be.visible");
    // Backup codes dialog
    cy.contains("Save Your Backup Codes").should("be.visible");
    cy.contains("AAAA-1111").should("be.visible");
  });

  it("validates the 2FA token before enabling and surfaces setup errors", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    // Cancel closes the dialog (closeSetup)
    cy.contains("button", "Cancel").click();
    cy.contains("Set Up Two-Factor Authentication").should("not.exist");
  });

  it("shows a setup error toast when /2fa/setup fails", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 400, body: { error: "Setup blocked" } }).as("setup");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.contains("Setup blocked").should("be.visible");
  });

  it("shows a verification error when /2fa/enable rejects the code", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 400, body: { error: "Invalid code" } }).as("enable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.get("#setup-token").type("000000");
    cy.contains("button", "Verify & Enable").click();
    cy.wait("@enable");
    cy.contains("Invalid code").should("be.visible");
  });

  it("downloads and copies backup codes, then closes the dialog", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 200, body: { backupCodes: BACKUP_CODES } }).as("enable");
    mountPage();
    cy.wait("@settings");
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").resolves().as("clip");
      cy.stub(win.URL, "createObjectURL").returns("blob:fake").as("createObj");
      cy.stub(win.URL, "revokeObjectURL").as("revokeObj");
    });
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.get("#setup-token").type("123456");
    cy.contains("button", "Verify & Enable").click();
    cy.wait("@enable");
    cy.contains("Save Your Backup Codes").should("be.visible");
    cy.contains("button", "Download .txt").click();
    cy.get("@createObj").should("have.been.called");
    cy.contains("button", "Copy all").click();
    cy.get("@clip").should("have.been.calledWith", BACKUP_CODES.join("\n"));
    cy.contains("All codes copied").should("be.visible");
    cy.contains("button", "I've saved my codes").click();
    cy.contains("Save Your Backup Codes").should("not.exist");
  });

  it("shows a destructive toast when copying backup codes fails", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 200, body: { backupCodes: BACKUP_CODES } }).as("enable");
    mountPage();
    cy.wait("@settings");
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").rejects(new Error("denied")).as("clip");
    });
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.get("#setup-token").type("123456");
    cy.contains("button", "Verify & Enable").click();
    cy.wait("@enable");
    cy.contains("button", "Copy all").click();
    cy.contains("Copy failed").should("be.visible");
  });

  // ---- 2FA already enabled: disable + regenerate flows ----

  it("disables 2FA after confirming password + code", () => {
    stubAll(SETTINGS, true);
    cy.intercept("POST", "/api/admin/2fa/disable", { statusCode: 200, body: { ok: true } }).as("disable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("Active").should("be.visible");
    cy.contains("button", "Disable 2FA").click();
    cy.contains("Disable Two-Factor Authentication").should("be.visible");
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[autocomplete="current-password"]').type("MyPass123!");
      cy.get('input[placeholder="000000 or XXXX-XXXX"]').type("123456");
      cy.contains("button", "Disable 2FA").click();
    });
    cy.wait("@disable").its("request.body").should("deep.equal", {
      password: "MyPass123!",
      totp: "123456",
    });
    cy.contains("2FA disabled").should("be.visible");
  });

  it("shows an error when disabling 2FA fails", () => {
    stubAll(SETTINGS, true);
    cy.intercept("POST", "/api/admin/2fa/disable", { statusCode: 400, body: { error: "Wrong password" } }).as("disable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Disable 2FA").click();
    cy.get('input[autocomplete="current-password"]').type("bad");
    cy.get('input[placeholder="000000 or XXXX-XXXX"]').type("000000");
    cy.contains("Disable Two-Factor Authentication")
      .closest('[role="dialog"]')
      .within(() => cy.contains("button", "Disable 2FA").click());
    cy.wait("@disable");
    cy.contains("Wrong password").should("be.visible");
  });

  it("cancels the disable 2FA dialog", () => {
    stubAll(SETTINGS, true);
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Disable 2FA").click();
    cy.contains("Disable Two-Factor Authentication").should("be.visible");
    cy.get('[role="dialog"]').within(() => cy.contains("button", "Cancel").click());
    cy.contains("Disable Two-Factor Authentication").should("not.exist");
  });

  it("regenerates backup codes when 2FA is enabled", () => {
    stubAll(SETTINGS, true);
    cy.intercept("POST", "/api/admin/2fa/backup-codes", { statusCode: 200, body: { backupCodes: BACKUP_CODES } }).as("regen");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Regenerate Backup Codes").click();
    cy.contains("Regenerate Backup Codes").should("be.visible");
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[autocomplete="current-password"]').type("MyPass123!");
      cy.get('input[placeholder="000000"]').type("12ab34"); // strips -> "1234", not enough
    });
    cy.get('[role="dialog"]').contains("button", "Regenerate").should("be.disabled");
    cy.get('[role="dialog"]').find('input[placeholder="000000"]').clear().type("123456");
    cy.get('[role="dialog"]').contains("button", "Regenerate").should("not.be.disabled").click();
    cy.wait("@regen").its("request.body").should("deep.equal", {
      password: "MyPass123!",
      totp: "123456",
    });
    cy.contains("New backup codes generated").should("be.visible");
    // new backup-codes dialog appears
    cy.contains("Save Your Backup Codes").should("be.visible");
  });

  it("shows an error when regenerating backup codes fails, and cancels", () => {
    stubAll(SETTINGS, true);
    cy.intercept("POST", "/api/admin/2fa/backup-codes", { statusCode: 400, body: { error: "Bad code" } }).as("regen");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Regenerate Backup Codes").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[autocomplete="current-password"]').type("MyPass123!");
      cy.get('input[placeholder="000000"]').type("123456");
      cy.contains("button", "Regenerate").click();
    });
    cy.wait("@regen");
    cy.contains("Bad code").should("be.visible");
    // dialog stays open on error -> cancel closes it (setRegenOpen(false))
    cy.get('[role="dialog"]').within(() => cy.contains("button", "Cancel").click());
    cy.get('[role="dialog"]').should("not.exist");
  });

  // ---- Security Policy: save, toggles, errors, load-failure states ----

  it("saves the security policy, toggling enforcement flags", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("savePolicy");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    cy.contains("Enforced").should("be.visible"); // admins enforced
    // toggle editors on, admins off
    cy.contains("label", "Require 2FA for all EDITOR accounts").find('input[type="checkbox"]').check();
    cy.contains("label", "Require 2FA for all ADMIN accounts").find('input[type="checkbox"]').uncheck();
    cy.get('input[type="number"]').first().clear().type("16");
    cy.get('input[type="number"]').last().clear().type("12");
    cy.contains("button", "Save Policy").click();
    cy.wait("@savePolicy").its("request.body").should("deep.equal", {
      enforceTwoFactorForAdmins: false,
      enforceTwoFactorForEditors: true,
      minPasswordLength: 16,
      sessionTimeoutHours: 12,
    });
    cy.contains("Security policy updated").should("be.visible");
  });

  it("shows the policy save-failed toast (default message) and the enforced-admins description", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/security-policy", { statusCode: 500, body: {} }).as("savePolicy");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    cy.contains("button", "Save Policy").click();
    cy.wait("@savePolicy");
    cy.contains("Save failed").should("be.visible");
  });

  it("shows a load-failed toast when the security policy request errors", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("settings");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: { user: { twoFactorEnabled: false } } }).as("me");
    cy.intercept("GET", "/api/admin/security-policy", { statusCode: 500, body: {} }).as("policy");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    cy.contains("Load failed").should("be.visible");
  });

  it("renders tabs whose fields are missing from settings (default fallbacks)", () => {
    // Minimal settings: most fields absent -> exercises `?? ""`, `?? 0`, and !!data falsy paths
    stubAll({ schoolName: "X", shortName: "Y", applyButtonEnabled: false });
    mountPage();
    cy.wait("@settings");
    // About tab: text + textarea fields all absent -> fallback "" rendering
    cy.contains('[role="tab"]', "About Section").click();
    cy.get("#aboutHeading").should("have.value", "");
    cy.get("#aboutParagraph").should("have.value", "");
    // Admissions tab
    cy.contains('[role="tab"]', "Admissions").click();
    cy.get("#admissionsHeading").should("have.value", "");
    // Footer Links tab
    cy.contains('[role="tab"]', "Footer Links").click();
    cy.get("#resourceFeeStructure").should("have.value", "");
    // Social tab
    cy.contains('[role="tab"]', "Social Media").click();
    cy.get("#instagramUrl").should("have.value", "");
    // Apply Button: applyButtonEnabled false -> "Disabled" label, then check -> "Enabled"
    cy.contains('[role="tab"]', "Apply Button").click();
    cy.contains("label", "Disabled").should("exist");
    cy.get("#applyButtonEnabled").check();
    cy.contains("label", "Enabled").should("exist");
  });

  it("shows the image-field preview cleared when crest has no value (search)", () => {
    stubAll({ schoolName: "X", shortName: "Y" }); // crestUrl absent
    mountPage();
    cy.wait("@settings");
    cy.get('input[placeholder^="Search settings"]').type("crest");
    cy.get("#crestUrl").should("have.value", "");
    // No preview img because data[crestUrl] is empty
    cy.get('img[alt="Preview"]').should("not.exist");
  });

  it("searches with valueless fields so the haystack value falls back to empty", () => {
    // instagramUrl absent -> SearchResults builds haystack with `data[f.name] ?? ""` fallback
    stubAll({ schoolName: "X", shortName: "Y" });
    mountPage();
    cy.wait("@settings");
    cy.get('input[placeholder^="Search settings"]').type("instagram");
    cy.get("#instagramUrl").should("have.value", "");
  });

  it("reflects partial password-strength checks before all pass", () => {
    stubAll();
    mountPage();
    cy.wait("@settings");
    openSecurity();
    // Type a password missing a symbol and too short -> several checks red, some green
    cy.get("#next").type("Abc123");
    cy.contains("Has uppercase letter").should("exist");
    cy.contains("Has digit").should("exist");
    // not all green -> button stays disabled
    cy.contains("button", "Update Password").should("be.disabled");
  });

  it("renders the Failed to load policy fallback when policy is null", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("settings");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: { user: { twoFactorEnabled: false } } }).as("me");
    cy.intercept("GET", "/api/admin/security-policy", { statusCode: 200, body: { policy: null } }).as("policy");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    cy.contains("Failed to load policy.").should("be.visible");
  });

  // ---- default-fallback branches ----

  it("defaults settings to {} when the GET body omits settings", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: {} }).as("settings");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: { user: { twoFactorEnabled: false } } }).as("me");
    cy.intercept("GET", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("policy");
    mountPage();
    cy.wait("@settings");
    // schoolName absent -> "" fallback, page still renders
    cy.get("#schoolName").should("have.value", "");
  });

  it("saves with founded falsy and a PUT response missing settings (|| payload fallback)", () => {
    // founded absent/0 -> skips Number() conversion; PUT returns no settings -> uses payload
    stubAll({ schoolName: "X", shortName: "Y", founded: 0 });
    cy.intercept("PUT", "/api/admin/settings", { statusCode: 200, body: {} }).as("save");
    mountPage();
    cy.wait("@settings");
    cy.contains("button", "Save General").click();
    cy.wait("@save").its("request.body").should((b) => {
      expect(b.founded).to.eq(0);
    });
    cy.contains("General saved").should("be.visible");
  });

  it("handles a me response with no user object (2FA defaults to disabled)", () => {
    cy.intercept("GET", "/api/admin/settings", { statusCode: 200, body: { settings: SETTINGS } }).as("settings");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: {} }).as("me");
    cy.intercept("GET", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("policy");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").should("be.visible");
  });

  it("closes the 2FA setup dialog via Escape (onOpenChange)", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.contains("Set Up Two-Factor Authentication").should("be.visible");
    cy.get("body").type("{esc}");
    cy.contains("Set Up Two-Factor Authentication").should("not.exist");
  });

  it("closes the backup-codes dialog via Escape (onOpenChange)", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 200, body: { backupCodes: BACKUP_CODES } }).as("enable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.get("#setup-token").type("123456");
    cy.contains("button", "Verify & Enable").click();
    cy.wait("@enable");
    cy.contains("Save Your Backup Codes").should("be.visible");
    cy.get("body").type("{esc}");
    cy.contains("Save Your Backup Codes").should("not.exist");
  });

  it("uses default error messages when 2FA enable/disable/regen errors lack a body", () => {
    stubAll(SETTINGS, true);
    cy.intercept("POST", "/api/admin/2fa/disable", { statusCode: 500, body: {} }).as("disable");
    cy.intercept("POST", "/api/admin/2fa/backup-codes", { statusCode: 500, body: {} }).as("regen");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    // disable default message
    cy.contains("button", "Disable 2FA").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[autocomplete="current-password"]').type("p");
      cy.get('input[placeholder="000000 or XXXX-XXXX"]').type("1");
      cy.contains("button", "Disable 2FA").click();
    });
    cy.wait("@disable");
    cy.contains("Disable failed").should("be.visible");
    cy.get('[role="dialog"]').within(() => cy.contains("button", "Cancel").click());
    // regen default message
    cy.contains("button", "Regenerate Backup Codes").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[autocomplete="current-password"]').type("p");
      cy.get('input[placeholder="000000"]').type("123456");
      cy.contains("button", "Regenerate").click();
    });
    cy.wait("@regen");
    cy.contains("Regeneration failed").should("be.visible");
  });

  it("uses the default verification message when 2FA enable errors without a body", () => {
    stubAll();
    cy.intercept("POST", "/api/admin/2fa/setup", { statusCode: 200, body: SETUP_DATA }).as("setup");
    cy.intercept("POST", "/api/admin/2fa/enable", { statusCode: 500, body: {} }).as("enable");
    mountPage();
    cy.wait("@settings");
    openSecurity();
    cy.contains("button", "Enable 2FA").click();
    cy.wait("@setup");
    cy.get("#setup-token").type("123456");
    cy.contains("button", "Verify & Enable").click();
    cy.wait("@enable");
    cy.contains("Verification failed").should("be.visible");
  });

  it("saves the policy with admins enforced (true branch of the toast description)", () => {
    stubAll();
    cy.intercept("PUT", "/api/admin/security-policy", { statusCode: 200, body: { policy: POLICY } }).as("savePolicy");
    mountPage();
    cy.wait("@settings");
    cy.contains('[role="tab"]', "Security Policy").click();
    cy.wait("@policy");
    // POLICY has enforceTwoFactorForAdmins true already -> save keeps it true
    cy.contains("button", "Save Policy").click();
    cy.wait("@savePolicy");
    cy.contains("Security policy updated").should("be.visible");
    cy.contains("All admin users without 2FA").should("be.visible");
  });
});

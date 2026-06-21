import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const USERS = [
  {
    id: "u1",
    email: "admin@tga.edu.ng",
    name: "Site Admin",
    role: "ADMIN",
    isActive: true,
    twoFactorEnabled: true,
    twoFactorEnabledAt: "2026-01-01T00:00:00.000Z",
    mustEnable2FA: false,
    mustChangePassword: false,
    lastLoginAt: "2026-06-01T00:00:00.000Z",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "u2",
    email: "editor@tga.edu.ng",
    name: "Content Editor",
    role: "EDITOR",
    isActive: false,
    twoFactorEnabled: false,
    twoFactorEnabledAt: null,
    mustEnable2FA: true,
    mustChangePassword: true,
    lastLoginAt: null,
    createdBy: "u1",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
];

const ME = { user: { id: "u1", email: "admin@tga.edu.ng", name: "Site Admin", role: "ADMIN" } };

function stubLoad(users = USERS) {
  cy.intercept("GET", "/api/admin/users", { statusCode: 200, body: { users } }).as("users");
  cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: ME }).as("me");
}

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

const STRONG = "Abcdef12345!@#";

describe("<AdminUsersPage />", () => {
  it("renders the users table with role, 2FA, status and last-login cells", () => {
    stubLoad();
    mountPage();
    cy.wait("@users");
    cy.wait("@me");
    cy.contains("h1", "User Management").should("be.visible");
    cy.contains("Site Admin").should("be.visible");
    cy.contains("(you)").should("be.visible");
    cy.contains("Content Editor").should("be.visible");
    cy.contains("Enabled").should("be.visible");
    cy.contains("Required").should("be.visible");
    cy.contains("Never").should("be.visible");
  });

  it("shows an empty state when no users exist", () => {
    stubLoad([]);
    mountPage();
    cy.wait("@users");
    cy.contains("No users found.").should("be.visible");
  });

  it("shows a load-failed toast when the users request errors", () => {
    cy.intercept("GET", "/api/admin/users", { statusCode: 500, body: {} }).as("users");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: ME }).as("me");
    mountPage();
    cy.wait("@users");
    cy.contains("Load failed").should("be.visible");
  });

  it("filters users by the search box", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.get('input[placeholder^="Search by name"]').type("editor");
    cy.contains("Content Editor").should("be.visible");
    cy.contains("Site Admin").should("not.exist");
  });

  it("gates the invite form submit until name, email and a strong password are set", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.contains("Invite New User").should("be.visible");
    cy.contains("button", "Create User").should("be.disabled");
    cy.get("#name").type("New Person");
    cy.get("#email").type("new@tga.edu.ng");
    cy.get("#password").type("weak");
    cy.contains("button", "Create User").should("be.disabled");
    cy.get("#password").clear().type(STRONG);
    cy.contains("button", "Create User").should("not.be.disabled");
  });

  it("creates a user (POST) and refetches", () => {
    stubLoad();
    cy.intercept("POST", "/api/admin/users", { statusCode: 201, body: { id: "u3" } }).as("create");
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("New Person");
    cy.get("#email").type("new@tga.edu.ng");
    cy.get("#password").type(STRONG);
    cy.contains("button", "Create User").click();
    cy.wait("@create").its("request.body").should("include", {
      name: "New Person",
      email: "new@tga.edu.ng",
      role: "EDITOR",
    });
    cy.contains("User created").should("be.visible");
  });

  it("surfaces a server error inside the invite form", () => {
    stubLoad();
    cy.intercept("POST", "/api/admin/users", { statusCode: 409, body: { error: "Email already in use" } }).as("create");
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("Dup");
    cy.get("#email").type("dup@tga.edu.ng");
    cy.get("#password").type(STRONG);
    cy.contains("button", "Create User").click();
    cy.wait("@create");
    cy.contains("Email already in use").should("be.visible");
  });

  it("edits an existing user (PUT) and refetches", () => {
    stubLoad();
    cy.intercept("PUT", "/api/admin/users/u2", { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor")
      .closest("tr")
      .find("button")
      .first()
      .click();
    cy.contains("Edit User").should("be.visible");
    cy.get("#edit-name").clear().type("Lead Editor");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body").should("include", { name: "Lead Editor", role: "EDITOR" });
    cy.contains("User updated").should("be.visible");
  });

  it("deletes a user after confirmation and refetches", () => {
    stubLoad();
    cy.intercept("DELETE", "/api/admin/users/u2", { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor")
      .closest("tr")
      .find("button")
      .last()
      .click();
    cy.contains("Delete user account?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("User deleted").should("be.visible");
  });

  it("disables the delete button for your own account", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("Site Admin")
      .closest("tr")
      .find("button")
      .last()
      .should("be.disabled");
  });

  it("renders the 2FA 'Disabled' and Status 'Active'/'Disabled' cell variants and a set last-login date", () => {
    const users = [
      {
        ...USERS[0],
        id: "u9",
        name: "No Two FA",
        email: "no2fa@tga.edu.ng",
        role: "EDITOR",
        isActive: true,
        twoFactorEnabled: false,
        twoFactorEnabledAt: null,
        mustEnable2FA: false,
        mustChangePassword: false,
        lastLoginAt: "2026-05-10T00:00:00.000Z",
      },
    ];
    stubLoad(users);
    mountPage();
    cy.wait("@users");
    cy.wait("@me");
    // 2FA neither enabled nor required -> "Disabled"
    cy.contains("Disabled").should("be.visible");
    // isActive true -> "Active"
    cy.contains("Active").should("be.visible");
    // lastLoginAt set -> formatted date (10 May 2026)
    cy.contains("10 May 2026").should("be.visible");
    // u9 is not the current user (me=u1) -> no "(you)" and delete enabled
    cy.contains("(you)").should("not.exist");
    cy.contains("No Two FA").closest("tr").find("button").last().should("not.be.disabled");
  });

  it("shows a no-match empty state when the search filter matches nothing", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.get('input[placeholder^="Search by name"]').type("zzz-nobody");
    cy.contains("No users found.").should("be.visible");
  });

  it("create form: generate-password button fills a strong password and the eye toggle reveals/hides it", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("Gen Person");
    cy.get("#email").type("gen@tga.edu.ng");
    cy.contains("button", "Generate strong password").click();
    // generatePassword sets showPwd=true -> input becomes text
    cy.get("#password").should("have.attr", "type", "text");
    cy.get("#password").invoke("val").should("have.length", 20);
    // all strength checks satisfied -> submit enabled
    cy.contains("button", "Create User").should("not.be.disabled");
    // toggle hide
    cy.get("#password").parent().find('button[tabindex="-1"]').click();
    cy.get("#password").should("have.attr", "type", "password");
  });

  it("create form: choosing ADMIN forces & disables the 2FA checkbox, shows the admin notice, and posts requireTwoFactor true", () => {
    stubLoad();
    cy.intercept("POST", "/api/admin/users", { statusCode: 201, body: { id: "u3" } }).as("create");
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("Admin Person");
    cy.get("#email").type("admin2@tga.edu.ng");
    cy.get("#password").type(STRONG);
    cy.get("#role").select("ADMIN");
    cy.contains("Admins are").should("be.visible");
    cy.contains("(required for admins)").should("be.visible");
    cy.contains("label", "Require 2FA on first login")
      .find('input[type="checkbox"]')
      .should("be.checked")
      .and("be.disabled");
    cy.contains("button", "Create User").click();
    cy.wait("@create").its("request.body").should("include", {
      role: "ADMIN",
      requireTwoFactor: true,
    });
  });

  it("create form: toggling the EDITOR-mode checkboxes posts requireTwoFactor/requirePasswordChange false", () => {
    stubLoad();
    cy.intercept("POST", "/api/admin/users", { statusCode: 201, body: { id: "u3" } }).as("create");
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("Editor Person");
    cy.get("#email").type("ed2@tga.edu.ng");
    cy.get("#password").type(STRONG);
    cy.contains("label", "Require 2FA on first login").find('input[type="checkbox"]').uncheck();
    cy.contains("label", "Require password change on first login").find('input[type="checkbox"]').uncheck();
    cy.contains("button", "Create User").click();
    cy.wait("@create").its("request.body").should("include", {
      requireTwoFactor: false,
      requirePasswordChange: false,
    });
  });

  it("create form: a server error without an `error` body falls back to the generic message", () => {
    stubLoad();
    cy.intercept("POST", "/api/admin/users", { statusCode: 500, body: "boom" }).as("create");
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.get("#name").type("Err Person");
    cy.get("#email").type("err@tga.edu.ng");
    cy.get("#password").type(STRONG);
    cy.contains("button", "Create User").click();
    cy.wait("@create");
    cy.contains("Create failed").should("be.visible");
  });

  it("closing the invite dialog via Cancel resets the create state", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("button", "Invite User").click();
    cy.contains("Invite New User").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Invite New User").should("not.exist");
  });

  it("edit form: toggles isActive/2FA, changes role, sets a new password and submits the full payload", () => {
    stubLoad();
    cy.intercept("PUT", "/api/admin/users/u2", { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").first().click();
    cy.contains("Edit User").should("be.visible");
    // u2 starts isActive=false, mustEnable2FA=true, mustChangePassword=true
    cy.contains("label", "Account active").find('input[type="checkbox"]').check();
    cy.contains("label", "Force 2FA setup").find('input[type="checkbox"]').uncheck();
    cy.get("#edit-role").select("ADMIN");
    // reset password -> reveals the "forced to change" notice
    cy.get('input[placeholder^="••••••••"]').type("NewTempPass123!");
    cy.contains("The user will be forced to change this password").should("be.visible");
    // toggle the edit-form password eye
    cy.get('input[placeholder^="••••••••"]').closest("div").find('button[tabindex="-1"]').click();
    cy.get('input[placeholder^="••••••••"]').should("have.attr", "type", "text");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body").should("deep.include", {
      role: "ADMIN",
      isActive: true,
      mustEnable2FA: false,
      mustChangePassword: true,
      newPassword: "NewTempPass123!",
    });
    cy.contains("User updated").should("be.visible");
  });

  it("edit form: editing your own row disables the role select and active toggle and shows the self notice", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("Site Admin").closest("tr").find("button").first().click();
    cy.contains("Edit User").should("be.visible");
    cy.get("#edit-role").should("be.disabled");
    cy.contains("You cannot change your own role").should("be.visible");
    cy.contains("label", "Account active").find('input[type="checkbox"]').should("be.disabled");
  });

  it("edit form: a server error surfaces inside the form (with `error` body)", () => {
    stubLoad();
    cy.intercept("PUT", "/api/admin/users/u2", { statusCode: 400, body: { error: "Bad role change" } }).as("update");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").first().click();
    cy.get("#edit-name").clear().type("Renamed");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Bad role change").should("be.visible");
  });

  it("edit form: a server error without an `error` body uses the generic message", () => {
    stubLoad();
    cy.intercept("PUT", "/api/admin/users/u2", { statusCode: 500, body: "nope" }).as("update");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").first().click();
    cy.get("#edit-name").clear().type("Renamed");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Save failed").should("be.visible");
  });

  it("edit form: Cancel closes the dialog without saving", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").first().click();
    cy.contains("Edit User").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Edit User").should("not.exist");
  });

  it("delete: a server error shows a destructive toast and keeps the dialog flow", () => {
    stubLoad();
    cy.intercept("DELETE", "/api/admin/users/u2", { statusCode: 500, body: { error: "Cannot delete" } }).as("del");
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").last().click();
    cy.contains("Delete user account?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("be.visible");
  });

  it("delete: cancelling the confirmation dialog closes it without a request", () => {
    stubLoad();
    mountPage();
    cy.wait("@me");
    cy.contains("Content Editor").closest("tr").find("button").last().click();
    cy.contains("Delete user account?").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Delete user account?").should("not.exist");
  });

  it("handles a /api/admin/me response with no user id (currentUserId stays empty)", () => {
    cy.intercept("GET", "/api/admin/users", { statusCode: 200, body: { users: USERS } }).as("users");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: {} }).as("me");
    mountPage();
    cy.wait("@users");
    cy.wait("@me");
    // No row is "you" -> all delete buttons enabled
    cy.contains("(you)").should("not.exist");
    cy.contains("Site Admin").closest("tr").find("button").last().should("not.be.disabled");
  });

  it("handles a users response with no `users` array (defaults to empty)", () => {
    cy.intercept("GET", "/api/admin/users", { statusCode: 200, body: {} }).as("users");
    cy.intercept("GET", "/api/admin/me", { statusCode: 200, body: ME }).as("me");
    mountPage();
    cy.wait("@users");
    cy.contains("No users found.").should("be.visible");
  });
});

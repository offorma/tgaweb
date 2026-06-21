import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const IMAGE = {
  publicId: "tga/hero-image",
  url: "https://res.cloudinary.com/x/hero.jpg",
  format: "jpg",
  resourceType: "image",
  bytes: 204800,
  width: 1200,
  height: 800,
  createdAt: "2026-01-01T00:00:00.000Z",
};
const DOC = {
  publicId: "tga/handbook",
  url: "https://res.cloudinary.com/x/handbook.pdf",
  format: "pdf",
  resourceType: "raw",
  bytes: 51200,
  createdAt: "2026-01-02T00:00:00.000Z",
};
// Missing format (undefined) + no width + zero bytes -> "FILE" fallback (optional chaining short-circuit),
// width ternary falsy, formatBytes "0 B"
const BARE = {
  publicId: "tga/bare",
  url: "https://res.cloudinary.com/x/bare",
  resourceType: "raw",
  bytes: 0,
  createdAt: "2026-01-03T00:00:00.000Z",
};
// Large image (>1 MB) -> formatBytes "MB" branch
const BIGIMG = {
  publicId: "tga/poster",
  url: "https://res.cloudinary.com/x/poster.png",
  format: "png",
  resourceType: "image",
  bytes: 3 * 1024 * 1024,
  width: 4000,
  height: 3000,
  createdAt: "2026-01-04T00:00:00.000Z",
};
// Small raw file (<1024 bytes) -> formatBytes "B" branch
const SMALL = {
  publicId: "tga/note",
  url: "https://res.cloudinary.com/x/note.txt",
  format: "txt",
  resourceType: "raw",
  bytes: 300,
  createdAt: "2026-01-05T00:00:00.000Z",
};

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminMediaPage />", () => {
  it("renders the loaded media grid", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Media Library").should("be.visible");
    cy.contains("hero-image").should("be.visible");
    cy.contains("handbook").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No files uploaded yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("re-fetches when switching to the Documents filter", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("all");
    cy.intercept("GET", "/api/admin/media?type=raw", { statusCode: 200, body: { items: [DOC] } }).as("raw");
    mountPage();
    cy.wait("@all");
    cy.contains("button", "Documents").click();
    cy.wait("@raw");
    cy.contains("handbook").should("be.visible");
    cy.contains("hero-image").should("not.exist");
  });

  it("filters the grid by search", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.get('input[placeholder="Search files..."]').type("hero");
    cy.contains("hero-image").should("be.visible");
    cy.contains("handbook").should("not.exist");
    cy.get('input[placeholder="Search files..."]').clear().type("zzz");
    cy.contains("No files match your search").should("be.visible");
  });

  it("deletes a media item and removes it from the grid", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    cy.intercept("DELETE", "/api/admin/media", { statusCode: 200, body: { ok: true } }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("handbook")
      .closest(".group")
      .find("button.bg-destructive")
      .click({ force: true });
    cy.contains("Delete from Cloudinary?").should("be.visible");
    cy.contains("button", "Delete permanently").click();
    cy.wait("@del").its("request.body").should("deep.equal", {
      publicId: "tga/handbook",
      resourceType: "raw",
    });
    cy.contains("Deleted").should("be.visible");
    // The document card is removed from the grid (filename may remain in the toast).
    cy.get(".grid-cols-2").find("p.font-medium").should("have.length", 1);
    cy.get(".grid-cols-2").contains("handbook").should("not.exist");
  });

  it("renders FILE fallback, byte sizes (B/KB/MB), and dimensions", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, BARE, BIGIMG, SMALL] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("bare").should("be.visible");
    cy.contains("FILE").should("be.visible"); // undefined format
    cy.contains("0 B").should("be.visible");  // BARE
    cy.contains("300 B").should("be.visible"); // SMALL (<1024)
    cy.contains("3.0 MB").should("be.visible"); // BIGIMG (>1MB)
    // IMAGE has width -> dimensions segment rendered
    cy.contains("1200").should("exist");
  });

  it("copies the URL to the clipboard and shows the copied check", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    mountPage();
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").resolves().as("clip");
    });
    cy.wait("@list");
    cy.contains("hero-image")
      .closest(".group")
      .find("button")
      .first()
      .click({ force: true });
    cy.get("@clip").should("have.been.calledWith", IMAGE.url);
    // copiedId === item.publicId -> CheckCircle (green) rendered
    cy.contains("hero-image")
      .closest(".group")
      .find(".text-green-600")
      .should("exist");
  });

  it("closes the delete dialog via Cancel without deleting", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("handbook")
      .closest(".group")
      .find("button.bg-destructive")
      .click({ force: true });
    cy.contains("Delete from Cloudinary?").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Delete from Cloudinary?").should("not.exist");
    // Item is still present (no delete happened)
    cy.contains("handbook").should("be.visible");
  });

  it("shows a destructive toast when deletion fails", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    cy.intercept("DELETE", "/api/admin/media", { statusCode: 500, body: { error: "Cloudinary error" } }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("handbook")
      .closest(".group")
      .find("button.bg-destructive")
      .click({ force: true });
    cy.contains("button", "Delete permanently").click();
    cy.wait("@del");
    cy.contains("Cloudinary error").should("be.visible");
  });

  it("falls back to the default message when delete error has no error field", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: { items: [IMAGE, DOC] } }).as("list");
    cy.intercept("DELETE", "/api/admin/media", { statusCode: 500, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("handbook")
      .closest(".group")
      .find("button.bg-destructive")
      .click({ force: true });
    cy.contains("button", "Delete permanently").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("be.visible");
  });

  it("handles a list response with no items array (defaults to empty)", () => {
    cy.intercept("GET", "/api/admin/media?type=all", { statusCode: 200, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No files uploaded yet").should("be.visible");
  });
});

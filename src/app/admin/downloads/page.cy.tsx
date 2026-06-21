import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/downloads";
const ITEMS = [
  { id: "d1", name: "2026 Calendar", description: "Term dates", url: "/files/cal.pdf", fileType: "pdf", fileSize: 102400, published: true, order: 1 },
  { id: "d2", name: "Prospectus", description: "", url: "/files/pros.pdf", fileType: "pdf", fileSize: 0, published: false, order: 2 },
  // No description + published + small (bytes) size -> exercises subtitle fileType branch + formatFileSize "B"
  { id: "d3", name: "Tiny File", description: "", url: "/files/tiny.txt", fileType: "txt", fileSize: 500, published: true, order: 3 },
  // No description + published + large size -> formatFileSize "MB", and no fileType -> "file" fallback
  { id: "d4", name: "Big File", description: "", url: "/files/big.zip", fileType: "", fileSize: 5 * 1024 * 1024, published: true, order: 4 },
  // No description + published + KB-range size -> formatFileSize "KB"
  { id: "d5", name: "Mid File", description: "", url: "/files/mid.pdf", fileType: "pdf", fileSize: 2048, published: true, order: 5 },
  // No description + published + zero size -> subtitle omits the size segment (falsy fileSize branch)
  { id: "d6", name: "Zero File", description: "", url: "/files/zero.pdf", fileType: "pdf", fileSize: 0, published: true, order: 6 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminDownloadsPage />", () => {
  it("renders the loaded list including a Draft badge", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Downloads").should("be.visible");
    cy.contains("2026 Calendar").should("be.visible");
    cy.contains("Draft").should("be.visible");
  });

  it("renders subtitle sizes in B/KB/MB and file-type fallbacks", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    // d3: no description -> subtitle uses TXT + 500 B
    cy.contains("500 B").should("be.visible");
    // d4: no description, empty fileType -> "FILE" fallback + MB size
    cy.contains("5.0 MB").should("be.visible");
    cy.contains("FILE").should("be.visible");
    // d5: no description, KB-range size
    cy.contains("2.0 KB").should("be.visible");
    // d6: no description, zero size -> just the file type, no size suffix
    cy.contains("Zero File").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No downloads yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a download (file URL + checkbox)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "d3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Download").click();
    cy.get("#name").type("Handbook");
    cy.get("#url").type("/files/handbook.pdf");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { name: "Handbook", url: "/files/handbook.pdf", fileType: "pdf" });
    cy.contains("Download created").should("be.visible");
  });

  it("edits a download", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/d1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("2026 Calendar").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#name").clear().type("2027 Calendar");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body").should("include", { name: "2027 Calendar" });
    cy.contains("Download updated").should("be.visible");
  });

  it("deletes a download", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/d1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("2026 Calendar").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Download deleted").should("be.visible");
  });
});

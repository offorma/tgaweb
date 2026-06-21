import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/faculty";

const ITEMS = [
  {
    id: "f1",
    name: "Jane Doe",
    role: "Head of School",
    image: "/images/teacher-jane.jpg",
    order: 1,
    bio: "An experienced educator.",
    quote: "Every child matters.",
  },
  {
    id: "f2",
    name: "John Smith",
    role: "Science Teacher",
    image: "/images/teacher-john.jpg",
    order: 2,
    bio: "Loves physics.",
    quote: "Curiosity first.",
  },
];

function mountPage() {
  cy.mount(
    <>
      <Page />
      <Toaster />
    </>
  );
}

describe("<AdminFacultyPage />", () => {
  it("renders the header and the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Faculty").should("be.visible");
    cy.contains("Jane Doe").should("be.visible");
    cy.contains("John Smith").should("be.visible");
  });

  it("shows the empty state when there are no items", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No facultys yet").should("be.visible");
  });

  it("shows a destructive toast when the list fails to load", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("filters the list via the search box", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.get('input[placeholder^="Search"]').type("Jane");
    cy.contains("Jane Doe").should("be.visible");
    cy.contains("John Smith").should("not.exist");
    cy.get('input[placeholder^="Search"]').clear().type("zzzzz");
    cy.contains("No matches found").should("be.visible");
  });

  it("creates a new item and refetches the list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "f3" } }).as("create");
    mountPage();
    cy.wait("@list");

    cy.contains("button", "Add Faculty").click();
    cy.contains("Add New Faculty").should("be.visible");
    cy.get("#name").type("New Teacher");
    cy.get("#role").type("Math Teacher");
    cy.get("#bio").type("Bio text here.");
    cy.get("#quote").type("A quote.");
    // image default value is pre-filled; order default is 0

    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", {
      name: "New Teacher",
      role: "Math Teacher",
    });
    cy.contains("Faculty created").should("be.visible");
  });

  it("surfaces a server error inside the form on failed save", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 400, body: { error: "Name already taken" } }).as("create");
    mountPage();
    cy.wait("@list");

    cy.contains("button", "Add Faculty").click();
    cy.get("#name").type("Dup");
    cy.get("#role").type("Role");
    cy.get("#bio").type("Bio");
    cy.get("#quote").type("Quote");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create");
    cy.contains("Name already taken").should("be.visible");
    // dialog stays open
    cy.contains("Add New Faculty").should("be.visible");
  });

  it("edits an existing item (PUT) and refetches", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/f1`, { statusCode: 200, body: { id: "f1" } }).as("update");
    mountPage();
    cy.wait("@list");

    cy.contains("Jane Doe")
      .closest(".group")
      .within(() => {
        cy.get("button").first().click();
      });
    cy.contains("Edit Faculty").should("be.visible");
    cy.get("#name").should("have.value", "Jane Doe").clear().type("Jane Updated");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body").should("include", { name: "Jane Updated" });
    cy.contains("Faculty updated").should("be.visible");
  });

  it("deletes an item after confirmation and refetches", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/f1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");

    cy.contains("Jane Doe")
      .closest(".group")
      .within(() => {
        cy.get("button").last().click();
      });
    cy.contains("Delete this faculty?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Faculty deleted").should("be.visible");
  });

  it("shows a destructive toast when delete fails", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/f1`, { statusCode: 500, body: { error: "In use" } }).as("del");
    mountPage();
    cy.wait("@list");

    cy.contains("Jane Doe")
      .closest(".group")
      .within(() => {
        cy.get("button").last().click();
      });
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("be.visible");
  });
});

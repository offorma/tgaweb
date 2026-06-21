import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/faqs";
const ITEMS = [
  { id: "q1", question: "What are the school hours?", answer: "8am to 3pm.", order: 1 },
  { id: "q2", question: "Do you provide lunch?", answer: "Yes.", order: 2 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminFaqsPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "FAQs").should("be.visible");
    cy.contains("What are the school hours?").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No faqs yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a FAQ", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "q3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add FAQ").click();
    cy.get("#question").type("Is there a bus service?");
    cy.get("#answer").type("Yes, on selected routes.");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { question: "Is there a bus service?" });
    cy.contains("FAQ created").should("be.visible");
  });

  it("edits a FAQ", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/q1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("What are the school hours?").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#answer").clear().type("7:45am to 3:15pm.");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("FAQ updated").should("be.visible");
  });

  it("deletes a FAQ", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/q1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("What are the school hours?").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("FAQ deleted").should("be.visible");
  });
});

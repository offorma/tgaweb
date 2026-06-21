import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/admission-steps";
const ITEMS = [
  { id: "a1", step: "01", title: "Enquire", description: "Submit an enquiry.", order: 1 },
  { id: "a2", step: "02", title: "Tour", description: "Visit the campus.", order: 2 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminAdmissionsPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Admissions Steps").should("be.visible");
    cy.contains("Enquire").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No admission steps yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates an admission step", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "a3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Admission Step").click();
    cy.get("#step").type("03");
    cy.get("#title").type("Assessment");
    cy.get("#description").type("Take an assessment.");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { step: "03", title: "Assessment" });
    cy.contains("Admission Step created").should("be.visible");
  });

  it("edits an admission step", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/a1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Enquire").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#title").clear().type("Make Enquiry");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Admission Step updated").should("be.visible");
  });

  it("deletes an admission step", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/a1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Enquire").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Admission Step deleted").should("be.visible");
  });
});

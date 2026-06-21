import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/stats";
const ITEMS = [
  { id: "s1", value: 850, suffix: "+", label: "Happy Pupils", description: "and counting", order: 1 },
  { id: "s2", value: 98, suffix: "%", label: "Placement Rate", description: "into top schools", order: 2 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminStatsPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Statistics").should("be.visible");
    cy.contains("Happy Pupils").should("be.visible");
    cy.contains("850+").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No statistics yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a statistic", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "s3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Statistic").click();
    cy.get("#label").type("Years");
    cy.get("#description").type("of excellence");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { label: "Years", description: "of excellence" });
    cy.contains("Statistic created").should("be.visible");
  });

  it("edits a statistic", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/s1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Happy Pupils").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#label").clear().type("Joyful Pupils");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Statistic updated").should("be.visible");
  });

  it("deletes a statistic", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/s1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Happy Pupils").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Statistic deleted").should("be.visible");
  });
});

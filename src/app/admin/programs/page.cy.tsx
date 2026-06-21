import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/programs";
const ITEMS = [
  {
    id: "p1",
    name: "Early Years",
    ages: "Ages 3-5",
    tagline: "Where wonder takes flight",
    color: "orange",
    image: "/images/early.jpg",
    description: "Foundational learning.",
    features: "Play\nPhonics",
    order: 1,
  },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminProgramsPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Programs").should("be.visible");
    cy.contains("Early Years").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No programs yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a program (with select)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "p2" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Program").click();
    cy.get("#name").type("Lower Primary");
    cy.get("#ages").type("Ages 6-8");
    cy.get("#tagline").type("Building blocks");
    cy.get("#color").select("navy");
    cy.get("#description").type("Core curriculum.");
    cy.get("#features").type("Reading\nWriting");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { name: "Lower Primary", color: "navy" });
    cy.contains("Program created").should("be.visible");
  });

  it("edits a program", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/p1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Early Years").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#name").clear().type("Early Years Updated");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Program updated").should("be.visible");
  });

  it("deletes a program", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/p1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Early Years").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Program deleted").should("be.visible");
  });
});

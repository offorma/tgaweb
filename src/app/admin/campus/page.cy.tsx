import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/campus-items";
const ITEMS = [
  { id: "c1", title: "Sports Day", description: "Athletics meet", image: "/images/sports.jpg", order: 1 },
  { id: "c2", title: "Art Club", description: "Painting", image: "/images/art.jpg", order: 2 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminCampusPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Campus Life").should("be.visible");
    cy.contains("Sports Day").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No campus items yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a campus item (image default pre-filled)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "c3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Campus Item").click();
    cy.get("#title").type("STEM Lab");
    cy.get("#description").type("Robotics");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { title: "STEM Lab", description: "Robotics" });
    cy.contains("Campus Item created").should("be.visible");
  });

  it("edits a campus item", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/c1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Sports Day").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#title").clear().type("Sports Week");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Campus Item updated").should("be.visible");
  });

  it("deletes a campus item", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/c1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Sports Day").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Campus Item deleted").should("be.visible");
  });
});

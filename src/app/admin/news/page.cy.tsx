import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/news";
const ITEMS = [
  { id: "n1", title: "Open Day Announced", date: "2026-07-01T00:00:00.000Z", category: "Event", tag: "Admissions", image: "/images/openday.jpg", excerpt: "Join us!", published: true, order: 1 },
  { id: "n2", title: "Draft Story", date: "2026-06-01T00:00:00.000Z", category: "News", tag: "STEM", image: "/images/stem.jpg", excerpt: "Coming soon.", published: false, order: 2 },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminNewsPage />", () => {
  it("renders the loaded list with published and draft badges", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "News & Events").should("be.visible");
    cy.contains("Open Day Announced").should("be.visible");
    cy.contains("Draft").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No news items yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a news item (date + select + image defaults)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "n3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add News Item").click();
    cy.get("#title").type("Sports Carnival");
    cy.get("#category").select("Event");
    cy.get("#tag").type("Sports");
    cy.get("#excerpt").type("A fun-filled day.");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { title: "Sports Carnival", category: "Event", tag: "Sports" });
    cy.contains("News Item created").should("be.visible");
  });

  it("edits a news item", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/n1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Open Day Announced").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#title").clear().type("Open Day Confirmed");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body").should("include", { title: "Open Day Confirmed" });
    cy.contains("News Item updated").should("be.visible");
  });

  it("deletes a news item", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/n1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Open Day Announced").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("News Item deleted").should("be.visible");
  });
});

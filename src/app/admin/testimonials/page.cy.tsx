import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/testimonials";
const ITEMS = [
  { id: "t1", name: "The Obioras", relation: "Parents of Zara", rating: 5, order: 1, quote: "Wonderful school." },
  { id: "t2", name: "Mrs. Bello", relation: "Parent of Tomi", rating: 4, order: 2, quote: "Great teachers." },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminTestimonialsPage />", () => {
  it("renders the loaded list", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Testimonials").should("be.visible");
    cy.contains("The Obioras").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No testimonials yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("creates a testimonial", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "t3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Testimonial").click();
    cy.get("#name").type("New Parent");
    cy.get("#relation").type("Parent of Ada");
    cy.get("#quote").type("Amazing place.");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should("include", { name: "New Parent", rating: 5 });
    cy.contains("Testimonial created").should("be.visible");
  });

  it("edits a testimonial", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/t1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("The Obioras").closest(".group").within(() => cy.get("button").first().click());
    cy.get("#name").clear().type("The Updated Obioras");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update");
    cy.contains("Testimonial updated").should("be.visible");
  });

  it("deletes a testimonial", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: ITEMS } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/t1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("The Obioras").closest(".group").within(() => cy.get("button").last().click());
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Testimonial deleted").should("be.visible");
  });
});

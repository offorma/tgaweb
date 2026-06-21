import { FAQ } from "./faq";
import type { Faq } from "@prisma/client";

const faqs = [
  { id: "f1", slug: "hours", question: "What are the school hours?", answer: "7:30 AM to 3:30 PM, Monday to Friday." },
  { id: "f2", slug: "transport", question: "Do you offer transport?", answer: "Yes, GPS-tracked buses serve Nsukka." },
] as unknown as Faq[];

describe("<FAQ />", () => {
  it("renders nothing for an empty faqs array", () => {
    cy.mountWithIntl(<FAQ faqs={[]} />);
    cy.get("section").should("not.exist");
  });

  it("lists every question and expands an item to reveal its answer", () => {
    cy.mountWithIntl(<FAQ faqs={faqs} />);
    cy.contains("What are the school hours?").should("exist");
    cy.contains("Do you offer transport?").should("exist");

    // Radix accordion keeps collapsed content out of the DOM; it appears on open.
    cy.contains("7:30 AM to 3:30 PM").should("not.exist");
    cy.contains("What are the school hours?").click();
    cy.contains("7:30 AM to 3:30 PM, Monday to Friday.").should("be.visible");

    // Single-type collapsible: opening another reveals its answer.
    cy.contains("Do you offer transport?").click();
    cy.contains("Yes, GPS-tracked buses serve Nsukka.").should("be.visible");
  });
});

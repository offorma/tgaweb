import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";

describe("<Accordion />", () => {
  it("expands content when the trigger is clicked", () => {
    cy.mount(
      <Accordion type="single" collapsible className="my-accordion">
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>Yes. It adheres to WAI-ARIA.</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    cy.get('[data-slot="accordion-item"]').should("exist");
    cy.get('[data-slot="accordion-trigger"]').should(
      "contain.text",
      "Is it accessible?"
    );
    cy.get('[data-slot="accordion-content"]').should("not.be.visible");
    cy.get('[data-slot="accordion-trigger"]').click();
    cy.get('[data-slot="accordion-content"]').should(
      "contain.text",
      "Yes. It adheres to WAI-ARIA."
    );
  });
});

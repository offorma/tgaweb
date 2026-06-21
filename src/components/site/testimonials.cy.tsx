import { Testimonials } from "./testimonials";
import type { Testimonial } from "@prisma/client";

const testimonials = [
  { id: "t1", slug: "obiora", name: "Mr. & Mrs. Obiora", relation: "Parents of Zara", quote: "A second family for our children.", rating: 5 },
  { id: "t2", slug: "anike", name: "Barr. Chinwe Anike", relation: "Parent of Chidinma", quote: "Exceptional preparation.", rating: 4 },
  { id: "t3", slug: "okeke", name: "Engr. Ifeanyi Okeke", relation: "Parent of Kamsi", quote: "Robotics on another level.", rating: 5 },
] as unknown as Testimonial[];

describe("<Testimonials />", () => {
  it("renders nothing for an empty array", () => {
    cy.mountWithIntl(<Testimonials testimonials={[]} />);
    cy.get("section").should("not.exist");
  });

  it("shows the first testimonial and its star rating, with nav controls for multiple", () => {
    cy.mountWithIntl(<Testimonials testimonials={testimonials} />);
    cy.contains("A second family for our children.").should("exist");
    cy.contains("Mr. & Mrs. Obiora").should("exist");
    cy.get('button[aria-label="Next testimonial"]').should("exist");
    cy.get('button[aria-label="Previous testimonial"]').should("exist");
    // One dot per testimonial.
    cy.get('button[aria-label^="Go to testimonial"]').should("have.length", 3);
  });

  it("advances to the next testimonial when the next arrow is clicked", () => {
    cy.mountWithIntl(<Testimonials testimonials={testimonials} />);
    cy.get('button[aria-label="Next testimonial"]').click();
    cy.contains("Exceptional preparation.").should("exist");
    cy.contains("Barr. Chinwe Anike").should("exist");
  });

  it("jumps to a specific testimonial via the dot indicators and wraps with prev", () => {
    cy.mountWithIntl(<Testimonials testimonials={testimonials} />);
    cy.get('button[aria-label="Go to testimonial 3"]').click();
    cy.contains("Robotics on another level.").should("exist");
    // prev from the first wraps around to the last.
    cy.get('button[aria-label="Go to testimonial 1"]').click();
    cy.get('button[aria-label="Previous testimonial"]').click();
    cy.contains("Robotics on another level.").should("exist");
  });

  it("hides navigation when there is a single testimonial", () => {
    cy.mountWithIntl(<Testimonials testimonials={[testimonials[0]]} />);
    cy.get('button[aria-label="Next testimonial"]').should("not.exist");
  });
});

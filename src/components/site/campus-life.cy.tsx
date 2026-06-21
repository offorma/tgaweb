import { CampusLife } from "./campus-life";
import type { CampusItem } from "@prisma/client";

const items = [
  { id: "c1", slug: "sports", image: "/images/sports.jpg", title: "Sports & Athletics", description: "Football and athletics." },
  { id: "c2", slug: "arts", image: "/images/arts.jpg", title: "Creative Arts", description: "Painting and drama." },
  { id: "c3", slug: "stem", image: "/images/science.jpg", title: "STEM Club", description: "Robotics and coding." },
  { id: "c4", slug: "library", image: "/images/library.jpg", title: "Reading Corner", description: "A 6,000-book library." },
  { id: "c5", slug: "digital", image: "/images/computer-lab.jpg", title: "Digital Lab", description: "ICT suites." },
  { id: "c6", slug: "grad", image: "/images/graduation.jpg", title: "Graduation Day", description: "Celebrating leaders." },
] as unknown as CampusItem[];

describe("<CampusLife />", () => {
  it("renders nothing with no items", () => {
    cy.mountWithIntl(<CampusLife items={[]} />);
    cy.get("section").should("not.exist");
  });

  it("renders every campus item with its image and title", () => {
    cy.mountWithIntl(<CampusLife items={items} />);
    cy.contains("Sports & Athletics").should("exist");
    cy.contains("Graduation Day").should("exist");
    cy.get("img").should("have.length", items.length);
    cy.get('img[alt="STEM Club"]').should("have.attr", "src", "/images/science.jpg");
  });

  it("scrolls to #contact via the 'book a tour' link", () => {
    cy.mountWithIntl(
      <div>
        <CampusLife items={items} />
        <div id="contact">contact</div>
      </div>
    );
    cy.get("#contact").then(($el) => cy.stub($el[0], "scrollIntoView").as("scrollSpy"));
    cy.get("button").last().click();
    cy.get("@scrollSpy").should("have.been.called");
  });
});

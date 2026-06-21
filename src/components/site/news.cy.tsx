import { News } from "./news";
import type { NewsItem } from "@prisma/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

// next/link needs an App Router context to mount outside a Next app.
const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  refresh: () => {},
} as never;
function withRouter(node: React.ReactNode) {
  return <AppRouterContext.Provider value={mockRouter}>{node}</AppRouterContext.Provider>;
}

const news = [
  { id: "n1", slug: "sports-day", date: "2026-06-21", category: "Event", tag: "Sports", title: "Annual Sports Day", excerpt: "A day of athletics and fun.", image: "/images/sports.jpg" },
  { id: "n2", slug: "robotics", date: new Date("2026-07-04"), category: "News", tag: "STEM", title: "Robotics Qualifies for Nationals", excerpt: "The GliderBots placed second.", image: "/images/computer-lab.jpg" },
] as unknown as NewsItem[];

describe("<News />", () => {
  it("renders nothing for an empty news array", () => {
    cy.mountWithIntl(withRouter(<News news={[]} />));
    cy.get("section").should("not.exist");
  });

  it("renders each article with tag, category, title and a formatted date", () => {
    cy.mountWithIntl(withRouter(<News news={news} />));
    cy.contains("Annual Sports Day").should("exist");
    cy.contains("Robotics Qualifies for Nationals").should("exist");
    cy.contains("A day of athletics and fun.").should("exist");
    cy.contains("Sports").should("exist");
    cy.contains("STEM").should("exist");
    // formatDate renders en-GB "21 Jun 2026" from both string and Date inputs.
    cy.contains("21 Jun 2026").should("exist");
    cy.contains("4 Jul 2026").should("exist");
    cy.get('a[href="/news/sports-day"]').should("exist");
  });

  it("scrolls to #contact via the 'contact admissions' button", () => {
    cy.mountWithIntl(
      withRouter(
        <div>
          <News news={news} />
          <div id="contact">contact</div>
        </div>
      )
    );
    cy.get("#contact").then(($el) => cy.stub($el[0], "scrollIntoView").as("scrollSpy"));
    cy.get("button").first().click();
    cy.get("@scrollSpy").should("have.been.called");
  });
});

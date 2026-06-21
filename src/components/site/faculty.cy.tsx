import { Faculty } from "./faculty";
import type { Faculty as FacultyType } from "@prisma/client";
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

const faculty = [
  { id: "t1", slug: "adaeze-okonkwo", name: "Dr. Adaeze Okonkwo", role: "Head of School", image: "/images/teacher-1.jpg", bio: "PhD in Early Childhood Education.", quote: "Every child carries a spark." },
  { id: "t2", slug: "chijioke-eze", name: "Mr. Chijioke Eze", role: "Head, Upper Primary", image: "/images/teacher-2.jpg", bio: "B.Ed Mathematics.", quote: "Mathematics is a way of seeing." },
] as unknown as FacultyType[];

describe("<Faculty />", () => {
  it("renders nothing for an empty faculty array", () => {
    cy.mountWithIntl(withRouter(<Faculty faculty={[]} />));
    cy.get("section").should("not.exist");
  });

  it("renders each member with name, role, bio and a link to their detail page", () => {
    cy.mountWithIntl(withRouter(<Faculty faculty={faculty} />));
    cy.contains("Dr. Adaeze Okonkwo").should("exist");
    cy.contains("Head of School").should("exist");
    cy.contains("PhD in Early Childhood Education.").should("exist");
    cy.contains("Mr. Chijioke Eze").should("exist");
    cy.get('a[href="/faculty/adaeze-okonkwo"]').should("exist");
    cy.get('a[href="/faculty/chijioke-eze"]').should("exist");
    cy.get('img[alt="Dr. Adaeze Okonkwo"]').should("have.attr", "src", "/images/teacher-1.jpg");
  });
});

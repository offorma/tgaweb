import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { AdminShell, AdminPageHeader, AdminCard } from "./shell";

// The shared harness (cy.mount) already wraps the tree in the Next App Router
// context with a stub router exposing push as the "@router:push" alias and a
// PathnameContext of "/". The component reads useRouter()/usePathname() from
// that context, so we do not (and cannot reliably) module-stub next/navigation
// here — module-mocking named ESM imports doesn't work in Cypress component
// tests. We drive behaviour through the real DOM and the harness router stub.

describe("<AdminShell />", () => {
  beforeEach(() => {
    // next-auth's client fires fetches to /api/auth/* (csrf, signout) which
    // would otherwise 404 with an HTML body and throw CLIENT_FETCH_ERROR,
    // polluting later tests. Stub them with valid JSON.
    cy.intercept("GET", "/api/auth/csrf", { statusCode: 200, body: { csrfToken: "test-csrf" } }).as("csrf");
    cy.intercept("GET", "/api/auth/session", { statusCode: 200, body: {} });
    cy.intercept("POST", "/api/auth/signout", { statusCode: 200, body: { url: "/admin/login" } }).as("signout");
  });

  it("renders all nav links with the active item highlighted", () => {
    cy.mount(
      <AdminShell>
        <div data-cy="content">Page content</div>
      </AdminShell>
    );
    cy.get('[data-cy="content"]').should("exist");
    // Desktop sidebar nav links
    cy.contains("a", "Dashboard").should("have.attr", "href", "/admin/dashboard");
    cy.contains("a", "Site Settings").should("have.attr", "href", "/admin/settings");
    cy.contains("a", "User Management").should("exist");
    // View Website external link + Sign Out button
    cy.contains("a", "View Website").should("have.attr", "href", "/");
    cy.contains("button", "Sign Out").should("exist");
  });

  it("renders the Programs nav item linking to its route", () => {
    cy.mount(
      <AdminShell>
        <div />
      </AdminShell>
    );
    cy.contains("a", "Programs").should("have.attr", "href", "/admin/programs");
  });

  it("highlights the active nav item for a matching pathname", () => {
    // Override the harness pathname ("/") with one that matches a nav href so
    // the `active` true branches (highlight classes + ChevronRight) render.
    cy.mount(
      <PathnameContext.Provider value="/admin/settings">
        <AdminShell>
          <div />
        </AdminShell>
      </PathnameContext.Provider>
    );
    // The active item gets the highlight class on the desktop sidebar.
    cy.get('aside a[href="/admin/settings"]')
      .first()
      .should("have.class", "bg-white/10");
    // ChevronRight indicator renders only for the active item.
    cy.get('aside a[href="/admin/settings"]')
      .first()
      .find("svg")
      .should("have.length.greaterThan", 1);
  });

  it("treats a nested route as the active section (startsWith branch)", () => {
    cy.mount(
      <PathnameContext.Provider value="/admin/programs/123/edit">
        <AdminShell>
          <div />
        </AdminShell>
      </PathnameContext.Provider>
    );
    cy.get('aside a[href="/admin/programs"]')
      .first()
      .should("have.class", "bg-white/10");
  });

  it("calls signOut and redirects to the login page when Sign Out is clicked", () => {
    cy.mount(
      <AdminShell>
        <div />
      </AdminShell>
    );
    cy.contains("button", "Sign Out").first().click();
    // The real next-auth signOut posts to /api/auth/signout; observing that
    // request proves signOut({ redirect: false }) ran.
    cy.wait("@signout");
    // handleSignOut then routes to the login page via the harness router stub.
    cy.get("@router:push").should("have.been.calledWith", "/admin/login");
  });

  it("opens and closes the mobile sidebar drawer", () => {
    cy.viewport(375, 667);
    cy.mount(
      <AdminShell>
        <div />
      </AdminShell>
    );
    // The drawer's Close (X) button is nested inside the brand <Link> in the
    // source, so a click on it bubbles to the anchor and would trigger a real
    // iframe navigation (breaking later tests). Suppress anchor navigation so we
    // can test the close-button behaviour in isolation.
    cy.document().then((doc) => {
      doc.addEventListener(
        "click",
        (e) => {
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        },
        true
      );
    });
    // Open the drawer via the hamburger menu
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close"]').should("be.visible").click();
    cy.get('button[aria-label="Close"]').should("not.exist");
  });

  it("closes the mobile drawer when clicking the backdrop overlay", () => {
    cy.viewport(375, 667);
    cy.mount(
      <AdminShell>
        <div />
      </AdminShell>
    );
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close"]').should("be.visible");
    cy.get(".bg-black\\/50").click({ force: true });
    cy.get('button[aria-label="Close"]').should("not.exist");
  });
});

describe("<AdminPageHeader />", () => {
  it("renders title, description and action", () => {
    cy.mount(
      <AdminPageHeader
        title="My Title"
        description="My description"
        action={<button>Do thing</button>}
      />
    );
    cy.contains("h1", "My Title").should("exist");
    cy.contains("My description").should("exist");
    cy.contains("button", "Do thing").should("exist");
  });

  it("renders without an optional description", () => {
    cy.mount(<AdminPageHeader title="Only Title" />);
    cy.contains("h1", "Only Title").should("exist");
  });
});

describe("<AdminCard />", () => {
  it("renders children and applies a custom className", () => {
    cy.mount(
      <AdminCard className="my-card">
        <span data-cy="card-child">inner</span>
      </AdminCard>
    );
    cy.get('[data-cy="card-child"]').should("exist");
    cy.get(".my-card").should("exist");
  });

  it("renders without a className (falls back to empty string)", () => {
    cy.mount(
      <AdminCard>
        <span data-cy="bare-child">bare</span>
      </AdminCard>
    );
    cy.get('[data-cy="bare-child"]').should("exist");
  });
});

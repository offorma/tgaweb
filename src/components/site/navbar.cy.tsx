import { Navbar } from "./navbar";
import type { SiteSettings } from "@prisma/client";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Navbar calls next/navigation's usePathname(), which reads PathnameContext.
// We provide it directly so the component can mount outside the App Router.
function withPathname(pathname: string, node: React.ReactNode) {
  return <PathnameContext.Provider value={pathname}>{node}</PathnameContext.Provider>;
}

const settings = {
  crestUrl: "/crest/school-crest.png",
  phone: "+234 803 456 7890",
  hours: "Mon - Fri 7:30 - 3:30",
  facebookUrl: "https://facebook.com/tga",
  instagramUrl: "https://instagram.com/tga",
  youtubeUrl: "",
  applyButtonEnabled: true,
  applyButtonLabel: "Apply Now",
  applyButtonType: "scroll",
  applyButtonUrl: "#admissions",
  applyButtonStyle: "primary",
} as unknown as SiteSettings;

describe("<Navbar />", () => {
  it("renders the brand, top-bar contact info and configured social links", () => {
    cy.mountWithIntl(withPathname("/", <Navbar settings={settings} />));
    cy.contains("Trail Gliders").should("exist");
    cy.contains("+234 803 456 7890").should("exist");
    cy.contains("Mon - Fri 7:30 - 3:30").should("exist");
    cy.contains("a", "Facebook").should("have.attr", "href", "https://facebook.com/tga");
    cy.contains("a", "Instagram").should("exist");
  });

  it("renders the desktop nav links and the ApplyButton CTA", () => {
    cy.mountWithIntl(withPathname("/", <Navbar settings={settings} />));
    cy.contains("button", "Home").should("exist");
    cy.contains("button", "About").should("exist");
    cy.contains("button", "Contact").should("exist");
    cy.contains("Apply Now").should("exist");
  });

  it("smooth-scrolls to the matching section when a nav link is clicked", () => {
    cy.mountWithIntl(
      withPathname(
        "/",
        <div>
          <Navbar settings={settings} />
          <div id="about" style={{ height: 100 }}>about section</div>
        </div>
      )
    );
    cy.get("#about").then(($el) => cy.stub($el[0], "scrollIntoView").as("scrollSpy"));
    cy.contains("button", "About").click();
    cy.get("@scrollSpy").should("have.been.called");
  });

  it("toggles the mobile menu open and closed", () => {
    cy.viewport(375, 700);
    cy.mountWithIntl(withPathname("/", <Navbar settings={settings} />));
    cy.get('button[aria-label="Toggle menu"]').click();
    // Mobile menu duplicates the nav links inside the panel.
    cy.get(".lg\\:hidden").contains("Admissions").should("be.visible");
    cy.get('button[aria-label="Toggle menu"]').click();
  });

  it("marks the section active from a sub-page path prefix", () => {
    cy.mountWithIntl(withPathname("/news/some-article", <Navbar settings={settings} />));
    // News button should carry the active orange color class.
    cy.contains("button", "News").should("have.class", "text-[var(--orange)]");
  });

  it("hides the social bar when no social URLs are configured", () => {
    const bare = { ...settings, facebookUrl: "", instagramUrl: "", youtubeUrl: "" } as unknown as SiteSettings;
    cy.mountWithIntl(withPathname("/", <Navbar settings={bare} />));
    cy.contains("a", "Facebook").should("not.exist");
  });

  it("applies the scrolled style and tracks the active section on scroll", () => {
    cy.viewport(1280, 720);
    cy.mountWithIntl(
      withPathname(
        "/",
        <div>
          <Navbar settings={settings} />
          {/* #about is positioned so its bounding rect straddles the 120px line
              (top below 120, bottom well past it) -> the section-detection loop
              marks it active when onScroll runs (on mount + on scroll). */}
          <div id="about" style={{ marginTop: "30px", height: "2500px" }}>
            about
          </div>
          <div style={{ height: "2000px" }} />
        </div>
      )
    );
    // Force #about's rect to straddle the 120px line so the detection loop's
    // `rect.top <= 120 && rect.bottom >= 120` branch is taken and About becomes
    // the active section; also push scrollY > 40 so `scrolled` flips true.
    cy.get("#about").then(($el) => {
      cy.stub($el[0], "getBoundingClientRect").returns({
        top: 100,
        bottom: 900,
        left: 0,
        right: 0,
        width: 0,
        height: 800,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);
    });
    cy.window().then((win) => {
      Object.defineProperty(win, "scrollY", { configurable: true, value: 80 });
      win.dispatchEvent(new Event("scroll"));
    });
    // `scrolled` true applies the solid white header background.
    cy.get("header").should("have.class", "bg-white/90");
    // #about straddles the 120px line -> becomes the active nav section.
    cy.contains(".hidden.lg\\:flex button", "About").should(
      "have.class",
      "text-[var(--orange)]"
    );
  });

  it("falls back to the translated Apply label when applyButtonLabel is empty", () => {
    const noLabel = { ...settings, applyButtonLabel: "" } as unknown as SiteSettings;
    cy.mountWithIntl(withPathname("/", <Navbar settings={noLabel} />));
    // Desktop CTA falls back to nav.applyNow ("Apply Now" in en messages).
    cy.contains("Apply Now").should("exist");
  });

  it("renders the mobile menu links and the Apply CTA inside the panel", () => {
    cy.viewport(375, 800);
    cy.mountWithIntl(withPathname("/", <Navbar settings={settings} />));
    cy.get('button[aria-label="Toggle menu"]').click();
    const panel = () => cy.get(".lg\\:hidden.overflow-hidden");
    panel().contains("Home").should("be.visible");
    panel().contains("Contact").should("be.visible");
    panel().contains("Apply Now").should("exist");
    // Clicking a mobile link closes the menu (handleNav sets open=false).
    panel().contains("Home").click();
    cy.get(".lg\\:hidden.overflow-hidden").should("not.exist");
  });

  it("falls back to the default crest when settings is null", () => {
    cy.mountWithIntl(withPathname("/", <Navbar settings={null} />));
    cy.get('img[alt="Trail Gliders Academy Crest"]').should(
      "have.attr",
      "src",
      "/crest/school-crest.png"
    );
  });
});

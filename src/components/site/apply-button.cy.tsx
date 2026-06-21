import { ApplyButton } from "./apply-button";
import type { SiteSettings } from "@prisma/client";

type ApplySettings = Pick<
  SiteSettings,
  "applyButtonEnabled" | "applyButtonLabel" | "applyButtonType" | "applyButtonUrl" | "applyButtonStyle"
>;

function make(overrides: Partial<ApplySettings>): ApplySettings {
  return {
    applyButtonEnabled: true,
    applyButtonLabel: "Apply Now",
    applyButtonType: "scroll",
    applyButtonUrl: "#admissions",
    applyButtonStyle: "primary",
    ...overrides,
  };
}

describe("<ApplyButton />", () => {
  it("renders nothing when disabled or when settings is null", () => {
    cy.mountWithIntl(<ApplyButton settings={make({ applyButtonEnabled: false })} />);
    cy.get("button, a").should("not.exist");
    cy.mountWithIntl(<ApplyButton settings={null} />);
    cy.get("button, a").should("not.exist");
  });

  it("scroll variant: renders a button and scrolls to the target anchor", () => {
    cy.mountWithIntl(
      <div>
        <ApplyButton settings={make({ applyButtonType: "scroll", applyButtonUrl: "#admissions" })} />
        <div id="admissions" style={{ marginTop: "2000px", height: "100px" }}>
          Admissions target
        </div>
      </div>
    );
    cy.get("button").contains("Apply Now").should("exist");
    cy.get("#admissions").then(($el) => {
      cy.stub($el[0], "scrollIntoView").as("scrollSpy");
    });
    cy.get("button").contains("Apply Now").click();
    cy.get("@scrollSpy").should("have.been.called");
  });

  it("scroll variant: bare anchor name gets a leading hash", () => {
    cy.mountWithIntl(
      <div>
        <ApplyButton settings={make({ applyButtonType: "scroll", applyButtonUrl: "admissions" })}>
          Go
        </ApplyButton>
        <div id="admissions">target</div>
      </div>
    );
    cy.get("#admissions").then(($el) => cy.stub($el[0], "scrollIntoView").as("scroll2"));
    cy.contains("Go").click();
    cy.get("@scroll2").should("have.been.called");
  });

  it("external variant: renders an anchor opening a full URL in a new tab", () => {
    cy.mountWithIntl(
      <ApplyButton
        settings={make({ applyButtonType: "external", applyButtonUrl: "https://apply.example.com", applyButtonStyle: "outline" })}
      />
    );
    cy.get("a")
      .should("have.attr", "href", "https://apply.example.com")
      .and("have.attr", "target", "_blank")
      .and("have.attr", "rel", "noopener noreferrer");
  });

  it("external variant: a schemeless URL is prefixed with https:// and window.open is used", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "external", applyButtonUrl: "apply.example.com" })} />
    );
    cy.get("a").should("have.attr", "href", "https://apply.example.com");
    cy.window().then((win) => cy.stub(win, "open").as("openSpy"));
    cy.get("a").click();
    cy.get("@openSpy").should("have.been.calledWithMatch", "https://apply.example.com");
  });

  it("mailto variant: a ready mailto URL is used verbatim", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "mailto", applyButtonUrl: "mailto:admissions@school.test" })} />
    );
    cy.get("a").should("have.attr", "href", "mailto:admissions@school.test");
  });

  it("mailto variant: a bare email is turned into a mailto: href", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "mailto", applyButtonUrl: "info@school.test" })} />
    );
    cy.get("a").should("have.attr", "href", "mailto:info@school.test");
  });

  it("respects the custom label, size and children", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "external", applyButtonUrl: "https://x.test" })} size="lg">
        Custom Child
      </ApplyButton>
    );
    cy.get("a").should("contain.text", "Custom Child").and("have.class", "h-13");
  });

  it("falls back to default label/type/url/style when those fields are empty", () => {
    // All optional config fields empty (but enabled) exercises every `|| default`
    // fallback: label -> "Apply Now", type -> "scroll", url -> "#admissions",
    // style -> "primary".
    cy.mountWithIntl(
      <ApplyButton
        settings={{
          applyButtonEnabled: true,
          applyButtonLabel: "",
          applyButtonType: "",
          applyButtonUrl: "",
          applyButtonStyle: "",
        } as unknown as Parameters<typeof ApplyButton>[0]["settings"]}
      />
    );
    // Default scroll button rendered with the default "Apply Now" label and the
    // primary gradient style.
    cy.get("button")
      .should("contain.text", "Apply Now")
      .and("have.class", "from-[var(--orange)]");
  });

  it("scroll variant: does nothing when the target element is missing", () => {
    // url points at an anchor that doesn't exist -> querySelector returns null ->
    // the `if (el)` guard is false and no scroll happens (covers the else path).
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "scroll", applyButtonUrl: "#does-not-exist" })}>
        Scroll
      </ApplyButton>
    );
    cy.contains("button", "Scroll").click();
    // No throw, button still present.
    cy.contains("button", "Scroll").should("exist");
  });

  it("scroll variant: a caller className already containing rounded-full isn't duplicated", () => {
    cy.mountWithIntl(
      <ApplyButton
        settings={make({ applyButtonType: "scroll" })}
        className="rounded-full extra-class"
      >
        Rounded
      </ApplyButton>
    );
    cy.contains("button", "Rounded").should("have.class", "extra-class");
  });

  it("scroll variant: renders with no className (default rounded-full applied)", () => {
    // No className prop -> `!className?.includes(...)` optional chain short-circuits
    // (className is undefined) and the default rounded-full class is applied.
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "scroll" })} />
    );
    cy.get("button").should("have.class", "rounded-full").and("contain.text", "Apply Now");
  });

  it("scroll variant: a large size gets the lg sizing classes", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "scroll" })} size="lg">
        Big
      </ApplyButton>
    );
    cy.contains("button", "Big").should("have.class", "h-13");
  });

  it("applies sm + default sizing across scroll, external and mailto variants", () => {
    // sm size — scroll
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "scroll" })} size="sm">
        S1
      </ApplyButton>
    );
    cy.contains("button", "S1").should("exist");
    // sm size — external
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "external", applyButtonUrl: "https://e.test" })} size="sm">
        S2
      </ApplyButton>
    );
    cy.contains("a", "S2").should("have.class", "h-9");
    // default size — external
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "external", applyButtonUrl: "https://e2.test" })} size="default">
        S3
      </ApplyButton>
    );
    cy.contains("a", "S3").should("have.class", "h-11");
    // sm size — mailto
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "mailto", applyButtonUrl: "mailto:s@x.test" })} size="sm">
        S4
      </ApplyButton>
    );
    cy.contains("a", "S4").should("have.class", "h-9");
    // default size — mailto
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "mailto", applyButtonUrl: "mailto:s2@x.test" })} size="default">
        S5
      </ApplyButton>
    );
    cy.contains("a", "S5").should("have.class", "h-11");
  });

  it("outline style renders the ghost variant for the scroll button", () => {
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "scroll", applyButtonStyle: "outline" })}>
        Ghost
      </ApplyButton>
    );
    cy.contains("button", "Ghost").should("have.class", "bg-white/5");
  });

  it("mailto variant: clicking a ready mailto: href is left to the browser", () => {
    // url already starts with "mailto:" -> handleClick's `!url.startsWith("mailto:")`
    // guard is FALSE, so no preventDefault / location assignment runs and the click
    // is handled natively (covers the mailto branch's else path without navigating).
    cy.mountWithIntl(
      <ApplyButton settings={make({ applyButtonType: "mailto", applyButtonUrl: "mailto:ready@school.test" })}>
        Mail
      </ApplyButton>
    );
    cy.contains("a", "Mail").should("have.attr", "href", "mailto:ready@school.test");
  });
});

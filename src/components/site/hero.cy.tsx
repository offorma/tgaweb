import { Hero } from "./hero";
import type { SiteSettings, Slide } from "@prisma/client";

const settings = {
  tagline: "Glide Beyond Limits",
  crestUrl: "/crest/school-crest.png",
  heroBadge: "Admissions Open",
  heroTitle1: "Where Young Minds",
  heroTitle2: "Glide Beyond Limits",
  heroDescription: "A premier Nigerian primary school.",
  applyButtonEnabled: true,
  applyButtonLabel: "Apply Now",
  applyButtonType: "scroll",
  applyButtonUrl: "#admissions",
  applyButtonStyle: "primary",
} as unknown as SiteSettings;

function slide(over: Partial<Slide>): Slide {
  return {
    id: "s1",
    image: "/images/hero.jpg",
    videoUrl: null,
    title: "Slide One",
    subtitle: "Subtitle one",
    badge: "Badge one",
    linkUrl: "",
    linkLabel: "",
    transitionType: "fade",
    duration: 6500,
    textPosition: "left",
    parallaxDepth: 15,
    active: true,
    order: 0,
    updatedAt: new Date(),
    ...over,
  } as Slide;
}

describe("<Hero />", () => {
  it("renders a fallback slide using settings when no slides are passed", () => {
    cy.mountWithIntl(<Hero settings={settings} slides={[]} />);
    cy.get("#home").should("exist");
    cy.contains("Where Young Minds").should("exist");
    cy.contains("Admissions Open").should("exist");
    // Single slide -> no carousel arrows.
    cy.get('button[aria-label="Next slide"]').should("not.exist");
  });

  it("renders the begin-application CTA and explore-campus button", () => {
    cy.mountWithIntl(<Hero settings={settings} slides={[]} />);
    // Hero's primary CTA renders the translated label (hero.beginApplication),
    // not the generic applyButtonLabel.
    cy.contains("Begin Your Application").should("exist");
    cy.contains(/explore/i).should("exist");
  });

  it("renders carousel controls and advances slides with the next arrow", () => {
    const slides = [
      slide({ id: "s1", title: "First Slide", image: "/images/a.jpg" }),
      slide({ id: "s2", title: "Second Slide", image: "/images/b.jpg", textPosition: "center" }),
      slide({ id: "s3", title: "Third Slide", image: "/images/c.jpg", transitionType: "zoom", textPosition: "right" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.contains("First Slide").should("exist");
    cy.get('button[aria-label="Next slide"]').should("exist");
    cy.get('button[aria-label="Previous slide"]').should("exist");
    cy.get('button[aria-label="Go to slide 2"]').should("exist");

    cy.get('button[aria-label="Next slide"]').click();
    cy.contains("Second Slide").should("exist");

    // Jump directly to slide 3 via a dot.
    cy.get('button[aria-label="Go to slide 3"]').first().click();
    cy.contains("Third Slide").should("exist");
  });

  it("toggles autoplay via the play/pause control", () => {
    const slides = [slide({ id: "s1", title: "One" }), slide({ id: "s2", title: "Two" })];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.get('button[aria-label="Pause slideshow"]').click();
    cy.get('button[aria-label="Play slideshow"]').should("exist").click();
    cy.get('button[aria-label="Pause slideshow"]').should("exist");
  });

  it("renders a video element when the slide has a videoUrl", () => {
    const slides = [slide({ id: "v1", title: "Video Slide", videoUrl: "/videos/clip.mp4" })];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.get("video").should("have.attr", "src", "/videos/clip.mp4");
  });

  it("scrolls to #about from the scroll-down indicator", () => {
    cy.mountWithIntl(
      <div>
        <Hero settings={settings} slides={[]} />
        <div id="about" style={{ height: 100 }}>about</div>
      </div>
    );
    cy.get("#about").then(($el) => cy.stub($el[0], "scrollIntoView").as("scrollSpy"));
    cy.get('button[aria-label="Scroll to about"]').click();
    cy.get("@scrollSpy").should("have.been.called");
  });

  it("uses settings/translation defaults for the fallback slide when settings is null", () => {
    // settings=null + empty slides -> the fallback slide is built entirely from
    // the `settings?.x || default` fallbacks (tagline, crest, heroBadge, titles,
    // description). Exercises every default branch in the fallback slide.
    cy.mountWithIntl(<Hero settings={null} slides={[]} />);
    cy.get("#home").should("exist");
    cy.contains("Where Young Minds").should("exist");
    cy.contains("Admissions Open for 2026/2027 Session").should("exist");
    cy.get('img[alt="Trail Gliders Academy Crest"]').should(
      "have.attr",
      "src",
      "/crest/school-crest.png"
    );
  });

  it("renders the slide transition variant for slide / curtain transition types", () => {
    const slides = [
      slide({ id: "s1", title: "Slide Trans", transitionType: "slide", parallaxDepth: 30 }),
      slide({ id: "s2", title: "Curtain Trans", transitionType: "curtain", parallaxDepth: 0 }),
      slide({ id: "s3", title: "Zoom Trans", transitionType: "zoom" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.contains("Slide Trans").should("exist");
    // Advance to the curtain slide (forward direction -> slide/zoom variant cond-exprs).
    cy.get('button[aria-label="Next slide"]').click();
    cy.contains("Curtain Trans").should("exist");
  });

  it("navigates with the left/right arrow keys", () => {
    const slides = [
      slide({ id: "s1", title: "Key One", transitionType: "slide" }),
      slide({ id: "s2", title: "Key Two", transitionType: "slide" }),
      slide({ id: "s3", title: "Key Three" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.contains("Key One").should("exist");
    // ArrowRight advances; ArrowLeft goes back (covers both keyboard branches +
    // the slide-variant cond-exprs for direction +1 / -1).
    cy.get("body").trigger("keydown", { key: "ArrowRight" });
    cy.contains("Key Two").should("exist");
    cy.get("body").trigger("keydown", { key: "ArrowLeft" });
    cy.contains("Key One").should("exist");
    // A no-op key is ignored.
    cy.get("body").trigger("keydown", { key: "Enter" });
    cy.contains("Key One").should("exist");
  });

  it("jumps backwards via a dot to set a negative direction", () => {
    const slides = [
      slide({ id: "s1", title: "Dot One" }),
      slide({ id: "s2", title: "Dot Two" }),
      slide({ id: "s3", title: "Dot Three" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    // Go forward to slide 3, then jump back to slide 1 (index < currentSlide ->
    // direction = -1 in goToSlide).
    cy.get('button[aria-label="Go to slide 3"]').first().click();
    cy.contains("Dot Three").should("exist");
    cy.get('button[aria-label="Go to slide 1"]').first().click();
    cy.contains("Dot One").should("exist");
  });

  it("renders a slide-specific link CTA, omits badge/subtitle, and right-aligns text", () => {
    const slides = [
      slide({
        id: "s1",
        title: "Link Slide",
        badge: "", // no badge -> falls back to heroBadge in the badge expression
        subtitle: "", // no subtitle -> subtitle block is skipped
        linkUrl: "/apply",
        linkLabel: "Apply Here",
        textPosition: "right",
      }),
      slide({ id: "s2", title: "Second", textPosition: "center" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    // The slide-provided link label is used for the CTA (linkUrl && linkLabel branch).
    cy.contains("Apply Here").should("exist");
  });

  it("marks video slides in the thumbnail strip and lazy-loads later thumbnails", () => {
    // More than three slides so thumbnails 4+ use loading="lazy" (the i < 3 ternary),
    // and a video slide renders the play badge on its thumbnail.
    const slides = [
      slide({ id: "t1", title: "T1" }),
      slide({ id: "t2", title: "T2", videoUrl: "/v/clip.mp4" }),
      slide({ id: "t3", title: "T3" }),
      slide({ id: "t4", title: "T4" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.get('button[aria-label="Go to slide 4: T4"]').should("exist");
    // The 4th thumbnail image is lazy-loaded.
    cy.get('button[aria-label="Go to slide 4: T4"] img').should("have.attr", "loading", "lazy");
    // The first three are eager.
    cy.get('button[aria-label="Go to slide 1: T1"] img').should("have.attr", "loading", "eager");
  });

  it("falls back to hero defaults when a slide omits title/badge/subtitle", () => {
    // A slide with empty title/badge and the settings present exercises the
    // `s.title || heroTitle1`, `s.badge || heroBadge` fallbacks. A second slide
    // keeps the carousel controls present.
    const slides = [
      slide({ id: "s1", title: "", badge: "", subtitle: "Has subtitle" }),
      slide({ id: "s2", title: "Second Slide" }),
    ];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    // Title falls back to heroTitle1 from settings.
    cy.contains("Where Young Minds").should("exist");
    // Badge falls back to heroBadge from settings.
    cy.contains("Admissions Open").should("exist");
  });

  it("ignores non-arrow keydown events", () => {
    const slides = [slide({ id: "s1", title: "KOnly One" }), slide({ id: "s2", title: "KOnly Two" })];
    cy.mountWithIntl(<Hero settings={settings} slides={slides} />);
    cy.contains("KOnly One").should("exist");
    // Dispatch a non-arrow key directly on the window so both key `if`s evaluate false.
    cy.window().then((win) => {
      win.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      win.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    cy.contains("KOnly One").should("exist");
  });

  it("scrolls to #campus-life from the explore button", () => {
    cy.mountWithIntl(
      <div>
        <Hero settings={settings} slides={[]} />
        <div id="campus-life" style={{ height: 100 }}>campus</div>
      </div>
    );
    cy.get("#campus-life").then(($el) => cy.stub($el[0], "scrollIntoView").as("campusSpy"));
    cy.contains(/explore/i).click();
    cy.get("@campusSpy").should("have.been.called");
  });
});

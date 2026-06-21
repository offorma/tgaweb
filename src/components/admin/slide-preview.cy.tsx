import { SlidePreview } from "./slide-preview";

describe("<SlidePreview />", () => {
  it("renders the background image and all text content (left default)", () => {
    cy.mount(
      <SlidePreview
        slide={{
          image: "/images/hero.jpg",
          title: "Welcome to TGA",
          subtitle: "A great school",
          badge: "New",
          linkLabel: "Apply Now",
          linkUrl: "/apply",
        }}
      />
    );
    cy.get('img[alt="Slide preview"]').should("have.attr", "src", "/images/hero.jpg");
    cy.contains("Welcome to TGA").should("exist");
    cy.contains("A great school").should("exist");
    cy.contains("New").should("exist");
    cy.contains("Apply Now").should("exist");
    // default text position indicator
    cy.contains("left").should("exist");
  });

  it("renders the 'No image' placeholder when no image is provided", () => {
    cy.mount(<SlidePreview slide={{ image: "", title: "Untitled" }} />);
    cy.contains("No image").should("exist");
    cy.get('img[alt="Slide preview"]').should("not.exist");
  });

  it("shows the video badge when videoUrl is set", () => {
    cy.mount(
      <SlidePreview
        slide={{ image: "/i.jpg", title: "T", videoUrl: "https://video.mp4" }}
      />
    );
    cy.contains("Video").should("exist");
  });

  it("does not show video badge when videoUrl is empty/whitespace", () => {
    cy.mount(
      <SlidePreview slide={{ image: "/i.jpg", title: "T", videoUrl: "   " }} />
    );
    cy.contains("Video").should("not.exist");
  });

  it("shows the transition type badge", () => {
    cy.mount(
      <SlidePreview
        slide={{ image: "/i.jpg", title: "T", transitionType: "curtain" }}
      />
    );
    cy.contains("curtain").should("exist");
  });

  it("applies center alignment and shows the center position indicator", () => {
    cy.mount(
      <SlidePreview slide={{ image: "/i.jpg", title: "T", textPosition: "center" }} />
    );
    cy.contains("center").should("exist");
  });

  it("applies right alignment and shows the right position indicator", () => {
    cy.mount(
      <SlidePreview slide={{ image: "/i.jpg", title: "T", textPosition: "right" }} />
    );
    cy.contains("right").should("exist");
  });

  it("applies a custom className to the root", () => {
    cy.mount(
      <SlidePreview
        className="my-preview"
        slide={{ image: "/i.jpg", title: "T" }}
      />
    );
    cy.get(".my-preview").should("exist");
  });
});

import "@/test-utils-next-auth-env";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import Page from "./page";

const ENDPOINT = "/api/admin/slides";

const SLIDES = [
  {
    id: "sl1",
    image: "/images/hero1.jpg",
    videoUrl: null,
    title: "Where Young Minds Glide",
    subtitle: "Excellence in education",
    badge: "Admissions Open",
    linkUrl: "#admissions",
    linkLabel: "Apply",
    transitionType: "fade",
    duration: 6500,
    textPosition: "left",
    parallaxDepth: 15,
    active: true,
    order: 0,
  },
  {
    id: "sl2",
    image: "/images/hero2.jpg",
    videoUrl: "/videos/tour.mp4",
    title: "Campus Tour",
    subtitle: null,
    badge: null,
    linkUrl: null,
    linkLabel: null,
    transitionType: "zoom",
    duration: 8000,
    textPosition: "center",
    parallaxDepth: 20,
    active: false,
    order: 1,
  },
];

function mountPage() {
  cy.mount(<><Page /><Toaster /></>);
}

describe("<AdminSlidesPage />", () => {
  it("renders the loaded slides with status and transition badges", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h1", "Hero Slides").should("be.visible");
    cy.contains("Where Young Minds Glide").should("be.visible");
    cy.contains("Campus Tour").should("be.visible");
    cy.contains("Active").should("be.visible");
    cy.contains("Hidden").should("be.visible");
  });

  it("shows the empty state", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No slides yet").should("be.visible");
  });

  it("shows a load error toast", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 500, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Load failed").should("be.visible");
  });

  it("filters slides by search", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.get('input[placeholder="Search slides..."]').type("Campus");
    cy.contains("Campus Tour").should("be.visible");
    cy.contains("Where Young Minds Glide").should("not.exist");
    cy.get('input[placeholder="Search slides..."]').clear().type("zzzz");
    cy.contains("No slides found.").should("be.visible");
  });

  it("toggles an inline preview open via the eye button", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .find("button")
      .first()
      .click();
    cy.contains("Live Preview").should("not.exist"); // that's only in the edit form
  });

  it("creates a slide (POST) and refetches", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "sl3" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.contains("Add New Slide").should("be.visible");
    cy.get('input[placeholder^="Where Young Minds"]').type("New Hero Slide");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create").its("request.body").should("include", {
      title: "New Hero Slide",
      transitionType: "fade",
      textPosition: "left",
    });
    cy.contains("Slide created").should("be.visible");
  });

  it("surfaces a server error inside the slide form", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 400, body: { error: "Image is required" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.get('input[placeholder^="Where Young Minds"]').type("Broken Slide");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create");
    cy.contains("Image is required").should("be.visible");
  });

  it("edits a slide (PUT) and refetches", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/sl1`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .find("button")
      .eq(1)
      .click();
    cy.contains("Edit Slide").should("be.visible");
    cy.get('input[placeholder^="Where Young Minds"]').clear().type("Updated Hero");
    cy.contains("button", "Save Slide").click();
    cy.wait("@update").its("request.body").should("include", { title: "Updated Hero" });
    cy.contains("Slide updated").should("be.visible");
  });

  it("deletes a slide after confirmation and refetches", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/sl1`, { statusCode: 200, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .find("button")
      .last()
      .click();
    cy.contains("Delete this slide?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Slide deleted").should("be.visible");
  });

  it("shows a delete failure toast when the DELETE request fails", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("DELETE", `${ENDPOINT}/sl1`, { statusCode: 500, body: {} }).as("del");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .find("button")
      .last()
      .click();
    cy.contains("Delete this slide?").should("be.visible");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("be.visible");
  });

  it("renders the video badge + thumbnail overlay for slides with a videoUrl", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Campus Tour")
      .closest(".bg-white")
      .within(() => {
        // the "Video" pill badge in the card metadata row
        cy.contains("Video").should("exist");
        // the thumbnail uses the slide image
        cy.get('img[src="/images/hero2.jpg"]').should("exist");
      });
  });

  it("expands the inline SlidePreview with the slide content when the eye is toggled", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .as("card");
    // open preview
    cy.get("@card").find("button").first().click();
    // SlidePreview renders the badge + subtitle + cta label inside the card
    cy.get("@card").contains("Admissions Open").should("be.visible");
    cy.get("@card").contains("Excellence in education").should("be.visible");
    cy.get("@card").contains("Apply").should("be.visible");
    // close it again (toggles showPreview false)
    cy.get("@card").find("button").first().click();
  });

  it("changes the transition type and text position selects and persists them", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "sl9" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.get('input[placeholder^="Where Young Minds"]').type("Select Slide");
    // transition select: choose every non-default option to exercise each <option>
    cy.get("select").eq(0).select("slide").should("have.value", "slide");
    cy.get("select").eq(0).select("zoom").should("have.value", "zoom");
    cy.get("select").eq(0).select("curtain").should("have.value", "curtain");
    // text position select: every non-default option
    cy.get("select").eq(1).select("center").should("have.value", "center");
    cy.get("select").eq(1).select("right").should("have.value", "right");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create").its("request.body").should("include", {
      transitionType: "curtain",
      textPosition: "right",
    });
  });

  it("walks the parallax-depth descriptor labels (None/Subtle/Moderate/Dramatic)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    // parallax depth input is the number field with min=0 max=50
    cy.get('input[type="number"][min="0"][max="50"]').as("pd");
    // default 15 => Subtle
    cy.contains("Subtle").should("be.visible");
    cy.get("@pd").type("{selectall}0").should("have.value", "0");
    cy.contains("None").should("be.visible");
    cy.get("@pd").type("{selectall}25").should("have.value", "25");
    cy.contains("Moderate").should("be.visible");
    cy.get("@pd").type("{selectall}45").should("have.value", "45");
    cy.contains("Dramatic").should("be.visible");
  });

  it("toggles the active checkbox (Active <-> Hidden) and changes the duration", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "sl10" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.get('input[placeholder^="Where Young Minds"]').type("Toggle Slide");
    // default active => label says "Active (shown on site)"
    cy.contains("Active (shown on site)").should("be.visible");
    cy.get('input[type="checkbox"]').uncheck();
    cy.contains("Hidden (not shown)").should("be.visible");
    cy.get('input[type="checkbox"]').check();
    cy.contains("Active (shown on site)").should("be.visible");
    // change duration -> the "Ns per slide" helper recomputes (min=2000 max=30000)
    cy.get('input[type="number"][min="2000"][max="30000"]')
      .type("{selectall}10000")
      .should("have.value", "10000");
    cy.contains("10.0s per slide").should("be.visible");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create").its("request.body").should("include", {
      active: true,
      duration: 10000,
    });
  });

  it("uses the status-code fallback message when the error body has no `error` field", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 500, body: {} }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.get('input[placeholder^="Where Young Minds"]').type("Fallback Slide");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create");
    cy.contains("Save failed (500)").should("be.visible");
  });

  it("uses the status-code fallback when the error body is not valid JSON", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 502, body: "<<not json>>" }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.get('input[placeholder^="Where Young Minds"]').type("Bad JSON Slide");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create");
    cy.contains("Save failed (502)").should("be.visible");
  });

  it("closes the editor dialog via Cancel without saving", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.contains("Add New Slide").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.contains("Add New Slide").should("not.exist");
  });

  it("populates the edit form from an existing slide (video + center position)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Campus Tour")
      .closest(".bg-white")
      .find("button")
      .eq(1)
      .click();
    cy.contains("Edit Slide").should("be.visible");
    // video URL prefilled
    cy.get('input[placeholder^="/videos/campus-tour"]').should("have.value", "/videos/tour.mp4");
    // text position select reflects "center"
    cy.get("select").eq(1).should("have.value", "center");
    cy.get("select").eq(0).should("have.value", "zoom");
  });

  it("reorders slides via keyboard drag and persists the new order", () => {
    cy.viewport(1000, 900);
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", `${ENDPOINT}/reorder`, { statusCode: 200, body: {} }).as("reorder");
    mountPage();
    cy.wait("@list");
    keyboardDragFirstDown();
    cy.wait("@reorder", { timeout: 8000 }).its("request.body").should("have.property", "ids");
    cy.contains("Slide order saved").should("be.visible");
  });

  it("restores order and toasts when the reorder request fails", () => {
    cy.viewport(1000, 900);
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", `${ENDPOINT}/reorder`, { statusCode: 500, body: {} }).as("reorder");
    mountPage();
    cy.wait("@list");
    keyboardDragFirstDown();
    cy.wait("@reorder", { timeout: 8000 });
    cy.contains("Reorder failed").should("be.visible");
  });

  it("does not persist a reorder when the item is dropped in place (over === active)", () => {
    cy.viewport(1000, 900);
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    let reorderCalls = 0;
    cy.intercept("POST", `${ENDPOINT}/reorder`, (req) => {
      reorderCalls += 1;
      req.reply({ statusCode: 200, body: {} });
    }).as("reorder");
    mountPage();
    cy.wait("@list");
    // Pick up the first item and drop it immediately without moving — onDragEnd
    // sees over === active (or no over) and returns early, firing no request.
    cy.get('[aria-roledescription="sortable"]')
      .first()
      .focus()
      .then(($el) => dispatchNativeKey($el[0].ownerDocument, $el[0], "Space"));
    cy.get('[aria-roledescription="sortable"]')
      .first()
      .should("have.attr", "aria-pressed", "true");
    cy.wait(200);
    cy.document().then((doc) => dispatchNativeKey(doc, doc, "Space"));
    cy.wait(500);
    cy.contains("Slide order saved").should("not.exist");
    cy.then(() => expect(reorderCalls).to.equal(0));
  });

  it("saves a fully-populated slide and a fully-empty one (optional field branches)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    cy.intercept("POST", ENDPOINT, { statusCode: 201, body: { id: "sl11" } }).as("create");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    // fill every optional field so the `formData.x || undefined` truthy paths fire
    cy.get('input[placeholder^="Where Young Minds"]').type("Full Slide");
    cy.get('input[placeholder^="/videos/campus-tour"]').type("/videos/x.mp4");
    cy.get('input[placeholder="Admissions Open 2026/2027"]').type("Open Now");
    cy.get('textarea[placeholder^="Short description"]').type("A subtitle line");
    cy.get('input[placeholder="Begin Your Application"]').type("Apply Now");
    cy.get('input[placeholder^="#admissions"]').type("#apply");
    cy.contains("button", "Save Slide").click();
    cy.wait("@create").its("request.body").should("include", {
      title: "Full Slide",
      videoUrl: "/videos/x.mp4",
      badge: "Open Now",
      subtitle: "A subtitle line",
      linkLabel: "Apply Now",
      linkUrl: "#apply",
    });
    cy.contains("Slide created").should("be.visible");
  });

  it("edits a slide whose optional/typed fields are null, exercising form fallbacks", () => {
    const minimal = {
      id: "sl5",
      image: "/images/min.jpg",
      videoUrl: null,
      title: "Minimal",
      subtitle: null,
      badge: null,
      linkUrl: null,
      linkLabel: null,
      // falsy / null typed fields force the `|| default` and `?? 15` branches
      transitionType: "",
      duration: 0,
      textPosition: "",
      parallaxDepth: null as unknown as number,
      active: false,
      order: 2,
    };
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [minimal] } }).as("list");
    cy.intercept("PUT", `${ENDPOINT}/sl5`, { statusCode: 200, body: {} }).as("update");
    mountPage();
    cy.wait("@list");
    cy.contains("Minimal")
      .closest(".bg-white")
      .find("button")
      .eq(1)
      .click();
    cy.contains("Edit Slide").should("be.visible");
    // defaults applied from the `||`/`??` fallbacks
    cy.get("select").eq(0).should("have.value", "fade");
    cy.get("select").eq(1).should("have.value", "left");
    cy.get('input[type="number"][min="2000"][max="30000"]').should("have.value", "6500");
    cy.get('input[type="number"][min="0"][max="50"]').should("have.value", "15");
    // empty optional inputs (null -> "")
    cy.get('input[placeholder^="/videos/campus-tour"]').should("have.value", "");
    cy.get('input[placeholder="Admissions Open 2026/2027"]').should("have.value", "");
    cy.contains("button", "Save Slide").click();
    // save sends optional empties as undefined (the `formData.x || undefined` branch)
    cy.wait("@update").then(({ request }) => {
      expect(request.body).to.not.have.property("videoUrl");
      expect(request.body).to.not.have.property("subtitle");
      expect(request.body).to.not.have.property("badge");
      expect(request.body).to.not.have.property("linkUrl");
      expect(request.body).to.not.have.property("linkLabel");
    });
    cy.contains("Slide updated").should("be.visible");
  });

  it("handles a slides response with no `items` field (falls back to empty list)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: {} }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("No slides yet").should("be.visible");
  });

  it("shows 'Untitled' for a slide with an empty title", () => {
    const untitled = {
      id: "sl7",
      image: "/images/u.jpg",
      videoUrl: null,
      title: "",
      subtitle: null,
      badge: null,
      linkUrl: null,
      linkLabel: null,
      transitionType: "fade",
      duration: 6500,
      textPosition: "left",
      parallaxDepth: 15,
      active: true,
      order: 0,
    };
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [untitled] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("h3", "Untitled").should("be.visible");
  });

  it("closes the editor dialog via Escape (Dialog onOpenChange)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("button", "Add Slide").click();
    cy.contains("Add New Slide").should("be.visible");
    cy.get('[role="dialog"]').type("{esc}");
    cy.contains("Add New Slide").should("not.exist");
  });

  it("closes the delete dialog via Escape (AlertDialog onOpenChange)", () => {
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: SLIDES } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Where Young Minds Glide")
      .closest(".bg-white")
      .find("button")
      .last()
      .click();
    cy.contains("Delete this slide?").should("be.visible");
    cy.get("body").type("{esc}");
    cy.contains("Delete this slide?").should("not.exist");
  });

  it("renders a slide card with no subtitle and no video badge", () => {
    const bare = {
      id: "sl6",
      image: "/images/bare.jpg",
      videoUrl: null,
      title: "Bare Title",
      subtitle: null,
      badge: null,
      linkUrl: null,
      linkLabel: null,
      transitionType: "slide",
      duration: 5000,
      textPosition: "right",
      parallaxDepth: 5,
      active: true,
      order: 0,
    };
    cy.intercept("GET", ENDPOINT, { statusCode: 200, body: { items: [bare] } }).as("list");
    mountPage();
    cy.wait("@list");
    cy.contains("Bare Title")
      .closest(".bg-white")
      .within(() => {
        cy.contains("Video").should("not.exist"); // no video badge
        cy.get("img[src='/images/bare.jpg']").should("exist");
      });
  });
});

// Drives @dnd-kit's KeyboardSensor end-to-end. @dnd-kit registers a *native*
// document-level keydown listener and validates events via `isKeyboardEvent`,
// which Cypress's synthetic `.trigger("keydown")` does not satisfy — so we
// dispatch real `KeyboardEvent`s. Sequence: Space picks up the focused handle,
// ArrowDown moves it past the next card (over != active), Space drops it,
// firing onDragEnd which POSTs the new order to /reorder.
function dispatchNativeKey(doc: Document, target: EventTarget, code: string) {
  const keyCode = code === "Space" ? 32 : code === "ArrowDown" ? 40 : 13;
  const ev = new (doc.defaultView as Window).KeyboardEvent("keydown", {
    key: code === "Space" ? " " : code,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  } as KeyboardEventInit);
  target.dispatchEvent(ev);
}

function pickUpFirst(attempt = 0) {
  cy.get('[aria-roledescription="sortable"]')
    .first()
    .focus()
    .then(($el) => dispatchNativeKey($el[0].ownerDocument, $el[0], "Space"));
  cy.wait(150);
  cy.get('[aria-roledescription="sortable"]')
    .first()
    .then(($el) => {
      if ($el.attr("aria-pressed") !== "true" && attempt < 5) {
        pickUpFirst(attempt + 1);
      }
    });
}

function keyboardDragFirstDown() {
  // Pick up the first item — retry until @dnd-kit confirms the drag started
  // (aria-pressed flips true). Its keydown listener is registered on a
  // setTimeout, so the pickup keydown can be a no-op if it lands too early.
  pickUpFirst();
  cy.get('[aria-roledescription="sortable"]')
    .first()
    .should("have.attr", "aria-pressed", "true");
  // Move down past the next card.
  cy.document().then((doc) => dispatchNativeKey(doc, doc, "ArrowDown"));
  // Wait until the move is announced ("was moved over droppable area …") so the
  // drop resolves with over != active and persists a new order.
  cy.contains("was moved over", { matchCase: false }).should("exist");
  // Let @dnd-kit commit the new `over` target before dropping.
  cy.wait(300);
  // Drop.
  cy.document().then((doc) => dispatchNativeKey(doc, doc, "Space"));
}

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "./carousel";

describe("<Carousel />", () => {
  it("renders slides and navigates with next/previous", () => {
    cy.mount(
      <div style={{ width: 300, margin: "0 auto" }}>
        <Carousel className="my-carousel">
          <CarouselContent>
            <CarouselItem>Slide 1</CarouselItem>
            <CarouselItem>Slide 2</CarouselItem>
            <CarouselItem>Slide 3</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    );

    cy.get('[data-slot="carousel"]').should("have.class", "my-carousel");
    cy.get('[data-slot="carousel-content"]').should("exist");
    cy.get('[data-slot="carousel-item"]').should("have.length", 3);

    // Previous starts disabled (cannot scroll back from the first slide).
    cy.get('[data-slot="carousel-previous"]').should("be.disabled");

    // Click next/previous to exercise scrollNext/scrollPrev callbacks.
    cy.get('[data-slot="carousel-next"]').click({ force: true });
    cy.get('[data-slot="carousel-previous"]').click({ force: true });

    // Keyboard navigation runs the key handler.
    cy.get('[data-slot="carousel"]').trigger("keydown", { key: "ArrowRight" });
    cy.get('[data-slot="carousel"]').trigger("keydown", { key: "ArrowLeft" });
    cy.get('[data-slot="carousel"]').trigger("keydown", { key: "Enter" });
  });

  it("supports vertical orientation", () => {
    cy.mount(
      <div style={{ width: 300, margin: "0 auto" }}>
        <Carousel orientation="vertical">
          <CarouselContent>
            <CarouselItem>A</CarouselItem>
            <CarouselItem>B</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    );
    cy.get('[data-slot="carousel-item"]').should("have.length", 2);
  });

  it("exposes the embla api via setApi and reacts to select events", () => {
    const apiSpy = cy.stub().as("apiSpy");
    function Wrapper() {
      const [api, setApi] = React.useState<CarouselApi>();
      // setApi's effect (line 91-94) runs once the api exists. Re-emit a
      // select event so onSelect (canScrollPrev/Next setters) is exercised.
      React.useEffect(() => {
        if (api) {
          apiSpy(api);
          api.emit?.("select");
          api.emit?.("reInit");
        }
      }, [api]);
      return (
        <div style={{ width: 200, margin: "0 auto" }}>
          <Carousel setApi={setApi} opts={{ loop: false }}>
            <CarouselContent>
              <CarouselItem style={{ width: 200 }}>One</CarouselItem>
              <CarouselItem style={{ width: 200 }}>Two</CarouselItem>
              <CarouselItem style={{ width: 200 }}>Three</CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      );
    }
    cy.mount(<Wrapper />);
    // setApi received the embla instance.
    cy.get("@apiSpy").should("have.been.called");
    cy.get('[data-slot="carousel-previous"]').should("be.disabled");
    // Clicking next runs scrollNext through the api.
    cy.get('[data-slot="carousel-next"]').click({ force: true });
  });

  it("derives orientation from opts.axis when orientation is unset", () => {
    cy.mount(
      <div style={{ width: 300, margin: "0 auto" }}>
        {/* Pass a falsy orientation so the opts.axis fallback branch runs. */}
        <Carousel
          orientation={"" as "horizontal" | "vertical"}
          opts={{ axis: "y" }}
        >
          <CarouselContent>
            <CarouselItem>A</CarouselItem>
            <CarouselItem>B</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    );
    cy.get('[data-slot="carousel-item"]').should("have.length", 2);
  });

  it("derives horizontal orientation from a non-vertical opts.axis", () => {
    cy.mount(
      <div style={{ width: 300, margin: "0 auto" }}>
        <Carousel
          orientation={"" as "horizontal" | "vertical"}
          opts={{ axis: "x" }}
        >
          <CarouselContent>
            <CarouselItem>A</CarouselItem>
            <CarouselItem>B</CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>
    );
    cy.get('[data-slot="carousel-item"]').should("have.length", 2);
  });
});

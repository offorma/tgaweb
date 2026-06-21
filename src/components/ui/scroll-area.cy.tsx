import { ScrollArea, ScrollBar } from "./scroll-area";

describe("<ScrollArea />", () => {
  it("renders viewport, children and scrollbars", () => {
    cy.mount(
      <ScrollArea type="always" className="my-scroll h-24 w-48">
        <div style={{ height: 600, width: 600 }}>scrollable content</div>
        <ScrollBar orientation="horizontal" className="my-bar" />
      </ScrollArea>
    );
    cy.get('[data-slot="scroll-area"]').should("have.class", "my-scroll");
    cy.get('[data-slot="scroll-area-viewport"]').should(
      "contain.text",
      "scrollable content"
    );
    cy.get('[data-slot="scroll-area-scrollbar"]').should("exist");
  });
});

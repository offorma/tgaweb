import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable";

describe("<Resizable />", () => {
  it("renders a panel group with panels and a handle", () => {
    cy.mount(
      <ResizablePanelGroup direction="horizontal" className="my-group h-40">
        <ResizablePanel defaultSize={50}>One</ResizablePanel>
        <ResizableHandle withHandle className="my-handle" />
        <ResizablePanel defaultSize={50}>Two</ResizablePanel>
      </ResizablePanelGroup>
    );
    cy.get('[data-slot="resizable-panel-group"]').should(
      "have.class",
      "my-group"
    );
    cy.get('[data-slot="resizable-panel"]').should("have.length", 2);
    cy.get('[data-slot="resizable-handle"]')
      .should("have.class", "my-handle")
      .and("exist");
  });

  it("renders a vertical group", () => {
    cy.mount(
      <ResizablePanelGroup direction="vertical" className="h-40">
        <ResizablePanel defaultSize={50}>Top</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>Bottom</ResizablePanel>
      </ResizablePanelGroup>
    );
    cy.get('[data-slot="resizable-panel-group"]').should(
      "have.attr",
      "data-panel-group-direction",
      "vertical"
    );
  });
});

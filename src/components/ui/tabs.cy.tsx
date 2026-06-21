import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

describe("<Tabs />", () => {
  it("renders tabs and switches active content on click", () => {
    cy.mount(
      <Tabs defaultValue="one" className="my-tabs">
        <TabsList className="my-list">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>
    );

    cy.get('[data-slot="tabs"]').should("have.class", "my-tabs");
    cy.get('[data-slot="tabs-list"]').should("have.class", "my-list");
    cy.get('[data-slot="tabs-trigger"]').should("have.length", 2);
    cy.contains('[data-slot="tabs-content"]', "First panel").should("be.visible");

    cy.contains('[data-slot="tabs-trigger"]', "Two").click();
    cy.contains('[data-slot="tabs-content"]', "Second panel").should("be.visible");
  });
});

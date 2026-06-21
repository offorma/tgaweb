import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

describe("<NavigationMenu />", () => {
  it("opens content on trigger click and renders parts (with viewport)", () => {
    cy.mount(
      <NavigationMenu className="my-nav">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger data-cy="trigger">
              Products
            </NavigationMenuTrigger>
            <NavigationMenuContent className="my-content">
              <NavigationMenuLink href="#" className="my-link">
                Link A
              </NavigationMenuLink>
            </NavigationMenuContent>
            <NavigationMenuIndicator />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
              Home
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );

    cy.get('[data-slot="navigation-menu"]').should("have.class", "my-nav");
    cy.get('[data-slot="navigation-menu-list"]').should("exist");
    cy.get('[data-slot="navigation-menu-link"]').should(
      "have.length.at.least",
      1
    );

    cy.get('[data-cy="trigger"]').trigger("pointermove").click();
    cy.get('[data-slot="navigation-menu-viewport"]').should("exist");
    cy.get('[data-slot="navigation-menu-content"]').should(
      "contain.text",
      "Link A"
    );
  });

  it("renders without a viewport", () => {
    cy.mount(
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink href="#">Plain</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
    cy.get('[data-slot="navigation-menu"]').should(
      "have.attr",
      "data-viewport",
      "false"
    );
    cy.get('[data-slot="navigation-menu-viewport"]').should("not.exist");
  });
});

import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "./sidebar";

function FullSidebar() {
  return (
    <SidebarProvider>
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <SidebarInput placeholder="Search" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Group</SidebarGroupLabel>
            <SidebarGroupAction>+</SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Home" isActive>
                    Home
                  </SidebarMenuButton>
                  <SidebarMenuAction showOnHover>x</SidebarMenuAction>
                  <SidebarMenuBadge>5</SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#" isActive size="sm">
                        Sub
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={{ children: "Settings" }}>
                    Settings
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </SidebarContent>
        <SidebarFooter>Footer</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <main>Content area</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

describe("<Sidebar />", () => {
  beforeEach(() => {
    // useIsMobile reads window.innerWidth; the mobile test mutates it on the
    // shared component-test window, so reset it to a desktop width here.
    cy.window().then((win) => {
      Object.defineProperty(win, "innerWidth", { configurable: true, value: 1280 });
    });
  });

  it("renders the full sidebar composition on desktop", () => {
    cy.viewport(1280, 800);
    cy.mount(<FullSidebar />);

    cy.get('[data-slot="sidebar-wrapper"]').should("exist");
    cy.get('[data-slot="sidebar"]').should("exist");
    cy.get('[data-slot="sidebar-header"]').should("exist");
    cy.get('[data-slot="sidebar-input"]').should("exist");
    cy.get('[data-slot="sidebar-content"]').should("exist");
    cy.get('[data-slot="sidebar-group"]').should("exist");
    cy.get('[data-slot="sidebar-group-label"]').should("have.text", "Group");
    cy.get('[data-slot="sidebar-group-action"]').should("exist");
    cy.get('[data-slot="sidebar-group-content"]').should("exist");
    cy.get('[data-slot="sidebar-menu"]').should("exist");
    cy.get('[data-slot="sidebar-menu-item"]').should("have.length.greaterThan", 0);
    cy.get('[data-slot="sidebar-menu-button"]').should("have.length.greaterThan", 0);
    cy.get('[data-slot="sidebar-menu-action"]').should("exist");
    cy.get('[data-slot="sidebar-menu-badge"]').should("have.text", "5");
    cy.get('[data-slot="sidebar-menu-sub"]').should("exist");
    cy.get('[data-slot="sidebar-menu-sub-item"]').should("exist");
    cy.get('[data-slot="sidebar-menu-sub-button"]').should("exist");
    cy.get('[data-slot="sidebar-menu-skeleton"]').should("exist");
    cy.get('[data-slot="sidebar-separator"]').should("exist");
    cy.get('[data-slot="sidebar-footer"]').should("have.text", "Footer");
    cy.get('[data-slot="sidebar-rail"]').should("exist");
    cy.get('[data-slot="sidebar-inset"]').should("exist");
  });

  it("toggles collapsed state via the trigger and rail", () => {
    cy.viewport(1280, 800);
    cy.mount(<FullSidebar />);

    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
    cy.get('[data-slot="sidebar-trigger"]').click();
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "collapsed");

    cy.get('[data-slot="sidebar-rail"]').click({ force: true });
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
  });

  it("renders the non-collapsible variant", () => {
    cy.viewport(1280, 800);
    cy.mount(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>None</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    cy.get('[data-slot="sidebar"]').should("contain.text", "None");
  });

  it("renders the mobile sheet sidebar and toggles it open", () => {
    cy.viewport(500, 800);
    // useIsMobile reads window.innerWidth on mount; force it below the breakpoint.
    cy.window().then((win) => {
      Object.defineProperty(win, "innerWidth", { configurable: true, value: 500 });
    });
    cy.mount(<FullSidebar />);

    cy.get('[data-slot="sidebar-trigger"]').click();
    // On mobile the sidebar renders inside a Sheet; props set data-mobile="true"
    // and override the slot to "sidebar".
    cy.get('[data-mobile="true"]').should("be.visible");
    cy.get('[data-mobile="true"]').should("contain.text", "Home");
  });

  it("supports a controlled open/onOpenChange provider and persists a cookie", () => {
    cy.viewport(1280, 800);
    const onOpenChange = cy.stub().as("onOpenChange");
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <SidebarProvider
          open={open}
          onOpenChange={(value) => {
            onOpenChange(value);
            setOpen(value);
          }}
        >
          <Sidebar collapsible="offcanvas" side="right" variant="inset">
            <SidebarContent>Controlled</SidebarContent>
          </Sidebar>
          <SidebarInset>
            <SidebarTrigger />
          </SidebarInset>
        </SidebarProvider>
      );
    }
    cy.mount(<Controlled />);
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
    cy.get('[data-slot="sidebar-trigger"]').click();
    cy.get("@onOpenChange").should("have.been.calledWith", false);
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "collapsed");
    // setOpen wrote the persistence cookie.
    cy.document().its("cookie").should("contain", "sidebar_state=false");
  });

  it("toggles via the ctrl/meta + b keyboard shortcut", () => {
    cy.viewport(1280, 800);
    cy.mount(<FullSidebar />);
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
    cy.window().then((win) => {
      win.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true })
      );
    });
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "collapsed");
    cy.window().then((win) => {
      win.dispatchEvent(
        new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true })
      );
    });
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
    // A non-shortcut key is ignored.
    cy.window().then((win) => {
      win.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));
    });
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "expanded");
  });

  it("renders asChild + outline/lg variants and a tooltip on collapse", () => {
    cy.viewport(1280, 800);
    cy.mount(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <a href="#group">As-child label</a>
              </SidebarGroupLabel>
              <SidebarGroupAction asChild>
                <a href="#action">+</a>
              </SidebarGroupAction>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    variant="outline"
                    size="lg"
                    tooltip="Collapsed tip"
                  >
                    <a href="#home">Home</a>
                  </SidebarMenuButton>
                  <SidebarMenuAction>action</SidebarMenuAction>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild size="md" href="#sub">
                        <span>Sub md</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton size="sm">No tooltip</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    cy.get('[data-slot="sidebar"]')
      .filter("[data-state]")
      .should("have.attr", "data-state", "collapsed");
    // The button is wrapped in a Tooltip whose content is rendered with
    // hidden={state !== "collapsed" || isMobile}; hovering exercises the
    // collapsed (visible) branch.
    cy.get('a[href="#home"]').trigger("focus").trigger("mouseover");
    cy.get('[data-slot="sidebar-menu-button"]')
      .should("have.attr", "data-active", "false");
    cy.get('[data-slot="sidebar-menu-sub-button"]')
      .should("have.attr", "data-size", "md");
  });

  it("renders bare default props for every primitive", () => {
    cy.viewport(1280, 800);
    cy.mount(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Label</SidebarGroupLabel>
              <SidebarGroupAction>+</SidebarGroupAction>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Default button</SidebarMenuButton>
                  <SidebarMenuAction>act</SidebarMenuAction>
                  <SidebarMenuBadge>1</SidebarMenuBadge>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#x">Default sub</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    cy.get('[data-slot="sidebar-menu-button"]')
      .should("have.attr", "data-active", "false")
      .and("have.attr", "data-size", "default");
    cy.get('[data-slot="sidebar-menu-sub-button"]')
      .should("have.attr", "data-size", "md")
      .and("have.attr", "data-active", "false");
  });
});

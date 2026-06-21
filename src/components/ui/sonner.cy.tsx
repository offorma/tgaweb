import * as React from "react";
import { Toaster } from "./sonner";
import { toast } from "sonner";

function Harness() {
  React.useEffect(() => {
    toast("Sonner message");
  }, []);
  return <Toaster />;
}

describe("<Toaster /> (sonner)", () => {
  it("mounts the sonner toaster with custom props", () => {
    cy.mount(<Toaster position="top-center" richColors />);
    cy.get("section[aria-label*='Notifications'], [data-sonner-toaster]").should("exist");
  });

  it("displays a triggered toast and its region", () => {
    cy.mount(<Harness />);
    cy.contains("Sonner message").should("be.visible");
    cy.get("[data-sonner-toaster]").should("exist");
  });
});

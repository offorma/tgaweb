import * as React from "react";
import { Toaster } from "./toaster";
import { ToastAction } from "./toast";
import { toast } from "@/hooks/use-toast";

function Harness() {
  React.useEffect(() => {
    toast({
      title: "Hello",
      description: "A toast message",
      variant: "success",
      action: <ToastAction altText="Retry">Retry</ToastAction>,
    });
  }, []);
  return <Toaster />;
}

describe("<Toaster />", () => {
  it("renders queued toasts with title, description and action", () => {
    cy.mount(<Harness />);
    cy.contains("Hello").should("be.visible");
    cy.contains("A toast message").should("be.visible");
    cy.contains("Retry").should("be.visible");
    cy.get("[toast-close]").should("exist");
  });

  it("renders an empty toaster with no toasts", () => {
    cy.mount(<Toaster />);
    cy.get("body").should("exist");
  });
});

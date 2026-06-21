import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./toast";

describe("<Toast />", () => {
  it("renders a composite toast with every part", () => {
    cy.mount(
      <ToastProvider>
        <Toast open variant="default" className="my-toast">
          <ToastTitle>Saved</ToastTitle>
          <ToastDescription>Your changes were saved.</ToastDescription>
          <ToastAction altText="Undo" className="my-action">
            Undo
          </ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport className="my-viewport" />
      </ToastProvider>
    );

    cy.contains("Saved").should("be.visible");
    cy.contains("Your changes were saved.").should("be.visible");
    cy.contains("Undo").should("be.visible");
    cy.get("[toast-close]").should("exist");
    cy.get("ol.my-viewport").should("exist");
  });

  it("renders each variant", () => {
    (["destructive", "success", "warning", "info"] as const).forEach((variant) => {
      cy.mount(
        <ToastProvider>
          <Toast open variant={variant}>
            <ToastTitle>{variant}</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );
      cy.contains(variant).should("be.visible");
    });
  });
});

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog";

describe("<AlertDialog />", () => {
  it("opens the dialog and renders all parts when triggered", () => {
    cy.mount(
      <AlertDialog>
        <AlertDialogTrigger data-slot="alert-dialog-trigger">
          Open
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    cy.get('[data-slot="alert-dialog-trigger"]').click();

    cy.get('body [data-slot="alert-dialog-overlay"]').should("exist");
    cy.get('body [data-slot="alert-dialog-content"]').should("exist");
    cy.get('body [data-slot="alert-dialog-header"]').should("exist");
    cy.get('body [data-slot="alert-dialog-title"]').should(
      "contain.text",
      "Are you sure?"
    );
    cy.get('body [data-slot="alert-dialog-description"]').should(
      "contain.text",
      "This action cannot be undone."
    );
    cy.get('body [data-slot="alert-dialog-footer"]').should("exist");
    cy.contains("Cancel").should("be.visible");
    cy.contains("Continue").should("be.visible");

    // Cancel closes the dialog.
    cy.contains("Cancel").click();
    cy.get('body [data-slot="alert-dialog-content"]').should("not.exist");
  });
});

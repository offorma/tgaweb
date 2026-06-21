import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./form";
import { Input } from "./input";

function DemoForm() {
  const form = useForm({
    defaultValues: { username: "" },
    mode: "onSubmit",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => {})}
        noValidate
      >
        <FormField
          control={form.control}
          name="username"
          rules={{ required: "Username is required" }}
          render={({ field }) => (
            <FormItem className="my-item">
              <FormLabel className="my-label">Username</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe("<Form />", () => {
  it("renders all form parts and shows a validation message on submit", () => {
    cy.mount(<DemoForm />);

    cy.get('[data-slot="form-item"]').should("have.class", "my-item");
    cy.get('[data-slot="form-label"]')
      .should("contain.text", "Username")
      .and("have.attr", "data-error", "false");
    cy.get('[data-slot="form-control"]').should("exist");
    cy.get('[data-slot="form-description"]').should(
      "contain.text",
      "Your public display name."
    );
    cy.get('[data-slot="form-message"]').should("not.exist");

    cy.get("button[type=submit]").click();

    cy.get('[data-slot="form-message"]').should(
      "contain.text",
      "Username is required"
    );
    cy.get('[data-slot="form-label"]').should("have.attr", "data-error", "true");
    cy.get('[data-slot="form-control"]').should(
      "have.attr",
      "aria-invalid",
      "true"
    );
    // After the error, aria-describedby includes both description and message ids.
    cy.get('[data-slot="form-control"]')
      .invoke("attr", "aria-describedby")
      .should("contain", "form-item-message");
  });

  it("renders FormMessage children when there is no error", () => {
    function NoErrorForm() {
      const form = useForm({ defaultValues: { username: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* No error -> body falls back to children */}
                <FormMessage>Static helper text</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      );
    }
    cy.mount(<NoErrorForm />);
    cy.get('[data-slot="form-message"]').should(
      "contain.text",
      "Static helper text"
    );
    // No error: aria-describedby has only the description id form (single token).
    cy.get('[data-slot="form-control"]').should(
      "have.attr",
      "aria-invalid",
      "false"
    );
  });

  it("renders null FormMessage when the error has no message string", () => {
    function NoMessageErrorForm() {
      const form = useForm({ defaultValues: { username: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="button"
            onClick={() =>
              // Manual error WITHOUT a message -> error.message is undefined,
              // exercising `error?.message ?? ""` (right side).
              form.setError("username", { type: "manual" })
            }
          >
            Trigger
          </button>
        </Form>
      );
    }
    cy.mount(<NoMessageErrorForm />);
    cy.contains("Trigger").click();
    // error present but no message -> body is "" -> FormMessage returns null,
    // but aria-invalid flips true on the control.
    cy.get('[data-slot="form-control"]').should(
      "have.attr",
      "aria-invalid",
      "true"
    );
    cy.get('[data-slot="form-message"]').should("not.exist");
  });

  it("renders nothing for an empty FormMessage with no error", () => {
    function EmptyForm() {
      const form = useForm({ defaultValues: { username: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                {/* no children, no error -> body is empty -> returns null */}
                <FormMessage />
              </FormItem>
            )}
          />
        </Form>
      );
    }
    cy.mount(<EmptyForm />);
    cy.get('[data-slot="form-message"]').should("not.exist");
    cy.get('[data-slot="form-control"]').should("exist");
  });
});

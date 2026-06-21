import { useToast, reducer } from "./use-toast";
import { useRef } from "react";

function Harness() {
  const { toasts, toast, dismiss } = useToast();
  const idRef = useRef<string | null>(null);
  const updateRef = useRef<((p: any) => void) | null>(null);

  return (
    <div>
      <div data-cy="count">{toasts.length}</div>
      <div data-cy="first-title">{String(toasts[0]?.title ?? "")}</div>
      <div data-cy="first-open">{String(toasts[0]?.open ?? "")}</div>
      <button
        data-cy="add"
        onClick={() => {
          const t = toast({ title: "Hello" });
          idRef.current = t.id;
          updateRef.current = t.update;
        }}
      >
        add
      </button>
      <button
        data-cy="update"
        onClick={() => updateRef.current?.({ id: idRef.current, title: "Updated" })}
      >
        update
      </button>
      <button data-cy="dismiss-one" onClick={() => dismiss(idRef.current ?? undefined)}>
        dismiss one
      </button>
      <button data-cy="dismiss-all" onClick={() => dismiss()}>
        dismiss all
      </button>
      <button
        data-cy="open-change-true"
        onClick={() => (toasts[0] as any)?.onOpenChange?.(true)}
      >
        open change true
      </button>
      <button
        data-cy="open-change-false"
        onClick={() => (toasts[0] as any)?.onOpenChange?.(false)}
      >
        open change false
      </button>
    </div>
  );
}

describe("useToast", () => {
  it("adds a toast, honoring the TOAST_LIMIT of 1", () => {
    cy.mount(<Harness />);
    cy.get('[data-cy="count"]').should("have.text", "0");
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="count"]').should("have.text", "1");
    cy.get('[data-cy="first-title"]').should("have.text", "Hello");
    cy.get('[data-cy="first-open"]').should("have.text", "true");
    // adding again still caps at 1 (limit)
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="count"]').should("have.text", "1");
  });

  it("updates an existing toast", () => {
    cy.mount(<Harness />);
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="update"]').click();
    cy.get('[data-cy="first-title"]').should("have.text", "Updated");
  });

  it("dismisses a specific toast (sets open=false, keeps it in list)", () => {
    cy.mount(<Harness />);
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="dismiss-one"]').click();
    cy.get('[data-cy="first-open"]').should("have.text", "false");
    cy.get('[data-cy="count"]').should("have.text", "1");
  });

  it("dismisses all toasts when no id is given", () => {
    cy.mount(<Harness />);
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="dismiss-all"]').click();
    cy.get('[data-cy="first-open"]').should("have.text", "false");
  });

  it("onOpenChange(true) keeps the toast open; onOpenChange(false) dismisses it", () => {
    cy.mount(<Harness />);
    cy.get('[data-cy="add"]').click();
    cy.get('[data-cy="first-open"]').should("have.text", "true");
    // open=true -> the `if (!open)` guard is false, so dismiss() is NOT called.
    cy.get('[data-cy="open-change-true"]').click();
    cy.get('[data-cy="first-open"]').should("have.text", "true");
    // open=false -> dismiss() runs, closing the toast.
    cy.get('[data-cy="open-change-false"]').click();
    cy.get('[data-cy="first-open"]').should("have.text", "false");
  });
});

// Pure reducer branch coverage (no shared module timers).
describe("toast reducer", () => {
  const base = { toasts: [{ id: "1", title: "a", open: true } as any] };

  it("ADD_TOAST prepends and slices to the limit", () => {
    const next = reducer(
      { toasts: [] },
      { type: "ADD_TOAST", toast: { id: "1", open: true } as any }
    );
    expect(next.toasts).to.have.length(1);
  });

  it("UPDATE_TOAST merges matching toast and leaves others alone", () => {
    const next = reducer(base, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "b" } as any,
    });
    expect(next.toasts[0].title).to.eq("b");
    const noMatch = reducer(base, {
      type: "UPDATE_TOAST",
      toast: { id: "999", title: "z" } as any,
    });
    expect(noMatch.toasts[0].title).to.eq("a");
  });

  it("DISMISS_TOAST with an id sets that toast open=false", () => {
    const next = reducer(base, { type: "DISMISS_TOAST", toastId: "1" });
    expect(next.toasts[0].open).to.eq(false);
  });

  it("DISMISS_TOAST without an id closes all toasts", () => {
    const multi = { toasts: [{ id: "1", open: true } as any, { id: "2", open: true } as any] };
    const next = reducer(multi, { type: "DISMISS_TOAST" });
    expect(next.toasts.every((t) => t.open === false)).to.eq(true);
  });

  it("REMOVE_TOAST with an id filters it out", () => {
    const next = reducer(base, { type: "REMOVE_TOAST", toastId: "1" });
    expect(next.toasts).to.have.length(0);
  });

  it("REMOVE_TOAST without an id clears all toasts", () => {
    const next = reducer(base, { type: "REMOVE_TOAST" });
    expect(next.toasts).to.have.length(0);
  });
});

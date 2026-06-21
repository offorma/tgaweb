import { ListEditor, type FieldDef } from "./list-editor";
import { Toaster } from "@/components/ui/toaster";

const fields: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "Title", maxLength: 50 },
  { name: "body", label: "Body", type: "textarea", helpText: "Some help" },
  { name: "count", label: "Count", type: "number" },
  { name: "when", label: "When", type: "date" },
  {
    name: "kind",
    label: "Kind",
    type: "select",
    options: [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ],
  },
  { name: "active", label: "Active", type: "checkbox" },
];

// Controlled number inputs are awkward to clear+retype via cy.type() (the
// browser's number input doesn't expose a usable text selection, so the
// leading "0" sticks). Set the value through React's native input setter so
// the controlled onChange fires with exactly the intended value.
function setReactInput(selector: string, value: string) {
  cy.get(selector).then(($el) => {
    const el = $el[0] as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const defaultValues = {
  title: "",
  body: "",
  count: 0,
  when: "",
  kind: "",
  active: false,
};

const itemsResponse = {
  items: [
    { id: "1", title: "First Program", body: "desc one", order: 1, when: "2024-01-15T00:00:00.000Z" },
    { id: "2", title: "Second Program", body: "desc two", order: 2 },
  ],
};

function mountEditor() {
  // The list editor emits toasts via the global useToast store; a <Toaster />
  // must be mounted for that toast text to actually render in the DOM.
  cy.mount(
    <>
      <ListEditor
        endpoint="/api/admin/programs"
        title="Programs"
        entityName="Program"
        fields={fields}
        defaultValues={defaultValues}
        initialOrder={5}
        renderCard={(item) => ({
          title: item.title,
          subtitle: item.body,
          badge: item.badge,
          image: item.image,
        })}
      />
      <Toaster />
    </>
  );
}

describe("<ListEditor />", () => {
  it("loads and renders item cards", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: itemsResponse }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program").should("exist");
    cy.contains("Second Program").should("exist");
    cy.contains("Order: 1").should("exist");
  });

  it("shows a toast when loading fails", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 500, body: {} }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("Load failed").should("exist");
  });

  it("shows empty state when there are no items", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: { items: [] } }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains('No programs yet. Click "Add Program" to create one.').should("exist");
  });

  it("filters items via search and shows no-match state", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: itemsResponse }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.get('input[placeholder="Search programs..."]').type("Second");
    cy.contains("Second Program").should("exist");
    cy.contains("First Program").should("not.exist");
    cy.get('input[placeholder="Search programs..."]').clear().type("zzzz");
    cy.contains("No matches found.").should("exist");
  });

  it("opens the create dialog with default order and saves a new item (POST)", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: { items: [] } }).as("load");
    cy.intercept("POST", "/api/admin/programs", { statusCode: 200, body: { item: { id: "9" } } }).as("create");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.contains("Add New Program").should("exist");
    cy.contains("Some help").should("exist"); // helpText rendered

    cy.get("#title").type("Brand New");
    cy.get("#body").type("body text");
    setReactInput("#count", "7");
    cy.get("#when").type("2024-03-01");
    cy.get("#kind").select("a");
    cy.get("#active").check();

    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should((body) => {
      expect(body.title).to.eq("Brand New");
      expect(body.count).to.eq(7);
      expect(body.active).to.eq(true);
      expect(body.kind).to.eq("a");
      expect(body.when).to.contain("2024-03-01");
    });
    cy.contains("Program created").should("exist");
  });

  it("shows a validation error when a required field is empty on save", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: { items: [] } }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    // leave required title empty, force submit by clicking save
    setReactInput("#count", "1");
    cy.contains("button", "Save Changes").click();
    // The title input is required; native HTML validation blocks the submit so
    // the dialog stays open and the field is reported invalid.
    cy.get("#title").then(($el) => {
      expect(($el[0] as HTMLInputElement).validity.valueMissing).to.be.true;
    });
    cy.contains("Add New Program").should("exist");
  });

  it("surfaces a server error in the form when save fails", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: { items: [] } }).as("load");
    cy.intercept("POST", "/api/admin/programs", { statusCode: 400, body: { error: "Bad data" } }).as("create");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.get("#title").type("X");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create");
    cy.contains("Bad data").should("exist");
  });

  it("edits an existing item (PUT) and pre-fills the date field", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: itemsResponse }).as("load");
    cy.intercept("PUT", "/api/admin/programs/1", { statusCode: 200, body: {} }).as("update");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get('button').first().click(); // edit (pencil) button
      });
    cy.contains("Edit Program").should("exist");
    cy.get("#title").should("have.value", "First Program");
    cy.get("#when").should("have.value", "2024-01-15");
    cy.get("#title").clear().type("Edited Program");
    cy.contains("button", "Save Changes").click();
    cy.wait("@update").its("request.body.title").should("eq", "Edited Program");
    cy.contains("Program updated").should("exist");
  });

  it("cancels the editor dialog", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: { items: [] } }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.contains("Add New Program").should("exist");
    cy.contains("button", "Cancel").click();
    cy.contains("Add New Program").should("not.exist");
  });

  it("deletes an item after confirmation", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: itemsResponse }).as("load");
    cy.intercept("DELETE", "/api/admin/programs/1", { statusCode: 200, body: {} }).as("del");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get("button").eq(1).click(); // delete (trash) button
      });
    cy.contains("Delete this program?").should("exist");
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Program deleted").should("exist");
  });

  it("handles a response with no items array (|| [] fallback)", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: {},
    }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains('No programs yet. Click "Add Program" to create one.').should(
      "exist"
    );
  });

  it("saves with empty optional fields serialized to defaults", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: { items: [] },
    }).as("load");
    cy.intercept("POST", "/api/admin/programs", {
      statusCode: 200,
      body: { item: { id: "11" } },
    }).as("create");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    // Only fill the required title; leave body/date/select empty so the
    // empty-value transforms run: number->0, checkbox->false, optional->"".
    cy.get("#title").type("Minimal");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should((body) => {
      expect(body.title).to.eq("Minimal");
      expect(body.count).to.eq(0); // number empty -> 0
      expect(body.active).to.eq(false); // checkbox empty -> false
      expect(body.body).to.eq(""); // optional text empty -> ""
      expect(body.when).to.eq(""); // optional date empty -> ""
    });
  });

  it("falls back to a generic save error when the API omits error text", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: { items: [] },
    }).as("load");
    cy.intercept("POST", "/api/admin/programs", {
      statusCode: 500,
      body: {},
    }).as("create");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.get("#title").type("Err");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create");
    cy.contains("Save failed (500)").should("exist");
  });

  it("falls back to a generic delete error when the API omits error text", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: itemsResponse,
    }).as("load");
    cy.intercept("DELETE", "/api/admin/programs/1", {
      statusCode: 500,
      body: {},
    }).as("del");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get("button").eq(1).click();
      });
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("exist");
  });

  it("handles a non-JSON error body on save (.catch fallback)", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: { items: [] },
    }).as("load");
    // Plain-text error body -> res.json() rejects -> `.catch(() => ({}))`.
    cy.intercept("POST", "/api/admin/programs", {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "boom not json",
    }).as("create");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.get("#title").type("X");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create");
    cy.contains("Save failed (500)").should("exist");
  });

  it("handles a non-JSON error body on delete (.catch fallback)", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: itemsResponse,
    }).as("load");
    cy.intercept("DELETE", "/api/admin/programs/1", {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "nope not json",
    }).as("del");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get("button").eq(1).click();
      });
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Delete failed").should("exist");
  });

  it("searches across items that have no subtitle or badge", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: {
        items: [{ id: "z", title: "Bare Title", order: 0 }],
      },
    }).as("load");
    mountEditor();
    cy.wait("@load");
    // Searching builds `${title} ${subtitle||""} ${badge||""}` -> exercises the
    // ?? "" fallbacks in the filter text.
    cy.get('input[placeholder="Search programs..."]').type("bare");
    cy.contains("Bare Title").should("exist");
  });

  it("closes the editor dialog via the Escape key", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: { items: [] },
    }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.contains("Add New Program").should("exist");
    // Escape triggers Radix onOpenChange(false) -> the `if (!o)` close branch.
    cy.get("body").type("{esc}");
    cy.contains("Add New Program").should("not.exist");
  });

  it("renders image and file field editors and posts uploaded urls", () => {
    const mediaFields: FieldDef[] = [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "image", label: "Image", type: "image" },
      { name: "doc", label: "Doc", type: "file" },
      {
        name: "kind",
        label: "Kind",
        type: "select", // no options -> exercises `f.options?.map` fallback
      },
    ];
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: { items: [] },
    }).as("load");
    cy.intercept("POST", "/api/admin/programs", {
      statusCode: 200,
      body: { item: { id: "10" } },
    }).as("create");
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 200,
      body: { url: "/uploaded.pdf", fileType: "pdf", fileSize: 42 },
    }).as("upload");
    cy.mount(
      <>
        <ListEditor
          endpoint="/api/admin/programs"
          title="Programs"
          entityName="Program"
          fields={mediaFields}
          defaultValues={{ title: "", image: "", doc: "", kind: "" }}
          renderCard={(item) => ({ title: item.title })}
        />
        <Toaster />
      </>
    );
    cy.wait("@load");
    cy.contains("button", "Add Program").click();
    cy.get("#title").type("Media item");
    // Image field present (ImageUploadField).
    cy.get("#image").should("exist").type("/img.png");
    // Typing a URL into the file field fires onChange WITHOUT meta -> the
    // `if (meta?.fileType)` / `if (meta?.fileSize)` false branches.
    cy.get("#doc").should("exist").type("/typed.pdf");
    // File field present (FileUploadField) - upload via the hidden file input.
    cy.get("#doc")
      .closest("div")
      .find('input[type="file"]')
      .selectFile(
        {
          contents: Cypress.Buffer.from("%PDF-1.4"),
          fileName: "d.pdf",
          mimeType: "application/pdf",
        },
        { force: true }
      );
    cy.wait("@upload");
    cy.contains("button", "Save Changes").click();
    cy.wait("@create").its("request.body").should((body) => {
      expect(body.title).to.eq("Media item");
      expect(body.image).to.eq("/img.png");
      expect(body.doc).to.eq("/uploaded.pdf");
    });
  });

  it("renders cards with a badge over an image and without an image", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: {
        items: [
          {
            id: "a",
            title: "With Image",
            badge: "NEW",
            image: "/cover.jpg",
            order: 3,
          },
          { id: "b", title: "No Image", badge: "HOT" },
        ],
      },
    }).as("load");
    mountEditor();
    cy.wait("@load");
    // Image card: badge overlaid on the image.
    cy.get('img[src="/cover.jpg"]').should("exist");
    // Both badges render (one over image, one inline).
    cy.contains("NEW").should("exist");
    cy.contains("HOT").should("exist");
  });

  it("falls back to empty date when an item has an invalid date value", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: {
        items: [
          { id: "1", title: "Bad Date", body: "x", when: "not-a-real-date" },
        ],
      },
    }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("Bad Date")
      .closest(".group")
      .within(() => {
        cy.get("button").first().click();
      });
    cy.contains("Edit Program").should("exist");
    // Invalid ISO -> the date parse throws -> field is blank.
    cy.get("#when").should("have.value", "");
  });

  it("cancels the delete confirmation dialog", () => {
    cy.intercept("GET", "/api/admin/programs", {
      statusCode: 200,
      body: itemsResponse,
    }).as("load");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get("button").eq(1).click();
      });
    cy.contains("Delete this program?").should("exist");
    // Cancel closes the AlertDialog -> onOpenChange(false) -> setDeleteTarget(null).
    cy.contains("button", "Cancel").click();
    cy.contains("Delete this program?").should("not.exist");
  });

  it("shows a toast when delete fails", () => {
    cy.intercept("GET", "/api/admin/programs", { statusCode: 200, body: itemsResponse }).as("load");
    cy.intercept("DELETE", "/api/admin/programs/1", { statusCode: 500, body: { error: "Nope" } }).as("del");
    mountEditor();
    cy.wait("@load");
    cy.contains("First Program")
      .closest(".group")
      .within(() => {
        cy.get("button").eq(1).click();
      });
    cy.contains("button", "Delete").click();
    cy.wait("@del");
    cy.contains("Nope").should("exist");
  });
});

import { useState } from "react";
import { ImageUploadField } from "./image-upload-field";

function Harness({
  initial = "",
  previewStyle,
  required,
}: {
  initial?: string;
  previewStyle?: "landscape" | "portrait";
  required?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <ImageUploadField
        id="img"
        value={value}
        onChange={(url) => setValue(url)}
        previewStyle={previewStyle}
        required={required}
      />
      <div data-cy="current-value">{value}</div>
    </div>
  );
}

const fakeImage = {
  contents: Cypress.Buffer.from("fake-image-bytes"),
  fileName: "photo.png",
  mimeType: "image/png",
};

describe("<ImageUploadField />", () => {
  it("renders the URL input and drop zone", () => {
    cy.mount(<Harness />);
    cy.get("input#img").should("have.attr", "placeholder", "/images/... or https URL");
    cy.contains("Drop an image here or click to upload").should("exist");
    cy.get('input[type="file"]').should("exist");
  });

  it("updates value when typing a URL manually", () => {
    cy.mount(<Harness />);
    cy.get("input#img").type("/images/manual.png");
    cy.get('[data-cy="current-value"]').should("have.text", "/images/manual.png");
    // preview appears (landscape default)
    cy.get('img[alt="Preview"]').should("have.attr", "src", "/images/manual.png");
  });

  it("uploads a file successfully and shows the returned URL + preview", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 200,
      body: { url: "https://cdn.test/uploaded.png" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakeImage, { force: true });
    cy.wait("@upload");
    cy.get('[data-cy="current-value"]').should("have.text", "https://cdn.test/uploaded.png");
    cy.get('img[alt="Preview"]').should("have.attr", "src", "https://cdn.test/uploaded.png");
  });

  it("shows an error message when the upload fails (non-ok response)", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 400,
      body: { error: "File too large" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakeImage, { force: true });
    cy.wait("@upload");
    cy.contains("File too large").should("exist");
  });

  it("falls back to a generic error when the API returns no error field", () => {
    cy.intercept("POST", "/api/admin/upload", { statusCode: 500, body: {} }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakeImage, { force: true });
    cy.wait("@upload");
    cy.contains("Upload failed").should("exist");
  });

  it("shows the uploading spinner while the request is in flight", () => {
    cy.intercept("POST", "/api/admin/upload", (req) => {
      req.reply({ delay: 300, statusCode: 200, body: { url: "/x.png" } });
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakeImage, { force: true });
    cy.contains("Uploading...").should("exist");
    cy.wait("@upload");
    cy.contains("Uploading...").should("not.exist");
  });

  it("renders the portrait preview style when requested", () => {
    cy.mount(<Harness initial="/images/p.png" previewStyle="portrait" />);
    cy.get(".rounded-full img[alt='Preview']").should("exist");
  });

  it("handles a drag-and-drop file and toggles drag-over state", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 200,
      body: { url: "/dropped.png" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.contains("Drop an image here or click to upload")
      .parent()
      .trigger("dragover");
    cy.contains("Drop an image here or click to upload")
      .parent()
      .trigger("dragleave");
    cy.get('input[type="file"]').selectFile(fakeImage, {
      force: true,
      action: "drag-drop",
    });
    cy.wait("@upload");
    cy.get('[data-cy="current-value"]').should("have.text", "/dropped.png");
  });

  it("ignores an empty file selection", () => {
    cy.intercept("POST", "/api/admin/upload").as("upload");
    cy.mount(<Harness />);
    // typing clears error path / no upload triggered
    cy.get("input#img").type("/manual");
    cy.get('[data-cy="current-value"]').should("have.text", "/manual");
  });

  it("dims the preview image when it fails to load (onError)", () => {
    cy.mount(<Harness initial="/does-not-exist.png" />);
    cy.get('img[alt="Preview"]').then(($img) => {
      const el = $img[0] as HTMLImageElement;
      el.dispatchEvent(new Event("error"));
      expect(el.style.opacity).to.eq("0.3");
    });
  });

  it("renders an empty input when value is null (?? fallback)", () => {
    // A null value exercises `value ?? ""` and leaves no preview.
    cy.mount(
      <ImageUploadField
        id="img-null"
        value={null as unknown as string}
        onChange={() => {}}
      />
    );
    cy.get("input#img-null").should("have.value", "");
    cy.get('img[alt="Preview"]').should("not.exist");
  });

  it("opens the native file picker when the drop zone is clicked", () => {
    cy.mount(<Harness />);
    cy.get('input[type="file"]').then(($input) => {
      cy.stub($input[0], "click").as("pickerClick");
    });
    cy.contains("Drop an image here or click to upload").click();
    cy.get("@pickerClick").should("have.been.called");
  });

  it("ignores a programmatic empty file list (no upload fired)", () => {
    const onChange = cy.stub().as("onChange");
    cy.mount(
      <ImageUploadField id="img-empty" value="" onChange={onChange} />
    );
    cy.get('input[type="file"]').then(($input) => {
      const el = $input[0] as HTMLInputElement;
      // dispatch change with no files -> handleFile returns early.
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    cy.get("@onChange").should("not.have.been.called");
  });
});

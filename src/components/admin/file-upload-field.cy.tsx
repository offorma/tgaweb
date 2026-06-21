import { useState } from "react";
import { FileUploadField } from "./file-upload-field";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const [meta, setMeta] = useState<{ fileType?: string; fileSize?: number }>({});
  return (
    <div>
      <FileUploadField
        id="file"
        value={value}
        onChange={(url, m) => {
          setValue(url);
          if (m) setMeta(m);
        }}
      />
      <div data-cy="current-value">{value}</div>
      <div data-cy="meta-type">{meta.fileType ?? ""}</div>
      <div data-cy="meta-size">{meta.fileSize ?? ""}</div>
    </div>
  );
}

const fakePdf = {
  contents: Cypress.Buffer.from("%PDF-1.4 fake"),
  fileName: "doc.pdf",
  mimeType: "application/pdf",
};

const fakeImage = {
  contents: Cypress.Buffer.from("img-bytes"),
  fileName: "pic.png",
  mimeType: "image/png",
};

describe("<FileUploadField />", () => {
  it("renders the URL input and drop zone", () => {
    cy.mount(<Harness />);
    cy.get("input#file").should("have.attr", "placeholder", "Upload a file or paste a URL");
    cy.contains("Drop a file here or click to upload").should("exist");
  });

  it("updates value when typing a URL manually and shows a file (non-image) preview", () => {
    cy.mount(<Harness />);
    cy.get("input#file").type("/files/report.pdf");
    cy.get('[data-cy="current-value"]').should("have.text", "/files/report.pdf");
    // non-image -> FileText icon + link
    cy.get('a[href="/files/report.pdf"]').should("contain.text", "/files/report.pdf");
    // Clicking the preview link calls stopPropagation (does not re-open the
    // file picker). preventDefault avoids a real navigation in the iframe.
    cy.get('a[href="/files/report.pdf"]').then(($a) => {
      $a[0].addEventListener("click", (e) => e.preventDefault());
    });
    cy.get('a[href="/files/report.pdf"]').click();
    cy.get('[data-cy="current-value"]').should("have.text", "/files/report.pdf");
  });

  it("opens the native file picker when the drop zone is clicked", () => {
    cy.mount(<Harness />);
    // Clicking the drop zone runs fileInputRef.current?.click().
    cy.get('input[type="file"]').then(($input) => {
      cy.stub($input[0], "click").as("pickerClick");
    });
    cy.contains("Drop a file here or click to upload").click();
    cy.get("@pickerClick").should("have.been.called");
  });

  it("shows an image thumbnail preview for image URLs", () => {
    cy.mount(<Harness initial="/files/pic.jpg" />);
    cy.get('img[alt="Preview"]').should("have.attr", "src", "/files/pic.jpg");
  });

  it("uploads a file successfully and passes back url + meta", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 200,
      body: { url: "https://cdn.test/doc.pdf", fileType: "pdf", fileSize: 1234 },
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakePdf, { force: true });
    cy.wait("@upload");
    cy.get('[data-cy="current-value"]').should("have.text", "https://cdn.test/doc.pdf");
    cy.get('[data-cy="meta-type"]').should("have.text", "pdf");
    cy.get('[data-cy="meta-size"]').should("have.text", "1234");
  });

  it("shows an error message when the upload fails", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 400,
      body: { error: "Unsupported type" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakePdf, { force: true });
    cy.wait("@upload");
    cy.contains("Unsupported type").should("exist");
  });

  it("falls back to a generic error when API omits the error field", () => {
    cy.intercept("POST", "/api/admin/upload", { statusCode: 500, body: {} }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakePdf, { force: true });
    cy.wait("@upload");
    cy.contains("Upload failed").should("exist");
  });

  it("shows the uploading spinner while in flight", () => {
    cy.intercept("POST", "/api/admin/upload", (req) => {
      req.reply({ delay: 300, statusCode: 200, body: { url: "/x.pdf" } });
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakePdf, { force: true });
    cy.contains("Uploading...").should("exist");
    cy.wait("@upload");
    cy.contains("Uploading...").should("not.exist");
  });

  it("handles drag-and-drop and toggles drag-over state", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 200,
      body: { url: "/dropped.pdf" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.contains("Drop a file here or click to upload").parent().trigger("dragover");
    cy.contains("Drop a file here or click to upload").parent().trigger("dragleave");
    cy.get('input[type="file"]').selectFile(fakeImage, {
      force: true,
      action: "drag-drop",
    });
    cy.wait("@upload");
    cy.get('[data-cy="current-value"]').should("have.text", "/dropped.pdf");
  });

  it("clears any prior error when typing a URL", () => {
    cy.intercept("POST", "/api/admin/upload", {
      statusCode: 400,
      body: { error: "boom" },
    }).as("upload");
    cy.mount(<Harness />);
    cy.get('input[type="file"]').selectFile(fakePdf, { force: true });
    cy.wait("@upload");
    cy.contains("boom").should("exist");
    cy.get("input#file").type("/clean.pdf");
    cy.contains("boom").should("not.exist");
  });

  it("renders an empty input when value is null (?? fallback)", () => {
    cy.mount(
      <FileUploadField
        id="file-null"
        value={null as unknown as string}
        onChange={() => {}}
      />
    );
    cy.get("input#file-null").should("have.value", "");
    // No value -> no preview block.
    cy.get('a[target="_blank"]').should("not.exist");
  });

  it("ignores a programmatic empty file list (no upload fired)", () => {
    const onChange = cy.stub().as("onChange");
    cy.mount(
      <FileUploadField id="file-empty" value="" onChange={onChange} />
    );
    cy.get('input[type="file"]').then(($input) => {
      const el = $input[0] as HTMLInputElement;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    cy.get("@onChange").should("not.have.been.called");
  });
});

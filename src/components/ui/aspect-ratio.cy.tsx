import { AspectRatio } from "./aspect-ratio";

describe("<AspectRatio />", () => {
  it("renders content inside the aspect ratio container", () => {
    cy.mount(
      <div style={{ width: 200 }}>
        <AspectRatio ratio={16 / 9}>
          <span>ratio content</span>
        </AspectRatio>
      </div>
    );
    cy.get('[data-slot="aspect-ratio"]').should("contain.text", "ratio content");
  });
});

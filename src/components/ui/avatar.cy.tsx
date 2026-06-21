import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

describe("<Avatar />", () => {
  it("renders the fallback when the image is unavailable", () => {
    cy.mount(
      <Avatar className="my-avatar">
        <AvatarImage src="https://invalid.example/none.png" alt="user" />
        <AvatarFallback>TG</AvatarFallback>
      </Avatar>
    );
    cy.get('[data-slot="avatar"]').should("have.class", "my-avatar");
    cy.get('[data-slot="avatar-fallback"]').should("contain.text", "TG");
  });

  it("mounts AvatarImage so its render runs", () => {
    cy.mount(
      <Avatar>
        <AvatarImage src="/img.png" alt="avatar" className="img-class" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    cy.get('[data-slot="avatar"]').should("exist");
  });
});

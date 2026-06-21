import { OTPInputContext } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "./input-otp";

describe("<InputOTP />", () => {
  it("renders slots and reflects typed characters", () => {
    cy.mount(
      <InputOTP maxLength={6} containerClassName="my-container" className="my-otp">
        <InputOTPGroup className="my-group">
          <InputOTPSlot index={0} className="my-slot" />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    );

    cy.get('[data-slot="input-otp-group"]').should("have.length", 2);
    cy.get('[data-slot="input-otp-slot"]').should("have.length", 6);
    cy.get('[data-slot="input-otp-separator"]').should("exist");

    cy.get('[data-slot="input-otp"]').type("123456");
    cy.get('[data-slot="input-otp-slot"]').first().should("contain.text", "1");
    cy.get('[data-slot="input-otp-slot"]').last().should("contain.text", "6");
  });

  it("marks the active slot when focused", () => {
    cy.mount(
      <InputOTP maxLength={4}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    );
    cy.get('[data-slot="input-otp"]').focus().type("7");
    cy.get('[data-slot="input-otp-slot"][data-active="true"]').should("exist");
  });

  it("renders a slot with a null OTP context (falls back to an empty slot object)", () => {
    // With a null context, `inputOTPContext?.slots[index] ?? {}` short-circuits
    // to the empty-object fallback branch.
    cy.mount(
      <OTPInputContext.Provider value={null as never}>
        <InputOTPSlot index={0} className="lonely" />
      </OTPInputContext.Provider>
    );
    cy.get('[data-slot="input-otp-slot"]').should("have.class", "lonely");
    // No char and not active.
    cy.get('[data-slot="input-otp-slot"]').should(
      "not.have.attr",
      "data-active",
      "true"
    );
  });

  it("shows the fake caret on the active empty slot", () => {
    cy.mount(
      <InputOTP maxLength={4} autoFocus>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    );
    // Focusing an empty input renders the blinking fake caret in the active slot.
    cy.get('[data-slot="input-otp"]').focus();
    cy.get(".animate-caret-blink").should("exist");
  });
});

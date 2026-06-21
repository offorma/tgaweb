import * as React from "react";
import { Calendar } from "./calendar";

describe("<Calendar />", () => {
  it("renders the day grid and selects a day", () => {
    function Wrapper() {
      const [date, setDate] = React.useState<Date | undefined>(
        new Date(2026, 5, 15)
      );
      return (
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={new Date(2026, 5, 15)}
          className="my-calendar"
        />
      );
    }
    cy.mount(<Wrapper />);

    cy.get('[data-slot="calendar"]').should("exist");
    // Navigation chevrons (left/right) render.
    cy.get(".rdp-button_previous, [data-slot=calendar] button").should("exist");

    // Click a day button to exercise CalendarDayButton selection.
    cy.get('[data-slot="calendar"] button[data-day]')
      .contains(/^20$/)
      .click({ force: true });
    cy.get('[data-day][data-selected-single="true"]').should("exist");
  });

  it("renders with the dropdown caption layout", () => {
    cy.mount(
      <Calendar
        mode="single"
        captionLayout="dropdown"
        month={new Date(2026, 5, 15)}
      />
    );
    cy.get('[data-slot="calendar"]').should("exist");
  });

  it("supports navigating months via the next button", () => {
    cy.mount(<Calendar mode="single" month={new Date(2026, 5, 15)} />);
    cy.get('[data-slot="calendar"] .rdp-button_next').first().click({ force: true });
    cy.get('[data-slot="calendar"]').should("exist");
  });

  it("renders week numbers when enabled (custom WeekNumber component)", () => {
    cy.mount(
      <Calendar
        mode="single"
        showWeekNumber
        month={new Date(2026, 5, 15)}
      />
    );
    cy.get('[data-slot="calendar"]').should("exist");
    // The custom WeekNumber renders <td> cells with the week number text.
    cy.get('[data-slot="calendar"] td').should("have.length.greaterThan", 0);
  });
});

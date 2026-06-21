import { describe, it, expect } from "vitest";
import {
  SCHOOL,
  NAV_LINKS,
  STATS,
  VALUES,
  PROGRAMS,
  WHY_US,
  CAMPUS_LIFE,
  FACULTY,
  TESTIMONIALS,
  ADMISSION_STEPS,
  NEWS_EVENTS,
  FAQS,
} from "./data";

/**
 * Unit tests for src/components/site/data.ts.
 *
 * data.ts is a pure, static content module (no DB / IO), so these tests assert
 * the *shape* and key invariants of each exported constant rather than mocking
 * any boundary.
 */

describe("SCHOOL constant", () => {
  it("exposes the core school identity fields", () => {
    expect(SCHOOL.name).toBe("Trail Gliders Academy");
    expect(SCHOOL.shortName).toBe("TGA");
    expect(SCHOOL.founded).toBe(2009);
    expect(typeof SCHOOL.tagline).toBe("string");
  });

  it("uses valid-looking email addresses", () => {
    expect(SCHOOL.email).toMatch(/@/);
    expect(SCHOOL.admissionsEmail).toMatch(/@/);
  });

  it("points crest at an image path", () => {
    expect(SCHOOL.crest).toMatch(/\.(png|jpg|svg)$/);
  });
});

describe("NAV_LINKS", () => {
  it("is a non-empty list of {label, href} anchors", () => {
    expect(NAV_LINKS.length).toBeGreaterThan(0);
    for (const link of NAV_LINKS) {
      expect(typeof link.label).toBe("string");
      expect(link.href.startsWith("#")).toBe(true);
    }
  });

  it("includes Home and Contact entries", () => {
    const labels = NAV_LINKS.map((l) => l.label);
    expect(labels).toContain("Home");
    expect(labels).toContain("Contact");
  });

  it("has unique hrefs", () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("STATS", () => {
  it("contains exactly 4 numeric stats with labels", () => {
    expect(STATS).toHaveLength(4);
    for (const s of STATS) {
      expect(typeof s.value).toBe("number");
      expect(typeof s.suffix).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  it("uses a percentage suffix on the placement rate", () => {
    const placement = STATS.find((s) => s.label.includes("Placement"));
    expect(placement?.suffix).toBe("%");
  });
});

describe("VALUES", () => {
  it("each value carries a lucide icon name, title and description", () => {
    expect(VALUES.length).toBeGreaterThan(0);
    for (const v of VALUES) {
      expect(v.icon.length).toBeGreaterThan(0);
      expect(v.title.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
    }
  });

  it("references the expected icon set", () => {
    const icons = VALUES.map((v) => v.icon);
    expect(icons).toEqual(["BookOpen", "Heart", "Sparkles", "Globe"]);
  });
});

describe("PROGRAMS", () => {
  it("has three programs, each with a non-empty features list", () => {
    expect(PROGRAMS).toHaveLength(3);
    for (const p of PROGRAMS) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.ages.length).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThan(0);
      expect(["orange", "navy", "gold"]).toContain(p.color);
    }
  });
});

describe("WHY_US", () => {
  it("lists six selling points with icons", () => {
    expect(WHY_US).toHaveLength(6);
    for (const w of WHY_US) {
      expect(w.icon.length).toBeGreaterThan(0);
      expect(w.title.length).toBeGreaterThan(0);
    }
  });
});

describe("CAMPUS_LIFE", () => {
  it("lists campus activities with image, title and description", () => {
    expect(CAMPUS_LIFE.length).toBeGreaterThan(0);
    for (const c of CAMPUS_LIFE) {
      expect(c.image).toMatch(/^\/images\//);
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});

describe("FACULTY", () => {
  it("lists faculty members with name, role, bio and quote", () => {
    expect(FACULTY.length).toBeGreaterThan(0);
    for (const f of FACULTY) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.role.length).toBeGreaterThan(0);
      expect(f.bio.length).toBeGreaterThan(0);
      expect(f.quote.length).toBeGreaterThan(0);
    }
  });
});

describe("TESTIMONIALS", () => {
  it("each testimonial has a 1-5 star rating", () => {
    expect(TESTIMONIALS.length).toBeGreaterThan(0);
    for (const t of TESTIMONIALS) {
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.quote.length).toBeGreaterThan(0);
    }
  });
});

describe("ADMISSION_STEPS", () => {
  it("steps are numbered sequentially as zero-padded strings", () => {
    expect(ADMISSION_STEPS).toHaveLength(4);
    ADMISSION_STEPS.forEach((s, i) => {
      expect(s.step).toBe(String(i + 1).padStart(2, "0"));
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    });
  });
});

describe("NEWS_EVENTS", () => {
  it("each entry has a parseable ISO date and a category", () => {
    expect(NEWS_EVENTS.length).toBeGreaterThan(0);
    for (const n of NEWS_EVENTS) {
      expect(Number.isNaN(Date.parse(n.date))).toBe(false);
      expect(["News", "Event"]).toContain(n.category);
      expect(n.title.length).toBeGreaterThan(0);
    }
  });
});

describe("FAQS", () => {
  it("each FAQ has a non-empty question and answer", () => {
    expect(FAQS.length).toBeGreaterThan(0);
    for (const f of FAQS) {
      expect(f.q.endsWith("?")).toBe(true);
      expect(f.a.length).toBeGreaterThan(0);
    }
  });
});

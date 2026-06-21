import { describe, it, expect } from "vitest";
import {
  SiteSettingsSchema,
  NewsletterSchema,
  StatSchema,
  ValueSchema,
  ProgramSchema,
  FacultySchema,
  TestimonialSchema,
  NewsItemSchema,
  AdmissionStepSchema,
  FaqSchema,
  CampusItemSchema,
  SlideSchema,
  DownloadSchema,
  LoginSchema,
  SecretSchema,
  SecretUpdateSchema,
  SmtpTestSchema,
  UserCreateSchema,
  UserUpdateSchema,
  SecurityPolicySchema,
  SECRET_CATEGORIES,
} from "./site";

/**
 * Pure zod schema tests. For each exported schema we assert a valid payload
 * passes and that representative invalid payloads (missing required fields,
 * extra keys rejected by strictObject, boundary violations, bad enums/regex)
 * fail.
 */

// A fully-valid SiteSettings payload (every required field present).
const VALID_SETTINGS = {
  schoolName: "Trail Gliders Academy",
  shortName: "TGA",
  tagline: "Soar high",
  motto: "Excellence",
  founded: 2005,
  location: "Lagos",
  address: "1 School Road",
  phone: "+234 800",
  phoneAlt: "+234 801",
  email: "info@school.test",
  admissionsEmail: "admissions@school.test",
  hours: "8am-4pm",
  crestUrl: "/crest/school-crest.png",
  heroBadge: "Badge",
  heroTitle1: "Title One",
  heroTitle2: "Title Two",
  heroDescription: "A description of the hero section.",
  aboutHeading: "About us",
  aboutParagraph: "About paragraph text.",
  missionText: "Our mission.",
  visionText: "Our vision.",
  admissionsHeading: "Admissions",
  admissionsParagraph: "Admissions paragraph.",
  admissionsDeadline: "March",
  admissionsOpenDay: "April",
  applyButtonLabel: "Apply Now",
  applyButtonUrl: "/apply",
};

describe("SiteSettingsSchema", () => {
  it("accepts a valid payload and applies defaults", () => {
    const parsed = SiteSettingsSchema.parse(VALID_SETTINGS);
    expect(parsed.applyButtonEnabled).toBe(true);
    expect(parsed.applyButtonType).toBe("scroll");
    expect(parsed.applyButtonStyle).toBe("primary");
    expect(parsed.facebookUrl).toBe("");
  });

  it("rejects extra keys (strictObject)", () => {
    expect(
      SiteSettingsSchema.safeParse({ ...VALID_SETTINGS, extra: "nope" }).success
    ).toBe(false);
  });

  it("rejects a missing required field", () => {
    const { schoolName: _omit, ...rest } = VALID_SETTINGS;
    expect(SiteSettingsSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects founded out of range", () => {
    expect(
      SiteSettingsSchema.safeParse({ ...VALID_SETTINGS, founded: 1799 }).success
    ).toBe(false);
    expect(
      SiteSettingsSchema.safeParse({ ...VALID_SETTINGS, founded: 2101 }).success
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      SiteSettingsSchema.safeParse({ ...VALID_SETTINGS, email: "not-an-email" })
        .success
    ).toBe(false);
  });

  it("rejects a crestUrl that is neither relative path nor https URL", () => {
    expect(
      SiteSettingsSchema.safeParse({ ...VALID_SETTINGS, crestUrl: "ftp://x" })
        .success
    ).toBe(false);
  });

  it("accepts an https crestUrl with query params", () => {
    expect(
      SiteSettingsSchema.safeParse({
        ...VALID_SETTINGS,
        crestUrl: "https://res.cloudinary.com/demo/image.png?v=1,2",
      }).success
    ).toBe(true);
  });
});

describe("NewsletterSchema", () => {
  it("accepts a valid email and optional honeypot", () => {
    expect(NewsletterSchema.parse({ email: "a@b.com" }).email).toBe("a@b.com");
    expect(
      NewsletterSchema.safeParse({ email: "a@b.com", website: "x" }).success
    ).toBe(true);
  });
  it("rejects invalid email and extra keys", () => {
    expect(NewsletterSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(
      NewsletterSchema.safeParse({ email: "a@b.com", other: 1 }).success
    ).toBe(false);
  });
});

describe("StatSchema", () => {
  it("accepts valid + applies defaults", () => {
    const p = StatSchema.parse({ value: 10, label: "Label", description: "Desc" });
    expect(p.suffix).toBe("");
    expect(p.order).toBe(0);
  });
  it("rejects negative value / over max", () => {
    expect(
      StatSchema.safeParse({ value: -1, label: "L", description: "D" }).success
    ).toBe(false);
    expect(
      StatSchema.safeParse({ value: 1_000_001, label: "L", description: "D" })
        .success
    ).toBe(false);
  });
  it("rejects missing required label", () => {
    expect(StatSchema.safeParse({ value: 1, description: "D" }).success).toBe(
      false
    );
  });
});

describe("ValueSchema", () => {
  it("accepts valid", () => {
    expect(
      ValueSchema.safeParse({ icon: "star", title: "T", description: "D" })
        .success
    ).toBe(true);
  });
  it("rejects empty title", () => {
    expect(
      ValueSchema.safeParse({ icon: "star", title: "", description: "D" }).success
    ).toBe(false);
  });
});

describe("ProgramSchema", () => {
  const valid = {
    name: "Primary",
    ages: "5-11",
    image: "/img.png",
    tagline: "Tag",
    description: "Desc",
    features: "a\nb",
  };
  it("accepts valid + defaults", () => {
    const p = ProgramSchema.parse(valid);
    expect(p.color).toBe("orange");
    expect(p.order).toBe(0);
  });
  it("rejects bad color enum", () => {
    expect(ProgramSchema.safeParse({ ...valid, color: "purple" }).success).toBe(
      false
    );
  });
});

describe("FacultySchema", () => {
  it("accepts valid", () => {
    expect(
      FacultySchema.safeParse({
        name: "Jane",
        role: "Teacher",
        image: "/j.png",
        bio: "Bio",
        quote: "Quote",
      }).success
    ).toBe(true);
  });
  it("rejects missing bio", () => {
    expect(
      FacultySchema.safeParse({
        name: "Jane",
        role: "Teacher",
        image: "/j.png",
        quote: "Quote",
      }).success
    ).toBe(false);
  });
});

describe("TestimonialSchema", () => {
  it("accepts valid + rating default", () => {
    const p = TestimonialSchema.parse({
      name: "Bola",
      relation: "Parent",
      quote: "Great",
    });
    expect(p.rating).toBe(5);
  });
  it("rejects rating out of range", () => {
    expect(
      TestimonialSchema.safeParse({
        name: "Bola",
        relation: "Parent",
        quote: "Q",
        rating: 6,
      }).success
    ).toBe(false);
  });
});

describe("NewsItemSchema", () => {
  const valid = {
    date: "2024-01-01",
    tag: "Sports",
    title: "Title",
    excerpt: "Excerpt",
    image: "/n.png",
  };
  it("accepts valid + defaults", () => {
    const p = NewsItemSchema.parse(valid);
    expect(p.category).toBe("News");
    expect(p.published).toBe(true);
  });
  it("rejects an invalid date", () => {
    expect(
      NewsItemSchema.safeParse({ ...valid, date: "not-a-date" }).success
    ).toBe(false);
  });
  it("rejects bad category enum", () => {
    expect(NewsItemSchema.safeParse({ ...valid, category: "Blog" }).success).toBe(
      false
    );
  });
});

describe("AdmissionStepSchema", () => {
  it("accepts valid", () => {
    expect(
      AdmissionStepSchema.safeParse({
        step: "1",
        title: "Apply",
        description: "Fill form",
      }).success
    ).toBe(true);
  });
  it("rejects step over max length", () => {
    expect(
      AdmissionStepSchema.safeParse({
        step: "12345678901",
        title: "Apply",
        description: "Fill form",
      }).success
    ).toBe(false);
  });
});

describe("FaqSchema", () => {
  it("accepts valid", () => {
    expect(
      FaqSchema.safeParse({ question: "Why?", answer: "Because." }).success
    ).toBe(true);
  });
  it("rejects empty answer", () => {
    expect(FaqSchema.safeParse({ question: "Why?", answer: "" }).success).toBe(
      false
    );
  });
});

describe("CampusItemSchema", () => {
  it("accepts valid", () => {
    expect(
      CampusItemSchema.safeParse({
        image: "/c.png",
        title: "Library",
        description: "Big library",
      }).success
    ).toBe(true);
  });
  it("rejects missing image", () => {
    expect(
      CampusItemSchema.safeParse({ title: "Library", description: "Big" }).success
    ).toBe(false);
  });
});

describe("SlideSchema", () => {
  const valid = { image: "/s.png", title: "Slide" };
  it("accepts minimal valid + defaults", () => {
    const p = SlideSchema.parse(valid);
    expect(p.transitionType).toBe("fade");
    expect(p.duration).toBe(6500);
    expect(p.textPosition).toBe("left");
    expect(p.parallaxDepth).toBe(15);
    expect(p.active).toBe(true);
  });
  it("accepts empty-string optionals", () => {
    expect(
      SlideSchema.safeParse({ ...valid, subtitle: "", videoUrl: "", badge: "" })
        .success
    ).toBe(true);
  });
  it("rejects duration below min", () => {
    expect(SlideSchema.safeParse({ ...valid, duration: 1000 }).success).toBe(
      false
    );
  });
  it("rejects parallaxDepth above max", () => {
    expect(SlideSchema.safeParse({ ...valid, parallaxDepth: 51 }).success).toBe(
      false
    );
  });
  it("rejects bad transitionType enum", () => {
    expect(
      SlideSchema.safeParse({ ...valid, transitionType: "spin" }).success
    ).toBe(false);
  });
});

describe("DownloadSchema", () => {
  const valid = {
    name: "Prospectus",
    url: "/files/prospectus.pdf",
    fileType: "pdf",
  };
  it("accepts valid + defaults", () => {
    const p = DownloadSchema.parse(valid);
    expect(p.description).toBe("");
    expect(p.fileSize).toBe(0);
    expect(p.published).toBe(true);
  });
  it("rejects bad url", () => {
    expect(DownloadSchema.safeParse({ ...valid, url: "javascript:x" }).success).toBe(
      false
    );
  });
});

describe("LoginSchema", () => {
  it("accepts valid", () => {
    expect(
      LoginSchema.safeParse({ email: "a@b.com", password: "password1" }).success
    ).toBe(true);
  });
  it("rejects short password", () => {
    expect(
      LoginSchema.safeParse({ email: "a@b.com", password: "short" }).success
    ).toBe(false);
  });
  it("rejects extra keys", () => {
    expect(
      LoginSchema.safeParse({
        email: "a@b.com",
        password: "password1",
        extra: 1,
      }).success
    ).toBe(false);
  });
});

describe("SecretSchema / SecretUpdateSchema", () => {
  it("exports SECRET_CATEGORIES", () => {
    expect(SECRET_CATEGORIES).toContain("email");
  });
  it("accepts a valid secret", () => {
    expect(
      SecretSchema.safeParse({
        key: "SMTP_PASSWORD",
        category: "email",
        value: "s3cret",
      }).success
    ).toBe(true);
  });
  it("rejects lowercase key (regex)", () => {
    expect(
      SecretSchema.safeParse({
        key: "smtp_password",
        category: "email",
        value: "x",
      }).success
    ).toBe(false);
  });
  it("rejects bad category enum", () => {
    expect(
      SecretSchema.safeParse({
        key: "SMTP_PASSWORD",
        category: "unknown",
        value: "x",
      }).success
    ).toBe(false);
  });
  it("SecretUpdateSchema allows partial (no value)", () => {
    expect(SecretUpdateSchema.safeParse({ category: "email" }).success).toBe(
      true
    );
  });
});

describe("SmtpTestSchema", () => {
  it("accepts valid", () => {
    expect(
      SmtpTestSchema.safeParse({
        host: "smtp.test.com",
        port: 587,
        user: "u",
        password: "p",
      }).success
    ).toBe(true);
  });
  it("rejects port out of range", () => {
    expect(
      SmtpTestSchema.safeParse({
        host: "smtp.test.com",
        port: 70000,
        user: "u",
        password: "p",
      }).success
    ).toBe(false);
  });
});

describe("UserCreateSchema", () => {
  const valid = {
    name: "New User",
    email: "NEW@School.Test",
    password: "Str0ng!Passw0rd",
  };
  it("accepts valid, lowercases email, applies defaults", () => {
    const p = UserCreateSchema.parse(valid);
    expect(p.email).toBe("new@school.test");
    expect(p.role).toBe("EDITOR");
    expect(p.requireTwoFactor).toBe(true);
    expect(p.requirePasswordChange).toBe(true);
  });
  it("rejects a weak password (no symbol)", () => {
    expect(
      UserCreateSchema.safeParse({ ...valid, password: "Str0ngPassword" }).success
    ).toBe(false);
  });
  it("rejects a short password", () => {
    expect(
      UserCreateSchema.safeParse({ ...valid, password: "Sh0rt!" }).success
    ).toBe(false);
  });
});

describe("UserUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(UserUpdateSchema.safeParse({ name: "Changed" }).success).toBe(true);
  });
  it("rejects a weak newPassword", () => {
    expect(
      UserUpdateSchema.safeParse({ newPassword: "weak" }).success
    ).toBe(false);
  });
  it("accepts a strong newPassword", () => {
    expect(
      UserUpdateSchema.safeParse({ newPassword: "Str0ng!Passw0rd" }).success
    ).toBe(true);
  });
});

describe("SecurityPolicySchema", () => {
  it("accepts valid", () => {
    expect(
      SecurityPolicySchema.safeParse({
        enforceTwoFactorForAdmins: true,
        enforceTwoFactorForEditors: false,
        minPasswordLength: 12,
        sessionTimeoutHours: 8,
      }).success
    ).toBe(true);
  });
  it("rejects minPasswordLength below 8", () => {
    expect(
      SecurityPolicySchema.safeParse({
        enforceTwoFactorForAdmins: true,
        enforceTwoFactorForEditors: false,
        minPasswordLength: 4,
        sessionTimeoutHours: 8,
      }).success
    ).toBe(false);
  });
  it("rejects sessionTimeoutHours above 168", () => {
    expect(
      SecurityPolicySchema.safeParse({
        enforceTwoFactorForAdmins: true,
        enforceTwoFactorForEditors: false,
        minPasswordLength: 12,
        sessionTimeoutHours: 200,
      }).success
    ).toBe(false);
  });
});

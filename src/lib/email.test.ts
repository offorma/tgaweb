import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Backend unit tests for src/lib/email.ts.
 *
 * All external boundaries are mocked: nodemailer (no real SMTP), the secrets
 * vault, the master-key check, and Prisma (db). We assert on the arguments
 * passed to nodemailer's sendMail — i.e. the rendered subject/from/to/replyTo
 * and the HTML/text body — without sending anything.
 */

// Hoisted mock fns so the vi.mock factories below can reference them safely.
const h = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const closeMock = vi.fn();
  const createTransportMock = vi.fn((_config: Record<string, unknown>) => ({
    sendMail: sendMailMock,
    close: closeMock,
  }));
  const isMasterKeyConfiguredMock = vi.fn();
  const getSecretValuesMock = vi.fn();
  const findUniqueMock = vi.fn();
  return {
    sendMailMock,
    closeMock,
    createTransportMock,
    isMasterKeyConfiguredMock,
    getSecretValuesMock,
    findUniqueMock,
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: h.createTransportMock },
  createTransport: h.createTransportMock,
}));
vi.mock("@/lib/secrets", () => ({
  isMasterKeyConfigured: h.isMasterKeyConfiguredMock,
}));
vi.mock("@/lib/secrets-data", () => ({
  getSecretValues: h.getSecretValuesMock,
}));
vi.mock("@/lib/db", () => ({
  db: { siteSettings: { findUnique: h.findUniqueMock } },
}));

const FULL_SMTP = {
  SMTP_HOST: "smtp.test.com",
  SMTP_PORT: "587",
  SMTP_USER: "mailer@test.com",
  SMTP_PASSWORD: "s3cret",
  SMTP_FROM: "info@trailgliders.com.ng",
};

// Fresh module per test so email.ts's internal 60s branding cache is reset.
async function freshEmail() {
  vi.resetModules();
  return import("@/lib/email");
}

/** Convenience: the payload passed to the last sendMail() call. */
function lastMail() {
  return h.sendMailMock.mock.calls.at(-1)?.[0] as {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isMasterKeyConfiguredMock.mockReturnValue(true);
  h.findUniqueMock.mockResolvedValue(null); // → branding falls back to defaults
  h.getSecretValuesMock.mockResolvedValue({ ...FULL_SMTP });
  h.sendMailMock.mockResolvedValue({ messageId: "test" });
  // Ensure no env-var SMTP leaks into tests
  for (const k of Object.keys(FULL_SMTP)) delete process.env[k];
});

describe("esc()", () => {
  it("escapes HTML-significant characters", async () => {
    const { esc } = await freshEmail();
    expect(esc(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
  });

  it("renders null/undefined as empty string", async () => {
    const { esc } = await freshEmail();
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("getEmailBranding()", () => {
  it("uses safe defaults when no SiteSettings row exists", async () => {
    const { getEmailBranding } = await freshEmail();
    const b = await getEmailBranding();
    expect(b.schoolName).toBe("Trail Gliders Academy");
    expect(b.crestUrl).toContain("/crest/school-crest.png");
  });

  it("uses values from SiteSettings when present", async () => {
    h.findUniqueMock.mockResolvedValue({
      schoolName: "Custom School",
      shortName: "CS",
      tagline: "Tagline",
      email: "hi@custom.test",
      phone: "+1 555",
      address: "1 Road",
    });
    const { getEmailBranding } = await freshEmail();
    const b = await getEmailBranding();
    expect(b.schoolName).toBe("Custom School");
    expect(b.email).toBe("hi@custom.test");
  });
});

describe("sendMail() — fail-soft & SMTP resolution", () => {
  it("skips with no-master-key when the vault is not configured and no env vars", async () => {
    h.isMasterKeyConfiguredMock.mockReturnValue(false);
    const { sendMail } = await freshEmail();
    const res = await sendMail({ to: "a@b.com", subject: "s", html: "<p>h</p>", text: "h" });
    expect(res).toEqual({ sent: false, skipped: "no-master-key" });
    expect(h.createTransportMock).not.toHaveBeenCalled();
  });

  it("skips with no-smtp when the vault has no host/user/pass", async () => {
    h.getSecretValuesMock.mockResolvedValue({});
    const { sendMail } = await freshEmail();
    const res = await sendMail({ to: "a@b.com", subject: "s", html: "<p>h</p>", text: "h" });
    expect(res).toEqual({ sent: false, skipped: "no-smtp" });
  });

  it("sends and reports sent:true when the vault is fully configured", async () => {
    const { sendMail } = await freshEmail();
    const res = await sendMail({
      to: "a@b.com",
      subject: "Subject",
      html: "<p>hi</p>",
      text: "hi",
      fromName: "Sender",
    });
    expect(res).toEqual({ sent: true });
    expect(h.createTransportMock).toHaveBeenCalledOnce();
    expect(h.closeMock).toHaveBeenCalledOnce();
    const transport = h.createTransportMock.mock.calls[0][0];
    expect(transport).toMatchObject({ host: "smtp.test.com", port: 587, secure: false });
    expect(lastMail().from).toBe('"Sender" <info@trailgliders.com.ng>');
  });

  it("uses secure:true for port 465", async () => {
    h.getSecretValuesMock.mockResolvedValue({ ...FULL_SMTP, SMTP_PORT: "465" });
    const { sendMail } = await freshEmail();
    await sendMail({ to: "a@b.com", subject: "s", html: "<p>h</p>", text: "h" });
    expect(h.createTransportMock.mock.calls[0][0]).toMatchObject({ port: 465, secure: true });
  });

  it("falls back to env-var SMTP when the vault is empty", async () => {
    h.isMasterKeyConfiguredMock.mockReturnValue(false);
    process.env.SMTP_HOST = "env.smtp.com";
    process.env.SMTP_USER = "envuser";
    process.env.SMTP_PASSWORD = "envpass";
    const { sendMail } = await freshEmail();
    const res = await sendMail({ to: "a@b.com", subject: "s", html: "<p>h</p>", text: "h" });
    expect(res).toEqual({ sent: true });
    expect(h.createTransportMock.mock.calls[0][0]).toMatchObject({ host: "env.smtp.com" });
  });
});

describe("sendPasswordResetEmail()", () => {
  it("renders the reset link, a school-branded subject, and escapes the name", async () => {
    const { sendPasswordResetEmail } = await freshEmail();
    const res = await sendPasswordResetEmail({
      to: "user@school.test",
      name: "<b>Ada</b>",
      resetLink: "https://site.test/admin/reset-password?token=abc123",
      expiresInLabel: "1 hour",
    });
    expect(res.sent).toBe(true);
    const mail = lastMail();
    expect(mail.to).toBe("user@school.test");
    expect(mail.subject).toContain("Trail Gliders Academy");
    expect(mail.html).toContain("https://site.test/admin/reset-password?token=abc123");
    expect(mail.html).toContain("1 hour");
    // Name is escaped — raw <b> must not appear
    expect(mail.html).not.toContain("<b>Ada</b>");
    expect(mail.html).toContain("&lt;b&gt;Ada&lt;/b&gt;");
    expect(mail.text).toContain("https://site.test/admin/reset-password?token=abc123");
  });
});

describe("sendWelcomeEmail()", () => {
  it("includes role, a login link, and the 2FA/password first-steps when required", async () => {
    const { sendWelcomeEmail } = await freshEmail();
    await sendWelcomeEmail({
      to: "new@school.test",
      name: "New Teacher",
      email: "new@school.test",
      role: "EDITOR",
      mustChangePassword: true,
      requireTwoFactor: true,
    });
    const mail = lastMail();
    expect(mail.to).toBe("new@school.test");
    expect(mail.subject.toLowerCase()).toContain("welcome");
    expect(mail.html).toContain("EDITOR");
    expect(mail.html).toContain("/admin/login");
    expect(mail.html.toLowerCase()).toContain("two-factor");
    expect(mail.text).toContain("EDITOR");
  });

  it("includes the temporary password (escaped) in the HTML and text", async () => {
    const { sendWelcomeEmail } = await freshEmail();
    await sendWelcomeEmail({
      to: "new@school.test",
      name: "New Teacher",
      email: "new@school.test",
      role: "ADMIN",
      tempPassword: "Tmp<Pa55>&!x",
      mustChangePassword: true,
    });
    const mail = lastMail();
    expect(mail.html).toContain("Temporary password");
    expect(mail.html).toContain("Tmp&lt;Pa55&gt;&amp;!x"); // escaped
    expect(mail.html).not.toContain("Tmp<Pa55>"); // raw not present
    expect(mail.text).toContain("Temporary password: Tmp<Pa55>&!x");
    // first-step copy switches to "below" when the password is in the email
    expect(mail.html.toLowerCase()).toContain("temporary password below");
  });

  it("omits the first-steps checklist when nothing is required", async () => {
    const { sendWelcomeEmail } = await freshEmail();
    await sendWelcomeEmail({
      to: "new@school.test",
      name: "New Teacher",
      email: "new@school.test",
      role: "ADMIN",
      mustChangePassword: false,
      requireTwoFactor: false,
    });
    expect(lastMail().html.toLowerCase()).not.toContain("two-factor");
  });
});

describe("sendContactNotificationEmail()", () => {
  it("sets replyTo to the sender and escapes the message body", async () => {
    const { sendContactNotificationEmail } = await freshEmail();
    await sendContactNotificationEmail({
      to: "admissions@school.test",
      firstName: "Bola",
      lastName: "Ade",
      email: "bola@parent.test",
      phone: "+234 800",
      subject: "Admission enquiry",
      message: "Hello <img src=x onerror=alert(1)> world",
      ip: "1.2.3.4",
    });
    const mail = lastMail();
    expect(mail.to).toBe("admissions@school.test");
    expect(mail.replyTo).toBe("bola@parent.test");
    expect(mail.subject).toBe("[Contact] Admission enquiry");
    expect(mail.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(mail.html).not.toContain("<img src=x");
  });
});

describe("sendContactAutoReplyEmail()", () => {
  it("is addressed to the sender and replies from the school inbox", async () => {
    h.findUniqueMock.mockResolvedValue({
      schoolName: "Trail Gliders Academy",
      email: "info@trailgliders.com.ng",
    });
    const { sendContactAutoReplyEmail } = await freshEmail();
    await sendContactAutoReplyEmail({
      to: "bola@parent.test",
      firstName: "Bola",
      subject: "Admission enquiry",
      message: "Hi there",
    });
    const mail = lastMail();
    expect(mail.to).toBe("bola@parent.test");
    expect(mail.replyTo).toBe("info@trailgliders.com.ng");
    expect(mail.html).toContain("Bola");
    expect(mail.subject.toLowerCase()).toContain("received");
  });
});

describe("branch coverage — fallbacks & cache", () => {
  it("caches branding within its TTL (db queried once for two calls)", async () => {
    const { getEmailBranding } = await freshEmail();
    await getEmailBranding();
    await getEmailBranding();
    expect(h.findUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("password reset defaults the validity label to '1 hour' when omitted", async () => {
    const { sendPasswordResetEmail } = await freshEmail();
    await sendPasswordResetEmail({
      to: "u@school.test",
      name: "Ada",
      resetLink: "https://site.test/reset?token=x",
    });
    const mail = lastMail();
    expect(mail.html).toContain("1 hour");
    expect(mail.text).toContain("1 hour");
  });

  it("contact notification renders dashes/omits IP when phone & ip are absent", async () => {
    const { sendContactNotificationEmail } = await freshEmail();
    await sendContactNotificationEmail({
      to: "admissions@school.test",
      firstName: "Bola",
      lastName: "Ade",
      email: "bola@parent.test",
      subject: "Enquiry",
      message: "Hello",
    });
    const mail = lastMail();
    expect(mail.html).toContain("—"); // phone fallback dash
    expect(mail.html).not.toContain("IP "); // no IP line in html
    expect(mail.text).toContain("(not provided)"); // phone fallback in text
    expect(mail.text).not.toContain("\nIP:"); // no IP line in text
  });

  it("returns skipped:no-smtp when nodemailer cannot be imported", async () => {
    vi.resetModules();
    vi.doMock("nodemailer", () => {
      throw new Error("module not installed");
    });
    const { sendMail } = await import("@/lib/email");
    const res = await sendMail({ to: "a@b.com", subject: "s", html: "<p>h</p>", text: "h" });
    expect(res).toEqual({ sent: false, skipped: "no-smtp" });
    vi.doUnmock("nodemailer");
  });
});

afterEach(() => {
  for (const k of Object.keys(FULL_SMTP)) delete process.env[k];
});
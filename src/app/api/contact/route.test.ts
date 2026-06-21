import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  settingsFindUnique: vi.fn(),
  verifyBotDefense: vi.fn(),
  isBotUserAgent: vi.fn(() => false),
  sendContactNotificationEmail: vi.fn(async () => ({ sent: true })),
  sendContactAutoReplyEmail: vi.fn(async () => ({ sent: true })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({
  db: { siteSettings: { findUnique: h.settingsFindUnique } },
}));
vi.mock("@/lib/bot-defense", () => ({
  verifyBotDefense: h.verifyBotDefense,
  isBotUserAgent: h.isBotUserAgent,
}));
vi.mock("@/lib/email", () => ({
  sendContactNotificationEmail: h.sendContactNotificationEmail,
  sendContactAutoReplyEmail: h.sendContactAutoReplyEmail,
}));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/contact",
  body,
  headers = { "user-agent": "Mozilla/5.0 (human)" },
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  return {
    method,
    url,
    headers: new Headers(headers),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
    json: async () => body,
  } as any;
}

const VALID_BODY = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "08012345678",
  subject: "Admissions enquiry",
  message: "I would like to enquire about admissions for my child.",
  mathToken: "math-token-xyz",
  mathAnswer: "10",
  timeToken: "time-token-xyz",
};

const OK_DEFENSE = {
  ok: true,
  checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.isBotUserAgent.mockReturnValue(false);
  h.verifyBotDefense.mockResolvedValue(OK_DEFENSE);
  h.settingsFindUnique.mockResolvedValue({ admissionsEmail: "admissions@school.ng" });
  h.sendContactNotificationEmail.mockResolvedValue({ sent: true });
  h.sendContactAutoReplyEmail.mockResolvedValue({ sent: true });
});

describe("POST /api/contact", () => {
  it("happy path: sends notification + auto-reply and returns success", async () => {
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("sent");
    expect(h.sendContactNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admissions@school.ng", firstName: "Jane" })
    );
    expect(h.sendContactAutoReplyEmail).toHaveBeenCalled();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contact.submission" })
    );
  });

  it("falls back through settings email then default when admissionsEmail missing", async () => {
    h.settingsFindUnique.mockResolvedValue({ email: "info@settings.ng" });
    await POST(makeReq({ body: VALID_BODY }));
    expect(h.sendContactNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "info@settings.ng" })
    );
  });

  it("uses hard-coded default email when no settings exist", async () => {
    h.settingsFindUnique.mockResolvedValue(null);
    await POST(makeReq({ body: VALID_BODY }));
    expect(h.sendContactNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "info@trailgliders.edu.ng" })
    );
  });

  it("returns 403 for a bot user-agent", async () => {
    h.isBotUserAgent.mockReturnValue(true);
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Access denied.");
    expect(h.rateLimitByIp).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 99 });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("99");
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ body: { ...VALID_BODY, email: "not-an-email" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Validation failed");
    expect(h.verifyBotDefense).not.toHaveBeenCalled();
  });

  it("returns 400 with fallback detail when json() throws", async () => {
    const req = makeReq({ body: VALID_BODY });
    req.json = async () => {
      throw {}; // no issues prop
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBe("Invalid request");
  });

  it("silently returns success when a non-honeypot layer fails (honeypot passed, math failed)", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      reason: "bad math",
      checks: { honeypot: false, math: false, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe("Message received.");
    expect(h.sendContactNotificationEmail).not.toHaveBeenCalled();
  });

  it("returns 400 with reason on honeypot failure", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      reason: "validation",
      checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: { ...VALID_BODY, company: "ACME" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("validation");
  });

  it("returns 400 with default message when honeypot fails without a reason", async () => {
    h.verifyBotDefense.mockResolvedValue({
      ok: false,
      checks: { honeypot: true, math: true, timeTrap: true, turnstile: true, turnstileSkipped: false },
    });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Security check failed");
  });

  it("returns 'received' message when notification email is not sent", async () => {
    h.sendContactNotificationEmail.mockResolvedValue({ sent: false });
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect((await res.json()).message).toContain("received");
    expect(h.sendContactAutoReplyEmail).not.toHaveBeenCalled();
  });

  it("still returns success when the notification email throws (fail soft)", async () => {
    h.sendContactNotificationEmail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toContain("received");
  });

  it("still returns success when the auto-reply email throws (fail soft)", async () => {
    h.sendContactAutoReplyEmail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toContain("sent");
  });

  it("handles a body with no phone (optional empty) and missing user-agent header", async () => {
    const { phone, ...noPhone } = VALID_BODY;
    const res = await POST(makeReq({ body: { ...noPhone, phone: "" }, headers: {} }));
    expect(res.status).toBe(200);
  });

  it("passes ip as undefined to the email when getClientIp returns empty", async () => {
    h.getClientIp.mockReturnValueOnce("");
    const res = await POST(makeReq({ body: VALID_BODY }));
    expect(res.status).toBe(200);
    expect(h.sendContactNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ip: undefined })
    );
  });
});

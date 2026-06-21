import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  invalidateCache: vi.fn(),
  getSiteSettings: vi.fn(),
  siteSettings: { update: vi.fn() },
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/content", () => ({
  invalidateCache: h.invalidateCache,
  getSiteSettings: h.getSiteSettings,
}));
vi.mock("@/lib/db", () => ({ db: { siteSettings: h.siteSettings } }));

import { GET, PUT } from "./route";

function makeReq({
  method = "GET",
  url = "http://localhost/api/admin/settings",
  body,
  headers = {},
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
  } as any;
}

const ADMIN_TOKEN = { sub: "u1", email: "a@b.com", name: "Admin", role: "ADMIN" };
const EDITOR_TOKEN = { sub: "u2", email: "e@b.com", name: "Editor", role: "EDITOR" };

const VALID_SETTINGS = {
  schoolName: "Test Academy",
  shortName: "TA",
  tagline: "Learn",
  motto: "Excellence",
  founded: 1990,
  location: "Lagos",
  address: "1 Main St",
  phone: "0800000000",
  phoneAlt: "0800000001",
  email: "info@test.com",
  admissionsEmail: "adm@test.com",
  hours: "8-4",
  crestUrl: "/images/crest.png",
  heroBadge: "Welcome",
  heroTitle1: "Hello",
  heroTitle2: "World",
  heroDescription: "A long description of the hero section here.",
  aboutHeading: "About",
  aboutParagraph: "About paragraph text here.",
  missionText: "Mission text here.",
  visionText: "Vision text here.",
  admissionsHeading: "Admissions",
  admissionsParagraph: "Admissions paragraph.",
  admissionsDeadline: "June",
  admissionsOpenDay: "May",
  applyButtonLabel: "Apply Now",
  applyButtonUrl: "/apply",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
});

describe("GET /api/admin/settings", () => {
  it("returns settings (EDITOR allowed)", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    h.getSiteSettings.mockResolvedValue({ schoolName: "Test Academy" });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(200);
    expect((await res.json()).settings.schoolName).toBe("Test Academy");
  });

  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 12 });
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(429);
  });

  it("returns 401 when no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await GET(makeReq(), {});
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/admin/settings", () => {
  it("updates and strips DB-only fields, invalidates cache", async () => {
    h.siteSettings.update.mockResolvedValue({ id: "singleton", ...VALID_SETTINGS });
    const body = { ...VALID_SETTINGS, id: "x", createdAt: "c", updatedAt: "u" };
    const res = await PUT(makeReq({ method: "PUT", body }), {});
    expect(res.status).toBe(200);
    const arg = h.siteSettings.update.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "singleton" });
    expect(arg.data).not.toHaveProperty("id");
    expect(arg.data).not.toHaveProperty("createdAt");
    expect(h.invalidateCache).toHaveBeenCalledWith("settings");
  });

  it("returns 403 for EDITOR", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await PUT(makeReq({ method: "PUT", body: VALID_SETTINGS }), {});
    expect(res.status).toBe(403);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("auth.denied") })
    );
  });

  it("returns 400 on validation failure", async () => {
    const res = await PUT(makeReq({ method: "PUT", body: { schoolName: "" } }), {});
    expect(res.status).toBe(400);
    expect(h.siteSettings.update).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = makeReq({ method: "PUT" });
    req.text = async () => "{not json";
    const res = await PUT(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 500 when DB throws", async () => {
    h.siteSettings.update.mockRejectedValue(new Error("db down"));
    const res = await PUT(makeReq({ method: "PUT", body: VALID_SETTINGS }), {});
    expect(res.status).toBe(500);
  });
});

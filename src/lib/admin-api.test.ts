import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the PURE helpers in admin-api.ts that the faculty route test
 * does NOT cover: parseJsonBody (413/400/content-length), isValidId,
 * sanitizeString, and the CUID_REGEX export. The adminHandler wrapper is
 * exercised by faculty/route.test.ts.
 *
 * We still mock the module's boundaries so importing it is side-effect free.
 */
const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  parseJsonBody,
  isValidId,
  sanitizeString,
  CUID_REGEX,
  adminHandler,
} from "./admin-api";
import { NextResponse } from "next/server";

function makeReq({
  body,
  headers = {},
}: {
  body?: string;
  headers?: Record<string, string>;
} = {}) {
  return {
    headers: new Headers(headers),
    text: async () => body ?? "",
  } as any;
}

describe("parseJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const req = makeReq({ body: JSON.stringify({ a: 1 }) });
    await expect(parseJsonBody(req)).resolves.toEqual({ a: 1 });
  });

  it("throws 413 when content-length header exceeds maxBytes", async () => {
    const req = makeReq({
      body: "{}",
      headers: { "content-length": "2000000" },
    });
    await expect(parseJsonBody(req, 1_000_000)).rejects.toMatchObject({
      statusCode: 413,
      message: "Request body too large",
    });
  });

  it("ignores content-length when within limit", async () => {
    const req = makeReq({
      body: JSON.stringify({ ok: true }),
      headers: { "content-length": "20" },
    });
    await expect(parseJsonBody(req)).resolves.toEqual({ ok: true });
  });

  it("throws 413 when the actual text exceeds maxBytes (no content-length)", async () => {
    const big = JSON.stringify({ s: "x".repeat(50) });
    const req = makeReq({ body: big });
    await expect(parseJsonBody(req, 10)).rejects.toMatchObject({
      statusCode: 413,
    });
  });

  it("throws 400 on invalid JSON", async () => {
    const req = makeReq({ body: "{not json" });
    await expect(parseJsonBody(req)).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid JSON body",
    });
  });
});

describe("isValidId / CUID_REGEX", () => {
  it("accepts a cuid-shaped 24-char id", () => {
    expect(isValidId("abcdefghij0123456789klmn")).toBe(true);
    expect(CUID_REGEX.test("abcdefghij0123456789klmn")).toBe(true);
  });

  it("accepts a 20-char id (lower boundary)", () => {
    expect(isValidId("a".repeat(20))).toBe(true);
  });

  it("rejects an id shorter than 20 chars", () => {
    expect(isValidId("tooshort")).toBe(false);
    expect(CUID_REGEX.test("a".repeat(19))).toBe(false);
  });

  it("rejects an id longer than 30 chars", () => {
    expect(isValidId("a".repeat(31))).toBe(false);
  });

  it("rejects ids with disallowed characters", () => {
    expect(isValidId("abcdefghij0123456789-!@#")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidId(123)).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(undefined)).toBe(false);
  });
});

describe("sanitizeString", () => {
  it("returns '' for non-string input", () => {
    expect(sanitizeString(123)).toBe("");
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
  });

  it("removes null bytes", () => {
    expect(sanitizeString("a\0b\0c")).toBe("abc");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("limits length to maxLength (slice before trim)", () => {
    expect(sanitizeString("abcdefghij", 5)).toBe("abcde");
  });

  it("uses the default maxLength of 5000", () => {
    const long = "x".repeat(6000);
    expect(sanitizeString(long).length).toBe(5000);
  });
});

/**
 * A handful of adminHandler tests targeting branches the faculty route test
 * does NOT exercise: default opts (no method → uses req.method, no audit on
 * GET), token fields missing (role/sub/email/name fallbacks), Promise params
 * resolution, and a thrown statusCode error being preserved.
 */
function handlerReq({
  method = "GET",
  url = "http://localhost/api/admin/thing",
  token,
  headers = {},
}: {
  method?: string;
  url?: string;
  token?: any;
  headers?: Record<string, string>;
} = {}) {
  h.getToken.mockResolvedValue(token);
  return {
    method,
    url,
    headers: new Headers(headers),
    text: async () => "",
  } as any;
}

describe("adminHandler — uncovered branches", () => {
  beforeEachReset();

  it("uses default opts (no method): runs handler, no audit on GET, default role/limit", async () => {
    const fn = vi.fn(async () => NextResponse.json({ ok: true }));
    // Default requiredRole is ADMIN; provide an ADMIN token.
    const handler = adminHandler(fn, {});
    // No opts.method -> falls back to req.method in the rate-limit key.
    const res = await handler(
      handlerReq({ method: "GET", token: { sub: "u1", role: "ADMIN" } }),
      {}
    );
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalled();
    // GET (and no opts.method) => no mutation audit
    expect(h.writeAuditLog).not.toHaveBeenCalled();
  });

  it("works with no opts argument at all (uses default {})", async () => {
    const fn = vi.fn(async () => NextResponse.json({ ok: true }));
    const handler = adminHandler(fn); // no second arg -> opts default {}
    const res = await handler(
      handlerReq({ method: "GET", token: { sub: "u1", role: "ADMIN" } }),
      {}
    );
    expect(res.status).toBe(200);
  });

  it("defaults an unknown requiredRole level to 2 and unknown userRole level to 1", async () => {
    // requiredRole not in ROLE_LEVELS -> requiredLevel ?? 2 ; userRole unknown -> ?? 1
    const handler = adminHandler(async () => NextResponse.json({}), {
      method: "POST",
      requiredRole: "SUPERUSER" as any,
    });
    const res = await handler(
      handlerReq({ method: "POST", token: { role: "GHOST" } }), // no sub -> "" on deny
      {}
    );
    expect(res.status).toBe(403);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "" })
    );
  });

  it("defaults role to EDITOR when token.role is absent (403 on ADMIN route)", async () => {
    const handler = adminHandler(async () => NextResponse.json({}), {
      method: "POST",
    });
    const res = await handler(
      handlerReq({ method: "POST", token: { sub: "u1" } }), // no role -> EDITOR
      {}
    );
    expect(res.status).toBe(403);
  });

  it("fills user with empty-string fallbacks when token has no sub/email/name", async () => {
    let captured: any;
    const handler = adminHandler(
      async (_req, user) => {
        captured = user;
        return NextResponse.json({});
      },
      { method: "GET", requiredRole: "EDITOR" }
    );
    const res = await handler(handlerReq({ token: { role: "EDITOR" } }), {});
    expect(res.status).toBe(200);
    expect(captured).toEqual({ id: "", email: "", name: undefined, role: "EDITOR" });
  });

  it("resolves Promise params and audits a successful mutation", async () => {
    const handler = adminHandler(
      async (_req, _user, ctx) => NextResponse.json({ id: ctx.params.id }),
      { method: "DELETE" }
    );
    const res = await handler(
      { ...handlerReq({ method: "DELETE", token: { sub: "u1", role: "ADMIN" } }) },
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(res.status).toBe(200);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("api.delete") })
    );
  });

  it("preserves an explicitly-thrown statusCode error", async () => {
    const handler = adminHandler(
      async () => {
        throw Object.assign(new Error("nope"), { statusCode: 422 });
      },
      { method: "POST" }
    );
    const res = await handler(
      handlerReq({ method: "POST", token: { sub: "u1", role: "ADMIN" } }),
      {}
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("nope");
  });

  it("falls back to 'Request failed' when a statusCode error has no message", async () => {
    const handler = adminHandler(
      async () => {
        throw { statusCode: 409 };
      },
      { method: "POST" }
    );
    const res = await handler(
      handlerReq({ method: "POST", token: { sub: "u1", role: "ADMIN" } }),
      {}
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Request failed");
  });
});

function beforeEachReset() {
  beforeEach(() => {
    vi.clearAllMocks();
    h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
    h.getClientIp.mockReturnValue("1.2.3.4");
  });
}

import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getToken: vi.fn(),
  rateLimitByIp: vi.fn(() => ({ ok: true, retryAfter: 0 })),
  getClientIp: vi.fn(() => "1.2.3.4"),
  writeAuditLog: vi.fn(),
  invalidateCache: vi.fn(),
  slideUpdate: vi.fn((args: any) => ({ __update: args })),
  transaction: vi.fn(async (ops: any[]) => ops),
}));

vi.mock("next-auth/jwt", () => ({ getToken: h.getToken }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: h.rateLimitByIp,
  getClientIp: h.getClientIp,
}));
vi.mock("@/lib/auth-utils", () => ({ writeAuditLog: h.writeAuditLog }));
vi.mock("@/lib/content", () => ({ invalidateCache: h.invalidateCache }));
vi.mock("@/lib/db", () => ({
  db: {
    slide: { update: h.slideUpdate },
    $transaction: h.transaction,
  },
}));

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/admin/slides/reorder",
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

const IDS = ["abcdefghij0123456789klmn", "zyxwvutsrq9876543210mnop"];

beforeEach(() => {
  vi.clearAllMocks();
  h.rateLimitByIp.mockReturnValue({ ok: true, retryAfter: 0 });
  h.getToken.mockResolvedValue(ADMIN_TOKEN);
  h.slideUpdate.mockImplementation((args: any) => ({ __update: args }));
  h.transaction.mockImplementation(async (ops: any[]) => ops);
});

describe("rate limiting", () => {
  it("returns 429 when rate limited", async () => {
    h.rateLimitByIp.mockReturnValue({ ok: false, retryAfter: 30 });
    const res = await POST(makeReq({ body: { ids: IDS } }), {});
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});

describe("auth & authz", () => {
  it("returns 401 when there is no token", async () => {
    h.getToken.mockResolvedValue(null);
    const res = await POST(makeReq({ body: { ids: IDS } }), {});
    expect(res.status).toBe(401);
  });

  it("returns 403 + audit log when an EDITOR posts (ADMIN required)", async () => {
    h.getToken.mockResolvedValue(EDITOR_TOKEN);
    const res = await POST(makeReq({ body: { ids: IDS } }), {});
    expect(res.status).toBe(403);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("auth.denied") })
    );
    expect(h.transaction).not.toHaveBeenCalled();
  });
});

describe("POST reorder", () => {
  it("updates each slide order by index, transacts, invalidates, audits", async () => {
    const res = await POST(makeReq({ body: { ids: IDS } }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // One update call per id with order = index
    expect(h.slideUpdate).toHaveBeenCalledTimes(2);
    expect(h.slideUpdate).toHaveBeenNthCalledWith(1, { where: { id: IDS[0] }, data: { order: 0 } });
    expect(h.slideUpdate).toHaveBeenNthCalledWith(2, { where: { id: IDS[1] }, data: { order: 1 } });

    // The update results are passed to $transaction as an array
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.transaction.mock.calls[0][0]).toHaveLength(2);

    expect(h.invalidateCache).toHaveBeenCalledWith("slides");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.stringContaining("api.post") })
    );
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = makeReq();
    req.text = async () => "{not json";
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids is missing", async () => {
    const res = await POST(makeReq({ body: {} }), {});
    expect(res.status).toBe(400);
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when ids is empty", async () => {
    const res = await POST(makeReq({ body: { ids: [] } }), {});
    expect(res.status).toBe(400);
  });

  it("returns 400 on unknown extra keys (strictObject)", async () => {
    const res = await POST(makeReq({ body: { ids: IDS, extra: true } }), {});
    expect(res.status).toBe(400);
  });

  it("returns 400 when an id is too long", async () => {
    const res = await POST(makeReq({ body: { ids: ["x".repeat(51)] } }), {});
    expect(res.status).toBe(400);
  });

  it("returns 500 when the transaction throws", async () => {
    h.transaction.mockRejectedValue(new Error("db down"));
    const res = await POST(makeReq({ body: { ids: IDS } }), {});
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error");
  });
});

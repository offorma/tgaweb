import { describe, it, expect } from "vitest";

import { POST } from "./route";

function makeReq({
  method = "POST",
  url = "http://localhost/api/set-locale",
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
    json: async () => body,
  } as any;
}

describe("POST /api/set-locale", () => {
  it("sets the locale cookie and returns ok for a valid locale", async () => {
    const res = await POST(makeReq({ body: { locale: "fr" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const setCookie = res.cookies.get("locale");
    expect(setCookie?.value).toBe("fr");
    expect(setCookie?.path).toBe("/");
    expect(setCookie?.sameSite).toBe("lax");
  });

  it("returns 400 for an invalid locale", async () => {
    const res = await POST(makeReq({ body: { locale: "xx" } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid locale" });
  });

  it("returns 400 when the body cannot be parsed", async () => {
    const req = makeReq();
    req.json = async () => {
      throw new Error("bad json");
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid locale" });
  });
});

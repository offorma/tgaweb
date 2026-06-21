import { describe, it, expect, vi } from "vitest";

const h = vi.hoisted(() => ({
  handler: vi.fn(),
  NextAuth: vi.fn(),
}));

// NextAuth(authOptions) returns the single handler used for both GET and POST.
vi.mock("next-auth", () => ({
  default: (...args: unknown[]) => {
    h.NextAuth(...args);
    return h.handler;
  },
}));
// authOptions pulls in a large dependency graph; stub it to an opaque object.
vi.mock("@/lib/auth", () => ({ authOptions: { providers: [] } }));

import { GET, POST } from "./route";

describe("/api/auth/[...nextauth] route", () => {
  it("exports the NextAuth handler as both GET and POST", () => {
    expect(GET).toBe(h.handler);
    expect(POST).toBe(h.handler);
    expect(GET).toBe(POST);
  });

  it("constructed the handler with authOptions", () => {
    expect(h.NextAuth).toHaveBeenCalledWith({ providers: [] });
  });
});

import { describe, it, expect } from "vitest";

import { GET } from "./route";

describe("GET /api", () => {
  it("returns the hello world message with 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Hello, world!" });
  });
});

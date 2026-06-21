import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("joins simple class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional/falsey values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("handles array and object inputs", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("returns empty string with no args", () => {
    expect(cn()).toBe("");
  });
});

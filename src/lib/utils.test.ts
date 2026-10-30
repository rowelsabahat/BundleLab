import { describe, expect, it } from "vitest";
import { cn } from "./utils";
describe("cn", () => {
  it("resolves conflicting Tailwind classes so component overrides work", () => {
    expect(cn("px-2 text-sm", false && "hidden", "px-6")).toBe("text-sm px-6");
  });
});

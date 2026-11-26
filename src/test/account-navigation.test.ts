import { describe, expect, it } from "vitest";
import { signedInDestination } from "@/lib/account-navigation";

describe("Sign-in destinations", () => {
  it("opens the professional dashboard for professional roles", () => {
    expect(signedInDestination(["medical_professional"])).toBe("/professional");
  });
  it("preserves patient dashboard navigation", () => {
    expect(signedInDestination(["patient"])).toBe("/dashboard");
  });
  it("does not confer professional access from an absent role", () => {
    expect(signedInDestination([])).toBe("/dashboard");
  });
});
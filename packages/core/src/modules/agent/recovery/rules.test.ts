import { describe, expect, it } from "vitest";
import { CONCERN_CATEGORIES, isDegradable, NEVER_DEGRADABLE } from "./rules";

describe("rules (AI-7) — the degradable / never-degradable policy", () => {
  it("authorization, tenant isolation, and money handling never degrade", () => {
    expect(isDegradable("authorization")).toBe(false);
    expect(isDegradable("tenant-isolation")).toBe(false);
    expect(isDegradable("money-handling")).toBe(false);
  });

  it("data invariants and audit trails never degrade", () => {
    expect(isDegradable("data-invariants")).toBe(false);
    expect(isDegradable("audit-trail")).toBe(false);
  });

  it("a layout failure degrades", () => {
    expect(isDegradable("layout")).toBe(true);
  });

  it("styling and copy degrade", () => {
    expect(isDegradable("styling")).toBe(true);
    expect(isDegradable("copy")).toBe(true);
  });

  it("every concern category is classified one way or the other", () => {
    for (const concern of CONCERN_CATEGORIES) {
      expect(typeof isDegradable(concern)).toBe("boolean");
    }
  });

  it("NEVER_DEGRADABLE holds exactly the five documented categories", () => {
    expect([...NEVER_DEGRADABLE].sort()).toEqual(
      [
        "audit-trail",
        "authorization",
        "data-invariants",
        "money-handling",
        "tenant-isolation",
      ].sort(),
    );
  });
});

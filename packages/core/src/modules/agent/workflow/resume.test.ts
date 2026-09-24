import { describe, expect, it } from "vitest";
import { isReusableFile, runWithReusableFiles } from "./resume";

describe("reusable files", () => {
  it("is empty outside a resume and scoped inside one", async () => {
    expect(isReusableFile("a.ts")).toBe(false);
    await runWithReusableFiles(new Set(["a.ts"]), async () => {
      await Promise.resolve();
      expect(isReusableFile("a.ts")).toBe(true);
      expect(isReusableFile("b.ts")).toBe(false);
    });
    expect(isReusableFile("a.ts")).toBe(false);
  });
});

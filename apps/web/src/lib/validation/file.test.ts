import { describe, expect, it } from "vitest";
import { validateFile } from "./file";

describe("validateFile (FE-5 client-side validation rules)", () => {
  it.each([
    ["spec.pdf", "application/pdf"],
    [
      "document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["notes.txt", "text/plain"],
    ["readme.md", "text/markdown"],
    ["diagram.png", "image/png"],
    ["photo.jpg", "image/jpeg"],
    ["vector.svg", "image/svg+xml"],
  ])("accepts allowlisted file: %s", (name, type) => {
    const file = new File(["dummy content"], name, { type });
    const result = validateFile(file, 0);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it.each([
    ["malware.exe", "application/x-msdownload"],
    ["archive.zip", "application/zip"],
    ["animation.gif", "image/gif"],
    ["video.mp4", "video/mp4"],
  ])("rejects disallowed file: %s", (name, type) => {
    const file = new File(["dummy content"], name, { type });
    const result = validateFile(file, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported file type");
  });

  it("rejects file exceeding 10MB", () => {
    const oversize = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([oversize], "large.pdf", { type: "application/pdf" });
    const result = validateFile(file, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Files must be 10MB or smaller");
  });

  it("rejects when project already has 5 files (overflow)", () => {
    const file = new File(["ok"], "spec.pdf", { type: "application/pdf" });
    const result = validateFile(file, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most 5 files");
  });
});

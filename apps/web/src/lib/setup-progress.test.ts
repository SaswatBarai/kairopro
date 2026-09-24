// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { rememberSetupStep, resumeSetupHref } from "./setup-progress";

beforeEach(() => localStorage.clear());

describe("setup progress", () => {
  it("resumes at the first step when nothing was recorded", () => {
    expect(resumeSetupHref("p1")).toBe("/projects/new?projectId=p1");
  });

  it("resumes at the last recorded step for that project only", () => {
    rememberSetupStep("p1", "/projects/new/data-model");
    expect(resumeSetupHref("p1")).toBe("/projects/new/data-model?projectId=p1");
    expect(resumeSetupHref("p2")).toBe("/projects/new?projectId=p2");
  });

  it("never navigates outside the wizard, whatever storage holds", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/dashboard"]) {
      rememberSetupStep("p1", bad);
      expect(resumeSetupHref("p1")).toBe("/projects/new?projectId=p1");
    }
  });

  it("sends a browser that last saw the old build step to the project's build page", () => {
    for (const legacy of [
      "/projects/new/build",
      "/projects/new/build/complete",
    ]) {
      rememberSetupStep("p1", legacy);
      expect(resumeSetupHref("p1")).toBe("/projects/p1/build");
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  exportDesignDocument,
  lintDesignDocument,
  parseDesignDocument,
  serializeDesignDocument,
} from "./design.service";

const VALID_DOC = `---
name: Test System
colors:
  primary: "#4f46e5"
  primary-foreground: "#ffffff"
  background: "#0a0a0a"
  foreground: "#fafafa"
typography:
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
---

## Overview

A test design system.

## Colors

- **Primary (#4f46e5):** brand color
`;

describe("design.service parse/serialize (BE-6)", () => {
  it("parse extracts tokens and sections", () => {
    const doc = parseDesignDocument(VALID_DOC);
    expect(doc.tokens.name).toBe("Test System");
    expect((doc.tokens.colors as Record<string, string>).primary).toBe(
      "#4f46e5",
    );
    expect(doc.sections.map((s) => s.heading)).toEqual(["Overview", "Colors"]);
  });

  it("parse → serialize is stable (idempotent on a second round-trip)", () => {
    const once = serializeDesignDocument(parseDesignDocument(VALID_DOC));
    const twice = serializeDesignDocument(parseDesignDocument(once));
    expect(twice).toBe(once);
  });

  it("produces tokens with a completely empty input", () => {
    const doc = parseDesignDocument("");
    expect(doc.tokens).toEqual({});
    expect(doc.sections).toEqual([]);
  });
});

describe("design.service lint (BE-6)", () => {
  it("surfaces a broken token reference", async () => {
    const broken = `---
colors:
  primary: "#4f46e5"
  primary-foreground: "{colors.nonexistent}"
---

## Colors

test
`;
    const result = await lintDesignDocument(broken);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.rule === "broken-reference")).toBe(
      true,
    );
  }, 30_000);

  it("does not flag a resolvable reference", async () => {
    const resolvable = `---
colors:
  primary: "#4f46e5"
  primary-foreground: "{colors.primary}"
---

## Colors

test
`;
    const result = await lintDesignDocument(resolvable);
    expect(result.findings.some((f) => f.rule === "broken-reference")).toBe(
      false,
    );
  }, 30_000);
});

describe("design.service export (BE-6)", () => {
  it("css-tailwind export produces a non-empty @theme block", async () => {
    const css = await exportDesignDocument(VALID_DOC, "css-tailwind");
    expect(css).toContain("@theme");
    expect(css).toContain("--color-primary: #4f46e5");
  }, 30_000);

  it("json-tailwind export produces resolvable theme JSON", async () => {
    const json = await exportDesignDocument(VALID_DOC, "json-tailwind");
    const parsed = JSON.parse(json);
    expect(parsed.theme.extend.colors.primary).toBe("#4f46e5");
  }, 30_000);

  it("a tokenless document still exports a structurally valid (empty) theme block", async () => {
    const css = await exportDesignDocument(
      "## Overview\n\nNo tokens here.",
      "css-tailwind",
    );
    expect(css).toContain("@theme");
  }, 30_000);
});

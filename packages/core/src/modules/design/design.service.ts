import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ProviderError, ValidationError } from "../../lib/errors";

/**
 * DESIGN.md parse/serialize/lint/export.
 *
 * Parse/serialize (round-trip) are pure, local, and dependency-free beyond
 * `yaml` — no network, no subprocess. Lint and export shell out to the
 * `@google/design.md` CLI (`designmd`), which is the format's reference
 * implementation; a CLI failure is wrapped as a typed ProviderError rather
 * than allowed to crash the request.
 */

export interface DesignDocument {
  /** Token frontmatter — colors, typography, rounded, spacing, components. */
  tokens: Record<string, unknown>;
  /** Markdown body sections in document order, e.g. "## Colors" → prose. */
  sections: { heading: string; body: string }[];
}

export type ExportFormat =
  "css-tailwind" | "json-tailwind" | "tailwind" | "dtcg" | "css-vars";

export interface LintFinding {
  severity: "error" | "warning" | "info";
  path?: string;
  message: string;
  rule?: string;
}

export interface LintResult {
  findings: LintFinding[];
  errorCount: number;
  warningCount: number;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseDesignDocument(markdown: string): DesignDocument {
  const match = FRONTMATTER_RE.exec(markdown);
  const tokens = match ? (parseYaml(match[1] ?? "") ?? {}) : {};
  const body = match ? (match[2] ?? "") : markdown;

  const sections: { heading: string; body: string }[] = [];
  const lines = body.split(/\r?\n/);
  let current: { heading: string; body: string[] } | null = null;
  for (const line of lines) {
    const headingMatch = /^##\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (current) {
        sections.push({
          heading: current.heading,
          body: current.body.join("\n").trim(),
        });
      }
      current = { heading: (headingMatch[1] ?? "").trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) {
    sections.push({
      heading: current.heading,
      body: current.body.join("\n").trim(),
    });
  }

  return { tokens: tokens as Record<string, unknown>, sections };
}

export function serializeDesignDocument(doc: DesignDocument): string {
  const frontmatter = stringifyYaml(doc.tokens).trimEnd();
  const body = doc.sections
    .map((s) => `## ${s.heading}\n\n${s.body}`.trimEnd())
    .join("\n\n");
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

/** Resolves a `{path.to.token}` reference against the token tree. */
function resolveTokenPath(
  tokens: Record<string, unknown>,
  path: string,
): unknown {
  const segments = path.split(".");
  let cursor: unknown = tokens;
  for (const segment of segments) {
    if (
      typeof cursor !== "object" ||
      cursor === null ||
      !(segment in (cursor as Record<string, unknown>))
    ) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

const TOKEN_REF_RE = /^\{([a-zA-Z0-9_.-]+)\}$/;

/** Finds `{a.b.c}` references that don't resolve to a value in the tree. */
function findBrokenReferences(tokens: Record<string, unknown>): LintFinding[] {
  const findings: LintFinding[] = [];

  function walk(node: unknown, path: string) {
    if (typeof node === "string") {
      const match = TOKEN_REF_RE.exec(node);
      const refPath = match?.[1];
      if (refPath && resolveTokenPath(tokens, refPath) === undefined) {
        findings.push({
          severity: "error",
          path,
          message: `Unresolved token reference "{${refPath}}"`,
          rule: "broken-reference",
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  }

  walk(tokens, "");
  return findings;
}

async function withTempFile<T>(
  markdown: string,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "designmd-"));
  const path = join(dir, "DESIGN.md");
  try {
    await writeFile(path, markdown, "utf8");
    return await fn(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runDesignmd(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "npx",
      ["-p", "@google/design.md", "designmd", ...args],
      { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new ProviderError({
              message: "design.md CLI failed",
              details: { args, stderr, stdout },
              cause: err,
            }),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export async function lintDesignDocument(
  markdown: string,
): Promise<LintResult> {
  const { tokens } = parseDesignDocument(markdown);
  const referenceFindings = findBrokenReferences(tokens);

  const raw = await withTempFile(markdown, (path) =>
    runDesignmd(["lint", path]),
  );

  let cliFindings: LintFinding[] = [];
  try {
    const parsed = JSON.parse(raw) as { findings?: LintFinding[] };
    cliFindings = parsed.findings ?? [];
  } catch (cause) {
    throw new ProviderError({
      message: "design.md CLI returned unparseable lint output",
      cause,
    });
  }

  const findings = [...referenceFindings, ...cliFindings];
  return {
    findings,
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
  };
}

export async function exportDesignDocument(
  markdown: string,
  format: ExportFormat,
): Promise<string> {
  const output = await withTempFile(markdown, (path) =>
    runDesignmd(["export", "--format", format, path]),
  );
  if (!output.trim()) {
    throw new ValidationError({
      message: "Design export produced empty output",
    });
  }
  return output;
}

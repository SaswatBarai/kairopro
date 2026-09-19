import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalWorkspaceStore } from "../../../platform/workspace/store";
import { retrieve } from "./retrieve";

const projectId = "prj-1";
let root: string;
let store: LocalWorkspaceStore;

beforeEach(async () => {
  root = mkdtempSync(path.join(tmpdir(), "kairopro-retrieve-"));
  store = new LocalWorkspaceStore(root);
  await store.allocate(projectId);

  await store.writeFile(
    projectId,
    "src/models/user.ts",
    "export interface User {\n  id: string;\n  name: string;\n}\n",
  );
  await store.writeFile(
    projectId,
    "src/api/users.ts",
    'import type { User } from "../models/user";\n\nexport async function listUsers(): Promise<User[]> {\n  return [];\n}\n',
  );
  await store.writeFile(
    projectId,
    "src/components/UserForm.tsx",
    'import type { User } from "../models/user";\n\nexport function UserForm(props: { user: User }) {\n  return null;\n}\n',
  );
  await store.writeFile(
    projectId,
    "src/components/Footer.tsx",
    "export function Footer() {\n  return null;\n}\n",
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("retrieve (AI-4)", () => {
  it("a schema-change request returns the schema, its API route, and the form that references it", async () => {
    const result = await retrieve(
      { query: "update the user model to add an email field" },
      { id: projectId, workspace: store },
      "data-model",
    );

    const paths = result.files.map((f) => f.path).sort();
    expect(paths).toEqual([
      "src/api/users.ts",
      "src/components/UserForm.tsx",
      "src/models/user.ts",
    ]);

    const byPath = new Map(result.files.map((f) => [f.path, f.reason]));
    expect(byPath.get("src/models/user.ts")).toBe("match");
    expect(byPath.get("src/api/users.ts")).toBe("dependency");
    expect(byPath.get("src/components/UserForm.tsx")).toBe("dependency");
  });

  it("a purely cosmetic request does not return the schema", async () => {
    const result = await retrieve(
      { query: "change the footer link color to blue" },
      { id: projectId, workspace: store },
      "design",
    );

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/components/Footer.tsx");
    expect(paths).not.toContain("src/models/user.ts");
    expect(paths).not.toContain("src/api/users.ts");
  });

  it("always includes the project summary", async () => {
    const result = await retrieve(
      { query: "anything" },
      { id: projectId, workspace: store },
      "prd",
    );
    expect(result.summary).toContain("indexed file(s)");
  });

  it("always includes explicit seed files, regardless of the query", async () => {
    const result = await retrieve(
      {
        query: "totally unrelated wording",
        seedFiles: ["src/components/Footer.tsx"],
      },
      { id: projectId, workspace: store },
      "fix",
    );
    const byPath = new Map(result.files.map((f) => [f.path, f.reason]));
    expect(byPath.get("src/components/Footer.tsx")).toBe("seed");
  });

  it("is deterministic — the same request twice returns an identical set", async () => {
    const request = { query: "update the user model" };
    const first = await retrieve(
      request,
      { id: projectId, workspace: store },
      "data-model",
    );
    const second = await retrieve(
      request,
      { id: projectId, workspace: store },
      "data-model",
    );

    expect(second.files.map((f) => f.path)).toEqual(
      first.files.map((f) => f.path),
    );
    expect(second.summary).toBe(first.summary);
    expect(second.omitted).toEqual(first.omitted);
  });

  it("logs and prioritizes seeds and matches over dependencies when maxFiles caps the set", async () => {
    const result = await retrieve(
      { query: "update the user model" },
      { id: projectId, workspace: store },
      "data-model",
      { maxFiles: 1 },
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.path).toBe("src/models/user.ts");
    expect(result.partial).toBe(true);
    expect(result.omitted).toContain("src/api/users.ts");
    expect(result.omitted).toContain("src/components/UserForm.tsx");
  });

  it("reports partial and lists omissions when the token budget drops files", async () => {
    const result = await retrieve(
      { query: "update the user model" },
      { id: projectId, workspace: store },
      "data-model",
      { maxTokens: 1 },
    );

    // The summary alone likely consumes the whole budget; at minimum the
    // single most-relevant file is kept and the rest are reported omitted.
    expect(result.partial).toBe(true);
    expect(result.omitted.length).toBeGreaterThan(0);
  });
});

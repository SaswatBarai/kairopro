import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";

vi.mock("../../platform/db/client", () => ({ db: {} }));
vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("./git.service", () => ({
  commitAll: vi.fn(),
  headCommit: vi.fn(),
  diffStat: vi.fn(),
  diffRaw: vi.fn(),
  isWorkingTreeClean: vi.fn(),
  revertToCommit: vi.fn(),
}));
vi.mock("./version.repository", () => ({
  createVersionRow: vi.fn(),
  findVersionWithProject: vi.fn(),
  listVersionsByProject: vi.fn(),
}));

import { ownerOf } from "../org/access";
import {
  commitAll,
  diffRaw,
  diffStat,
  headCommit,
  isWorkingTreeClean,
  revertToCommit,
} from "./git.service";
import {
  createVersionRow,
  findVersionWithProject,
  listVersionsByProject,
  type VersionRow,
  type VersionWithProject,
} from "./version.repository";
import {
  getVersionDiff,
  listVersions,
  recordVersion,
  revertVersion,
} from "./version.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const projectId = "prj-1";
const workspacePath = "/workspaces/prj-1";

function versionRow(overrides: Partial<VersionRow> = {}): VersionRow {
  return {
    id: "ver-1",
    projectId,
    hash: "abc1234",
    message: "Approve PRD v1",
    filesChanged: 2,
    revertible: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as VersionRow;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ownerOf).mockResolvedValue({ id: projectId } as never);
});

describe("recordVersion (BE-8)", () => {
  it("marks the first-ever commit (no parent) non-revertible with 0 files changed", async () => {
    vi.mocked(headCommit).mockResolvedValueOnce(null);
    vi.mocked(commitAll).mockResolvedValueOnce("aaa1111");
    vi.mocked(createVersionRow).mockResolvedValueOnce(
      versionRow({ hash: "aaa1111", filesChanged: 0, revertible: false }),
    );

    const version = await recordVersion(
      projectId,
      workspacePath,
      "Initial project",
      ctx,
    );

    expect(diffStat).not.toHaveBeenCalled();
    expect(createVersionRow).toHaveBeenCalledWith({
      projectId,
      hash: "aaa1111",
      message: "Initial project",
      filesChanged: 0,
      revertible: false,
    });
    expect(version.revertible).toBe(false);
  });

  it("computes filesChanged and marks revertible when there is a parent commit", async () => {
    vi.mocked(headCommit).mockResolvedValueOnce("aaa1111");
    vi.mocked(commitAll).mockResolvedValueOnce("bbb2222");
    vi.mocked(diffStat).mockResolvedValueOnce({
      files: [{ file: "a.ts", insertions: 1, deletions: 0 }],
      insertions: 1,
      deletions: 0,
    });
    vi.mocked(createVersionRow).mockResolvedValueOnce(
      versionRow({ hash: "bbb2222", filesChanged: 1, revertible: true }),
    );

    const version = await recordVersion(
      projectId,
      workspacePath,
      "Approve PRD v1",
      ctx,
    );

    expect(diffStat).toHaveBeenCalledWith(workspacePath, "aaa1111", "bbb2222");
    expect(createVersionRow).toHaveBeenCalledWith({
      projectId,
      hash: "bbb2222",
      message: "Approve PRD v1",
      filesChanged: 1,
      revertible: true,
    });
    expect(version.filesChanged).toBe(1);
  });

  it("returns 404 for a project the caller cannot access", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(
      recordVersion(projectId, workspacePath, "x", ctx),
    ).rejects.toThrow(NotFoundError);
    expect(commitAll).not.toHaveBeenCalled();
  });
});

describe("listVersions (BE-8)", () => {
  it("returns rows newest-first, mapped to the contract shape", async () => {
    vi.mocked(listVersionsByProject).mockResolvedValueOnce([
      versionRow({ id: "ver-2", hash: "bbb2222" }),
      versionRow({ id: "ver-1", hash: "aaa1111" }),
    ]);

    const list = await listVersions(projectId, ctx);
    expect(list.map((v) => v.hash)).toEqual(["bbb2222", "aaa1111"]);
  });
});

describe("getVersionDiff (BE-8)", () => {
  function withProject(row: Partial<VersionRow> = {}): VersionWithProject {
    return {
      ...versionRow(row),
      project: { workspacePath },
    } as VersionWithProject;
  }

  it("returns an empty diff for the non-revertible initial commit", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(
      withProject({ revertible: false }),
    );

    const diff = await getVersionDiff("ver-1", ctx);
    expect(diff).toEqual({
      summary: { filesChanged: 0, insertions: 0, deletions: 0 },
      raw: "",
    });
    expect(diffStat).not.toHaveBeenCalled();
  });

  it("diffs against the commit's parent for a revertible version", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(
      withProject({ hash: "bbb2222", revertible: true }),
    );
    vi.mocked(diffStat).mockResolvedValueOnce({
      files: [{ file: "a.ts", insertions: 1, deletions: 0 }],
      insertions: 1,
      deletions: 0,
    });
    vi.mocked(diffRaw).mockResolvedValueOnce("diff --git a/a.ts b/a.ts\n");

    const diff = await getVersionDiff("ver-1", ctx);

    expect(diffStat).toHaveBeenCalledWith(workspacePath, "bbb2222^", "bbb2222");
    expect(diff.summary.filesChanged).toBe(1);
    expect(diff.raw).toContain("a.ts");
  });

  it("returns 404 for a version that does not exist", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(null);
    await expect(getVersionDiff("ver-1", ctx)).rejects.toThrow(NotFoundError);
  });

  it("returns 404 for a version belonging to a foreign project", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(withProject());
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(getVersionDiff("ver-1", ctx)).rejects.toThrow(NotFoundError);
  });
});

describe("revertVersion (BE-8)", () => {
  function withProject(row: Partial<VersionRow> = {}): VersionWithProject {
    return {
      ...versionRow(row),
      project: { workspacePath },
    } as VersionWithProject;
  }

  it("rejects reverting the initial (non-revertible) commit", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(
      withProject({ revertible: false }),
    );
    await expect(revertVersion("ver-1", ctx)).rejects.toThrow(ValidationError);
    expect(revertToCommit).not.toHaveBeenCalled();
  });

  it("refuses on a dirty workspace rather than discarding uncommitted work", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(withProject());
    vi.mocked(isWorkingTreeClean).mockResolvedValueOnce(false);

    await expect(revertVersion("ver-1", ctx)).rejects.toThrow(ConflictError);
    expect(revertToCommit).not.toHaveBeenCalled();
  });

  it("creates a new forward commit and a new Version row on a clean tree", async () => {
    vi.mocked(findVersionWithProject).mockResolvedValueOnce(
      withProject({ hash: "aaa1111", message: "Approve PRD v1" }),
    );
    vi.mocked(isWorkingTreeClean).mockResolvedValueOnce(true);
    vi.mocked(headCommit).mockResolvedValueOnce("ccc3333");
    vi.mocked(revertToCommit).mockResolvedValueOnce("ddd4444");
    vi.mocked(diffStat).mockResolvedValueOnce({
      files: [{ file: "a.ts", insertions: 0, deletions: 1 }],
      insertions: 0,
      deletions: 1,
    });
    vi.mocked(createVersionRow).mockResolvedValueOnce(
      versionRow({
        hash: "ddd4444",
        message: "Revert: Approve PRD v1",
        revertible: true,
      }),
    );

    const result = await revertVersion("ver-1", ctx);

    expect(revertToCommit).toHaveBeenCalledWith(
      workspacePath,
      "aaa1111",
      "Revert: Approve PRD v1",
    );
    expect(createVersionRow).toHaveBeenCalledWith({
      projectId,
      hash: "ddd4444",
      message: "Revert: Approve PRD v1",
      filesChanged: 1,
      revertible: true,
    });
    expect(result.message).toBe("Revert: Approve PRD v1");
  });
});

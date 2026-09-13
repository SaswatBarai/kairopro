import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project as ProjectRow } from "@kairopro/db";
import type { ProjectStatus } from "@kairopro/contracts";
import type { RequestContext } from "../../lib/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import { LEGAL_TRANSITIONS, transitionStatus } from "./project.service";

vi.mock("../../platform/db/client", () => ({ db: {} }));

vi.mock("./project.repository", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  findProjectById: vi.fn(),
  findProjectWithActivity: vi.fn(),
  listProjectsByOrg: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../org/access", () => ({
  ownerOf: vi.fn(),
}));

vi.mock("./workspace", () => ({
  createWorkspace: vi.fn(),
  destroyWorkspace: vi.fn(),
}));

import {
  createProject as createProjectRepo,
  deleteProject as deleteProjectRepo,
  findProjectWithActivity,
  listProjectsByOrg,
  updateProject as updateProjectRepo,
} from "./project.repository";
import { createWorkspace, destroyWorkspace } from "./workspace";
import { ownerOf } from "../org/access";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "./project.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };

function projectRow(
  overrides: Partial<
    Omit<ProjectRow, "versions" | "builds"> & {
      versions: { hash: string; createdAt: Date }[];
      builds: { createdAt: Date }[];
    }
  > = {},
): ProjectRow & {
  versions: { hash: string; createdAt: Date }[];
  builds: { createdAt: Date }[];
} {
  return {
    id: "prj-1",
    orgId: "org-1",
    userId: "user-1",
    name: "TaskFlow",
    description: null,
    status: "DRAFT",
    templateId: "nextjs-shadcn",
    previewUrl: null,
    deployedUrl: null,
    workspacePath: null,
    versions: [],
    builds: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("project.service create/list/get/update (BE-4)", () => {
  it("create produces a row, a workspace with a git repo, and stores the path", async () => {
    vi.mocked(createProjectRepo).mockResolvedValueOnce(projectRow());
    vi.mocked(createWorkspace).mockResolvedValueOnce("/tmp/ws/prj-1");
    vi.mocked(updateProjectRepo).mockResolvedValueOnce(
      projectRow({ workspacePath: "/tmp/ws/prj-1" }),
    );

    const project = await createProject({ name: "TaskFlow" }, ctx);

    expect(createProjectRepo).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      name: "TaskFlow",
      description: null,
    });
    expect(createWorkspace).toHaveBeenCalledWith("prj-1");
    expect(updateProjectRepo).toHaveBeenCalledWith("prj-1", {
      workspacePath: "/tmp/ws/prj-1",
    });
    expect(project.name).toBe("TaskFlow");
    // The contract shape omits workspacePath; it is stored on the row only.
    expect(updateProjectRepo).toHaveBeenCalledTimes(1);
  });

  it("create rolls back the row when workspace allocation fails", async () => {
    vi.mocked(createProjectRepo).mockResolvedValueOnce(projectRow());
    vi.mocked(createWorkspace).mockRejectedValueOnce(new Error("disk full"));

    await expect(createProject({ name: "TaskFlow" }, ctx)).rejects.toThrow(
      "disk full",
    );
    expect(deleteProjectRepo).toHaveBeenCalledWith("prj-1");
  });

  it("create rejects an invalid payload with a ValidationError", async () => {
    await expect(createProject({ name: "" }, ctx)).rejects.toThrow(
      ValidationError,
    );
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("list returns only projects of the caller's org, mapped to the F2 shape", async () => {
    vi.mocked(listProjectsByOrg).mockResolvedValueOnce([
      projectRow({
        status: "DEPLOYED",
        versions: [{ hash: "7e2f1a3", createdAt: new Date() }],
        builds: [],
      }),
    ]);

    const items = await listProjects(ctx);

    expect(listProjectsByOrg).toHaveBeenCalledWith("org-1");
    expect(items).toHaveLength(1);
    expect(items[0]!.stack).toBe("Next.js + shadcn/ui");
    expect(items[0]!.latestCommitHash).toBe("7e2f1a3");
  });

  it("get maps a foreign-org project to NotFoundError (404, never 403)", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(getProject("prj-foreign", ctx)).rejects.toThrow(NotFoundError);
  });

  it("get returns the F2 list-item shape for an owned project", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(projectRow());
    vi.mocked(findProjectWithActivity).mockResolvedValueOnce(
      projectRow({
        versions: [{ hash: "abc1234", createdAt: new Date() }],
        builds: [],
      }),
    );

    const item = await getProject("prj-1", ctx);
    expect(item.latestCommitHash).toBe("abc1234");
  });

  it("update applies a partial update through ownerOf", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(projectRow());
    vi.mocked(updateProjectRepo).mockResolvedValueOnce(
      projectRow({ name: "TaskFlow v2" }),
    );

    const project = await updateProject("prj-1", { name: "TaskFlow v2" }, ctx);

    expect(updateProjectRepo).toHaveBeenCalledWith("prj-1", {
      name: "TaskFlow v2",
      description: undefined,
    });
    expect(project.name).toBe("TaskFlow v2");
  });

  it("delete removes both the workspace and the row", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(projectRow());

    await deleteProject("prj-1", ctx);

    expect(destroyWorkspace).toHaveBeenCalledWith("prj-1");
    expect(deleteProjectRepo).toHaveBeenCalledWith("prj-1");
  });

  it("delete of a foreign project throws NotFoundError and touches nothing", async () => {
    vi.mocked(ownerOf).mockResolvedValueOnce(null);
    await expect(deleteProject("prj-foreign", ctx)).rejects.toThrow(
      NotFoundError,
    );
    expect(destroyWorkspace).not.toHaveBeenCalled();
  });
});

describe("project.service status transitions (BE-4, table-driven)", () => {
  const allStatuses = Object.keys(LEGAL_TRANSITIONS) as Array<
    keyof typeof LEGAL_TRANSITIONS
  >;

  const table = allStatuses.flatMap((from) =>
    allStatuses.map((to) => ({
      from: from as ProjectStatus,
      to: to as ProjectStatus,
    })),
  );

  it.each(table)("$from → $to", async ({ from, to }) => {
    const legal = LEGAL_TRANSITIONS[from].includes(to);
    vi.mocked(ownerOf).mockResolvedValueOnce(projectRow({ status: from }));

    if (legal) {
      vi.mocked(updateProjectRepo).mockResolvedValueOnce(
        projectRow({ status: to }),
      );
      const project = await transitionStatus("prj-1", to, ctx);
      expect(project.status).toBe(to);
    } else {
      await expect(transitionStatus("prj-1", to, ctx)).rejects.toThrow(
        ConflictError,
      );
      expect(updateProjectRepo).not.toHaveBeenCalled();
    }
  });
});

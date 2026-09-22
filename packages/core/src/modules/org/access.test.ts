import { describe, expect, it, vi } from "vitest";
import { assertMember, canEdit, ownerOf } from "./access";
import { NotFoundError } from "../../lib/errors";
import type { RequestContext } from "../../lib/context";

// Mock database client and membership repository
vi.mock("../../platform/db/client", () => ({
  db: {
    project: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("./membership.repository", () => ({
  findMembership: vi.fn(),
}));

import { db } from "../../platform/db/client";
import { findMembership } from "./membership.repository";

describe("Access control & tenant isolation (BE-3)", () => {
  const validContext: RequestContext = {
    userId: "user-1",
    orgId: "org-1",
  };

  it("ownerOf returns project when user is member of project's org", async () => {
    vi.mocked(findMembership).mockResolvedValueOnce({
      id: "mem-1",
      orgId: "org-1",
      userId: "user-1",
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
      org: {
        id: "org-1",
        name: "Org 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    vi.mocked(db.project.findFirst).mockResolvedValueOnce({
      id: "proj-1",
      orgId: "org-1",
      userId: "user-1",
      name: "TaskFlow",
      description: null,
      status: "READY",
      templateId: "nextjs-shadcn",
      previewUrl: null,
      deployedUrl: null,
      subdomain: null,
      lastActiveAt: null,
      workspacePath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const project = await ownerOf("proj-1", validContext);
    expect(project).not.toBeNull();
    expect(project?.id).toBe("proj-1");
  });

  it("ownerOf returns null (triggering 404, never 403) when project belongs to a foreign org", async () => {
    vi.mocked(findMembership).mockResolvedValueOnce({
      id: "mem-1",
      orgId: "org-1",
      userId: "user-1",
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
      org: {
        id: "org-1",
        name: "Org 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // DB query checks `orgId: ctx.orgId`, so foreign project returns null
    vi.mocked(db.project.findFirst).mockResolvedValueOnce(null);

    const project = await ownerOf("foreign-proj-id", validContext);
    expect(project).toBeNull();
  });

  it("ownerOf returns null when user is not a member of the org", async () => {
    vi.mocked(findMembership).mockResolvedValueOnce(null);

    const project = await ownerOf("proj-1", validContext);
    expect(project).toBeNull();
  });

  it("assertMember throws NotFoundError when orgId mismatches context", async () => {
    await expect(assertMember("foreign-org-id", validContext)).rejects.toThrow(
      NotFoundError,
    );
  });
});

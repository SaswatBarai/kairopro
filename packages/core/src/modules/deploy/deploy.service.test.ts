import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../lib/context";
import { ConflictError, ValidationError } from "../../lib/errors";

vi.mock("../../platform/db/client", () => ({ db: {} }));
vi.mock("../org/access", () => ({ ownerOf: vi.fn() }));
vi.mock("../build/build.repository", () => ({
  findLatestSucceededBuild: vi.fn(),
}));
vi.mock("../project/project.repository", () => ({
  findProjectBySubdomain: vi.fn(),
  touchProjectActivity: vi.fn(),
  updateProject: vi.fn(),
}));
vi.mock("./dns", () => ({
  getDnsProvider: vi.fn(() => ({
    createRecord: vi.fn().mockResolvedValue({}),
    removeRecord: vi.fn(),
  })),
}));
vi.mock("./ssl", () => ({
  activateDeployRoute: vi.fn(),
  deployedUrlFor: (s: string) => `https://${s}.kairopro.app`,
}));

import { ownerOf } from "../org/access";
import { findLatestSucceededBuild } from "../build/build.repository";
import {
  findProjectBySubdomain,
  touchProjectActivity,
  updateProject,
} from "../project/project.repository";
import { activateDeployRoute } from "./ssl";
import { deploy, validateSubdomainFormat } from "./deploy.service";

const ctx: RequestContext = { userId: "user-1", orgId: "org-1" };
const projectId = "prj-1";

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: projectId,
    subdomain: null,
    status: "READY",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ownerOf).mockResolvedValue(project() as never);
  vi.mocked(findLatestSucceededBuild).mockResolvedValue({
    previewUrl: "http://localhost:3210",
  } as never);
  vi.mocked(findProjectBySubdomain).mockResolvedValue(null);
  vi.mocked(activateDeployRoute).mockResolvedValue(
    "https://acme-crm.kairopro.app",
  );
  vi.mocked(updateProject).mockResolvedValue({} as never);
  vi.mocked(touchProjectActivity).mockResolvedValue({} as never);
});

describe("validateSubdomainFormat (BE-11)", () => {
  it.each([
    ["acme-crm", true],
    ["ab", false], // too short
    ["-acme", false], // leading hyphen
    ["acme-", false], // trailing hyphen
    ["Acme", false], // uppercase
    ["acme_crm", false], // underscore
    ["a".repeat(64), false], // too long
  ])("%s -> valid=%s", (candidate, valid) => {
    if (valid) {
      expect(() => validateSubdomainFormat(candidate)).not.toThrow();
    } else {
      expect(() => validateSubdomainFormat(candidate)).toThrow(ValidationError);
    }
  });

  it("rejects reserved words", () => {
    expect(() => validateSubdomainFormat("www")).toThrow(ValidationError);
    expect(() => validateSubdomainFormat("api")).toThrow(ValidationError);
  });
});

describe("deploy (BE-11)", () => {
  it("reserves the subdomain, activates routing, and records the deployed URL", async () => {
    const result = await deploy(projectId, { subdomain: "acme-crm" }, ctx);

    expect(result).toEqual({
      projectId,
      subdomain: "acme-crm",
      deployedUrl: "https://acme-crm.kairopro.app",
    });
    expect(activateDeployRoute).toHaveBeenCalledWith("acme-crm", 3210);
    expect(updateProject).toHaveBeenCalledWith(projectId, {
      subdomain: "acme-crm",
      deployedUrl: "https://acme-crm.kairopro.app",
      status: "DEPLOYED",
    });
    expect(touchProjectActivity).toHaveBeenCalledWith(projectId);
  });

  it("a duplicate subdomain returns a conflict", async () => {
    vi.mocked(findProjectBySubdomain).mockResolvedValue({
      id: "other-project",
    } as never);

    await expect(
      deploy(projectId, { subdomain: "taken" }, ctx),
    ).rejects.toThrow(ConflictError);
    expect(activateDeployRoute).not.toHaveBeenCalled();
  });

  it("requires a subdomain on first deploy", async () => {
    await expect(deploy(projectId, {}, ctx)).rejects.toThrow(ValidationError);
  });

  it("a redeploy reuses the already-reserved subdomain without a fresh uniqueness check", async () => {
    vi.mocked(ownerOf).mockResolvedValue(
      project({ subdomain: "acme-crm", status: "DEPLOYED" }) as never,
    );

    const result = await deploy(projectId, {}, ctx);

    expect(result.subdomain).toBe("acme-crm");
    expect(findProjectBySubdomain).not.toHaveBeenCalled();
  });

  it("fails cleanly when the project has no successful build", async () => {
    vi.mocked(findLatestSucceededBuild).mockResolvedValue(null);

    await expect(
      deploy(projectId, { subdomain: "acme-crm" }, ctx),
    ).rejects.toThrow(ConflictError);
  });
});

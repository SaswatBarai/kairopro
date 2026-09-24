import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../../../../lib/context";
import type { TemplateManifest } from "../../template";

vi.mock("./generate-code", () => ({ generateFile: vi.fn() }));

import { generateFile } from "./generate-code";
import { authTask, generateAuthConfig } from "./generate-auth";

const ctx: RequestContext = { userId: "u1", orgId: "o1" };
const template = {
  id: "t",
  stack: "s",
  description: "d",
  conventions: {
    auth: "next-auth",
    authConfigPath: "src/lib/auth.ts",
    prismaClientPath: "src/lib/prisma.ts",
  },
} as unknown as TemplateManifest;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateFile).mockResolvedValue({
    path: "src/lib/auth.ts",
    fixAttempts: 1,
    level: "full",
    omitted: false,
  });
});

describe("authTask", () => {
  it("names the library and where to export it, and points at the personas", () => {
    const task = authTask(template);
    expect(task).toContain("next-auth");
    expect(task).toContain("src/lib/auth.ts");
    expect(task).toMatch(/personas and\s+permission matrix/);
  });

  it("tells the model to use the provided Prisma client, not build its own", () => {
    expect(authTask(template)).toContain("src/lib/prisma.ts");
    expect(authTask(template)).toMatch(/do not construct a PrismaClient/);
  });
});

describe("generateAuthConfig", () => {
  it("writes the configured auth path, as never-degradable authorization", async () => {
    await generateAuthConfig({
      projectId: "p1",
      ctx,
      workspace: {} as never,
      runtime: {} as never,
      containerId: "c1",
      template,
      conventions: "conventions text",
      specs: "specs text",
    });

    expect(generateFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "src/lib/auth.ts",
        concern: "authorization",
        conventions: "conventions text",
        specs: "specs text",
      }),
    );
  });

  it("passes the live-code and degradation hooks through", async () => {
    const onCode = vi.fn();
    const onDegrade = vi.fn();
    await generateAuthConfig({
      projectId: "p1",
      ctx,
      workspace: {} as never,
      runtime: {} as never,
      containerId: "c1",
      template,
      conventions: "c",
      specs: "s",
      onCode,
      onDegrade,
    });

    const passed = vi.mocked(generateFile).mock.calls[0]![0];
    expect(passed.onCode).toBe(onCode);
    expect(passed.onDegrade).toBe(onDegrade);
  });
});

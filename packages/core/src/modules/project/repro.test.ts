import { config } from "dotenv";
config({ path: "/home/saswatbarai/Videos/kairopro/.env" });

import { describe, expect, it } from "vitest";
import { db } from "../../platform/db/client";
import { createProject } from "./project.service";

describe("repro full create", () => {
  it("creates a project end to end on the dev db", async () => {
    process.env.KAIROPRO_WORKSPACE_ROOT =
      "/home/saswatbarai/Videos/kairopro/apps/web/.workspaces";
    const user = await db.user.create({
      data: { name: "Repro", email: `repro-${Date.now()}@test.dev` },
    });
    const org = await db.organization.create({
      data: {
        name: "Repro Org",
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    try {
      const project = await createProject(
        { name: "Repro Project" },
        { userId: user.id, orgId: org.id },
      );
      expect(project.name).toBe("Repro Project");
      await db.project.delete({ where: { id: project.id } });
    } finally {
      await db.organization.delete({ where: { id: org.id } }).catch(() => {});
      await db.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });
});

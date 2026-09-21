import { describe, expect, it } from "vitest";
import {
  APP_CPU_LIMIT,
  APP_MEMORY_LIMIT_MB,
  buildComposeSpec,
  DB_CPU_LIMIT,
  DB_IMAGE,
  DB_MEMORY_LIMIT_MB,
  MANAGED_LABEL,
  networkNameFor,
  PROJECT_LABEL,
  ROLE_LABEL,
  serializeComposeYaml,
} from "./compose";

describe("buildComposeSpec (BE-9)", () => {
  it("labels both services as managed, tags them with the project id and role", () => {
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "kairopro-app-runtime:local" });

    expect(spec.app.labels).toEqual({
      [MANAGED_LABEL]: "true",
      [PROJECT_LABEL]: "proj1",
      [ROLE_LABEL]: "app",
    });
    expect(spec.db.labels).toEqual({
      [MANAGED_LABEL]: "true",
      [PROJECT_LABEL]: "proj1",
      [ROLE_LABEL]: "db",
    });
  });

  it("always sets resource limits — never unbounded", () => {
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    expect(spec.app.limits).toEqual({ cpus: APP_CPU_LIMIT, memoryMb: APP_MEMORY_LIMIT_MB });
    expect(spec.db.limits).toEqual({ cpus: DB_CPU_LIMIT, memoryMb: DB_MEMORY_LIMIT_MB });
  });

  it("places both services on the project's own isolated network", () => {
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    expect(spec.networkName).toBe(networkNameFor("proj1"));
    expect(spec.app.network).toBe(spec.networkName);
    expect(spec.db.network).toBe(spec.networkName);
  });

  it("merges caller-supplied env with the injected DATABASE_URL, without overwriting it", () => {
    const spec = buildComposeSpec({
      projectId: "proj1",
      appImage: "img",
      appEnv: { STRIPE_KEY: "sk_test_123", DATABASE_URL: "should-be-overwritten" },
    });

    expect(spec.app.environment.STRIPE_KEY).toBe("sk_test_123");
    expect(spec.app.environment.DATABASE_URL).toBe(
      "postgresql://app:app@db:5432/app",
    );
  });

  it("defaults the app port to 3000, honors an explicit port", () => {
    expect(buildComposeSpec({ projectId: "p", appImage: "img" }).app.port).toBe(3000);
    expect(buildComposeSpec({ projectId: "p", appImage: "img", port: 8080 }).app.port).toBe(8080);
  });

  it("uses the fixed postgres image and a healthcheck that matches its credentials", () => {
    const spec = buildComposeSpec({ projectId: "proj1", appImage: "img" });

    expect(spec.db.image).toBe(DB_IMAGE);
    expect(spec.db.healthcheck).toEqual(["CMD-SHELL", "pg_isready -U app -d app"]);
  });

  it("two different projects never collide on network name or volume", () => {
    const a = buildComposeSpec({ projectId: "proj-a", appImage: "img" });
    const b = buildComposeSpec({ projectId: "proj-b", appImage: "img" });

    expect(a.networkName).not.toBe(b.networkName);
    expect(a.db.volumeName).not.toBe(b.db.volumeName);
  });
});

describe("serializeComposeYaml (BE-9)", () => {
  it("matches a known fixture for a simple spec", () => {
    const spec = buildComposeSpec({
      projectId: "proj1",
      appImage: "kairopro-app-runtime:local",
      appEnv: { FOO: "bar" },
    });

    const yaml = serializeComposeYaml(spec);

    expect(yaml).toContain("name: kairopro-proj1");
    expect(yaml).toContain("image: kairopro-app-runtime:local");
    expect(yaml).toContain('FOO: "bar"');
    expect(yaml).toContain(`cpus: "${APP_CPU_LIMIT}"`);
    expect(yaml).toContain(`memory: ${APP_MEMORY_LIMIT_MB}M`);
    expect(yaml).toContain("condition: service_healthy");
    expect(yaml).toContain(`${spec.networkName}:`);
    expect(yaml).toContain(`${spec.db.volumeName}:`);
  });
});

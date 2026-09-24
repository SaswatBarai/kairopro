import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, executeRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
}));
vi.mock("../db/client", () => ({
  db: { $queryRawUnsafe: queryRaw, $executeRawUnsafe: executeRaw },
}));

import {
  appDatabaseName,
  appDatabaseUrl,
  dropAppDatabase,
  ensureAppDatabase,
} from "./index";

const PLATFORM =
  "postgresql://kairopro:pw@localhost:5432/kairopro_dev?schema=public";

beforeEach(() => vi.clearAllMocks());

describe("appDatabaseName", () => {
  it("derives a plain identifier from a project id", () => {
    expect(appDatabaseName("cmug0i6ue00009mi04cyehivv")).toBe(
      "kairopro_app_cmug0i6ue00009mi04cyehivv",
    );
  });

  it("neutralises anything that isn't a plain identifier character", () => {
    const name = appDatabaseName('x"; DROP DATABASE kairopro_dev; --');
    expect(name).toMatch(/^kairopro_app_[a-z0-9_]+$/);
    expect(name).not.toContain('"');
  });

  it("refuses an id too long for a Postgres identifier", () => {
    expect(() => appDatabaseName("a".repeat(60))).toThrow();
  });
});

describe("appDatabaseUrl", () => {
  it("points at the project's database on the platform's server, never the platform's own", () => {
    const url = new URL(appDatabaseUrl("prj1", PLATFORM));
    expect(url.pathname).toBe("/kairopro_app_prj1");
    expect(url.hostname).toBe("localhost");
    expect(url.username).toBe("kairopro");
    expect(url.search).toBe("");
    expect(url.toString()).not.toContain("kairopro_dev");
  });

  it("swaps the host for containers that reach the server by another name", () => {
    const url = new URL(
      appDatabaseUrl("prj1", PLATFORM, "host.docker.internal"),
    );
    expect(url.hostname).toBe("host.docker.internal");
  });

  it("fails clearly when there is no platform database configured", () => {
    expect(() => appDatabaseUrl("prj1", undefined)).toThrow(/DATABASE_URL/);
  });
});

describe("ensureAppDatabase / dropAppDatabase", () => {
  beforeEach(() => vi.stubEnv("DATABASE_URL", PLATFORM));

  it("creates the database when it does not exist", async () => {
    queryRaw.mockResolvedValue([]);

    const url = await ensureAppDatabase("prj1");

    expect(executeRaw).toHaveBeenCalledWith(
      'CREATE DATABASE "kairopro_app_prj1"',
    );
    expect(url).toContain("/kairopro_app_prj1");
  });

  it("does nothing when it already exists", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    await ensureAppDatabase("prj1");

    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("drops only the project's own database", async () => {
    await dropAppDatabase("prj1");

    expect(executeRaw).toHaveBeenCalledWith(
      'DROP DATABASE IF EXISTS "kairopro_app_prj1" WITH (FORCE)',
    );
  });
});

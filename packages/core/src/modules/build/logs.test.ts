import { beforeEach, describe, expect, it, vi } from "vitest";

const buildLogCreate = vi.fn();
const buildLogFindFirst = vi.fn();
const buildLogFindMany = vi.fn();

vi.mock("../../platform/db/client", () => ({
  db: {
    buildLog: {
      create: (...args: unknown[]) => buildLogCreate(...args),
      findFirst: (...args: unknown[]) => buildLogFindFirst(...args),
      findMany: (...args: unknown[]) => buildLogFindMany(...args),
    },
  },
}));

const publish = vi.fn();
vi.mock("../../platform/events", () => ({
  eventBus: { publish: (...args: unknown[]) => publish(...args) },
}));

import { appendLog, emitLog, listLogsSince } from "./logs";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("appendLog (BE-10)", () => {
  it("assigns seq 0 for the first log in a build", async () => {
    buildLogFindFirst.mockResolvedValue(null);
    buildLogCreate.mockResolvedValue({
      id: "l1",
      buildId: "b1",
      seq: 0,
      type: "STEP",
      content: "x",
      createdAt: new Date(),
    });

    const row = await appendLog("b1", "STEP", "x");

    expect(buildLogCreate).toHaveBeenCalledWith({
      data: { buildId: "b1", seq: 0, type: "STEP", content: "x" },
    });
    expect(row.seq).toBe(0);
  });

  it("assigns the next seq after the current max", async () => {
    buildLogFindFirst.mockResolvedValue({ seq: 4 });
    buildLogCreate.mockResolvedValue({
      id: "l2",
      buildId: "b1",
      seq: 5,
      type: "STDOUT",
      content: "y",
      createdAt: new Date(),
    });

    await appendLog("b1", "STDOUT", "y");

    expect(buildLogCreate).toHaveBeenCalledWith({
      data: { buildId: "b1", seq: 5, type: "STDOUT", content: "y" },
    });
  });

  it("retries with the next seq on a unique-constraint collision", async () => {
    buildLogFindFirst
      .mockResolvedValueOnce({ seq: 0 })
      .mockResolvedValueOnce({ seq: 1 });
    buildLogCreate
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({
        id: "l2",
        buildId: "b1",
        seq: 2,
        type: "STEP",
        content: "z",
        createdAt: new Date(),
      });

    const row = await appendLog("b1", "STEP", "z");

    expect(row.seq).toBe(2);
    expect(buildLogCreate).toHaveBeenCalledTimes(2);
  });

  it("rethrows a non-constraint error immediately, without retrying", async () => {
    buildLogFindFirst.mockResolvedValue(null);
    buildLogCreate.mockRejectedValue(new Error("boom"));

    await expect(appendLog("b1", "STEP", "x")).rejects.toThrow("boom");
    expect(buildLogCreate).toHaveBeenCalledTimes(1);
  });

  it("gives up after repeated collisions instead of retrying forever", async () => {
    buildLogFindFirst.mockResolvedValue({ seq: 0 });
    buildLogCreate.mockRejectedValue({ code: "P2002" });

    await expect(appendLog("b1", "STEP", "x")).rejects.toThrow(
      /Could not allocate/,
    );
  });
});

describe("emitLog (BE-10)", () => {
  it("persists before publishing, with the persisted row's exact shape", async () => {
    buildLogFindFirst.mockResolvedValue(null);
    const created = {
      id: "l1",
      buildId: "b1",
      seq: 0,
      type: "STEP",
      content: "x",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    buildLogCreate.mockResolvedValue(created);

    await emitLog("b1", "STEP", "x");

    expect(publish).toHaveBeenCalledWith("build:b1", {
      buildId: "b1",
      seq: 0,
      type: "STEP",
      content: "x",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(buildLogCreate.mock.invocationCallOrder[0]).toBeLessThan(
      publish.mock.invocationCallOrder[0]!,
    );
  });
});

describe("listLogsSince (BE-10)", () => {
  it("queries with a gt filter, ordered ascending", async () => {
    buildLogFindMany.mockResolvedValue([]);
    await listLogsSince("b1", 3);
    expect(buildLogFindMany).toHaveBeenCalledWith({
      where: { buildId: "b1", seq: { gt: 3 } },
      orderBy: { seq: "asc" },
    });
  });
});

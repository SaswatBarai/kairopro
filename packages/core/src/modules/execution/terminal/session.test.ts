import { describe, expect, it } from "vitest";
import { eventBus } from "../../../platform/events";
import type {
  ContainerRuntime,
  ExecResult,
} from "../../../platform/container/runtime";
import { runSession } from "./session";

function fakeRuntime(lines: string[], result: ExecResult): ContainerRuntime {
  return {
    provision: async () => {
      throw new Error("not used");
    },
    exec: async () => {
      throw new Error("not used");
    },
    execStream: async (_input, onLine) => {
      for (const line of lines) onLine(line);
      return result;
    },
    health: async () => ({ ready: true }),
    stop: async () => undefined,
    destroy: async () => undefined,
    list: async () => [],
  };
}

describe("runSession (BE-9)", () => {
  it("publishes each line onto the container's terminal channel as it arrives", async () => {
    const containerId = "c1";
    const received: string[] = [];
    const unsubscribe = eventBus.subscribe(
      `terminal:${containerId}`,
      (event) => {
        received.push(event.line);
      },
    );

    const result = await runSession({
      runtime: fakeRuntime(["line1", "line2"], {
        exitCode: 0,
        stdout: "line1\nline2\n",
        stderr: "",
      }),
      containerId,
      cmd: "echo hi",
    });

    unsubscribe();
    expect(received).toEqual(["line1", "line2"]);
    expect(result.exitCode).toBe(0);
  });

  it("stamps each published event with the container id and a timestamp", async () => {
    const containerId = "c2";
    const events: Array<{
      containerId: string;
      line: string;
      createdAt: string;
    }> = [];
    const unsubscribe = eventBus.subscribe(
      `terminal:${containerId}`,
      (event) => {
        events.push(event);
      },
    );

    await runSession({
      runtime: fakeRuntime(["only line"], {
        exitCode: 0,
        stdout: "only line\n",
        stderr: "",
      }),
      containerId,
      cmd: "echo hi",
    });

    unsubscribe();
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.containerId).toBe(containerId);
    expect(() => new Date(event.createdAt).toISOString()).not.toThrow();
  });

  it("only subscribers on that container's own channel receive its lines", async () => {
    const receivedA: string[] = [];
    const receivedB: string[] = [];
    const unsubA = eventBus.subscribe("terminal:a", (e) =>
      receivedA.push(e.line),
    );
    const unsubB = eventBus.subscribe("terminal:b", (e) =>
      receivedB.push(e.line),
    );

    await runSession({
      runtime: fakeRuntime(["only for a"], {
        exitCode: 0,
        stdout: "",
        stderr: "",
      }),
      containerId: "a",
      cmd: "echo hi",
    });

    unsubA();
    unsubB();
    expect(receivedA).toEqual(["only for a"]);
    expect(receivedB).toEqual([]);
  });
});

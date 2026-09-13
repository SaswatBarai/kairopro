import { describe, expect, it } from "vitest";
import { createLogger, logger, withCorrelation } from "./index";

interface Captured {
  lines: object[];
  stream: {
    write: (chunk: string) => void;
  };
}

function capture(): Captured {
  const lines: object[] = [];
  return {
    lines,
    stream: {
      write(chunk: string) {
        lines.push(JSON.parse(chunk) as object);
      },
    },
  };
}

describe("logger", () => {
  it("emits structured JSON lines", () => {
    const cap = capture();
    const log = createLogger({
      name: "test",
      level: "info",
      stream: cap.stream,
    });
    log.info("hello");
    expect(cap.lines).toHaveLength(1);
    const line = cap.lines[0] as Record<string, unknown>;
    expect(line.level).toBe(30); // pino info
    expect(line.msg).toBe("hello");
  });

  it("carries correlation fields when provided, and only those", () => {
    const cap = capture();
    const log = createLogger({
      name: "test",
      level: "info",
      stream: cap.stream,
    });

    const correlated = withCorrelation(log, {
      projectId: "prj_taskflow",
      buildId: "bld_taskflow_7",
      step: "install",
    });
    correlated.info("working");

    expect(cap.lines[0]).toMatchObject({
      projectId: "prj_taskflow",
      buildId: "bld_taskflow_7",
      step: "install",
    });

    const projectOnly = withCorrelation(log, { projectId: "prj_taskflow" });
    projectOnly.info("scoped");
    const second = cap.lines[1] as Record<string, unknown>;
    expect(second.projectId).toBe("prj_taskflow");
    expect(second).not.toHaveProperty("buildId");
    expect(second).not.toHaveProperty("step");

    // No fields → the same logger, unchanged.
    expect(withCorrelation(log, {})).toBe(log);
  });

  it("exposes a process root logger", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
  });
});

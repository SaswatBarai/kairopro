import { BuildCodeEventDataSchema } from "@kairopro/contracts";

/**
 * The build view's state, as a pure function of the build's SSE events.
 * Kept free of React and of the network so the whole build screen's behavior
 * — steps, terminal, per-file code, simplifications, outcome — is testable by
 * feeding it events, and so a reconnect that replays history rebuilds
 * exactly the same state.
 */

export interface BuildEvent {
  seq: number;
  event: string;
  data: unknown;
}

export interface TerminalLine {
  seq: number;
  stream: "stdout" | "stderr";
  text: string;
}

export type FileStatus = "writing" | "done" | "omitted";

export interface CodeFile {
  path: string;
  text: string;
  status: FileStatus;
  /** How many times it has been (re)written: more than 1 means a repair. */
  attempts: number;
}

export type SimplificationLevel = "simpler" | "simplest" | "omit";

export type BuildOutcome =
  | { status: "SUCCEEDED" | "CANCELLED" }
  | { status: "FAILED"; message: string }
  | null;

export interface BuildViewState {
  /** Highest `seq` applied — events at or below it are duplicates. */
  lastSeq: number;
  /** Backend stage name → whether it has started or completed. */
  stages: Record<string, "started" | "completed">;
  terminal: TerminalLine[];
  files: Record<string, CodeFile>;
  fileOrder: string[];
  /** The file most recently started — what the Code Stream shows. */
  activeFile: string | null;
  /** Last degradation level reported for each unit, by path. */
  simplified: Record<string, SimplificationLevel>;
  outcome: BuildOutcome;
}

/** Oldest lines are dropped, never the newest. */
export const MAX_TERMINAL_LINES = 5000;

export function initialBuildView(): BuildViewState {
  return {
    lastSeq: -1,
    stages: {},
    terminal: [],
    files: {},
    fileOrder: [],
    activeFile: null,
    simplified: {},
    outcome: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function touchFile(state: BuildViewState, path: string): CodeFile {
  return (
    state.files[path] ?? { path, text: "", status: "writing", attempts: 0 }
  );
}

function withFile(state: BuildViewState, file: CodeFile): BuildViewState {
  return {
    ...state,
    files: { ...state.files, [file.path]: file },
    fileOrder: state.fileOrder.includes(file.path)
      ? state.fileOrder
      : [...state.fileOrder, file.path],
  };
}

export function applyBuildEvent(
  state: BuildViewState,
  event: BuildEvent,
): BuildViewState {
  if (event.seq <= state.lastSeq) return state;
  const next = { ...state, lastSeq: event.seq };
  const { data } = event;

  switch (event.event) {
    case "status": {
      if (
        isRecord(data) &&
        typeof data.step === "string" &&
        (data.status === "started" || data.status === "completed")
      ) {
        return {
          ...next,
          stages: { ...next.stages, [data.step]: data.status },
        };
      }
      return next;
    }

    case "terminal": {
      if (!isRecord(data) || typeof data.line !== "string") return next;
      const line: TerminalLine = {
        seq: event.seq,
        stream: data.stream === "stderr" ? "stderr" : "stdout",
        text: data.line,
      };
      return {
        ...next,
        terminal: [...next.terminal, line].slice(-MAX_TERMINAL_LINES),
      };
    }

    case "code": {
      const parsed = BuildCodeEventDataSchema.safeParse(data);
      if (!parsed.success) return next;
      const d = parsed.data;

      if ("unit" in d) {
        if ("level" in d && d.level !== "full") {
          return {
            ...next,
            simplified: {
              ...next.simplified,
              [d.unit]: d.level as SimplificationLevel,
            },
          };
        }
        return next;
      }

      const file = touchFile(next, d.file);
      if ("reset" in d) {
        return {
          ...withFile(next, {
            ...file,
            text: "",
            status: "writing",
            attempts: file.attempts + 1,
          }),
          activeFile: d.file,
        };
      }
      if ("content" in d) {
        const text = d.replace ? d.content : file.text + d.content;
        return withFile(next, { ...file, text });
      }
      return withFile(next, {
        ...file,
        status: d.omitted ? "omitted" : "done",
      });
    }

    case "done": {
      const status =
        isRecord(data) && data.status === "CANCELLED"
          ? "CANCELLED"
          : "SUCCEEDED";
      return { ...next, outcome: { status } };
    }

    case "error": {
      const message =
        isRecord(data) && typeof data.message === "string"
          ? data.message
          : "The build didn't finish.";
      return { ...next, outcome: { status: "FAILED", message } };
    }

    default:
      return next;
  }
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export type StepId =
  "environment" | "database" | "api" | "pages" | "auth" | "tests" | "finish";

export type StepState = "pending" | "running" | "done";

/** The seven rows the build screen shows. Each is driven by the backend
 * stages named here — real boundaries, not a script that plays on a timer. */
export const BUILD_STEPS: ReadonlyArray<{
  id: StepId;
  label: string;
  stages: readonly string[];
}> = [
  {
    id: "environment",
    label: "Preparing your environment",
    stages: ["provision", "scaffold"],
  },
  { id: "database", label: "Setting up the database", stages: ["schema"] },
  { id: "api", label: "Creating API routes", stages: ["api"] },
  { id: "pages", label: "Building pages", stages: ["pages"] },
  { id: "auth", label: "Setting up sign-in", stages: ["auth"] },
  { id: "tests", label: "Writing and running tests", stages: ["test"] },
  { id: "finish", label: "Saving your project", stages: ["checkpoint"] },
];

export function stepStates(
  state: BuildViewState,
): Array<{ id: StepId; label: string; state: StepState }> {
  const succeeded = state.outcome?.status === "SUCCEEDED";
  return BUILD_STEPS.map((step) => {
    const seen = step.stages.map((s) => state.stages[s]);
    let stepState: StepState = "pending";
    if (succeeded || seen.every((s) => s === "completed")) stepState = "done";
    else if (seen.some((s) => s !== undefined)) stepState = "running";
    return { id: step.id, label: step.label, state: stepState };
  });
}

/* ------------------------------------------------------------------ */
/* Simplifications                                                     */
/* ------------------------------------------------------------------ */

const title = (segment: string) =>
  segment.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

const isStaticSegment = (segment: string) =>
  segment !== "" && !segment.startsWith("[") && !segment.startsWith("(");

/**
 * A readable name for a generated unit, for the "features were simplified"
 * notice. That notice must never show a file name, so this describes what the
 * file is *for*, from where it lives.
 */
export function friendlyUnitLabel(unit: string): string {
  if (/__tests__|\.test\.|\.spec\./.test(unit)) return "Automated tests";

  const api = /^src\/app\/api(?:\/(.*))?\/route\.[jt]sx?$/.exec(unit);
  if (api) {
    const name = (api[1] ?? "").split("/").filter(isStaticSegment).map(title);
    return name.length > 0 ? `${name.join(" / ")} API` : "API";
  }

  const page = /^src\/app\/(?:(.*)\/)?page\.[jt]sx?$/.exec(unit);
  if (page) {
    const name = (page[1] ?? "").split("/").filter(isStaticSegment).map(title);
    return name.length > 0 ? `${name.join(" / ")} page` : "Home page";
  }

  if (/(^|\/)auth\.[jt]sx?$/.test(unit)) return "Sign-in";
  return "Part of your app";
}

export interface Simplification {
  label: string;
  kind: "simplified" | "omitted";
}

export function simplifications(state: BuildViewState): Simplification[] {
  return Object.entries(state.simplified).map(([unit, level]) => ({
    label: friendlyUnitLabel(unit),
    kind: level === "omit" ? "omitted" : "simplified",
  }));
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

/** One line saying what the agent is doing right now, or null when idle. */
export function currentActivity(state: BuildViewState): string | null {
  if (state.outcome) return null;
  const file = state.activeFile ? state.files[state.activeFile] : undefined;
  if (file?.status === "writing") {
    return file.attempts > 1 ? `Refining ${file.path}` : `Writing ${file.path}`;
  }
  const running = stepStates(state).find((s) => s.state === "running");
  return running ? running.label : null;
}

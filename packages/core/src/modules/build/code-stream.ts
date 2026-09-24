import type { BuildCodeEventData } from "@kairopro/contracts";
import { logger } from "../../platform/logger";
import type { CodeStreamEvent } from "../agent/workflow/steps/generate-code";
import { emitLog } from "./logs";
import { encodeEventContent } from "./sse/encode";

/**
 * Turns the model's raw output for each generated file into `code` SSE
 * events (`BuildCodeEventDataSchema`'s file-stream family). Two jobs the
 * raw stream can't do on its own:
 *
 * 1. Strip the code fence. Claude wraps a file in a fence (```ts … ```)
 *    even when told not to, and a chunk boundary can land in the middle of
 *    the fence itself, so it can't be stripped per chunk.
 * 2. Batch. Every event is persisted as a `BuildLog` row before it is sent
 *    (that is what makes reconnect-and-replay exact), so one event per
 *    token would be thousands of rows per file. Text is coalesced into a
 *    few events per second instead.
 */

/** How long text may sit before it is sent. Short enough to read as live. */
const FLUSH_MS = 250;
/** …or how much, whichever comes first — bounds a single row's size. */
const FLUSH_CHARS = 2000;
/** Longest tail held back while waiting to see if it is a closing fence:
 * "\n```" plus trailing whitespace. */
const TAIL = 8;

/**
 * Incrementally removes a fence wrapping an entire response. `push` returns
 * the text that is safe to show so far (the tail that could still be part
 * of a closing fence is held back); `end` returns what remains, with the
 * closing fence and trailing whitespace dropped.
 *
 * Only a fence that opens the response is treated as one — text merely
 * containing fenced blocks passes through untouched.
 */
export function createFenceStripper() {
  let phase: "head" | "body" = "head";
  let buf = "";

  function bodyPush(text: string): string {
    buf += text;
    if (buf.length <= TAIL) return "";
    const out = buf.slice(0, buf.length - TAIL);
    buf = buf.slice(-TAIL);
    return out;
  }

  return {
    push(delta: string): string {
      if (phase === "body") return bodyPush(delta);

      buf += delta;
      const start = buf.trimStart();
      if (start === "") return "";
      if (!start.startsWith("`")) {
        phase = "body";
        const text = buf;
        buf = "";
        return bodyPush(text);
      }

      // Could be an opening fence: decide once the whole first line is in.
      const newline = start.indexOf("\n");
      if (newline === -1) return "";
      phase = "body";
      if (/^```[\w-]*\s*$/.test(start.slice(0, newline))) {
        buf = "";
        return bodyPush(start.slice(newline + 1));
      }
      const text = buf;
      buf = "";
      return bodyPush(text);
    },

    end(): string {
      const rest = buf;
      buf = "";
      if (phase === "head") {
        return rest
          .trim()
          .replace(/^```[\w-]*\s*/, "")
          .replace(/```$/, "")
          .trim();
      }
      return rest.replace(/\n?```\s*$/, "").trimEnd();
    },
  };
}

interface FileState {
  stripper: ReturnType<typeof createFenceStripper>;
  pending: string;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface CodeStream {
  /** Pass to a phase's `onCode`. Never throws and never blocks the build. */
  onCode: (file: string, event: CodeStreamEvent) => void;
  /** Sends anything still buffered and resolves once every event queued so
   * far is persisted. Call when the phase ends, including on failure. */
  drain: () => Promise<void>;
}

type Emit = (
  buildId: string,
  type: "EVENT",
  content: string,
) => Promise<unknown>;

export function createCodeStream(
  buildId: string,
  emit: Emit = emitLog,
): CodeStream {
  const files = new Map<string, FileState>();
  // Events must land in `seq` order — chained, since each `emit` is async.
  let queue: Promise<void> = Promise.resolve();

  function send(data: BuildCodeEventData): void {
    queue = queue.then(async () => {
      try {
        await emit(
          buildId,
          "EVENT",
          encodeEventContent({ event: "code", data }),
        );
      } catch (err) {
        // A lost code frame must never fail the build it is only watching.
        logger.warn({ err, buildId }, "failed to persist a code stream event");
      }
    });
  }

  function flush(file: string): void {
    const state = files.get(file);
    if (!state) return;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.pending) {
      send({ file, content: state.pending });
      state.pending = "";
    }
  }

  function stateFor(file: string): FileState {
    let state = files.get(file);
    if (!state) {
      state = { stripper: createFenceStripper(), pending: "", timer: null };
      files.set(file, state);
    }
    return state;
  }

  return {
    onCode(file, event) {
      if (event.type === "reset") {
        const state = stateFor(file);
        if (state.timer) clearTimeout(state.timer);
        files.set(file, {
          stripper: createFenceStripper(),
          pending: "",
          timer: null,
        });
        send({ file, reset: true });
        return;
      }

      if (event.type === "delta") {
        const state = stateFor(file);
        state.pending += state.stripper.push(event.text);
        if (state.pending.length >= FLUSH_CHARS) flush(file);
        else if (state.pending && !state.timer) {
          state.timer = setTimeout(() => flush(file), FLUSH_MS);
        }
        return;
      }

      const state = stateFor(file);
      state.pending += state.stripper.end();
      flush(file);
      send({ file, done: true, omitted: event.omitted });
      files.delete(file);
    },

    async drain() {
      for (const file of [...files.keys()]) flush(file);
      await queue;
    },
  };
}

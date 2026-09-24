import type {
  BuildLogType,
  BuildStreamEvent,
  BuildStreamEventName,
} from "@kairopro/contracts";

/**
 * SSE frame encoding (Phase 15 / BE-10) — and the mapping between a
 * persisted `BuildLog`'s storage `type` (`STEP`/`STDOUT`/`STDERR`/`EVENT`/
 * `CHECKPOINT`) and the wire `event` name (`status`/`terminal`/`code`/
 * `checkpoint`/`done`/`error`) a client's `EventSource` sees. The two
 * vocabularies differ on purpose: storage stays coarse enough for `logs.ts`
 * to reason about generically, while `done`/`error`/`code` are distinct on
 * the wire because a client reacts to each differently. `BuildLogType.EVENT`
 * carries whichever of those three applies, encoded as JSON — see
 * `encodeEventContent`/`decodeEventContent` below, the only place that
 * encoding is produced or consumed.
 */

interface EventLogPayload {
  event: Extract<BuildStreamEventName, "code" | "done" | "error">;
  data: BuildStreamEvent["data"];
}

/** Builds the `BuildLog.content` string for an `EVENT`-typed log — the one
 * place a caller (build.service, workflow) picks which terminal/code wire
 * event a log represents. */
export function encodeEventContent(payload: EventLogPayload): string {
  return JSON.stringify(payload);
}

function decodeEventContent(content: string): EventLogPayload {
  try {
    const parsed = JSON.parse(content) as Partial<EventLogPayload>;
    if (
      parsed.event === "code" ||
      parsed.event === "done" ||
      parsed.event === "error"
    ) {
      return { event: parsed.event, data: parsed.data ?? null };
    }
  } catch {
    // fall through to the safe default below
  }
  return { event: "error", data: { message: "Malformed event log" } };
}

function safeParseJson(content: string): BuildStreamEvent["data"] {
  try {
    return JSON.parse(content) as BuildStreamEvent["data"];
  } catch {
    return content;
  }
}

export interface BuildLogLike {
  seq: number;
  type: BuildLogType;
  content: string;
}

/** Maps one persisted (or just-published) `BuildLog` into the `BuildStreamEvent`
 * a client receives. Pure — no I/O. */
export function toStreamEvent(log: BuildLogLike): BuildStreamEvent {
  switch (log.type) {
    case "STEP":
      return {
        seq: log.seq,
        event: "status",
        data: safeParseJson(log.content),
      };
    case "STDOUT":
      return {
        seq: log.seq,
        event: "terminal",
        data: { stream: "stdout", line: log.content },
      };
    case "STDERR":
      return {
        seq: log.seq,
        event: "terminal",
        data: { stream: "stderr", line: log.content },
      };
    case "CHECKPOINT":
      return {
        seq: log.seq,
        event: "checkpoint",
        data: safeParseJson(log.content),
      };
    case "EVENT": {
      const { event, data } = decodeEventContent(log.content);
      return { seq: log.seq, event, data };
    }
  }
}

/** One SSE wire frame: `id`, `event`, and `data` (JSON, one line per `data:`
 * so a multi-line payload can never be split across frames). */
export function encodeSseFrame(event: BuildStreamEvent): string {
  const json = JSON.stringify(event.data);
  const dataLines = json
    .split("\n")
    .map((line) => `data: ${line}`)
    .join("\n");
  return `id: ${event.seq}\nevent: ${event.event}\n${dataLines}\n\n`;
}

export const KEEPALIVE_INTERVAL_MS = 15_000;

/** An SSE comment line — ignored by `EventSource` but keeps intermediaries
 * from timing out an otherwise-idle connection. */
export function encodeKeepalive(): string {
  return `: keepalive\n\n`;
}

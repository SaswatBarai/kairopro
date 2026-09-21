import { eventBus, type BuildEvent } from "../../../platform/events";
import { listLogsSince } from "../logs";
import {
  encodeKeepalive,
  encodeSseFrame,
  toStreamEvent,
  KEEPALIVE_INTERVAL_MS,
} from "./encode";

/**
 * Drives one SSE connection for a build (Phase 15 / BE-10): replays
 * persisted `BuildLog` rows after `lastEventSeq` first (gap-free
 * reconnect), then live events off the event bus, interleaved with a
 * keepalive comment every 15s. Yields raw SSE frame text — the HTTP layer
 * only has to write it to the response body.
 *
 * Subscribing before querying the backlog (not after) is what makes the
 * reconnect gap-free: an event published while the backlog query is still
 * in flight lands in the queue below instead of being missed, and is
 * de-duplicated against the backlog by `seq` before delivery.
 */

const KEEPALIVE = Symbol("keepalive");
type QueueItem = BuildEvent | typeof KEEPALIVE;

export interface StreamBuildEventsOptions {
  buildId: string;
  /** The last seq the client already has — replay starts after it. `-1`
   * replays the whole history. */
  lastEventSeq: number;
  signal: AbortSignal;
  keepaliveIntervalMs?: number;
}

export async function* streamBuildEvents(
  options: StreamBuildEventsOptions,
): AsyncGenerator<string, void, void> {
  const {
    buildId,
    lastEventSeq,
    signal,
    keepaliveIntervalMs = KEEPALIVE_INTERVAL_MS,
  } = options;

  const queue: QueueItem[] = [];
  let wake: (() => void) | undefined;
  const notify = () => {
    wake?.();
    wake = undefined;
  };

  const unsubscribe = eventBus.subscribe(`build:${buildId}`, (event) => {
    queue.push(event);
    notify();
  });
  const keepaliveTimer = setInterval(() => {
    queue.push(KEEPALIVE);
    notify();
  }, keepaliveIntervalMs);
  const onAbort = () => notify();
  signal.addEventListener("abort", onAbort);

  try {
    let lastSent = lastEventSeq;

    const backlog = await listLogsSince(buildId, lastEventSeq);
    for (const row of backlog) {
      yield encodeSseFrame(toStreamEvent(row));
      lastSent = row.seq;
    }

    while (!signal.aborted) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      const item = queue.shift()!;
      if (item === KEEPALIVE) {
        yield encodeKeepalive();
        continue;
      }
      if (item.seq <= lastSent) continue; // already sent via backlog or a dup
      yield encodeSseFrame(toStreamEvent(item));
      lastSent = item.seq;
    }
  } finally {
    clearInterval(keepaliveTimer);
    unsubscribe();
    signal.removeEventListener("abort", onAbort);
  }
}

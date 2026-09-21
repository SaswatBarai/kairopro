import type { BuildLogType } from "@kairopro/contracts";

/**
 * In-process event bus — the seam between producers (build workflow, agent
 * emissions) and consumers (SSE delivery). Producers publish on a typed
 * channel; consumers subscribe. In V1 the transport is a Map inside one
 * Node process; the interface is what lets that change without touching
 * either side.
 */

export type Unsubscribe = () => void;
export type EventHandler<Payload> = (payload: Payload) => void;

/** A persisted build-log event, published after its row is written —
 * persist before you emit, so a reconnecting client can never lose it. */
export interface BuildEvent {
  buildId: string;
  /** Monotonic per build; matches the persisted BuildLog row. */
  seq: number;
  type: BuildLogType;
  content: string;
  createdAt: string;
}

/** Channel id for a build's event stream. */
export type BuildChannel = `build:${string}`;

/** Progress through the spec-generation pipeline (Phase 11 / AI-5) — not
 * persisted like `BuildEvent`, since there is no `BuildLog` row for spec
 * generation; SSE delivery for this channel is a later phase's concern. */
export interface SpecGenerationEvent {
  projectId: string;
  /** A workflow phase name (e.g. "prd", "data-model") — kept as a plain
   * string here rather than importing `WorkflowPhase`, so this
   * lower-level platform module never depends on `modules/agent`. */
  step: string;
  status: "started" | "completed" | "failed";
  message?: string;
  createdAt: string;
}

/** Channel id for a project's spec-generation progress stream. */
export type SpecGenerationChannel = `spec-generation:${string}`;

/** One line of output from a container exec session (Phase 14 / BE-9) — not
 * persisted; a build's own lines go through `BuildEvent` instead, which is
 * (buildId, seq)-addressable for SSE replay. This channel is for exec
 * sessions with no build behind them (e.g. an ad hoc workspace terminal). */
export interface TerminalEvent {
  containerId: string;
  line: string;
  createdAt: string;
}

/** Channel id for a container's live terminal output. */
export type TerminalChannel = `terminal:${string}`;

/** The typed channel map. Later phases add channels here — one line each. */
export interface BusChannels {
  [channel: BuildChannel]: BuildEvent;
  [channel: SpecGenerationChannel]: SpecGenerationEvent;
  [channel: TerminalChannel]: TerminalEvent;
}

export interface EventBus<Channels extends object = BusChannels> {
  publish<K extends string & keyof Channels>(
    channel: K,
    payload: Channels[K],
  ): void;
  subscribe<K extends string & keyof Channels>(
    channel: K,
    handler: EventHandler<Channels[K]>,
  ): Unsubscribe;
}

/**
 * Local, in-process implementation. Handlers run synchronously on publish;
 * a throwing handler is isolated so it cannot break delivery to the others
 * or the publisher.
 */
export class LocalEventBus<
  Channels extends object = BusChannels,
> implements EventBus<Channels> {
  // Handlers are stored type-erased: a handler subscribed to one channel is
  // only ever invoked with that channel's payload (the map is keyed by
  // channel), which the type system cannot express through `unknown`.
  readonly #handlers = new Map<string, Set<EventHandler<unknown>>>();

  publish<K extends string & keyof Channels>(
    channel: K,
    payload: Channels[K],
  ): void {
    const subscribers = this.#handlers.get(channel);
    if (!subscribers) return;

    // Copy: a handler that (un)subscribes during delivery must not mutate
    // the set being iterated.
    for (const handler of [...subscribers]) {
      try {
        handler(payload);
      } catch {
        // One broken subscriber must not break the others, nor the emitter.
      }
    }
  }

  subscribe<K extends string & keyof Channels>(
    channel: K,
    handler: EventHandler<Channels[K]>,
  ): Unsubscribe {
    let subscribers = this.#handlers.get(channel);
    if (!subscribers) {
      subscribers = new Set();
      this.#handlers.set(channel, subscribers);
    }
    subscribers.add(handler as EventHandler<unknown>);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      const current = this.#handlers.get(channel);
      if (!current) return;
      current.delete(handler as EventHandler<unknown>);
      if (current.size === 0) this.#handlers.delete(channel); // clean up
    };
  }

  /** Test/inspection affordance — not part of the seam. */
  subscriberCount(channel: string): number {
    return this.#handlers.get(channel)?.size ?? 0;
  }
}

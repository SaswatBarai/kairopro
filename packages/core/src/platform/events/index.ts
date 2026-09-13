import { LocalEventBus } from "./bus";
import type { EventBus } from "./bus";

/**
 * The process-wide bus — the seam consumers use. In V1 the transport is
 * in-process; the interface is what lets that change without touching
 * either side.
 */
export const eventBus: EventBus = new LocalEventBus();

export type {
  EventBus,
  BuildChannel,
  BuildEvent,
  BusChannels,
  EventHandler,
  Unsubscribe,
} from "./bus";

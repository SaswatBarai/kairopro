import { create } from "zustand";

import {
  applyBuildEvent,
  initialBuildView,
  type BuildEvent,
  type BuildViewState,
} from "@/lib/build-view";

export type StreamConnection =
  "idle" | "connecting" | "live" | "reconnecting" | "closed";

interface BuildViewStore {
  buildId: string | null;
  view: BuildViewState;
  connection: StreamConnection;
  /** Starts (or restarts) a build's view from nothing — the server replays
   * the whole history to a fresh connection, so nothing is carried over. */
  open: (buildId: string) => void;
  apply: (event: BuildEvent) => void;
  setConnection: (connection: StreamConnection) => void;
}

export const useBuildViewStore = create<BuildViewStore>((set) => ({
  buildId: null,
  view: initialBuildView(),
  connection: "idle",
  open: (buildId) =>
    set({ buildId, view: initialBuildView(), connection: "connecting" }),
  apply: (event) => set((s) => ({ view: applyBuildEvent(s.view, event) })),
  setConnection: (connection) => set({ connection }),
}));

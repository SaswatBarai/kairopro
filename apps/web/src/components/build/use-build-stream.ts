"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { buildQueryKey, buildsQueryKey } from "@/lib/queries/builds";
import { useBuildViewStore } from "@/stores/use-build-view-store";

const EVENTS = ["status", "terminal", "code", "checkpoint", "done", "error"];

/**
 * Connects the build view to a build's SSE stream. `EventSource` reconnects
 * by itself and resends the last event id it saw, which the server replays
 * from — so a dropped connection resumes with no gaps. A fresh mount has no
 * last id and gets the whole history, which is what rebuilds the view after a
 * page reload.
 *
 * `done` and `error` end the stream: the server would keep the connection
 * open forever, so this closes it rather than let the browser retry.
 */
export function useBuildStream(
  projectId: string | undefined,
  buildId: string | undefined,
): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !buildId) return;
    const { open, apply, setConnection } = useBuildViewStore.getState();
    open(buildId);

    const source = new EventSource(
      `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/stream`,
    );

    const finish = () => {
      source.close();
      setConnection("closed");
      // The Build row (status, finishedAt, previewUrl) changed with the end.
      void queryClient.invalidateQueries({
        queryKey: buildQueryKey(projectId, buildId),
      });
      void queryClient.invalidateQueries({
        queryKey: buildsQueryKey(projectId),
      });
    };

    for (const name of EVENTS) {
      source.addEventListener(name, (raw) => {
        // The browser also fires a plain `error` Event for a lost
        // connection; ours is a MessageEvent that carries data.
        const message = raw as MessageEvent;
        if (typeof message.data !== "string") return;

        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          data = message.data;
        }
        const seq = Number(message.lastEventId);
        if (!Number.isFinite(seq)) return;

        apply({ seq, event: name, data });
        if (name === "done" || name === "error") finish();
      });
    }

    source.onopen = () => setConnection("live");
    source.onerror = () =>
      setConnection(
        source.readyState === EventSource.CLOSED ? "closed" : "reconnecting",
      );

    return () => source.close();
  }, [projectId, buildId, queryClient]);
}

// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { FakeEventSource } from "@/test-utils/fake-event-source";
import { useBuildViewStore } from "@/stores/use-build-view-store";
import { useBuildStream } from "./use-build-stream";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
  useBuildViewStore.setState(useBuildViewStore.getInitialState());
});
afterEach(() => vi.unstubAllGlobals());

const source = () => FakeEventSource.latest;
const view = () => useBuildViewStore.getState().view;

describe("useBuildStream", () => {
  it("connects to the build's stream endpoint", () => {
    renderHook(() => useBuildStream("prj 1", "b1"), { wrapper });
    expect(source().url).toBe("/api/projects/prj%201/builds/b1/stream");
    expect(useBuildViewStore.getState().connection).toBe("connecting");
  });

  it("does nothing until it has both ids", () => {
    renderHook(() => useBuildStream("prj1", undefined), { wrapper });
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("feeds events into the view, using the frame id as the sequence", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => {
      source().onopen?.();
      source().emit("terminal", { stream: "stdout", line: "hello" }, 0);
      source().emit("code", { file: "a.ts", reset: true }, 1);
      source().emit("code", { file: "a.ts", content: "x" }, 2);
    });

    expect(useBuildViewStore.getState().connection).toBe("live");
    expect(view().terminal.map((l) => l.text)).toEqual(["hello"]);
    expect(view().files["a.ts"]!.text).toBe("x");
    expect(view().lastSeq).toBe(2);
  });

  it("ignores a frame it already has, as when the server replays after a reconnect", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => {
      source().emit("terminal", { stream: "stdout", line: "once" }, 0);
      source().emit("terminal", { stream: "stdout", line: "once" }, 0);
    });
    expect(view().terminal).toHaveLength(1);
  });

  it("ignores the browser's own connection-error event, which has no data", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => {
      // A connection `error` Event: no `data`, so it must not become a FAILED outcome.
      (
        source() as unknown as {
          listeners: Map<string, Array<(e: unknown) => void>>;
        }
      ).listeners
        .get("error")!
        .forEach((fn) => fn({ type: "error" }));
    });
    expect(view().outcome).toBeNull();
  });

  it("closes the stream when the build ends, and records the outcome", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => source().emit("done", { status: "SUCCEEDED" }, 5));

    expect(view().outcome).toEqual({ status: "SUCCEEDED" });
    expect(source().closed).toBe(true);
    expect(useBuildViewStore.getState().connection).toBe("closed");
  });

  it("closes the stream when a failed build reports its error", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => source().emit("error", { message: "Try again." }, 3));

    expect(view().outcome).toEqual({ status: "FAILED", message: "Try again." });
    expect(source().closed).toBe(true);
  });

  it("shows reconnecting while the browser retries, and closed once it gives up", () => {
    renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => source().onerror?.());
    expect(useBuildViewStore.getState().connection).toBe("reconnecting");

    act(() => {
      source().readyState = FakeEventSource.CLOSED;
      source().onerror?.();
    });
    expect(useBuildViewStore.getState().connection).toBe("closed");
  });

  it("starts from a clean view for each build and closes on unmount", () => {
    const first = renderHook(() => useBuildStream("prj1", "b1"), { wrapper });
    act(() => source().emit("terminal", { stream: "stdout", line: "old" }, 0));
    first.unmount();
    expect(FakeEventSource.instances[0]!.closed).toBe(true);

    renderHook(() => useBuildStream("prj1", "b2"), { wrapper });
    expect(view().terminal).toEqual([]);
    expect(useBuildViewStore.getState().buildId).toBe("b2");
  });
});

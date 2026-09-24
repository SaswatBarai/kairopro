import { useEffect, useRef, useState } from "react";

const BOTTOM_TOLERANCE_PX = 24;

/**
 * Keeps a scrolling pane pinned to its newest content while it grows, and
 * stops as soon as the user scrolls up to read something — `resume` puts it
 * back. `dependency` is whatever changes when there is new content.
 */
export function useStickyScroll<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && !paused) el.scrollTop = el.scrollHeight;
  }, [dependency, paused]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPaused(distance > BOTTOM_TOLERANCE_PX);
  };

  return { ref, paused, onScroll, resume: () => setPaused(false) };
}

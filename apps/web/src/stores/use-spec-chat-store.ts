import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  kind: "user" | "agent";
  text: string;
  /** Which specs were rewritten, e.g. "PRD v4 · Data model v3". */
  detail?: string;
  isError?: boolean;
  time: string;
}

interface SpecChatState {
  messages: Record<string, ChatMessage[]>;
  pending: Record<string, boolean>;
  addMessage: (
    projectId: string,
    message: Omit<ChatMessage, "id" | "time">,
  ) => void;
  setPending: (projectId: string, pending: boolean) => void;
}

/**
 * One conversation per project, shared by every wizard step that shows the
 * change-request chat (spec, data model, app structure) — they edit the same
 * project, so they're one thread. History persists across reloads; `pending`
 * deliberately doesn't (a request in flight dies with the page's memory).
 */
export const useSpecChatStore = create<SpecChatState>()(
  persist(
    (set) => ({
      messages: {},
      pending: {},
      addMessage: (projectId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [projectId]: [
              ...(state.messages[projectId] ?? []),
              {
                ...message,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                time: new Date().toLocaleTimeString([], { hour12: false }),
              },
            ],
          },
        })),
      setPending: (projectId, pending) =>
        set((state) => ({
          pending: { ...state.pending, [projectId]: pending },
        })),
    }),
    {
      name: "kairopro-spec-chat",
      partialize: (s) => ({ messages: s.messages }),
    },
  ),
);

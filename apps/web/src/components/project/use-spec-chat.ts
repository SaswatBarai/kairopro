import { useQueryClient } from "@tanstack/react-query";
import type { SpecType } from "@kairopro/contracts";

import { requestSpecChangeRequest, specsQueryKey } from "@/lib/queries/specs";
import {
  type ChatMessage,
  useSpecChatStore,
} from "@/stores/use-spec-chat-store";

const SPEC_LABELS: Record<SpecType, string> = {
  PRD: "PRD",
  DESIGN: "Design",
  DATA_MODEL: "Data model",
  APP_STRUCTURE: "App structure",
};

const NO_MESSAGES: ChatMessage[] = [];

export function useSpecChat(projectId: string) {
  const queryClient = useQueryClient();
  const messages = useSpecChatStore(
    (s) => s.messages[projectId] ?? NO_MESSAGES,
  );
  const isWorking = useSpecChatStore((s) => s.pending[projectId] ?? false);

  const send = (instruction: string) => {
    const { addMessage, setPending, pending } = useSpecChatStore.getState();
    if (pending[projectId]) return;

    addMessage(projectId, { kind: "user", text: instruction });
    setPending(projectId, true);

    // A plain promise, not `useMutation().mutate()`: per-call mutate
    // callbacks are dropped if the component unmounts, and this takes about
    // a minute — long enough for the user to move to another wizard step,
    // where the reply still has to land in the shared conversation.
    requestSpecChangeRequest(projectId, instruction)
      .then(({ summary, specs }) => {
        addMessage(projectId, {
          kind: "agent",
          text: summary,
          detail:
            specs.length > 0
              ? `Updated: ${specs
                  .map((s) => `${SPEC_LABELS[s.type]} v${s.version}`)
                  .join(" · ")}`
              : "No spec changes made.",
        });
        void queryClient.invalidateQueries({
          queryKey: specsQueryKey(projectId),
        });
      })
      .catch((err: unknown) => {
        addMessage(projectId, {
          kind: "agent",
          text: `Couldn't apply that change: ${
            err instanceof Error ? err.message : "Request failed"
          }`,
          isError: true,
        });
      })
      .finally(() => setPending(projectId, false));
  };

  return { messages, isWorking, send };
}

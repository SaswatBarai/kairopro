import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangeRequest, ChangeRequestList } from "@kairopro/contracts";

import { filesQueryKey } from "./files";
import { versionKeys } from "./versions";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export function changesQueryKey(projectId: string) {
  return ["projects", projectId, "changes"] as const;
}

const base = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/changes`;

export function fetchChanges(projectId: string): Promise<ChangeRequestList> {
  return request(base(projectId));
}

/** A request the agent hasn't finished with — it is either working or
 * waiting on the user. */
export const OPEN_STATUSES: ReadonlySet<string> = new Set([
  "PLANNING",
  "AWAITING_APPROVAL",
  "APPLYING",
]);

/** The agent is working: nothing to do but wait, so keep looking. */
const WORKING_STATUSES: ReadonlySet<string> = new Set(["PLANNING", "APPLYING"]);

function justApplied(
  previous: ChangeRequestList,
  next: ChangeRequestList,
): boolean {
  const before = new Map(previous.map((c) => [c.id, c.status]));
  return next.some(
    (c) =>
      c.status === "SUCCEEDED" &&
      before.get(c.id) !== undefined &&
      before.get(c.id) !== "SUCCEEDED",
  );
}

/**
 * The project's change requests, which double as the agent chat's history.
 * Polls while the agent is working. When one becomes applied the project's
 * files and history have changed underneath the workspace, so those are
 * refreshed here — where the transition is seen — rather than left for each
 * view to notice.
 */
export function useChangesQuery(projectId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: changesQueryKey(projectId),
    queryFn: async () => {
      const previous = queryClient.getQueryData<ChangeRequestList>(
        changesQueryKey(projectId),
      );
      const next = await fetchChanges(projectId);
      if (previous && justApplied(previous, next)) {
        void queryClient.invalidateQueries({
          queryKey: filesQueryKey(projectId),
        });
        void queryClient.invalidateQueries({
          queryKey: versionKeys(projectId).all,
        });
      }
      return next;
    },
    enabled: Boolean(projectId),
    refetchInterval: (query) =>
      query.state.data?.some((c) => WORKING_STATUSES.has(c.status))
        ? 2500
        : false,
  });
}

function useChangeMutation<TVars>(
  projectId: string,
  fn: (vars: TVars) => Promise<ChangeRequest>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: changesQueryKey(projectId) }),
  });
}

export function useRequestChangeMutation(projectId: string) {
  return useChangeMutation(projectId, (text: string) =>
    request<ChangeRequest>(base(projectId), {
      method: "POST",
      body: JSON.stringify({ request: text }),
    }),
  );
}

export function useApproveChangeMutation(projectId: string) {
  return useChangeMutation(projectId, (changeId: string) =>
    request<ChangeRequest>(
      `${base(projectId)}/${encodeURIComponent(changeId)}/approve`,
      { method: "POST" },
    ),
  );
}

export function useCancelChangeMutation(projectId: string) {
  return useChangeMutation(projectId, (changeId: string) =>
    request<ChangeRequest>(
      `${base(projectId)}/${encodeURIComponent(changeId)}/cancel`,
      { method: "POST" },
    ),
  );
}

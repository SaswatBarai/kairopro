import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Spec, SpecList, SpecType } from "@kairopro/contracts";

export const SPEC_TYPES: SpecType[] = [
  "PRD",
  "DESIGN",
  "DATA_MODEL",
  "APP_STRUCTURE",
];

export function specsQueryKey(projectId: string) {
  return ["projects", projectId, "specs"] as const;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export function fetchSpecs(projectId: string): Promise<SpecList> {
  return request<SpecList>(
    `/api/projects/${encodeURIComponent(projectId)}/specs`,
  );
}

export function approveSpecRequest(
  projectId: string,
  specId: string,
): Promise<Spec> {
  return request<Spec>(
    `/api/projects/${encodeURIComponent(projectId)}/specs/${encodeURIComponent(specId)}/approve`,
    { method: "POST" },
  );
}

/**
 * Polls while any of the four gate specs hasn't landed yet — there is no
 * SSE feed for spec-generation progress (docs/FRONTEND_INTEGRATION_PLAN.md
 * gap G2), so short polling is the honest, correct substitute rather than
 * pretending a single fetch always has the answer.
 */
export function useSpecsQuery(projectId: string) {
  return useQuery({
    queryKey: specsQueryKey(projectId),
    queryFn: () => fetchSpecs(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      const specs = query.state.data;
      if (!specs) return 3000;
      const haveAll = SPEC_TYPES.every((t) => specs.some((s) => s.type === t));
      return haveAll ? false : 3000;
    },
  });
}

export function findSpec(
  specs: SpecList | undefined,
  type: SpecType,
): Spec | undefined {
  return specs?.find((s) => s.type === type);
}

export function useApproveSpecMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specId: string) => approveSpecRequest(projectId, specId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: specsQueryKey(projectId),
      });
    },
  });
}

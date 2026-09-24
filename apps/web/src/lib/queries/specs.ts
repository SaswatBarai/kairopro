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

const generationStartedKey = (projectId: string) =>
  `kairopro:specGenerationStartedAt:${projectId}`;

/**
 * Records that a generation run was just kicked off for `projectId`, so the
 * spec views can tell the previous run's specs (stale) from this run's
 * (fresh). `startedAt` should come from the *server's* clock (the POST
 * response's `Date` header) — spec `createdAt` is stamped server-side, and
 * comparing it against the browser clock would misfire under any skew.
 * sessionStorage, so it survives a reload of the spec page but not a new tab.
 */
export function markSpecGenerationStarted(
  projectId: string,
  startedAt: number = Date.now(),
): void {
  try {
    sessionStorage.setItem(generationStartedKey(projectId), String(startedAt));
  } catch {
    // Storage unavailable (private mode, blocked): the views fall back to
    // showing whatever specs exist, which is the pre-existing behavior.
  }
}

function readGenerationStartedAt(projectId: string): number | null {
  try {
    const raw = sessionStorage.getItem(generationStartedKey(projectId));
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Drops specs from before the current generation run started, so a
 * regenerate shows a loader rather than the previous run's output. */
function onlyFreshSpecs(
  specs: SpecList | undefined,
  projectId: string,
): SpecList | undefined {
  if (!specs) return specs;
  const startedAt = readGenerationStartedAt(projectId);
  if (startedAt === null) return specs;
  return specs.filter((s) => new Date(s.createdAt).getTime() >= startedAt);
}

/**
 * Polls while any of the four gate specs hasn't landed yet — there is no
 * SSE feed for spec-generation progress (docs/FRONTEND_INTEGRATION_PLAN.md
 * gap G2), so short polling is the honest, correct substitute rather than
 * pretending a single fetch always has the answer.
 *
 * "Landed" means landed *in the current run*: after a regenerate, the
 * previous run's specs are filtered out of both the returned data and the
 * poll's completeness check. Checking completeness against the raw list
 * would see the old, complete set, stop polling, and never pick up the new.
 */
export function useSpecsQuery(projectId: string) {
  return useQuery({
    queryKey: specsQueryKey(projectId),
    queryFn: () => fetchSpecs(projectId),
    enabled: Boolean(projectId),
    select: (specs) => onlyFreshSpecs(specs, projectId),
    refetchInterval: (query) => {
      const specs = onlyFreshSpecs(query.state.data, projectId);
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

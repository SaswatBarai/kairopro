import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Build, BuildList } from "@kairopro/contracts";

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

const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING"]);

export function buildsQueryKey(projectId: string) {
  return ["projects", projectId, "builds"] as const;
}

export function buildQueryKey(projectId: string, buildId: string) {
  return ["projects", projectId, "builds", buildId] as const;
}

/**
 * Starts a build — or, when one is already running (a double click, a second
 * tab, "Try again" on a stale screen), returns that one so the caller lands
 * on the live build instead of an error.
 */
export async function startBuildRequest(
  projectId: string,
  resume = false,
): Promise<Build> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/builds`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume }),
    },
  );
  const body = await res.json().catch(() => null);
  if (res.ok) return body as Build;
  if (res.status === 409) {
    const active = (await fetchBuilds(projectId)).find((b) =>
      ACTIVE_STATUSES.has(b.status),
    );
    if (active) return active;
  }
  throw new Error(body?.error?.message ?? "Request failed");
}

export function fetchBuild(projectId: string, buildId: string): Promise<Build> {
  return request<Build>(
    `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}`,
  );
}

export function fetchBuilds(projectId: string): Promise<BuildList> {
  return request<BuildList>(
    `/api/projects/${encodeURIComponent(projectId)}/builds`,
  );
}

export function cancelBuildRequest(
  projectId: string,
  buildId: string,
): Promise<Build> {
  return request<Build>(
    `/api/projects/${encodeURIComponent(projectId)}/builds/${encodeURIComponent(buildId)}/cancel`,
    { method: "POST" },
  );
}

export function useStartBuildMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resume: boolean | void) =>
      startBuildRequest(projectId, resume === true),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: buildsQueryKey(projectId),
      });
    },
  });
}

/**
 * The Build row. The live stream is what updates the build screen; this
 * polls only while the build is active, as a fallback if the stream is
 * blocked (some proxies buffer or drop event streams), and stops once the
 * build is terminal.
 */
export function useBuildQuery(projectId: string, buildId: string) {
  return useQuery({
    queryKey: buildQueryKey(projectId, buildId),
    queryFn: () => fetchBuild(projectId, buildId),
    enabled: Boolean(projectId && buildId),
    refetchInterval: (query) =>
      ACTIVE_STATUSES.has(query.state.data?.status ?? "") ? 4000 : false,
  });
}

export function useBuildsQuery(projectId: string) {
  return useQuery({
    queryKey: buildsQueryKey(projectId),
    queryFn: () => fetchBuilds(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCancelBuildMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildId: string) => cancelBuildRequest(projectId, buildId),
    onSuccess: (build) => {
      void queryClient.invalidateQueries({
        queryKey: buildQueryKey(projectId, build.id),
      });
      void queryClient.invalidateQueries({
        queryKey: buildsQueryKey(projectId),
      });
    },
  });
}

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

export function buildsQueryKey(projectId: string) {
  return ["projects", projectId, "builds"] as const;
}

export function buildQueryKey(projectId: string, buildId: string) {
  return ["projects", projectId, "builds", buildId] as const;
}

export function startBuildRequest(projectId: string): Promise<Build> {
  return request<Build>(
    `/api/projects/${encodeURIComponent(projectId)}/builds`,
    { method: "POST" },
  );
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
    mutationFn: () => startBuildRequest(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: buildsQueryKey(projectId),
      });
    },
  });
}

export function useBuildQuery(
  projectId: string,
  buildId: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: buildQueryKey(projectId, buildId),
    queryFn: () => fetchBuild(projectId, buildId),
    enabled: Boolean(projectId && buildId),
    refetchInterval: options?.refetchInterval,
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DiffSummary, Version } from "@kairopro/contracts";

export function versionKeys(projectId: string) {
  return {
    all: ["projects", projectId, "versions"] as const,
    list: () => [...versionKeys(projectId).all, "list"] as const,
    diff: (versionId: string) =>
      [...versionKeys(projectId).all, versionId, "diff"] as const,
  };
}

export function useVersionsQuery(projectId: string | null | undefined) {
  return useQuery<Version[]>({
    queryKey: versionKeys(projectId ?? "").list(),
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (!res.ok) {
        throw new Error("Failed to fetch versions");
      }
      return res.json();
    },
    enabled: Boolean(projectId),
  });
}

export function useVersionDiffQuery(
  projectId: string | null | undefined,
  versionId: string | null | undefined,
) {
  return useQuery<{ summary: DiffSummary; raw: string }>({
    queryKey: versionKeys(projectId ?? "").diff(versionId ?? ""),
    queryFn: async () => {
      if (!projectId || !versionId) {
        return {
          summary: { filesChanged: 0, insertions: 0, deletions: 0 },
          raw: "",
        };
      }
      const res = await fetch(
        `/api/projects/${projectId}/versions/${versionId}/diff`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch version diff");
      }
      return res.json();
    },
    enabled: Boolean(projectId && versionId),
  });
}

export function useRevertMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/versions/${versionId}/revert`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to revert version");
      }
      return res.json() as Promise<Version>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: versionKeys(projectId).all,
      });
    },
  });
}

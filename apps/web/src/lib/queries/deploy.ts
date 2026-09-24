import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DeployInput,
  DeployResult,
  GithubConnectInput,
  GithubConnectionStatus,
  GithubExportResult,
} from "@kairopro/contracts";

import { projectQueryKey, projectsQueryKey } from "./projects";

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

const project = (id: string) => `/api/projects/${encodeURIComponent(id)}`;

/** Publishes the latest successful build. The project becomes deployed, so
 * everything that shows its status or URL is refreshed. */
export function useDeployMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeployInput) =>
      request<DeployResult>(`${project(projectId)}/deploy`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKey(projectId),
      });
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function githubStatusQueryKey(projectId: string) {
  return ["projects", projectId, "github"] as const;
}

/** Whether a GitHub account is already connected for this project. */
export function useGithubStatusQuery(projectId: string, enabled = true) {
  return useQuery({
    queryKey: githubStatusQueryKey(projectId),
    queryFn: () =>
      request<GithubConnectionStatus>(`${project(projectId)}/export/github`),
    enabled: enabled && Boolean(projectId),
  });
}

/** Pushes the project to GitHub. Pass credentials to connect (or reconnect)
 * an account first; omit them to push using the connection already saved. */
export function useGithubExportMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials?: GithubConnectInput) =>
      request<GithubExportResult>(`${project(projectId)}/export/github`, {
        method: "POST",
        body: JSON.stringify(credentials ?? {}),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: githubStatusQueryKey(projectId),
      }),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project, ProjectListItem } from "@kairopro/contracts";

export const projectsQueryKey = ["projects"] as const;

export function useProjectsQuery(initialData?: ProjectListItem[]) {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
    initialData,
    staleTime: 15_000,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProjectRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProjectRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export function fetchProjects(): Promise<ProjectListItem[]> {
  return request<ProjectListItem[]>("/api/projects");
}

export function createProjectRequest(input: {
  name: string;
  description?: string;
}): Promise<Project> {
  return request<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProjectRequest(id: string): Promise<void> {
  return request<void>(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

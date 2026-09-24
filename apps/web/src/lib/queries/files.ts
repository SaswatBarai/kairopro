import { useQuery } from "@tanstack/react-query";
import type { ProjectFileContent, ProjectFileList } from "@kairopro/contracts";

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export function filesQueryKey(projectId: string) {
  return ["projects", projectId, "files"] as const;
}

export function fileQueryKey(projectId: string, path: string) {
  return ["projects", projectId, "files", path] as const;
}

export function fetchProjectFiles(projectId: string): Promise<ProjectFileList> {
  return request(`/api/projects/${encodeURIComponent(projectId)}/files`);
}

export function fetchProjectFile(
  projectId: string,
  path: string,
): Promise<ProjectFileContent> {
  return request(
    `/api/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(path)}`,
  );
}

/** The project's file paths. */
export function useProjectFilesQuery(projectId: string) {
  return useQuery({
    queryKey: filesQueryKey(projectId),
    queryFn: () => fetchProjectFiles(projectId),
    enabled: Boolean(projectId),
  });
}

/** One file's content. Only fetched once a path is chosen. */
export function useProjectFileQuery(projectId: string, path: string | null) {
  return useQuery({
    queryKey: fileQueryKey(projectId, path ?? ""),
    queryFn: () => fetchProjectFile(projectId, path!),
    enabled: Boolean(projectId && path),
  });
}

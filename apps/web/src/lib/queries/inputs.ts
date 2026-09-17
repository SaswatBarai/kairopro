import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Input, InputList } from "@kairopro/contracts";

export const inputsQueryKey = (projectId: string) =>
  ["projects", projectId, "inputs"] as const;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  return body as T;
}

export function fetchInputs(projectId: string): Promise<InputList> {
  return request<InputList>(
    `/api/projects/${encodeURIComponent(projectId)}/inputs`,
  );
}

export function saveTextInputRequest(
  projectId: string,
  text: string,
): Promise<Input> {
  return request<Input>(
    `/api/projects/${encodeURIComponent(projectId)}/inputs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "TEXT", text }),
    },
  );
}

export function uploadFilesRequest(
  projectId: string,
  files: File[],
): Promise<InputList> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return request<InputList>(
    `/api/projects/${encodeURIComponent(projectId)}/inputs`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function deleteInputRequest(
  projectId: string,
  inputId: string,
): Promise<void> {
  return request<void>(
    `/api/projects/${encodeURIComponent(projectId)}/inputs/${encodeURIComponent(inputId)}`,
    {
      method: "DELETE",
    },
  );
}

export function useInputsQuery(projectId: string) {
  return useQuery({
    queryKey: inputsQueryKey(projectId),
    queryFn: () => fetchInputs(projectId),
    enabled: Boolean(projectId),
  });
}

export function useSaveTextInputMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => saveTextInputRequest(projectId, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inputsQueryKey(projectId),
      });
    },
  });
}

export function useUploadFilesMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadFilesRequest(projectId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inputsQueryKey(projectId),
      });
    },
  });
}

export function useDeleteInputMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputId: string) => deleteInputRequest(projectId, inputId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inputsQueryKey(projectId),
      });
    },
  });
}

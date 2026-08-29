export async function fetchFiles(projectId: string, path?: string) {
  const url = `/api/projects/${projectId}/workspace/files${path ? `?path=${encodeURIComponent(path)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch files");
  
  if (path) {
    return res.text();
  }
  return res.json();
}

export async function saveFile(projectId: string, path: string, content: string) {
  const res = await fetch(`/api/projects/${projectId}/workspace/files`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content })
  });
  if (!res.ok) throw new Error("Failed to save file");
  return res.json();
}

export async function createFile(projectId: string, path: string, isDirectory: boolean = false) {
  const res = await fetch(`/api/projects/${projectId}/workspace/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, isDirectory })
  });
  if (!res.ok) throw new Error("Failed to create file");
  return res.json();
}

export async function createSandbox(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/sandbox`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create sandbox");
  return res.json();
}

export async function getSandboxStatus(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/sandbox/status`);
  if (!res.ok) throw new Error("Failed to get sandbox status");
  return res.json();
}

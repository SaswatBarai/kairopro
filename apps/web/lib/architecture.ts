export async function getArchitecture(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/architecture`);
  if (!res.ok) throw new Error("Failed to fetch architecture");
  return res.json();
}

export async function generateArchitecture(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/architecture`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate architecture");
  return res.json();
}

export async function approveArchitecture(projectId: string, archId: string) {
  const res = await fetch(`/api/projects/${projectId}/architecture/${archId}/approve`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to approve architecture");
  return res.json();
}

export async function modifyArchitecture(projectId: string, archId: string, currentArch: any, prompt: string) {
  const res = await fetch(`/api/projects/${projectId}/architecture/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentArch, prompt, archId })
  });
  if (!res.ok) throw new Error("Failed to modify architecture");
  return res.json();
}

export async function getPRD(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/prd`);
  if (!res.ok) throw new Error("Failed to fetch PRD");
  return res.json();
}

export async function getPRDVersions(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/prd/versions`);
  if (!res.ok) throw new Error("Failed to fetch PRD versions");
  return res.json();
}

export async function approvePRD(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/prd/approve`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to approve PRD");
  return res.json();
}

export async function editPRDSection(projectId: string, sectionContent: string, prompt: string) {
  const res = await fetch(`/api/projects/${projectId}/prd/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionContent, prompt })
  });
  if (!res.ok) throw new Error("Failed to run AI edit");
  return res.json();
}

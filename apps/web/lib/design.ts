export async function getDesigns(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/design`);
  if (!res.ok) throw new Error("Failed to fetch designs");
  return res.json();
}

export async function generateDesigns(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/design`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate designs");
  return res.json();
}

export async function approveDesign(projectId: string, designId: string) {
  const res = await fetch(`/api/projects/${projectId}/design/${designId}/approve`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to approve design");
  return res.json();
}

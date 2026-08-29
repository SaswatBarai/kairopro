export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  state: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  organization?: { id: string; name: string; slug: string };
  createdBy?: { id: string; name: string; email: string; image?: string };
  _count?: { documents: number; deployments: number };
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role?: string;
  _count?: { projects: number; members: number };
}

export async function fetchProjects(orgId?: string): Promise<ProjectData[]> {
  const url = orgId ? `/api/projects?orgId=${encodeURIComponent(orgId)}` : "/api/projects";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch projects");
  const data = await res.json();
  return data.projects;
}

export async function fetchProjectById(id: string): Promise<ProjectData> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project details");
  const data = await res.json();
  return data.project;
}

export async function createProject(payload: {
  name: string;
  description?: string;
  organizationId?: string;
}): Promise<ProjectData> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create project");
  }
  const data = await res.json();
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete project");
}

export async function fetchOrganizations(): Promise<OrganizationData[]> {
  const res = await fetch("/api/orgs");
  if (!res.ok) throw new Error("Failed to fetch organizations");
  const data = await res.json();
  return data.organizations;
}

export async function createOrganization(name: string): Promise<OrganizationData> {
  const res = await fetch("/api/orgs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create organization");
  const data = await res.json();
  return data.organization;
}

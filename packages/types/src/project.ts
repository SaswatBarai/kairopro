export interface User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

export type ProjectState =
  | "draft"
  | "analyzing"
  | "clarification"
  | "prd_ready"
  | "designing"
  | "design_ready"
  | "architecture_ready"
  | "approved"
  | "developing"
  | "testing"
  | "preview"
  | "deploying"
  | "live"
  | "failed";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  state: ProjectState;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: "owner" | "admin" | "developer" | "designer" | "viewer";
  joinedAt: Date;
}

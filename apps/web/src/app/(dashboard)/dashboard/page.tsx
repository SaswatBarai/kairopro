import type { Metadata } from "next";
import { listProjects } from "@kairopro/core";
import type { ProjectListItem } from "@kairopro/contracts";

import { ProjectsDashboard } from "@/components/dashboard/projects-dashboard";
import { getRequestContext } from "@/lib/request-context";

export const metadata: Metadata = {
  title: "Projects — KairoPro",
  description: "Your KairoPro workspace projects.",
};

export default async function DashboardPage() {
  const ctx = await getRequestContext().catch(() => null);
  const initialProjects: ProjectListItem[] = ctx ? await listProjects(ctx) : [];

  return <ProjectsDashboard initialProjects={initialProjects} />;
}

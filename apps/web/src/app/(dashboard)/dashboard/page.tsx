import type { Metadata } from "next";

import { ProjectsDashboard } from "@/components/dashboard/projects-dashboard";

export const metadata: Metadata = {
  title: "Projects — KairoPro",
  description: "Your KairoPro workspace projects.",
};

export default function DashboardPage() {
  return <ProjectsDashboard />;
}

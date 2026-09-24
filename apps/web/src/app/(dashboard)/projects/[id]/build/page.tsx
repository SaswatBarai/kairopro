import type { Metadata } from "next";
import { Suspense } from "react";

import { BuildScreen } from "@/components/build/build-screen";
import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";

export const metadata: Metadata = {
  title: "Build — KairoPro",
  description:
    "Watch KairoPro build your application: what it is doing now, the code as it is written, and the result.",
};

export default async function ProjectBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DashboardAppShell
      activeTab="projects"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="Build"
    >
      <Suspense
        fallback={
          <div className="p-8 text-center text-zinc-400">Loading...</div>
        }
      >
        <BuildScreen projectId={id} />
      </Suspense>
    </DashboardAppShell>
  );
}

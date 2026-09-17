import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { BuildWorkspace } from "./build-workspace";

export function BuildPage() {
  return (
    <DashboardAppShell
      activeTab="deployments"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="Build Progress & Agent Execution"
    >
      <BuildWorkspace />
    </DashboardAppShell>
  );
}

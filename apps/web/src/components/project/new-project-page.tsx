import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { NewProjectWorkspace } from "@/components/project/new-project-workspace";

export function NewProjectPage() {
  return (
    <DashboardAppShell
      activeTab="new-project"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="Tell Us What to Build (Phase 5)"
    >
      <div className="mx-auto w-full max-w-[1520px] px-6 py-6">
        <NewProjectWorkspace />
      </div>
    </DashboardAppShell>
  );
}

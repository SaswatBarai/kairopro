import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { ClarificationForm } from "@/components/project/clarification-form";

export function QuestionsPage() {
  return (
    <DashboardAppShell
      activeTab="new-project"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="Project Clarification Questions"
    >
      <div className="flex w-full justify-center px-4 py-6 md:px-6">
        <ClarificationForm />
      </div>
    </DashboardAppShell>
  );
}

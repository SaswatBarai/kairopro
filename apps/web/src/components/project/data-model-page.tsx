"use client";

import { useSearchParams } from "next/navigation";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { AgentReviewSidebar } from "@/components/project/agent-review-sidebar";
import { DataModelGateBar } from "@/components/project/data-model-gate-bar";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { SchemaCanvas } from "@/components/project/schema-canvas";

export function DataModelPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  return (
    <DashboardAppShell
      activeTab="new-project"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="Data Model & Database Schema"
    >
      {!projectId ? (
        <NoProjectEmptyState stepName="data model review" />
      ) : (
        <>
          <DataModelGateBar />
          <div className="mx-auto w-full max-w-[1440px] px-6 py-4">
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
              <SchemaCanvas />
              <AgentReviewSidebar />
            </div>
          </div>
        </>
      )}
    </DashboardAppShell>
  );
}

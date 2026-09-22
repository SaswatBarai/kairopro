"use client";

import { useSearchParams } from "next/navigation";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { AgentStructureSidebar } from "@/components/project/agent-structure-sidebar";
import { AppStructureGateBar } from "@/components/project/app-structure-gate-bar";
import { ArchitectureSurface } from "@/components/project/architecture-surface";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { findSpec, useSpecsQuery } from "@/lib/queries/specs";

export function AppStructurePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const { data: specs, isLoading } = useSpecsQuery(projectId ?? "");
  const prdSpec = findSpec(specs, "PRD");
  const dataModelSpec = findSpec(specs, "DATA_MODEL");
  const appStructureSpec = findSpec(specs, "APP_STRUCTURE");

  return (
    <DashboardAppShell
      activeTab="new-project"
      backHref="/dashboard"
      backLabel="Back to Projects"
      showBackButton={true}
      title="App Architecture & Route Structure"
    >
      {!projectId ? (
        <NoProjectEmptyState stepName="app structure review" />
      ) : (
        <>
          <AppStructureGateBar
            spec={appStructureSpec}
            prdApproved={prdSpec?.status === "APPROVED"}
            dataModelApproved={dataModelSpec?.status === "APPROVED"}
          />
          <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start gap-6 p-6 lg:flex-row">
            <ArchitectureSurface
              spec={appStructureSpec}
              isLoading={isLoading}
            />
            <AgentStructureSidebar />
          </div>
        </>
      )}
    </DashboardAppShell>
  );
}

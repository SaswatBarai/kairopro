"use client";

import { useSearchParams } from "next/navigation";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { AgentChatPanel } from "@/components/project/agent-chat-panel";
import { DataModelGateBar } from "@/components/project/data-model-gate-bar";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { SchemaCanvas } from "@/components/project/schema-canvas";
import { findSpec, useSpecsQuery } from "@/lib/queries/specs";

export function DataModelPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const { data: specs, isLoading } = useSpecsQuery(projectId ?? "");
  const prdSpec = findSpec(specs, "PRD");
  const dataModelSpec = findSpec(specs, "DATA_MODEL");

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
          <DataModelGateBar
            spec={dataModelSpec}
            prdApproved={prdSpec?.status === "APPROVED"}
          />
          <div className="mx-auto w-full max-w-[1440px] px-6 py-4">
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
              <SchemaCanvas spec={dataModelSpec} isLoading={isLoading} />
              <AgentChatPanel
                className="xl:sticky xl:top-[92px] xl:col-span-4"
                projectId={projectId}
              />
            </div>
          </div>
        </>
      )}
    </DashboardAppShell>
  );
}

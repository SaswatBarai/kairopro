"use client";

import { useSearchParams } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AgentStructureSidebar } from "@/components/project/agent-structure-sidebar";
import { AppStructureGateBar } from "@/components/project/app-structure-gate-bar";
import { ArchitectureSurface } from "@/components/project/architecture-surface";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";

export function AppStructurePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        {!projectId ? (
          <NoProjectEmptyState stepName="app structure review" />
        ) : (
          <>
            <AppStructureGateBar />
            <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start gap-6 p-6 lg:flex-row">
              <ArchitectureSurface />
              <AgentStructureSidebar />
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

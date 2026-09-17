"use client";

import { useSearchParams } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AgentReviewSidebar } from "@/components/project/agent-review-sidebar";
import { DataModelGateBar } from "@/components/project/data-model-gate-bar";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { SchemaCanvas } from "@/components/project/schema-canvas";

export function DataModelPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
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
      </main>
      <Footer />
    </>
  );
}

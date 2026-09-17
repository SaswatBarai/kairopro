"use client";

import { useSearchParams } from "next/navigation";

import { FadeIn } from "@/components/landing/fade-in";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AgentChatPanel } from "@/components/project/agent-chat-panel";
import { DesignDirectionPanel } from "@/components/project/design-direction-panel";
import { NoProjectEmptyState } from "@/components/project/no-project-empty-state";
import { PrdDocument } from "@/components/project/prd-document";
import { SpecGateBar } from "@/components/project/spec-gate-bar";

export function SpecPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        {!projectId ? (
          <NoProjectEmptyState stepName="spec review" />
        ) : (
          <>
            <SpecGateBar />
            <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start gap-4 px-4 pb-6 pt-4 md:px-6 lg:flex-row">
              <div className="flex w-full flex-col gap-4 lg:w-[720px] lg:shrink-0">
                <FadeIn>
                  <PrdDocument />
                </FadeIn>
                <FadeIn delay={0.1}>
                  <DesignDirectionPanel />
                </FadeIn>
              </div>
              <aside className="w-full lg:sticky lg:top-[148px] lg:w-[360px] lg:shrink-0">
                <FadeIn delay={0.15}>
                  <AgentChatPanel />
                </FadeIn>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

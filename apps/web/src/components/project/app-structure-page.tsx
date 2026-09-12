import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AgentStructureSidebar } from "@/components/project/agent-structure-sidebar";
import { AppStructureGateBar } from "@/components/project/app-structure-gate-bar";
import { ArchitectureSurface } from "@/components/project/architecture-surface";

export function AppStructurePage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        <AppStructureGateBar />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start gap-6 p-6 lg:flex-row">
          <ArchitectureSurface />
          <AgentStructureSidebar />
        </div>
      </main>
      <Footer />
    </>
  );
}

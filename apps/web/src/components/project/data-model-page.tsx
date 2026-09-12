import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AgentReviewSidebar } from "@/components/project/agent-review-sidebar";
import { DataModelGateBar } from "@/components/project/data-model-gate-bar";
import { SchemaCanvas } from "@/components/project/schema-canvas";

export function DataModelPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        <DataModelGateBar />
        <div className="mx-auto w-full max-w-[1440px] px-6 py-4">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            <SchemaCanvas />
            <AgentReviewSidebar />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

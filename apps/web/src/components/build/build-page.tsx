import { BuildConsole } from "@/components/build/build-console";
import { BuildTopBar } from "@/components/build/build-top-bar";
import { ExecutionPipeline } from "@/components/build/execution-pipeline";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export function BuildPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        <BuildTopBar />
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-4">
          <ExecutionPipeline />
          <BuildConsole />
        </div>
      </main>
      <Footer />
    </>
  );
}

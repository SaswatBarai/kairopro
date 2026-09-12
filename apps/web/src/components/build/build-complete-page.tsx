import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

import { BuildCompleteWorkspace } from "./build-complete-workspace";

export function BuildCompletePage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        <BuildCompleteWorkspace />
      </main>
      <Footer />
    </>
  );
}

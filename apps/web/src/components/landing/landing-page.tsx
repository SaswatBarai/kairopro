import { AgentRuntime } from "@/components/landing/agent-runtime";
import { Architecture } from "@/components/landing/architecture";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Principles } from "@/components/landing/principles";
import { SelfHealing } from "@/components/landing/self-healing";
import { SpecToSoftware } from "@/components/landing/spec-to-software";
import { TerminalSection } from "@/components/landing/terminal-section";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="grid-lines-bg relative w-full overflow-hidden pt-[92px]">
        <Hero />
        <SpecToSoftware />
        <AgentRuntime />
        <SelfHealing />
        <Architecture />
        <Principles />
        <CodeShowcase />
        <TerminalSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

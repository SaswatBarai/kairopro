import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { AboutCta } from "@/components/marketing/about-cta";
import { StackPanel } from "@/components/marketing/stack-panel";
import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";

export function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="grid-lines-bg relative w-full overflow-hidden pt-[92px]">
        <div className="flex w-full justify-center px-6 py-20 md:py-24">
          <FadeIn className="flex w-full max-w-[680px] flex-col">
            <div className="mb-6 flex items-center gap-2.5">
              <Badge
                variant="secondary"
                mono
                className="gap-1.5 px-2.5 py-1 text-brand-cyan"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                Spec_05 // Manifesto &amp; Philosophy
              </Badge>
              <span className="font-mono-tech text-[11px] text-zinc-500">
                Rev. 2025.4
              </span>
            </div>

            <h1 className="mb-8 text-3xl font-bold leading-tight tracking-tight text-zinc-100 md:text-5xl">
              Why KairoPro exists.
            </h1>

            <div className="mb-8 space-y-6 text-base leading-[1.75] text-zinc-400 md:text-[17px]">
              <p>
                Software engineering should be about architecture, data design,
                and solving actual human problems — not spending days stitching
                together configuration files, fighting database migrations, and
                configuring boilerplate build tooling.
              </p>
              <p>
                We built KairoPro because AI code generators either produce
                disconnected snippets in a chat window, or black-box toys with
                unmanageable abstractions. We believe developers deserve
                autonomous agents that understand strict schemas, execute
                end-to-end type safety, and leave you with clean, standard code
                you completely own.
              </p>
              <p>
                Every project scaffolded by KairoPro adheres to production-grade
                patterns, runs its own automated test suites in isolated
                sandboxes, and commits clean TypeScript directly to your
                repository. No proprietary runtimes, no vendor lock-in, and no
                magic.
              </p>
            </div>

            <StackPanel className="mb-8" />
            <AboutCta />
          </FadeIn>
        </div>
      </main>
      <Footer />
    </>
  );
}

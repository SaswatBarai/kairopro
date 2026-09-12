import { ArrowRight } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FeaturesCta() {
  return (
    <section className="w-full border-t border-white/[0.08] bg-brand-surface px-6 py-20">
      <FadeIn className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <Badge
          variant="secondary"
          mono
          className="gap-1.5 px-2.5 py-1 text-brand-cyan"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
          Ready to Build
        </Badge>

        <h2 className="text-3xl font-bold tracking-tight text-zinc-100 md:text-[36px] md:leading-[44px]">
          Stop wrestling with boilerplates. Ship real software today.
        </h2>

        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
          Let autonomous agents handle schema normalization, scaffolding, and
          verification while you retain 100% architectural ownership.
        </p>

        <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <a href="/register">
              Start building
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#">Read the documentation</a>
          </Button>
        </div>

        <div className="pt-2 font-mono-tech text-[11px] text-zinc-500">
          Free while in beta · No credit card required · Instant GitHub export
        </div>
      </FadeIn>
    </section>
  );
}

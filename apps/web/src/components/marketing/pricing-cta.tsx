import { ArrowRight } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";

export function PricingCta() {
  return (
    <FadeIn className="mt-10 flex flex-col items-center text-center">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
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
      <p className="mt-4 font-mono-tech text-[11px] tracking-tight text-zinc-400">
        Instant access with GitHub or Google · No waitlist
      </p>
    </FadeIn>
  );
}

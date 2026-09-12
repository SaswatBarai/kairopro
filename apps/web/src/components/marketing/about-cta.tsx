import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AboutCta() {
  return (
    <div className="flex flex-col items-center justify-center border-t border-white/[0.08] pt-6 text-center">
      <Button asChild size="lg" className="w-full gap-2 sm:w-auto">
        <a href="/register">
          Start building
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
      <p className="mt-4 text-xs text-zinc-500">
        Free while in beta · Instant access with GitHub or Google
      </p>
    </div>
  );
}

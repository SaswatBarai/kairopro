import { FadeIn } from "@/components/landing/fade-in";
import { Badge } from "@/components/ui/badge";

export function PricingHero() {
  return (
    <FadeIn className="flex max-w-2xl flex-col items-center text-center">
      <Badge
        variant="secondary"
        mono
        className="gap-1.5 px-2.5 py-1 text-zinc-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
        Beta access · No credit card required
      </Badge>
      <h1 className="mt-6 text-4xl font-bold leading-[1.15] tracking-tight text-zinc-100 md:text-[44px] md:leading-[52px]">
        Free while we&apos;re in beta.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
        Every feature is available at no cost while KairoPro is in beta:
        unlimited projects, deployment, and GitHub export. Paid plans with usage
        limits will be introduced later — beta users will be told in advance.
      </p>
    </FadeIn>
  );
}

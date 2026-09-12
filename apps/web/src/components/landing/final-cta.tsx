import { FadeIn } from "@/components/landing/fade-in";
import { Button } from "@/components/ui/button";

const guarantees = [
  "No credit card required",
  "Free tier available",
  "Full GitHub export",
];

export function FinalCta() {
  return (
    <section
      id="pricing"
      className="relative mx-auto max-w-6xl overflow-hidden border-t border-white/[0.06] px-6 py-28 text-center"
    >
      <div className="relative z-10 mx-auto max-w-3xl">
        <FadeIn>
          <span className="font-mono-tech text-xs font-semibold uppercase tracking-widest text-brand-purple">
            GET STARTED IN MINUTES
          </span>
          <h2 className="mb-4 mt-3 text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl">
            STOP DESCRIBING SOFTWARE.
            <br />
            START SHIPPING IT.
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base text-zinc-400">
            Turn your product specification into a working, tested application.
          </p>
          <Button
            asChild
            size="lg"
            className="inline-flex shadow-[0_0_30px_rgba(109,94,245,0.4)] hover:shadow-[0_0_40px_rgba(109,94,245,0.6)]"
          >
            <a href="#">
              <span>Start building</span>
              <span>→</span>
            </a>
          </Button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 font-mono-tech text-[11px] text-zinc-500">
            {guarantees.map((g) => (
              <span key={g}>• {g}</span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

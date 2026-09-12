import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { InclusionPanel } from "@/components/marketing/inclusion-panel";
import { PricingCta } from "@/components/marketing/pricing-cta";
import { PricingFaq } from "@/components/marketing/pricing-faq";
import { PricingHero } from "@/components/marketing/pricing-hero";

export function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="grid-lines-bg relative w-full overflow-hidden pt-[92px]">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-12 md:py-20">
          <PricingHero />
          <InclusionPanel />
          <PricingCta />
          <PricingFaq />
        </div>
      </main>
      <Footer />
    </>
  );
}

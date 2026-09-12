import type { Metadata } from "next";

import { PricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — KairoPro",
  description:
    "Free while KairoPro is in beta: unlimited projects, deployments, and GitHub export. No credit card required.",
};

export default function PricingRoute() {
  return <PricingPage />;
}

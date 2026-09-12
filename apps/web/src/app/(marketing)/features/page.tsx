import type { Metadata } from "next";

import { FeaturesPage } from "@/components/marketing/features-page";

export const metadata: Metadata = {
  title: "Features — KairoPro",
  description:
    "From raw markdown PRDs to production-ready Next.js repositories: ingestion, verification gates, autonomous compilation, self-healing tests, ephemeral staging, and zero lock-in export.",
};

export default function FeaturesRoute() {
  return <FeaturesPage />;
}

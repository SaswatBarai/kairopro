import type { Metadata } from "next";

import { AboutPage } from "@/components/marketing/about-page";

export const metadata: Metadata = {
  title: "About — KairoPro",
  description:
    "Why KairoPro exists: autonomous agents that understand strict schemas, execute end-to-end type safety, and leave you with clean, standard code you completely own.",
};

export default function AboutRoute() {
  return <AboutPage />;
}

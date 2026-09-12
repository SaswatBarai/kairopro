import type { Metadata } from "next";

import { BuildPage } from "@/components/build/build-page";

export const metadata: Metadata = {
  title: "Build progress — KairoPro",
  description:
    "Watch the KairoPro agent compile your application in real time — pipeline stages, live terminal, and generated artifacts.",
};

export default function ProjectBuildRoute() {
  return <BuildPage />;
}

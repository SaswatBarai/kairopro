import type { Metadata } from "next";
import { Suspense } from "react";

import { AppStructurePage } from "@/components/project/app-structure-page";

export const metadata: Metadata = {
  title: "App structure review — KairoPro",
  description:
    "Review the generated routes, API endpoints, and component architecture, then start the build.",
};

export default function ProjectAppStructureRoute() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}
    >
      <AppStructurePage />
    </Suspense>
  );
}

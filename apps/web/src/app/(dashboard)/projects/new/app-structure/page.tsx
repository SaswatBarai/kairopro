import type { Metadata } from "next";

import { AppStructurePage } from "@/components/project/app-structure-page";

export const metadata: Metadata = {
  title: "App structure review — KairoPro",
  description:
    "Review the generated routes, API endpoints, and component architecture, then start the build.",
};

export default function ProjectAppStructureRoute() {
  return <AppStructurePage />;
}

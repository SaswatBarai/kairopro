import type { Metadata } from "next";
import { Suspense } from "react";

import { NewProjectPage } from "@/components/project/new-project-page";

export const metadata: Metadata = {
  title: "New project — KairoPro",
  description:
    "Describe your application in natural language, or start from a template, to generate a production-ready PRD.",
};

export default function NewProjectRoute() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}
    >
      <NewProjectPage />
    </Suspense>
  );
}

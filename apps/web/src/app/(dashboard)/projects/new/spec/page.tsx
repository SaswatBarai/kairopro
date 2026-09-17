import type { Metadata } from "next";
import { Suspense } from "react";

import { SpecPage } from "@/components/project/spec-page";

export const metadata: Metadata = {
  title: "Review spec — KairoPro",
  description:
    "Review the generated PRD, choose a design direction, and request changes before approving Gate 1.",
};

export default function ProjectSpecRoute() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}
    >
      <SpecPage />
    </Suspense>
  );
}

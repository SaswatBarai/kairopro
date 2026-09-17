import type { Metadata } from "next";
import { Suspense } from "react";

import { DataModelPage } from "@/components/project/data-model-page";

export const metadata: Metadata = {
  title: "Data model review — KairoPro",
  description:
    "Review the generated PostgreSQL schema and Prisma models, request changes, and approve Gate 2.",
};

export default function ProjectDataModelRoute() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}
    >
      <DataModelPage />
    </Suspense>
  );
}

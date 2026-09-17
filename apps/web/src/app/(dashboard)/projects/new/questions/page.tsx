import type { Metadata } from "next";
import { Suspense } from "react";

import { QuestionsPage } from "@/components/project/questions-page";

export const metadata: Metadata = {
  title: "Project questions — KairoPro",
  description:
    "Answer a few clarifying questions about authentication, tenancy, roles, and billing before PRD generation.",
};

export default function ProjectQuestionsRoute() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-zinc-400">Loading...</div>}
    >
      <QuestionsPage />
    </Suspense>
  );
}

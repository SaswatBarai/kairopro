import type { Metadata } from "next";

import { QuestionsPage } from "@/components/project/questions-page";

export const metadata: Metadata = {
  title: "Project questions — KairoPro",
  description:
    "Answer a few clarifying questions about authentication, tenancy, roles, and billing before PRD generation.",
};

export default function ProjectQuestionsRoute() {
  return <QuestionsPage />;
}

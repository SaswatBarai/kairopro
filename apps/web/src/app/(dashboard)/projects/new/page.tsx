import type { Metadata } from "next";

import { NewProjectPage } from "@/components/project/new-project-page";

export const metadata: Metadata = {
  title: "New project — KairoPro",
  description:
    "Describe your application in natural language, or start from a template, to generate a production-ready PRD.",
};

export default function NewProjectRoute() {
  return <NewProjectPage />;
}

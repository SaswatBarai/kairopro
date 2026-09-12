import type { Metadata } from "next";

import { DataModelPage } from "@/components/project/data-model-page";

export const metadata: Metadata = {
  title: "Data model review — KairoPro",
  description:
    "Review the generated PostgreSQL schema and Prisma models, request changes, and approve Gate 2.",
};

export default function ProjectDataModelRoute() {
  return <DataModelPage />;
}

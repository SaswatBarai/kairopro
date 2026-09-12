import type { Metadata } from "next";

import { SpecPage } from "@/components/project/spec-page";

export const metadata: Metadata = {
  title: "Review spec — KairoPro",
  description:
    "Review the generated PRD, choose a design direction, and request changes before approving Gate 1.",
};

export default function ProjectSpecRoute() {
  return <SpecPage />;
}

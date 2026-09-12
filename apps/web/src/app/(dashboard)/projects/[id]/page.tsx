import type { Metadata } from "next";

import { WorkspacePage } from "@/components/workspace/workspace-page";

export const metadata: Metadata = {
  title: "TaskFlow — Workspace — KairoPro",
  description:
    "KairoPro developer workspace — code editor, file explorer, agent workbench, and runtime diagnostics.",
};

export default function ProjectWorkspaceRoute() {
  return <WorkspacePage />;
}

import type { Metadata } from "next";

import { BuildWorkbench } from "@/components/build/build-workbench";

export const metadata: Metadata = {
  title: "Build — KairoPro",
};

export default async function ProjectBuildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <BuildWorkbench />;
}

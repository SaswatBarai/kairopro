import type { Metadata } from "next";

import { BuildCompletePage } from "@/components/build/build-complete-page";

export const metadata: Metadata = {
  title: "Build complete — KairoPro",
  description:
    "Your generated application is live — preview it, inspect artifacts, review agent decisions, and open the deployment.",
};

export default function BuildCompleteRoute() {
  return <BuildCompletePage />;
}

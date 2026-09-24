"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { rememberSetupStep } from "@/lib/setup-progress";

/** Renders nothing; records the current wizard step for the open project so
 * the dashboard can resume there. Mounted once in the wizard's layout. */
export function RememberSetupStep() {
  const pathname = usePathname();
  const projectId = useSearchParams().get("projectId");

  useEffect(() => {
    if (projectId) rememberSetupStep(projectId, pathname);
  }, [pathname, projectId]);

  return null;
}

import { Suspense } from "react";

import { RememberSetupStep } from "@/components/project/remember-setup-step";

export default function NewProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <RememberSetupStep />
      </Suspense>
      {children}
    </>
  );
}

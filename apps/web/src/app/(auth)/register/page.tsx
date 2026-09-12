import type { Metadata } from "next";

import { RegisterPage } from "@/components/auth/register-page";

export const metadata: Metadata = {
  title: "Create account — KairoPro",
  description:
    "Start building full-stack apps from PRDs in minutes. Free during beta.",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}

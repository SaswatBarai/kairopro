import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";

export const metadata: Metadata = {
  title: "Reset password — KairoPro",
  description:
    "Self-service password reset is handled manually during the KairoPro beta. Contact the security team to regain workspace access.",
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}

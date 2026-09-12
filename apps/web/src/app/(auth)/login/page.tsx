import type { Metadata } from "next";

import { LoginPage } from "@/components/auth/login-page";

export const metadata: Metadata = {
  title: "Log in — KairoPro",
  description: "Sign in to KairoPro to continue building.",
};

export default function LoginRoute() {
  return <LoginPage />;
}

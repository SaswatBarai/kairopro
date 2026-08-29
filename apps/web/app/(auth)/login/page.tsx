import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign In — KairoPro",
  description: "Sign in to your KairoPro account",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-center py-8">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

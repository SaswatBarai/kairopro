import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Create Account — KairoPro",
  description: "Create a new KairoPro account",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-center py-8">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

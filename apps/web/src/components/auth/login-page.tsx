import { AuthProofPanel } from "@/components/auth/auth-proof-panel";
import { LoginForm } from "@/components/auth/login-form";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-hidden pt-[92px]">
        <div className="grid min-h-[calc(100dvh-160px)] w-full grid-cols-1 lg:grid-cols-2">
          <div className="flex w-full flex-col items-center justify-center bg-brand-dark px-6 py-12">
            <LoginForm />
          </div>
          <AuthProofPanel />
        </div>
      </main>
      <Footer />
    </>
  );
}

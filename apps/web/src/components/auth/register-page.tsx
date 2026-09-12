import { RegisterForm } from "@/components/auth/register-form";
import { RegisterProofPanel } from "@/components/auth/register-proof-panel";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-hidden pt-[92px]">
        <div className="grid min-h-[calc(100dvh-160px)] w-full grid-cols-1 lg:grid-cols-2">
          <div className="flex w-full flex-col items-center justify-center bg-brand-dark px-6 py-6 lg:py-10">
            <RegisterForm />
          </div>
          <RegisterProofPanel />
        </div>
      </main>
      <Footer />
    </>
  );
}

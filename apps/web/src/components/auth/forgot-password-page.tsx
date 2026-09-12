import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

export function ForgotPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-hidden pt-[92px]">
        <div className="flex min-h-[calc(100dvh-160px)] w-full flex-col items-center justify-center px-6 py-10">
          <ForgotPasswordCard />
        </div>
      </main>
      <Footer />
    </>
  );
}

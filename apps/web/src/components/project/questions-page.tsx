import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ClarificationForm } from "@/components/project/clarification-form";

export function QuestionsPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-hidden pt-[92px]">
        <div className="flex w-full justify-center px-4 py-6 md:px-6">
          <ClarificationForm />
        </div>
      </main>
      <Footer />
    </>
  );
}

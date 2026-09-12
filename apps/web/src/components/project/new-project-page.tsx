import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { NewProjectWorkspace } from "@/components/project/new-project-workspace";

export function NewProjectPage() {
  return (
    <>
      <Navbar />
      <main className="relative w-full pt-[92px]">
        <div className="mx-auto w-full max-w-[1520px] px-6 py-6">
          <NewProjectWorkspace />
        </div>
      </main>
      <Footer />
    </>
  );
}

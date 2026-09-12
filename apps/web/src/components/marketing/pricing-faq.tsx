import { FadeIn } from "@/components/landing/fade-in";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Will it stay free?",
    answer:
      "No. Paid plans are planned. Beta users will be notified before anything changes.",
  },
  { question: "Do you use my code for training?", answer: "No." },
  {
    question: "Can I export my project?",
    answer: "Yes, to GitHub at any time.",
  },
  {
    question: "What stack does it generate?",
    answer: "Next.js, PostgreSQL, Prisma, NextAuth, and shadcn/ui.",
  },
];

export function PricingFaq() {
  return (
    <FadeIn className="mt-24 w-full border-t border-white/[0.08] pt-12">
      <div className="mb-1 font-mono-tech text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Spec_04 // Terms &amp; Architecture
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
        Frequently asked questions
      </h3>

      <Accordion
        collapsible
        defaultValue="faq-0"
        type="single"
        className="mt-6 w-full border-y border-white/[0.06]"
      >
        {faqs.map((faq, index) => (
          <AccordionItem
            key={faq.question}
            value={`faq-${index}`}
            className="border-white/[0.06]"
          >
            <AccordionTrigger className="py-5 text-[15px] font-medium text-zinc-100 hover:no-underline [&_svg]:size-5 [&_svg]:text-zinc-400">
              <span className="flex items-center gap-4">
                <span className="font-mono-tech text-[11px] text-zinc-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {faq.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pl-8">
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
                {faq.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </FadeIn>
  );
}

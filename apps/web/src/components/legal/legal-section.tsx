import { Card } from "@/components/ui/card";

export function LegalSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <span className="font-mono-tech text-[13px] font-medium text-brand-purple">
          {index} //
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h2>
      </div>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export function NoticeBox({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-lg border-white/[0.05] bg-brand-surface-muted p-4 shadow-none">
      {label ? (
        <span className="mb-1 block font-mono-tech text-[11px] uppercase tracking-wider text-brand-purple">
          {label}
        </span>
      ) : null}
      <div className="text-[13px] leading-relaxed text-zinc-400">
        {children}
      </div>
    </Card>
  );
}

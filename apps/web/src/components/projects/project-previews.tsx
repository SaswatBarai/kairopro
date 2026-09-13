import {
  FileText,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

function WindowChrome({
  url,
  trailing,
}: {
  url: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex h-6 items-center justify-between border-b border-white/[0.06] bg-brand-surface px-2">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />
      </div>
      <span className="font-mono-tech text-[9px] text-zinc-500">{url}</span>
      {trailing}
    </div>
  );
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-36 w-full select-none flex-col overflow-hidden rounded-[3px] border border-white/[0.06] bg-brand-dark">
      {children}
    </div>
  );
}

export function KanbanPreview() {
  return (
    <PreviewShell>
      <WindowChrome
        trailing={<ShieldCheck className="h-3 w-3 text-zinc-500" />}
        url="app.taskflow.internal"
      />
      <div className="grid flex-1 grid-cols-3 gap-1.5 bg-brand-dark p-2">
        <div className="flex flex-col gap-1 rounded-[2px] border border-white/[0.04] bg-brand-surface p-1">
          <div className="flex items-center justify-between font-mono-tech text-[8px] text-zinc-500">
            <span>BACKLOG</span>
            <span>2</span>
          </div>
          <div className="flex h-5 flex-col justify-center rounded-[2px] border border-white/[0.06] bg-white/[0.04] p-1">
            <div className="h-1 w-3/4 rounded-[2px] bg-white/[0.12]" />
          </div>
          <div className="flex h-5 flex-col justify-center rounded-[2px] border border-white/[0.06] bg-white/[0.04] p-1">
            <div className="h-1 w-1/2 rounded-[2px] bg-white/[0.12]" />
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-[2px] border border-white/[0.04] bg-brand-surface p-1">
          <div className="flex items-center justify-between font-mono-tech text-[8px] text-brand-purple-light">
            <span>IN PROG</span>
            <span>1</span>
          </div>
          <div className="flex h-7 flex-col justify-between rounded-[2px] border border-brand-purple/30 bg-brand-surface-muted p-1">
            <div className="h-1.5 w-4/5 rounded-[2px] bg-brand-purple/40" />
            <div className="h-1 w-1/3 rounded-[2px] bg-brand-green/40" />
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-[2px] border border-white/[0.04] bg-brand-surface p-1">
          <div className="flex items-center justify-between font-mono-tech text-[8px] text-brand-green">
            <span>DONE</span>
            <span>4</span>
          </div>
          <div className="flex h-5 flex-col justify-center rounded-[2px] border border-white/[0.06] bg-white/[0.04] p-1">
            <div className="h-1 w-5/6 rounded-[2px] bg-white/[0.12]" />
          </div>
          <div className="flex h-5 flex-col justify-center rounded-[2px] border border-white/[0.06] bg-white/[0.04] p-1">
            <div className="h-1 w-2/3 rounded-[2px] bg-white/[0.12]" />
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

const INVOICE_ROWS = [
  {
    id: "#INV-802",
    client: "Acme Labs",
    amount: "$4,850",
    status: "PAID",
    paid: true,
  },
  {
    id: "#INV-803",
    client: "Vortex Corp",
    amount: "$1,200",
    status: "PENDING",
    paid: false,
  },
  {
    id: "#INV-804",
    client: "Hyperion",
    amount: "$9,400",
    status: "PAID",
    paid: true,
  },
];

export function InvoicePreview() {
  return (
    <PreviewShell>
      <WindowChrome
        trailing={<SlidersHorizontal className="h-3 w-3 text-zinc-500" />}
        url="crm-staging.preview"
      />
      <div className="flex flex-1 flex-col gap-1.5 bg-brand-dark p-2">
        <div className="grid grid-cols-4 border-b border-white/[0.06] pb-1 font-mono-tech text-[8px] text-zinc-500">
          <span>INVOICE</span>
          <span>CLIENT</span>
          <span>AMOUNT</span>
          <span className="text-right">STATUS</span>
        </div>
        {INVOICE_ROWS.map((row, index) => (
          <div
            className={`grid grid-cols-4 items-center py-0.5 font-mono-tech text-[8px] ${
              index < INVOICE_ROWS.length - 1
                ? "border-b border-white/[0.04]"
                : ""
            }`}
            key={row.id}
          >
            <span className="text-zinc-100">{row.id}</span>
            <span className="truncate text-zinc-500">{row.client}</span>
            <span className="font-semibold text-zinc-100">{row.amount}</span>
            <div className="flex justify-end">
              <span
                className={`rounded-[2px] px-1 text-[7px] ${
                  row.paid
                    ? "bg-brand-green/10 text-brand-green"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                {row.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

const CODE_STREAM = [
  "> generating schema /api/v1/slots",
  "> running AST codegen [agent:core-02]",
  "> validating edge functions ... OK",
];

export function BuildingPreview() {
  return (
    <div className="relative flex h-36 w-full select-none flex-col items-center justify-center overflow-hidden rounded-[3px] border border-dashed border-brand-cyan/30 bg-brand-dark p-4">
      <div className="pointer-events-none absolute inset-0 select-none p-2 font-mono-tech text-[9px] leading-tight text-brand-cyan opacity-15">
        {CODE_STREAM.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan">
          <RefreshCw className="h-[18px] w-[18px] animate-spin" />
        </div>
        <span className="font-mono-tech text-xs font-medium tracking-tight text-brand-cyan">
          Building agent task…
        </span>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-brand-surface">
        <div className="h-full w-2/5 animate-pulse bg-brand-cyan" />
      </div>
    </div>
  );
}

export function DraftPreview() {
  return (
    <div className="flex h-36 w-full select-none flex-col items-center justify-center rounded-[3px] border border-dashed border-white/[0.08] bg-brand-dark p-4 text-center">
      <FileText className="mb-1 h-6 w-6 text-zinc-500" />
      <span className="text-xs font-medium text-zinc-400">No preview yet</span>
      <span className="mt-0.5 font-mono-tech text-[10px] text-zinc-500">
        Specification verified and queued
      </span>
    </div>
  );
}

/** Generic live-app preview for projects without a bespoke mock screen. */
export function LivePreview({ url }: { url?: string | null }) {
  return (
    <PreviewShell>
      <WindowChrome
        trailing={<ShieldCheck className="h-3 w-3 text-zinc-500" />}
        url={url ?? "preview pending"}
      />
      <div className="grid flex-1 grid-cols-2 gap-1.5 bg-brand-dark p-2">
        <div className="flex flex-col gap-1 rounded-[2px] border border-white/[0.04] bg-brand-surface p-1.5">
          <div className="h-1 w-1/2 rounded-[2px] bg-white/[0.12]" />
          <div className="h-1 w-3/4 rounded-[2px] bg-white/[0.08]" />
          <div className="h-1 w-2/3 rounded-[2px] bg-white/[0.08]" />
        </div>
        <div className="flex flex-col gap-1 rounded-[2px] border border-white/[0.04] bg-brand-surface p-1.5">
          <div className="h-1 w-2/3 rounded-[2px] bg-brand-purple/40" />
          <div className="h-1 w-1/2 rounded-[2px] bg-white/[0.08]" />
          <div className="h-1 w-3/5 rounded-[2px] bg-white/[0.08]" />
        </div>
      </div>
    </PreviewShell>
  );
}

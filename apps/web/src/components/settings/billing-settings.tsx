"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarSync,
  CreditCard,
  Download,
  FileDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

const SECTION_BASE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

function UsageCard({
  label,
  value,
  pct,
  pctColor,
  barColor,
  note,
  delay,
}: {
  label: string;
  value: string;
  pct: string;
  pctColor: string;
  barColor: string;
  note: string;
  delay: number;
}) {
  return (
    <motion.div
      {...SECTION_BASE}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="flex flex-col justify-between gap-4 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <div className="flex items-baseline justify-between">
          <span className="font-mono-tech text-[15px] font-semibold text-zinc-100">
            {value}
          </span>
          <span className={cn("font-mono-tech text-[11px]", pctColor)}>
            {pct}
          </span>
        </div>
        <div className="my-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-dark">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: pct }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + 0.2,
            }}
            className={cn("h-full rounded-full", barColor)}
          />
        </div>
      </div>
      <div className="border-t border-white/[0.06] pt-2 font-mono-tech text-[11px] leading-relaxed text-zinc-400">
        {note}
      </div>
    </motion.div>
  );
}

const PROJECT_ROWS = [
  {
    name: "TaskFlow",
    dot: "bg-brand-purple-light",
    threads: "24 peak",
    tokens: "2.6M",
    hours: "84.2 hrs",
    cost: "$28.40",
  },
  {
    name: "Invoice CRM",
    dot: "bg-brand-cyan",
    threads: "8 peak",
    tokens: "1.1M",
    hours: "41.0 hrs",
    cost: "$14.10",
  },
  {
    name: "Internal Dashboard",
    dot: "bg-zinc-500",
    threads: "2 peak",
    tokens: "0.5M",
    hours: "17.3 hrs",
    cost: "$6.50",
  },
];

const INVOICES = [
  { date: "Oct 01, 2025", id: "INV-2025-010", amount: "$49.00 USD" },
  { date: "Sep 01, 2025", id: "INV-2025-009", amount: "$49.00 USD" },
  { date: "Aug 01, 2025", id: "INV-2025-008", amount: "$49.00 USD" },
];

export function BillingSettings() {
  const [hardStop, setHardStop] = useState(true);

  return (
    <div className="flex w-full max-w-[880px] flex-col gap-4">
      <motion.div
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-1.5 pb-1"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-zinc-100">
            Billing &amp; Usage
          </h1>
          <span className="rounded-[2px] border border-brand-purple-light/30 bg-brand-purple/20 px-2 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-purple-light">
            Pro Plus Tier
          </span>
        </div>
        <p className="max-w-xl text-[13px] leading-relaxed text-zinc-300">
          Monitor agent compute consumption, active execution hours, inference
          tokens, and payment methods.
        </p>
      </motion.div>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
        className="flex flex-col gap-4 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-4"
      >
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-semibold leading-7 tracking-tight text-zinc-100">
                Pro Plus Developer Plan
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-brand-green/30 bg-brand-green/10 px-2 py-0.5 font-mono-tech text-[11px] text-brand-green">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono-tech">
              <span className="text-[13px] font-semibold text-zinc-100">
                $49.00
              </span>
              <span className="text-[12px] text-zinc-300">
                / month, billed monthly
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-[2px] bg-brand-purple px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[#5544dc]"
            >
              Upgrade to Team
            </button>
            <button
              type="button"
              className="rounded-[2px] border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-[13px] text-zinc-100 transition-colors hover:bg-white/[0.1]"
            >
              Manage Payment Method
            </button>
            <button
              type="button"
              className="rounded-[2px] px-2 py-1.5 text-[12px] text-zinc-300 transition-colors hover:bg-rose-400/10 hover:text-rose-400"
            >
              Cancel subscription
            </button>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-2 rounded-[2px] border border-white/[0.06] bg-white/[0.02] p-2 font-mono-tech text-[11px] text-zinc-300 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <CalendarSync className="h-4 w-4 text-zinc-500" />
            <span>
              Next billing cycle:{" "}
              <strong className="font-semibold text-zinc-100">
                November 1, 2025
              </strong>{" "}
              (in 18 days)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-zinc-500" />
            <span>
              Renews via{" "}
              <strong className="font-semibold text-zinc-100">
                Visa ending in 4242
              </strong>
            </span>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <UsageCard
          label="Agent Concurrency"
          value="34 / 50"
          pct="68%"
          pctColor="text-brand-cyan"
          barColor="bg-brand-cyan"
          note="Peak 48 threads yesterday during Turbopack compile"
          delay={0.12}
        />
        <UsageCard
          label="Inference Tokens"
          value="4.2M / 10M"
          pct="42%"
          pctColor="text-brand-purple-light"
          barColor="bg-brand-purple"
          note="Resets in 18 days • Est. run rate: 7.1M"
          delay={0.16}
        />
        <UsageCard
          label="MicroVM Runtime"
          value="142.5 / 250h"
          pct="57%"
          pctColor="text-brand-green"
          barColor="bg-brand-green"
          note="Edge MicroVM runtime across 4 active branches"
          delay={0.2}
        />
      </section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.22 }}
        className="flex flex-col gap-3 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
              Usage by Project
            </span>
            <span className="font-mono-tech text-[11px] text-zinc-300">
              (Current Period)
            </span>
          </div>
          <span className="font-mono-tech text-[11px] text-zinc-500">
            Oct 1 – Oct 14, 2025
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-2">Project Name</th>
                <th className="pb-2">Threads Peak</th>
                <th className="pb-2">Inference Tokens</th>
                <th className="pb-2">Compute Hours</th>
                <th className="pb-2 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="font-mono-tech text-[11px]">
              {PROJECT_ROWS.map((row) => (
                <tr
                  key={row.name}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 text-[12px] font-medium text-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                      {row.name}
                    </div>
                  </td>
                  <td className="py-2.5 text-zinc-100">{row.threads}</td>
                  <td className="py-2.5 text-zinc-100">{row.tokens}</td>
                  <td className="py-2.5 text-zinc-100">{row.hours}</td>
                  <td className="py-2.5 text-right">
                    <span className="font-medium text-zinc-100">
                      {row.cost}
                    </span>
                    <span className="block font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                      Quota covered
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.1] bg-white/[0.02] font-mono-tech text-[11px]">
                <td className="py-2.5 font-semibold text-zinc-100">
                  Total Aggregation
                </td>
                <td className="py-2.5 font-semibold text-zinc-100">
                  34 active/pk
                </td>
                <td className="py-2.5 font-semibold text-zinc-100">
                  4.2M tokens
                </td>
                <td className="py-2.5 font-semibold text-zinc-100">
                  142.5 hrs
                </td>
                <td className="py-2.5 text-right font-mono-tech text-[12px] font-semibold text-brand-purple-light">
                  $49.00 / plan
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.26 }}
        className="flex flex-col gap-3 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <span className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
            Invoices
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[2px] border border-white/[0.08] bg-white/[0.05] px-2 py-1 font-mono-tech text-[11px] text-zinc-100 transition-colors hover:bg-white/[0.1]"
          >
            <Download className="h-3.5 w-3.5" />
            Download all (CSV)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left font-mono-tech text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-2">Billing Date</th>
                <th className="pb-2">Invoice ID</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="text-zinc-100">
              {INVOICES.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 text-zinc-300">{invoice.date}</td>
                  <td className="py-2.5 font-semibold text-brand-purple-light">
                    {invoice.id}
                  </td>
                  <td className="py-2.5">{invoice.amount}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center rounded-[2px] border border-brand-green/30 bg-brand-green/10 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                      Paid
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      title="Download PDF"
                      className="rounded-[2px] p-1 text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-100"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section
        {...SECTION_BASE}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
        className="flex flex-col gap-3 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3"
      >
        <div className="flex flex-col gap-1 border-b border-white/[0.06] pb-2">
          <span className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-100">
            Spending Limit &amp; Guardrails
          </span>
          <p className="text-[12px] leading-relaxed text-zinc-300">
            Prevent runaway agent inference or unexpected compute spikes across
            autonomous background jobs.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-zinc-100">
                Hard stop on compute quota overages
              </span>
              <span className="max-w-md text-[12px] leading-relaxed text-zinc-300">
                Suspends autonomous agent loop execution immediately when thread
                or token cap reaches 100%.
              </span>
            </div>
            <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={hardStop}
                onChange={(e) => setHardStop(e.target.checked)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "h-5 w-9 rounded-full transition-colors peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-purple-light/60",
                  hardStop ? "bg-brand-purple" : "bg-white/[0.12]",
                )}
              >
                <div
                  className={cn(
                    "top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-transform",
                    hardStop && "translate-x-4",
                  )}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-col justify-between gap-3 border-t border-white/[0.04] pt-2 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] text-zinc-100">
                Usage threshold email alert
              </span>
              <span className="text-[12px] leading-relaxed text-zinc-300">
                Send notification when overall consumption hits target capacity.
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono-tech text-[11px]">
              <span className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-zinc-100">
                80% quota
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
              <span className="rounded-[2px] border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-brand-purple-light">
                ada@lovelace.dev
              </span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

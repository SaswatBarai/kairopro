"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Key,
  Terminal,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "profile", icon: User, label: "Profile", href: "/settings/profile" },
  {
    id: "credentials",
    icon: Key,
    label: "Credentials / API Keys",
    badge: "I2",
  },
  { id: "notifications", icon: Bell, label: "Notifications", dot: true },
  { id: "billing", icon: CreditCard, label: "Billing & Usage" },
  { id: "team", icon: Users, label: "Team / Members", count: "4" },
] as const;

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const leaf = pathname.split("/").filter(Boolean).pop() ?? "profile";

  return (
    <div className="flex min-h-screen w-full flex-col bg-brand-dark lg:h-screen lg:overflow-hidden">
      <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] font-medium tracking-[0.03em] text-zinc-300">
            <span className="cursor-pointer transition-colors hover:text-zinc-100">
              workspace-alpha
            </span>
            <span className="text-zinc-700">/</span>
            <span className="cursor-pointer transition-colors hover:text-zinc-100">
              settings
            </span>
            <span className="text-zinc-700">/</span>
            <span className="font-semibold text-brand-purple-light">
              {leaf}
            </span>
          </div>
          <div className="hidden h-3 w-px bg-white/[0.1] sm:block" />
          <div className="hidden items-center gap-1.5 rounded-[2px] bg-white/[0.05] px-1.5 py-0.5 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" />
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-brand-green">
              Mesh Connected
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono-tech text-[11px] text-zinc-300">
            <Terminal className="h-3.5 w-3.5 text-zinc-500" />
            <span>
              node-us-west-1a:{" "}
              <span className="font-semibold text-brand-cyan">healthy</span>
            </span>
          </div>
          <div className="h-3 w-px bg-white/[0.1]" />
          <div className="font-mono-tech text-[10px] font-semibold uppercase tracking-[0.05em] text-zinc-300">
            ENV:{" "}
            <span className="text-[11px] tracking-[0.03em] text-zinc-100">
              PRODUCTION
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
          <div>
            <div className="mb-2 px-2 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Settings Scope
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = "href" in item ? pathname === item.href : false;
                const Icon = item.icon;
                const inner = (
                  <>
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px]",
                          active
                            ? "text-brand-purple-light"
                            : "text-zinc-500 group-hover:text-zinc-100",
                        )}
                      />
                      <span
                        className={cn(
                          active
                            ? "text-[15px] font-semibold tracking-tight"
                            : "text-[13px]",
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    {"badge" in item && item.badge && (
                      <span className="rounded-[2px] bg-white/[0.08] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-zinc-500">
                        {item.badge}
                      </span>
                    )}
                    {"dot" in item && item.dot && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                    )}
                    {"count" in item && item.count && (
                      <span className="font-mono-tech text-[11px] text-zinc-500">
                        {item.count}
                      </span>
                    )}
                    {active && (
                      <div className="h-4 w-1.5 rounded-full bg-brand-purple" />
                    )}
                  </>
                );
                const className = cn(
                  "group relative flex items-center justify-between rounded-[2px] px-3 py-2 transition-colors",
                  active
                    ? "bg-white/[0.05] text-zinc-100 shadow-sm"
                    : "text-zinc-300 hover:bg-white/[0.03] hover:text-zinc-100",
                );
                return "href" in item && item.href ? (
                  <Link key={item.id} href={item.href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <button key={item.id} type="button" className={className}>
                    {inner}
                  </button>
                );
              })}
              <div className="mt-2 pt-3">
                <div className="mb-2 px-2 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Destructive
                </div>
                <button
                  type="button"
                  className="group flex w-full items-center gap-2 rounded-[2px] px-3 py-2 text-[13px] font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
                >
                  <TriangleAlert className="h-[18px] w-[18px]" />
                  Danger Zone
                </button>
              </div>
            </nav>
          </div>

          <div className="flex flex-col gap-2 rounded-[2px] bg-white/[0.05] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Compute Tier
              </span>
              <span className="font-mono-tech text-[11px] text-brand-cyan">
                Pro Plus
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.1]">
              <div className="h-full w-[68%] rounded-full bg-brand-cyan" />
            </div>
            <div className="flex items-center justify-between font-mono-tech text-[11px] text-zinc-300">
              <span>Agent Threads</span>
              <span className="font-medium text-zinc-100">34 / 50</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleUser,
  CreditCard,
  Key,
  Terminal,
  TriangleAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    id: "profile",
    icon: CircleUser,
    label: "Profile",
    href: "/settings/profile",
  },
  {
    id: "credentials",
    icon: Key,
    label: "API Credentials",
    href: "/settings/credentials",
    badge: { text: "12", tone: "purple" },
  },
  { id: "notifications", icon: Bell, label: "Notifications" },
  {
    id: "billing",
    icon: CreditCard,
    label: "Billing & Usage",
    href: "/settings/billing",
    badge: { text: "Tier 2", tone: "zinc" },
  },
  {
    id: "team",
    icon: Users,
    label: "Team & Members",
    href: "/settings/team",
    badge: { text: "4", tone: "zinc" },
  },
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
          <div className="flex flex-col gap-1 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-2">
            <div className="px-2 py-1 font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Settings Scope
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = "href" in item ? pathname === item.href : false;
                const Icon = item.icon;
                const inner = (
                  <>
                    <div className="flex items-center gap-2 text-[12px]">
                      <Icon
                        className={cn(
                          "h-[17px] w-[17px]",
                          active
                            ? "text-brand-purple-light"
                            : "text-zinc-500 group-hover:text-zinc-100",
                        )}
                      />
                      <span className={cn(active && "font-medium")}>
                        {item.label}
                      </span>
                    </div>
                    {"badge" in item && item.badge && (
                      <span
                        className={cn(
                          "rounded-[2px] px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold",
                          item.badge.tone === "purple"
                            ? "bg-brand-purple-light/30 text-brand-purple-light"
                            : "bg-white/[0.1] text-zinc-300",
                        )}
                      >
                        {item.badge.text}
                      </span>
                    )}
                  </>
                );
                const className = cn(
                  "group flex items-center justify-between rounded-[2px] border-l-2 px-2 py-1.5 transition-all",
                  active
                    ? "border-brand-purple-light bg-white/[0.05] font-medium text-zinc-100"
                    : "border-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100",
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
              <div className="mt-1 border-t border-white/[0.06] px-2 pt-2">
                <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  Destructive
                </span>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-[12px] font-medium text-rose-400/80 transition-all hover:bg-rose-400/10 hover:text-rose-400"
                >
                  <TriangleAlert className="h-[17px] w-[17px]" />
                  Danger Zone
                </button>
              </div>
            </nav>
          </div>

          <div className="flex flex-col gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Compute Quota
              </span>
              <span className="rounded-[2px] bg-brand-green/25 px-1.5 py-0.5 font-mono-tech text-[10px] font-semibold text-brand-green">
                Pro Plus
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex justify-between font-mono-tech text-[11px]">
                <span className="text-zinc-300">Agent Threads</span>
                <span className="font-medium text-zinc-100">
                  34 <span className="text-zinc-500">/ 50</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-[68%] rounded-full bg-brand-purple" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 font-mono-tech text-[10px] text-zinc-500">
              <span>Active Invocations</span>
              <span className="font-medium text-brand-cyan">12 running</span>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 [scrollbar-width:none] lg:min-h-0 lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

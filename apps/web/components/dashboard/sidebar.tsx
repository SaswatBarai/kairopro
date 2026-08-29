"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { OrganizationSwitcher } from "./organization-switcher";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  CreditCard,
  LogOut,
  Sparkles,
  Zap,
} from "lucide-react";

interface SidebarProps {
  selectedOrgId?: string;
  onSelectOrg: (orgId: string | undefined) => void;
}

export function Sidebar({ selectedOrgId, onSelectOrg }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/dashboard?tab=projects", icon: FolderKanban },
    { label: "Billing & Plans", href: "/dashboard?tab=billing", icon: CreditCard },
    { label: "Settings", href: "/dashboard?tab=settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0 h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-600/30">
            K
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-wide">KairoPro</span>
            <span className="block text-[10px] text-indigo-400 font-mono">AI Platform v1.0</span>
          </div>
        </div>

        {/* Organization Switcher */}
        <OrganizationSwitcher selectedOrgId={selectedOrgId} onSelectOrg={onSelectOrg} />

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="p-3 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Free Tier</span>
          </div>
          <p className="text-[11px] text-slate-400">100 AI credits remaining</p>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
              {session?.user?.name?.[0] ?? "U"}
            </div>
            <div className="truncate">
              <span className="block text-xs font-semibold text-white truncate">
                {session?.user?.name ?? "User"}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                {session?.user?.email ?? ""}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

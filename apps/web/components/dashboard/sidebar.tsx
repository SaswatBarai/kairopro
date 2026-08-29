"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { OrganizationSwitcher } from "./organization-switcher";
import {
  LayoutDashboard, FolderKanban, Settings, CreditCard, LogOut, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarProps {
  selectedOrgId?: string;
  onSelectOrg: (orgId: string | undefined) => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard?tab=projects", icon: FolderKanban },
  { label: "Billing & Plans", href: "/dashboard?tab=billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard?tab=settings", icon: Settings },
];

export function Sidebar({ selectedOrgId, onSelectOrg }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-black text-white shadow-lg shadow-primary/30 shrink-0">
            K
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm tracking-wide text-sidebar-foreground">KairoPro</div>
            <div className="text-[10px] text-primary font-mono">AI Platform v1.0</div>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Org switcher */}
      <div className="px-3 py-3">
        <OrganizationSwitcher selectedOrgId={selectedOrgId} onSelectOrg={onSelectOrg} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Free tier badge */}
      <div className="px-4 py-3">
        <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Zap className="w-3 h-3 text-amber-400" />
            Free Tier
          </div>
          <div className="text-[11px] text-muted-foreground">100 AI credits remaining</div>
          <button className="w-full h-7 text-xs border border-primary/30 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center gap-1.5 transition-colors">
            <Sparkles className="w-3 h-3" /> Upgrade Plan
          </button>
        </div>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 flex items-center gap-3">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={session?.user?.image ?? ""} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-sidebar-foreground truncate">
            {session?.user?.name ?? "User"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {session?.user?.email ?? ""}
          </div>
        </div>
          <Tooltip>
          <TooltipTrigger>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-7 h-7 text-muted-foreground hover:text-destructive flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}

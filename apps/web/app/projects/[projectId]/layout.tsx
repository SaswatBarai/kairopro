"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, Palette, Server, Code2, Cpu, Rocket, Eye,
  ChevronRight, Loader2, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const phases = [
  { label: "Overview", href: "overview", icon: LayoutDashboard },
  { label: "PRD", href: "prd", icon: FileText },
  { label: "Design", href: "design", icon: Palette },
  { label: "Architecture", href: "architecture", icon: Server },
  { label: "Code", href: "code", icon: Code2 },
  { label: "Develop", href: "develop", icon: Cpu },
  { label: "Build", href: "build", icon: Rocket },
  { label: "Preview", href: "preview", icon: Eye },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .catch(() => {});
  }, [projectId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-6 gap-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Projects</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground truncate max-w-48">
            {project ? project.name : <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</span>}
          </span>
          {project?.state && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {project.state.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Phase sidebar */}
        <aside className="w-52 border-r border-border bg-card/30 flex flex-col py-4 px-3 sticky top-14 h-[calc(100vh-3.5rem)] shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-3">Build Phases</p>
          <nav className="space-y-0.5">
            {phases.map(({ label, href, icon: Icon }) => {
              const isActive = pathname.includes(`/${href}`);
              return (
                <Link
                  key={href}
                  href={`/projects/${projectId}/${href}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

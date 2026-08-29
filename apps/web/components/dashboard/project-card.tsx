"use client";

import Link from "next/link";
import { ProjectData } from "@/lib/projects";
import { Clock, ArrowRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectData;
  onDelete?: (id: string) => void;
}

const stateConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; dot: string }> = {
  draft: { variant: "secondary", label: "Draft", dot: "bg-muted-foreground" },
  analyzing: { variant: "outline", label: "Analyzing", dot: "bg-amber-400 animate-pulse" },
  prd_ready: { variant: "outline", label: "PRD Ready", dot: "bg-blue-400" },
  designing: { variant: "outline", label: "Designing", dot: "bg-pink-400" },
  architecture_ready: { variant: "outline", label: "Arch Ready", dot: "bg-cyan-400" },
  approved: { variant: "outline", label: "Approved", dot: "bg-emerald-400" },
  developing: { variant: "outline", label: "Building", dot: "bg-primary animate-pulse" },
  testing: { variant: "outline", label: "Testing", dot: "bg-violet-400" },
  preview: { variant: "outline", label: "Preview", dot: "bg-teal-400" },
  live: { variant: "default", label: "Live", dot: "bg-emerald-400" },
  failed: { variant: "destructive", label: "Failed", dot: "bg-destructive" },
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const state = stateConfig[project.state] ?? stateConfig.draft;
  const timeAgo = new Date(project.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Card className="group relative bg-card border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col">
      <CardContent className="p-5 flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={state.variant} className="gap-1.5 text-xs">
            <span className={cn("w-1.5 h-1.5 rounded-full", state.dot)} />
            {state.label}
          </Badge>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                if (confirm(`Delete "${project.name}"?`)) onDelete(project.id);
              }}
              className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-8 leading-relaxed">
            {project.description || "No description provided."}
          </p>
        </div>
      </CardContent>

      <Separator className="bg-border/60" />

      <CardFooter className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
        >
          Open IDE <ArrowRight className="w-3 h-3" />
        </Link>
      </CardFooter>
    </Card>
  );
}

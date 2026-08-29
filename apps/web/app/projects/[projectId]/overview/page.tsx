"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText, Palette, Server, Code2, Cpu, Rocket, Eye,
  Play, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Sparkles, HelpCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const phaseInfo = [
  { key: "prd", label: "Product Requirements", icon: FileText, href: "prd", desc: "AI-generated PRD and extracted requirements" },
  { key: "design", label: "Design System", icon: Palette, href: "design", desc: "Color palette, typography, and component specs" },
  { key: "architecture", label: "Architecture", icon: Server, href: "architecture", desc: "Tech stack, data models, API structure" },
  { key: "code", label: "IDE & Files", icon: Code2, href: "code", desc: "Browse and edit generated code files" },
  { key: "develop", label: "Development Hub", icon: Cpu, href: "develop", desc: "AI agent progress, tasks, and change sets" },
  { key: "build", label: "Build & Test", icon: Rocket, href: "build", desc: "Run builds and test suites" },
  { key: "preview", label: "Live Preview", icon: Eye, href: "preview", desc: "Preview the running application" },
];

const stateOrder = ["draft", "analyzing", "clarification", "prd_ready", "designing", "architecture_ready", "approved", "developing", "testing", "preview", "live", "failed"];

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<any>(null);
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = () => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/agent-runs`).then((r) => r.json()).catch(() => ({ runs: [] })),
    ]).then(([projData, runsData]) => {
      setProject(projData.project);
      setAgentRuns(runsData.runs || []);
      setLoading(false);
    });
  };

  const handleStartAnalysis = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemStatement: project?.description || project?.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProject((p: any) => ({ ...p, state: "analyzing" }));
        setTimeout(fetchData, 3000);
      } else {
        alert(data.error || "Failed to start analysis");
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentState = project?.state ?? "draft";
  const stateIdx = Math.max(0, stateOrder.indexOf(currentState));
  const progressPct = Math.min(100, Math.round(((stateIdx + 1) / stateOrder.length) * 100));

  return (
    <div className="p-8 max-w-5xl space-y-8">
      {/* Action Banner for Clarification / PRD Ready */}
      {(currentState === "clarification" || currentState === "prd_ready") && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {currentState === "clarification" ? "Requirements & Clarifications Ready!" : "PRD Successfully Generated!"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {currentState === "clarification"
                  ? "AI has extracted project requirements and prepared clarification questions."
                  : "Product requirements document is ready for your review."}
              </p>
            </div>
          </div>
          <Link href={`/projects/${projectId}/prd`}>
            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md">
              View PRD <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Hero */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{project?.name}</h1>
          <p className="text-sm text-muted-foreground max-w-xl">{project?.description || "No description provided."}</p>
        </div>
        {currentState === "draft" && (
          <Button
            onClick={handleStartAnalysis}
            disabled={starting}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 shrink-0"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Start AI Analysis
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wider">Project Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {currentState.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">Current stage</span>
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Phase cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Build Phases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {phaseInfo.map(({ key, label, icon: Icon, href, desc }, i) => {
            const isComplete = stateIdx > i + 1;
            const isActive = stateIdx === i + 1 || (key === "prd" && (currentState === "clarification" || currentState === "prd_ready"));

            return (
              <Link key={key} href={`/projects/${projectId}/${href}`}>
                <Card className={`group border-border/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer ${isActive ? "border-primary/40 bg-primary/5" : ""}`}>
                  <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? "bg-emerald-500/15 text-emerald-400" : isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isActive ? (
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{label}</div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent agent runs */}
      {agentRuns.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {agentRuns.slice(0, 5).map((run: any) => (
              <div key={run.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/60 bg-card/30 text-sm">
                <div className={`w-2 h-2 rounded-full shrink-0 ${run.status === "completed" ? "bg-emerald-400" : run.status === "failed" ? "bg-destructive" : "bg-primary animate-pulse"}`} />
                <span className="text-foreground font-medium capitalize">{run.agentType?.replace("_", " ")} agent</span>
                <span className="text-muted-foreground text-xs ml-auto flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(run.createdAt).toLocaleString()}
                </span>
                <Badge variant={run.status === "completed" ? "secondary" : run.status === "failed" ? "destructive" : "outline"} className="text-xs">
                  {run.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

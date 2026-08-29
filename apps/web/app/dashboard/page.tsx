"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import { ProjectData, fetchProjects, deleteProject } from "@/lib/projects";
import { FolderKanban, Layers, CheckCircle2, Loader2, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { loadProjects(); }, [selectedOrgId]);

  const loadProjects = async () => {
    setLoading(true);
    try { setProjects(await fetchProjects(selectedOrgId)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { console.error(err); }
  };

  const activeCount = projects.filter((p) => p.state !== "draft").length;

  const stats = [
    { icon: FolderKanban, label: "Total Projects", value: projects.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: Layers, label: "Active Builds", value: activeCount, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: CheckCircle2, label: "Uptime", value: "100%", color: "text-violet-400", bg: "bg-violet-500/10" },
  ];

  return (
    <div className="flex w-full min-h-screen bg-background">
      <Sidebar selectedOrgId={selectedOrgId} onSelectOrg={setSelectedOrgId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onNewProject={() => setIsModalOpen(true)} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Your Projects</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Build and manage AI-generated full-stack applications</p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 h-9 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              New Application
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card">
                <div className={`p-2.5 rounded-lg ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Projects grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/60 p-5 space-y-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">No projects yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Create your first AI-powered application to get started</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 mt-2">
                <Plus className="w-4 h-4 mr-2" /> Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDeleteProject} />
              ))}
            </div>
          )}
        </main>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newProj: ProjectData) => setProjects((prev) => [newProj, ...prev])}
        orgId={selectedOrgId}
      />
    </div>
  );
}

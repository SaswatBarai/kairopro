"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import { ProjectData, fetchProjects, deleteProject } from "@/lib/projects";
import { FolderKanban, Plus, Sparkles, Layers, CheckCircle2, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [selectedOrgId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects(selectedOrgId);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const activeProjectsCount = projects.filter((p) => p.state !== "draft").length;

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar selectedOrgId={selectedOrgId} onSelectOrg={setSelectedOrgId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onNewProject={() => setIsModalOpen(true)} />

        <main className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Welcome Banner & Stats */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Your Projects</h1>
              <p className="text-xs text-slate-400 mt-1">
                Build, manage, and monitor your AI-generated full-stack web applications.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              New Application
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-indigo-600/15 text-indigo-400 rounded-xl">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">{projects.length}</span>
                <span className="text-xs text-slate-400">Total Projects</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-600/15 text-emerald-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">{activeProjectsCount}</span>
                <span className="text-xs text-slate-400">Active Builds</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-purple-600/15 text-purple-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-2xl font-bold text-white">100%</span>
                <span className="text-xs text-slate-400">Local Dev Health</span>
              </div>
            </div>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Loading your workspace projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 text-indigo-400 flex items-center justify-center mx-auto">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">No projects found</h3>
                <p className="text-xs text-slate-400">
                  Get started by creating your first AI web application project.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" /> Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
                />
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

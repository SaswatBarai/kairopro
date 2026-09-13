import { create } from "zustand";

export type ProjectStatus =
  "DRAFT" | "SPECIFYING" | "BUILDING" | "READY" | "DEPLOYED";

export interface ProjectState {
  activeProjectId: string | null;
  activeProjectName: string | null;
  status: ProjectStatus | null;
  selectedFile: string | null;
  isTerminalOpen: boolean;
  isSidebarOpen: boolean;
  setActiveProject: (id: string, name: string, status?: ProjectStatus) => void;
  setStatus: (status: ProjectStatus) => void;
  setSelectedFile: (filePath: string | null) => void;
  setTerminalOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  toggleSidebar: () => void;
  clearActiveProject: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  activeProjectName: null,
  status: null,
  selectedFile: null,
  isTerminalOpen: true,
  isSidebarOpen: true,
  setActiveProject: (id, name, status = "DRAFT") =>
    set({
      activeProjectId: id,
      activeProjectName: name,
      status,
      selectedFile: null,
    }),
  setStatus: (status) => set({ status }),
  setSelectedFile: (filePath) => set({ selectedFile: filePath }),
  setTerminalOpen: (open) => set({ isTerminalOpen: open }),
  toggleTerminal: () =>
    set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  clearActiveProject: () =>
    set({
      activeProjectId: null,
      activeProjectName: null,
      status: null,
      selectedFile: null,
    }),
}));

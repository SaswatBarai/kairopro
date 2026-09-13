import { create } from "zustand";

export interface LogItem {
  id: string;
  seq: number;
  type: "STEP" | "STDOUT" | "STDERR" | "EVENT" | "CHECKPOINT";
  content: string;
  timestamp: string;
}

export type BuildStepName =
  | "ingest-spec"
  | "generate-architecture"
  | "synthesize-code"
  | "run-tests"
  | "deploy-microvm";

export interface BuildStreamState {
  buildId: string | null;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | null;
  currentStep: BuildStepName | null;
  stepProgress: number; // 0 - 100
  logs: LogItem[]; // Ring buffer (max 1000 items)
  lastSeq: number;
  microVmStatus: "INITIALIZING" | "RUNNING" | "STOPPED" | "ERROR" | null;
  previewUrl: string | null;
  setBuildId: (id: string) => void;
  setBuildStatus: (status: BuildStreamState["status"]) => void;
  setCurrentStep: (step: BuildStepName, progress?: number) => void;
  appendLog: (log: Omit<LogItem, "id">) => void;
  setMicroVmStatus: (
    status: BuildStreamState["microVmStatus"],
    url?: string,
  ) => void;
  resetStream: () => void;
}

const MAX_LOG_BUFFER = 1000;

export const useBuildStreamStore = create<BuildStreamState>((set) => ({
  buildId: null,
  status: null,
  currentStep: null,
  stepProgress: 0,
  logs: [],
  lastSeq: 0,
  microVmStatus: null,
  previewUrl: null,
  setBuildId: (id) => set({ buildId: id, logs: [], lastSeq: 0 }),
  setBuildStatus: (status) => set({ status }),
  setCurrentStep: (step, progress = 0) =>
    set({ currentStep: step, stepProgress: progress }),
  appendLog: (log) =>
    set((state) => {
      const newItem: LogItem = {
        ...log,
        id: `${log.seq}-${Date.now()}`,
      };
      const updatedLogs = [...state.logs, newItem].slice(-MAX_LOG_BUFFER);
      return {
        logs: updatedLogs,
        lastSeq: Math.max(state.lastSeq, log.seq),
      };
    }),
  setMicroVmStatus: (status, url) =>
    set((state) => ({
      microVmStatus: status,
      previewUrl: url ?? state.previewUrl,
    })),
  resetStream: () =>
    set({
      buildId: null,
      status: null,
      currentStep: null,
      stepProgress: 0,
      logs: [],
      lastSeq: 0,
      microVmStatus: null,
      previewUrl: null,
    }),
}));

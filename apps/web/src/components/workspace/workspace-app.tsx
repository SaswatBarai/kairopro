"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ACTIVE_TAB,
  DEFAULT_TABS,
  MODIFIED_TAB,
  basename,
} from "./code-content";
import { ActivityRail } from "./activity-rail";
import { AgentPanel } from "./agent-panel";
import { CodeEditor } from "./code-editor";
import { CommandPalette } from "./command-palette";
import { DeployModal } from "./deploy-modal";
import { DeploySuccessModal } from "./deploy-success-modal";
import { ExportModal } from "./export-modal";
import { FileExplorer } from "./file-explorer";
import { CHECKPOINTS, HistoryDrawer } from "./history-drawer";
import {
  SandboxPanel,
  type SandboxMode,
  type SandboxState,
} from "./sandbox-panel";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceStatusBar } from "./workspace-statusbar";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type ResizeTarget = "explorer" | "agent" | "sandbox";

function ResizeHandle({
  vertical,
  className,
  onStart,
}: {
  vertical?: boolean;
  className?: string;
  onStart: () => void;
}) {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault();
        onStart();
      }}
      className={cn(
        "shrink-0 bg-white/[0.05] transition-colors hover:bg-brand-purple/60",
        vertical
          ? "h-1 w-full cursor-row-resize"
          : "h-full w-1 cursor-col-resize",
        className,
      )}
    />
  );
}

export function WorkspaceApp() {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentWidth, setAgentWidth] = useState(380);
  const [sandboxExpanded, setSandboxExpanded] = useState(true);
  const [sandboxHeight, setSandboxHeight] = useState(280);
  const [sandboxState, setSandboxState] = useState<SandboxState>("running");
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>("terminal");
  const [restartCount, setRestartCount] = useState(0);
  const [tabs, setTabs] = useState<string[]>(DEFAULT_TABS);
  const [activeTab, setActiveTab] = useState<string | null>(ACTIVE_TAB);
  const [diffMode, setDiffMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [checkpointId, setCheckpointId] = useState(CHECKPOINTS[0]?.id ?? "");
  const [savedFile, setSavedFile] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeTarget | null>(null);

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentInputRef = useRef<HTMLTextAreaElement>(null);

  const flashSaved = useCallback((message: string) => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSavedFile(message);
    savedTimer.current = setTimeout(() => setSavedFile(null), 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const openFile = useCallback((path: string) => {
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      const next = tabs.filter((t) => t !== path);
      setTabs(next);
      setActiveTab((current) =>
        current === path ? (next[next.length - 1] ?? null) : current,
      );
    },
    [tabs],
  );

  const save = useCallback(() => {
    if (activeTab) flashSaved(`Saved ${basename(activeTab)}`);
  }, [activeTab, flashSaved]);

  const restart = useCallback(() => {
    if (sandboxState === "restarting" || sandboxState === "building") return;
    setSandboxState("restarting");
    setTimeout(() => setSandboxState("building"), 600);
    setTimeout(() => {
      setSandboxState("running");
      setRestartCount((c) => c + 1);
    }, 1400);
  }, [sandboxState]);

  const run = useCallback(() => {
    if (sandboxState !== "idle" && sandboxState !== "failed") return;
    setSandboxState("building");
    setTimeout(() => {
      setSandboxState("running");
      setRestartCount((c) => c + 1);
    }, 800);
  }, [sandboxState]);

  const preview = useCallback(() => {
    setSandboxMode("preview");
    setSandboxExpanded(true);
  }, []);

  const toggleTerminal = useCallback(() => {
    if (sandboxExpanded && sandboxMode === "terminal") {
      setSandboxExpanded(false);
    } else {
      setSandboxMode("terminal");
      setSandboxExpanded(true);
    }
  }, [sandboxExpanded, sandboxMode]);

  const askKairo = useCallback(() => {
    setAgentOpen(true);
    setTimeout(() => agentInputRef.current?.focus(), 80);
  }, []);

  const undoCurrentCheckpoint = useCallback(() => {
    setCheckpointId((id) => {
      const next = CHECKPOINTS[CHECKPOINTS.findIndex((c) => c.id === id) + 1];
      return next ? next.id : id;
    });
  }, []);

  const revertToCheckpoint = useCallback(
    (id: string) => setCheckpointId(id),
    [],
  );

  const viewCheckpoint = useCallback(
    (path: string, diff: boolean) => {
      openFile(path);
      setDiffMode(diff);
      setHistoryOpen(false);
    },
    [openFile],
  );

  const runCommand = useCallback(
    (id: string) => {
      if (id === "run") run();
      else if (id === "restart") restart();
      else if (id === "toggle-terminal") toggleTerminal();
      else if (id === "preview") preview();
      else if (id === "ask") askKairo();
      else if (id === "history") setHistoryOpen(true);
      else if (id === "deploy") setDeployOpen(true);
      else if (id === "export") setExportOpen(true);
    },
    [run, restart, toggleTerminal, preview, askKairo],
  );

  const acceptChanges = useCallback(() => {
    setDiffMode(false);
    flashSaved("Applied changes to route.ts");
  }, [flashSaved]);

  const rejectChanges = useCallback(() => setDiffMode(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "p" || key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (key === "s") {
        e.preventDefault();
        save();
      } else if (key === "b") {
        e.preventDefault();
        setExplorerOpen((v) => !v);
      } else if (key === "j") {
        e.preventDefault();
        toggleTerminal();
      } else if (key === "z") {
        e.preventDefault();
        undoCurrentCheckpoint();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save, toggleTerminal, undoCurrentCheckpoint]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      if (resizing === "explorer")
        setExplorerWidth(clamp(e.clientX - 56, 180, 420));
      else if (resizing === "agent")
        setAgentWidth(clamp(window.innerWidth - e.clientX, 300, 560));
      else
        setSandboxHeight(clamp(window.innerHeight - e.clientY - 24, 120, 480));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor =
      resizing === "sandbox" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing]);

  return (
    <div className="flex h-screen w-full select-none flex-col overflow-hidden bg-brand-dark text-zinc-100">
      <WorkspaceHeader
        sandboxState={sandboxState}
        onPreview={preview}
        onSave={save}
        onOpenHistory={() => setHistoryOpen(true)}
        onDeploy={() => setDeployOpen(true)}
        onExport={() => setExportOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <ActivityRail
          paletteOpen={paletteOpen}
          explorerOpen={explorerOpen}
          sandboxExpanded={sandboxExpanded}
          agentOpen={agentOpen}
          onSearch={() => setPaletteOpen(true)}
          onToggleExplorer={() => setExplorerOpen((v) => !v)}
          onToggleSandbox={toggleTerminal}
          onToggleAgent={() => setAgentOpen((v) => !v)}
        />

        {explorerOpen && (
          <>
            <FileExplorer
              width={explorerWidth}
              activeFile={activeTab}
              onOpenFile={openFile}
              onSearch={() => setPaletteOpen(true)}
              className="hidden lg:flex"
            />
            <ResizeHandle
              onStart={() => setResizing("explorer")}
              className="hidden lg:block"
            />
          </>
        )}

        <CodeEditor
          tabs={tabs}
          activeTab={activeTab}
          diffMode={diffMode}
          onSelectTab={setActiveTab}
          onCloseTab={closeTab}
          onToggleDiff={setDiffMode}
          onAcceptChanges={acceptChanges}
          onRejectChanges={rejectChanges}
          onPreview={preview}
          onSave={save}
          onAskKairo={askKairo}
        />

        {agentOpen && (
          <>
            <ResizeHandle
              onStart={() => setResizing("agent")}
              className="hidden md:block"
            />
            <AgentPanel
              width={agentWidth}
              inputRef={agentInputRef}
              className="hidden md:flex"
              onOpenDiff={() => {
                setActiveTab(MODIFIED_TAB);
                setDiffMode(true);
              }}
              onDock={() => setAgentOpen(false)}
            />
          </>
        )}
      </div>

      {sandboxExpanded && (
        <ResizeHandle vertical onStart={() => setResizing("sandbox")} />
      )}

      <SandboxPanel
        expanded={sandboxExpanded}
        height={sandboxHeight}
        state={sandboxState}
        mode={sandboxMode}
        restartCount={restartCount}
        onToggleExpand={() => setSandboxExpanded((v) => !v)}
        onModeChange={setSandboxMode}
        onRestart={restart}
        onRun={run}
        onAskKairo={askKairo}
      />

      <WorkspaceStatusBar sandboxState={sandboxState} savedFile={savedFile} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenFile={openFile}
        onCommand={runCommand}
      />

      <HistoryDrawer
        open={historyOpen}
        currentId={checkpointId}
        onClose={() => setHistoryOpen(false)}
        onView={viewCheckpoint}
        onUndoCurrent={undoCurrentCheckpoint}
        onRevertTo={revertToCheckpoint}
      />

      <DeployModal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        onDeployed={setDeployedUrl}
      />

      <DeploySuccessModal
        open={deployedUrl !== null}
        url={deployedUrl ?? ""}
        onClose={() => setDeployedUrl(null)}
        onOpenLogs={() => {
          setDeployedUrl(null);
          setSandboxMode("terminal");
          setSandboxExpanded(true);
        }}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExported={flashSaved}
      />
    </div>
  );
}

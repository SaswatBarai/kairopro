"use client";

import { useEffect, useState } from "react";
import { ExternalLink, GitBranch, Loader2 } from "lucide-react";
import type { GithubExportResult } from "@kairopro/contracts";

import {
  useGithubExportMutation,
  useGithubStatusQuery,
} from "@/lib/queries/deploy";
import { ModalShell } from "./modal-shell";

export function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface ExportModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onExported: (message: string) => void;
}

/**
 * Pushes the project to a GitHub repository. There is no OAuth flow yet, so
 * connecting means giving a GitHub username and a personal access token; once
 * connected, later pushes need nothing. The token goes straight to the
 * server — it is never kept in the browser.
 */
export function ExportModal({
  open,
  projectId,
  onClose,
  onExported,
}: ExportModalProps) {
  const status = useGithubStatusQuery(projectId, open);
  const exportToGithub = useGithubExportMutation(projectId);
  const [login, setLogin] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<GithubExportResult | null>(null);

  useEffect(() => {
    if (open) {
      setLogin("");
      setToken("");
      setResult(null);
      exportToGithub.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const connected = status.data?.connected === true;
  const canSubmit =
    !exportToGithub.isPending &&
    !status.isLoading &&
    (connected || (login.trim() !== "" && token.trim() !== ""));

  const submit = () => {
    if (!canSubmit) return;
    exportToGithub.mutate(
      connected
        ? undefined
        : { githubLogin: login.trim(), accessToken: token.trim() },
      {
        onSuccess: (out) => {
          setToken("");
          setResult(out);
          onExported("Exported to GitHub");
        },
      },
    );
  };

  return (
    <ModalShell
      icon={<GitBranch className="h-5 w-5" />}
      locked={exportToGithub.isPending}
      open={open}
      title="Export to GitHub"
      titleId="export-modal-title"
      onClose={onClose}
    >
      {result ? (
        <>
          <p className="text-[13px] leading-relaxed text-zinc-400">
            Your project is on GitHub, on the{" "}
            <span className="font-mono-tech text-zinc-200">
              {result.defaultBranch}
            </span>{" "}
            branch.
          </p>
          <a
            className="flex items-center justify-between gap-2 rounded bg-brand-dark px-3 py-2 font-mono-tech text-[13px] text-brand-purple-light hover:underline"
            href={result.repoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="truncate">{result.repoUrl}</span>
            <ExternalLink className="h-4 w-4 shrink-0" />
          </a>
          <div className="flex justify-end">
            <button
              className="rounded-[3px] bg-white/[0.06] px-4 py-1.5 text-[13px] text-zinc-100 transition-colors hover:bg-white/[0.1]"
              type="button"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          {status.isLoading ? (
            <p className="flex items-center gap-2 text-[13px] text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking your GitHub connection…
            </p>
          ) : connected ? (
            <p className="text-[13px] leading-relaxed text-zinc-400">
              Connected as{" "}
              <span className="font-mono-tech text-zinc-200">
                @{status.data?.githubLogin}
              </span>
              . This pushes the latest version of your project
              {status.data?.repoUrl
                ? " to its repository"
                : " to a new repository"}
              .
            </p>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-zinc-400">
                Connect GitHub with your username and a personal access token
                that can create repositories (the{" "}
                <code className="font-mono-tech text-zinc-300">repo</code>{" "}
                scope).
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-medium text-zinc-300"
                  htmlFor="gh-login"
                >
                  GitHub username
                </label>
                <input
                  autoComplete="off"
                  className="rounded bg-brand-dark px-3 py-2 font-mono-tech text-[13px] text-zinc-100 outline-none focus:ring-1 focus:ring-brand-purple-light"
                  id="gh-login"
                  spellCheck={false}
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] font-medium text-zinc-300"
                  htmlFor="gh-token"
                >
                  Personal access token
                </label>
                <input
                  autoComplete="off"
                  className="rounded bg-brand-dark px-3 py-2 font-mono-tech text-[13px] text-zinc-100 outline-none focus:ring-1 focus:ring-brand-purple-light"
                  id="gh-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
            </>
          )}

          {exportToGithub.error && (
            <p
              className="rounded-[3px] bg-white/[0.04] px-3 py-2 text-[12px] text-zinc-300"
              role="alert"
            >
              {exportToGithub.error.message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              className="rounded-[3px] px-3 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-50"
              disabled={exportToGithub.isPending}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-2 rounded-[3px] bg-brand-purple px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
              type="button"
              onClick={submit}
            >
              {exportToGithub.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {exportToGithub.isPending
                ? "Pushing…"
                : connected
                  ? "Push to GitHub"
                  : "Connect and push"}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

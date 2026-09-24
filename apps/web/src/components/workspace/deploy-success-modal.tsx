"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Rocket } from "lucide-react";

import { ModalShell } from "./modal-shell";

interface DeploySuccessModalProps {
  open: boolean;
  url: string;
  onClose: () => void;
}

export function DeploySuccessModal({
  open,
  url,
  onClose,
}: DeploySuccessModalProps) {
  const [copied, setCopied] = useState(false);

  return (
    <ModalShell
      icon={<Rocket className="h-5 w-5" />}
      open={open}
      title="Your app is live"
      titleId="deploy-success-title"
      onClose={onClose}
    >
      <div className="flex items-center gap-2 rounded bg-brand-dark px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono-tech text-[13px] text-zinc-100">
          {url}
        </span>
        <button
          type="button"
          title={copied ? "Copied" : "Copy URL"}
          onClick={() => {
            void navigator.clipboard?.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-brand-green" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-[3px] px-3 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          type="button"
          onClick={onClose}
        >
          Done
        </button>
        <a
          className="flex items-center gap-2 rounded-[3px] bg-brand-purple px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-purple/85"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Open site
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </ModalShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";

import { useDeployMutation } from "@/lib/queries/deploy";
import { ModalShell } from "./modal-shell";

interface DeployModalProps {
  open: boolean;
  projectId: string;
  projectName: string;
  /** The subdomain already reserved by an earlier deploy, if any. */
  subdomain: string | null;
  onClose: () => void;
  onDeployed: (url: string) => void;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "app"
  );
}

export function DeployModal({
  open,
  projectId,
  projectName,
  subdomain: reserved,
  onClose,
  onDeployed,
}: DeployModalProps) {
  const deploy = useDeployMutation(projectId);
  const [subdomain, setSubdomain] = useState(() => slugify(projectName));

  // Start each opening from the project's name, with no leftover error.
  useEffect(() => {
    if (open) {
      setSubdomain(slugify(projectName));
      deploy.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectName]);

  const submit = () => {
    if (deploy.isPending) return;
    // A redeploy reuses the reserved address; only a first deploy chooses one.
    deploy.mutate(reserved ? {} : { subdomain: subdomain.trim() }, {
      onSuccess: (result) => {
        onDeployed(result.deployedUrl);
        onClose();
      },
    });
  };

  return (
    <ModalShell
      icon={<Rocket className="h-5 w-5" />}
      locked={deploy.isPending}
      open={open}
      title={reserved ? "Redeploy" : "Deploy"}
      titleId="deploy-modal-title"
      onClose={onClose}
    >
      <p className="text-[13px] leading-relaxed text-zinc-400">
        {reserved ? (
          <>
            Publish the latest successful build of{" "}
            <span className="text-zinc-200">{projectName}</span> at its existing
            address,{" "}
            <span className="font-mono-tech text-zinc-200">{reserved}</span>.
          </>
        ) : (
          <>
            Publish the latest successful build of{" "}
            <span className="text-zinc-200">{projectName}</span> at a public
            address.
          </>
        )}
      </p>

      {!reserved && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="deploy-subdomain"
            className="text-[12px] font-medium text-zinc-300"
          >
            Subdomain
          </label>
          <input
            autoComplete="off"
            className="rounded bg-brand-dark px-3 py-2 font-mono-tech text-[13px] text-zinc-100 outline-none focus:ring-1 focus:ring-brand-purple-light"
            id="deploy-subdomain"
            spellCheck={false}
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <p className="text-[11px] text-zinc-500">
            3–63 characters: lowercase letters, digits and hyphens.
          </p>
        </div>
      )}

      {deploy.error && (
        <p
          className="rounded-[3px] bg-white/[0.04] px-3 py-2 text-[12px] text-zinc-300"
          role="alert"
        >
          {deploy.error.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-[3px] px-3 py-1.5 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-50"
          disabled={deploy.isPending}
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="flex items-center gap-2 rounded-[3px] bg-brand-purple px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-purple/85 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={
            deploy.isPending || (!reserved && subdomain.trim().length < 3)
          }
          type="button"
          onClick={submit}
        >
          {deploy.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {deploy.isPending ? "Deploying…" : reserved ? "Redeploy" : "Deploy"}
        </button>
      </div>
    </ModalShell>
  );
}

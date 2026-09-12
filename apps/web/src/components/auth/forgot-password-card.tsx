"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, LockKeyhole, Mail } from "lucide-react";

import { FadeIn } from "@/components/landing/fade-in";
import { Logo } from "@/components/common/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "support@kairopro.dev";
const MAILTO_LINK = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Password Reset Request — KairoPro Beta",
)}`;

export function ForgotPasswordCard() {
  const [copied, setCopied] = useState(false);

  const onCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <FadeIn className="flex w-full max-w-[400px] flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          sys_auth // credential_recovery
        </div>
        <Badge variant="outline" mono className="text-zinc-400">
          stage: 00-manual
        </Badge>
      </div>

      <Card className="gap-4 rounded-lg border-white/[0.08] bg-brand-surface px-6 py-6 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="text-base font-medium tracking-tight text-zinc-100">
              KairoPro
            </span>
          </div>
          <Badge variant="secondary" mono className="text-zinc-400">
            v2.4-beta
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Reset your password
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Self-service password reset is not available in the current beta
            build. Contact our security team directly from the email linked to
            your account to verify identity and regain workspace access.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-[4px] bg-brand-surface-muted p-3.5">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple-light" />
          <div className="flex flex-col gap-1">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
              Beta Security Protocol
            </span>
            <p className="text-xs leading-relaxed text-zinc-400">
              For cluster integrity, credential resets are verified manually
              against your registered Git identity or cryptographically via
              existing SSH public keys on file.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button asChild className="h-10 w-full gap-2">
            <a href={MAILTO_LINK}>
              <Mail className="h-4 w-4" />
              <span>Email support</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-70" />
            </a>
          </Button>

          <div className="flex items-center justify-between px-1 pt-1">
            <a
              className="inline-flex items-center gap-1.5 py-1 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
              href="/login"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to login
            </a>
            <button
              className="cursor-pointer font-mono-tech text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
              title="Copy support email address"
              type="button"
              onClick={onCopyEmail}
            >
              copy email
            </button>
          </div>

          <div
            aria-live="polite"
            className={cn(
              "py-1 text-center font-mono-tech text-[11px] text-brand-purple-light transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0",
            )}
          >
            Address copied: {SUPPORT_EMAIL}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[3px] bg-brand-dark p-2.5">
          <div className="flex items-center justify-between font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Operational SLA</span>
            <span className="text-zinc-400">&lt; 2 hours</span>
          </div>
          <div className="flex items-center justify-between font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Destination addr</span>
            <span className="text-[11px] text-zinc-200">{SUPPORT_EMAIL}</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col items-center gap-1.5 px-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-zinc-500" />
            TLS 1.3
          </span>
          <span aria-hidden="true">•</span>
          <span>AES-256 GCM</span>
          <span aria-hidden="true">•</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            auth_daemon: secured
          </span>
        </div>
        <p className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500/80">
          KairoPro Cluster Security Infrastructure
        </p>
      </div>
    </FadeIn>
  );
}

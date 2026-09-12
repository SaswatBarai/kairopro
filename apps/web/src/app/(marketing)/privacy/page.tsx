import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LegalSection, NoticeBox } from "@/components/legal/legal-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy — KairoPro",
  description: "KairoPro Privacy Policy.",
};

const toc = [
  { id: "sec-01", label: "Information We Collect" },
  { id: "sec-02", label: "Telemetry & Crash Reporting" },
  { id: "sec-03", label: "Cookies & Local Storage" },
  { id: "sec-04", label: "GDPR & CCPA Compliance" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      documentId="DOCUMENT_ID_KP-2025-05"
      title="Privacy Policy"
      updated="April 14, 2025"
      revision="2.4.0"
      commit="4f1a9e"
      activeDoc="privacy"
      toc={toc}
    >
      <LegalSection id="sec-01" index="01" title="Information We Collect">
        <p>
          KairoPro operates under a minimum-necessary telemetry posture. When
          you use our developer tooling, we record authentication credentials
          via GitHub OAuth, ephemeral sandbox resource usage metrics (CPU, RAM
          utilization), and standard API invocation timestamps.
        </p>
        <p>
          We do not track keystrokes inside web editors or inspect environment
          variables unless explicitly instructed via diagnostic submission
          tickets.
        </p>
      </LegalSection>

      <LegalSection id="sec-02" index="02" title="Telemetry & Crash Reporting">
        <p>
          Our automated build agents generate execution crash logs when
          compilation or testing routines fail. These crash reports are stripped
          of personal identifiers and secrets prior to ingestion. You can
          disable telemetry transmission via your project settings at any time:
        </p>
        <Card className="gap-0 rounded-lg border-white/[0.06] bg-brand-dark p-4 font-mono-tech text-[12px] leading-relaxed shadow-none">
          <span className="text-zinc-600">{"# .kairospec.json"}</span>
          <br />
          <span className="text-brand-cyan">&quot;telemetry&quot;</span>: {"{"}{" "}
          <span className="text-brand-cyan">&quot;crashReports&quot;</span>:{" "}
          <span className="text-brand-purple">false</span>,{" "}
          <span className="text-brand-cyan">&quot;anonymousTokens&quot;</span>:{" "}
          <span className="text-brand-purple">false</span> {"}"}
        </Card>
      </LegalSection>

      <LegalSection id="sec-03" index="03" title="Cookies & Local Storage">
        <p>
          We utilize strictly functional cookies essential for session
          authentication and terminal session continuity. We do not embed
          third-party marketing trackers, behavioral re-targeting scripts, or
          cross-site data aggregators.
        </p>
      </LegalSection>

      <LegalSection id="sec-04" index="04" title="GDPR & CCPA Compliance">
        <p>
          Users residing in the European Economic Area (EEA) and California
          maintain full rights to access, rectify, port, and delete their stored
          personal records. Requests executed via our privacy API or email are
          fulfilled within thirty (30) business days.
        </p>
        <NoticeBox>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-mono-tech text-[12px] text-zinc-200">
                Data Protection Officer
              </span>
              <span className="text-xs text-zinc-500">
                Direct all inquiries to dpo@kairopro.dev
              </span>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="font-mono-tech text-[11px]"
            >
              <a href="mailto:dpo@kairopro.dev">Contact DPO</a>
            </Button>
          </div>
        </NoticeBox>
      </LegalSection>
    </LegalLayout>
  );
}

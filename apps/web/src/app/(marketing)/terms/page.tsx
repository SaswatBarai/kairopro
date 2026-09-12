import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal/legal-layout";
import { NoticeBox, LegalSection } from "@/components/legal/legal-section";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service — KairoPro",
  description: "KairoPro Terms of Service agreement.",
};

const toc = [
  { id: "sec-01", label: "Acceptance of Terms" },
  { id: "sec-02", label: "Beta Service & Eligibility" },
  { id: "sec-03", label: "Ownership & Generated Code" },
  { id: "sec-04", label: "Data Privacy & Model Training" },
  { id: "sec-05", label: "Usage Limits & Fair Use" },
  { id: "sec-06", label: "Disclaimers & Warranties" },
  { id: "sec-07", label: "Termination & Portability" },
  { id: "sec-08", label: "Contact Information" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      documentId="DOCUMENT_ID_KP-2025-04"
      title="Terms of Service"
      updated="April 14, 2025"
      revision="2.4.0"
      commit="4f1a9e"
      activeDoc="terms"
      toc={toc}
    >
      <LegalSection id="sec-01" index="01" title="Acceptance of Terms">
        <p>
          By accessing, deploying, configuring, or registering an account on
          KairoPro (&ldquo;the Platform&rdquo;), operated by KairoPro Inc.
          (&ldquo;KairoPro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
          &ldquo;our&rdquo;), you (&ldquo;User&rdquo;,
          &ldquo;Organization&rdquo;, or &ldquo;Developer&rdquo;) irrevocably
          agree to comply with and be bound by this contractual Terms of Service
          Agreement (&ldquo;Terms&rdquo;).
        </p>
        <p>
          These terms govern all CLI integrations, Web IDE interfaces, agent
          orchestration APIs, headless runner webhooks, and background
          generation processes. If you are accepting these terms on behalf of a
          company or legal entity, you represent and warrant that you possess
          the full structural authority to bind that entity to this instrument.
        </p>
        <NoticeBox label="Contract Scope Notice">
          KairoPro delivers autonomous AI developer tooling. Automated task
          triggers initiated by your API tokens, Git webhooks, or scheduled
          pipeline dispatches fall strictly under your operational legal
          responsibility.
        </NoticeBox>
      </LegalSection>

      <LegalSection id="sec-02" index="02" title="Beta Service & Eligibility">
        <p>
          KairoPro is currently distributed under an active Developer Beta
          stage. Access to computing sandboxes, LLM execution pipelines, and
          automated artifact generation is provided free of charge during the
          preview phase.
        </p>
        <p>
          We reserve the operational right to modify token allocations, throttle
          concurrency pipelines, or schedule maintenance downtime without
          liability. Users will receive no less than fourteen (14) calendar days
          of formal notice via verified account email prior to the
          initialization of any paid tier transition or commercial billing
          requirement.
        </p>
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          <Card className="gap-1 rounded-lg border-white/[0.05] bg-brand-surface-muted p-4 shadow-none">
            <span className="font-mono-tech text-[12px] text-zinc-200">
              Service Level: Beta Experimental
            </span>
            <span className="text-xs text-zinc-500">
              No uptime SLA is contractually attached to pre-release developer
              build infrastructure.
            </span>
          </Card>
          <Card className="gap-1 rounded-lg border-white/[0.05] bg-brand-surface-muted p-4 shadow-none">
            <span className="font-mono-tech text-[12px] text-zinc-200">
              Age Requirement
            </span>
            <span className="text-xs text-zinc-500">
              Account holders must be at least 18 years old or the age of legal
              majority in their local jurisdiction.
            </span>
          </Card>
        </div>
      </LegalSection>

      <LegalSection id="sec-03" index="03" title="Ownership & Generated Code">
        <p>
          We assert zero intellectual property claims over your creations. All
          source code, schema definitions, TypeScript modules, migrations,
          Docker configurations, architectural diagrams, and documentation
          produced by KairoPro agents on your behalf are 100% owned by you or
          your designated organization.
        </p>
        <p>
          Outputs are delivered under permissive terms equivalent to the
          standard MIT License, granting you unrestricted rights to use, modify,
          distribute, commercialize, or sublicense the generated code with zero
          vendor lock-in, royalty obligations, or attribution prerequisites.
        </p>
        <NoticeBox label="Absolute Code Independence">
          Generated code runs standalone without proprietary KairoPro client
          runtimes or hidden recurring micro-dependencies. You can eject any
          project at any time.
        </NoticeBox>
      </LegalSection>

      <LegalSection
        id="sec-04"
        index="04"
        title="Data Privacy & Model Training"
      >
        <p>KairoPro operates under strict enterprise isolation principles:</p>
        <div className="flex flex-col gap-3">
          {[
            {
              n: "4.1",
              strong: "Zero Model Training:",
              body: (
                <>
                  Your repositories, private system instructions, architectural
                  specs, and conversation payloads are{" "}
                  <span className="font-medium text-zinc-200">NEVER</span> used
                  to train, fine-tune, or calibrate public or proprietary
                  foundation weights.
                </>
              ),
            },
            {
              n: "4.2",
              strong: "Inference Zero-Retention:",
              body: (
                <>
                  Upstream LLM inference providers utilized by KairoPro are
                  configured with zero-data-retention (ZDR) agreements. Context
                  vectors are discarded post-generation.
                </>
              ),
            },
            {
              n: "4.3",
              strong: "Encrypted Storage:",
              body: (
                <>
                  All disk images and ephemeral container volumes are encrypted
                  at rest using AES-256 and in transit via TLS 1.3 cryptographic
                  protocols.
                </>
              ),
            },
          ].map((item) => (
            <div key={item.n} className="flex items-start gap-3">
              <span className="font-mono-tech text-xs font-bold text-brand-purple">
                {item.n}
              </span>
              <p>
                <strong className="font-semibold text-zinc-200">
                  {item.strong}
                </strong>{" "}
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection id="sec-05" index="05" title="Usage Limits & Fair Use">
        <p>
          To protect infrastructure capacity for all developers during beta
          operations, each active account is governed by fair-use execution
          limits:
        </p>
        <Card className="gap-0 overflow-hidden rounded-lg border-white/[0.06] bg-brand-surface p-0 shadow-none">
          <div className="grid grid-cols-3 gap-2 bg-brand-surface-muted px-4 py-2 font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Resource Scope</span>
            <span>Default Allocation</span>
            <span>Enforcement Action</span>
          </div>
          {[
            {
              scope: "Concurrent Sandbox Runners",
              allocation: "2 virtual nodes",
              enforcement: "Queue hold",
              enforcementCls: "text-zinc-500",
              rowCls: "bg-brand-dark",
            },
            {
              scope: "Idle Sandbox Expiration",
              allocation: "30 minutes",
              enforcement: "State hibernated",
              enforcementCls: "text-zinc-500",
              rowCls: "bg-brand-surface-muted",
            },
            {
              scope: "Cryptomining / DoS Tools",
              allocation: "Strictly 0",
              enforcement: "Instant revocation",
              enforcementCls: "text-rose-400",
              rowCls: "bg-brand-dark",
            },
          ].map((row) => (
            <div
              key={row.scope}
              className={`grid grid-cols-3 gap-2 px-4 py-2.5 font-mono-tech text-[11px] text-zinc-300 ${row.rowCls}`}
            >
              <span>{row.scope}</span>
              <span className="text-zinc-500">{row.allocation}</span>
              <span className={row.enforcementCls}>{row.enforcement}</span>
            </div>
          ))}
        </Card>
        <p>
          Automated scraping, denial-of-service stress testing through our
          infrastructure, distribution of malicious payloads, or circumventing
          runner sandboxes to gain host root privileges constitutes immediate
          account termination.
        </p>
      </LegalSection>

      <LegalSection id="sec-06" index="06" title="Disclaimers & Warranties">
        <p className="font-mono-tech text-xs uppercase tracking-wider">
          THE SERVICES, SOFTWARE, AND GENERATED SYSTEM ASSETS ARE PROVIDED
          STRICTLY &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
          WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
        </p>
        <p>
          Because KairoPro relies on autonomous generative probabilistic models,
          artifacts may occasionally contain syntactic anomalies, non-optimal
          logic routines, security vulnerabilities, or outdated dependencies.
          You maintain complete responsibility for verifying, static-analyzing,
          compiling, unit-testing, and security-auditing all code prior to
          deployment in production environments.
        </p>
        <p>
          Under no circumstances shall KairoPro Inc. or its infrastructure
          affiliates be liable for indirect, incidental, punitive, or
          consequential damages, loss of business data, unauthorized repository
          access resulting from compromised user tokens, or production downtime.
        </p>
      </LegalSection>

      <LegalSection id="sec-07" index="07" title="Termination & Portability">
        <p>
          You may terminate your account at any moment through the Account
          Management interface. We provide instant one-click repository exports
          via GitHub synchronization or direct downloadable tarball/zip archive
          downloads containing:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Complete source code history including all Git commit logs</li>
          <li>
            Agent execution plans, architectural decisions, and design
            transcripts
          </li>
          <li>
            Custom Dockerfiles, environment variables (encrypted), and CI/CD
            pipelines
          </li>
        </ul>
        <p>
          Upon account closure, your build volumes, telemetry entries, and
          persistent disk allocations are systematically wiped within
          twenty-four (24) operational hours in accordance with DoD 5220.22-M
          sanitization standards.
        </p>
      </LegalSection>

      <LegalSection id="sec-08" index="08" title="Contact Information">
        <p>
          For regulatory requests, general inquiries, DMCA takedown submissions,
          or enterprise terms negotiation, direct formal communications to our
          legal team:
        </p>
        <Card className="gap-2 rounded-lg border-white/[0.05] bg-brand-surface-muted p-4 font-mono-tech text-[12px] shadow-none">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Legal Operations:</span>
            <a
              className="text-brand-purple hover:underline"
              href="mailto:legal@kairopro.dev"
            >
              legal@kairopro.dev
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Security Disclosures:</span>
            <a
              className="text-brand-purple hover:underline"
              href="mailto:security@kairopro.dev"
            >
              security@kairopro.dev
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Physical Entity:</span>
            <span className="text-zinc-300">
              KairoPro Inc. — 548 Market St, Suite 39211, San Francisco, CA
              94104
            </span>
          </div>
        </Card>
      </LegalSection>
    </LegalLayout>
  );
}

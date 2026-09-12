import Link from "next/link";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExportButtons } from "@/components/legal/export-buttons";

export function LegalLayout({
  documentId,
  title,
  updated,
  revision,
  commit,
  activeDoc,
  toc,
  children,
}: {
  documentId: string;
  title: string;
  updated: string;
  revision: string;
  commit: string;
  activeDoc: "terms" | "privacy";
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen w-full bg-brand-dark pt-24">
        <div className="mx-auto max-w-6xl px-6">
          {/* Document header */}
          <div className="flex flex-col justify-between gap-6 pb-8 md:flex-row md:items-end">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 font-mono-tech text-[11px] text-zinc-500">
                <span className="text-brand-purple">SYS::LEGAL_SPEC</span>
                <span>/</span>
                <span className="text-zinc-300">{documentId}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 font-mono-tech text-[11px] text-zinc-500">
                <span>Last updated: {updated}</span>
                <span className="text-zinc-700">|</span>
                <Badge variant="outline" mono>
                  REV {revision}
                </Badge>
                <span className="text-zinc-700">|</span>
                <span className="text-brand-green">STABLE COMMIT {commit}</span>
              </div>
            </div>

            {/* Document toggle */}
            <div className="flex items-center gap-1 self-start rounded-[4px] border border-white/[0.08] bg-brand-surface p-1 md:self-auto">
              <Button
                asChild
                size="sm"
                variant={activeDoc === "terms" ? "default" : "ghost"}
                className="font-mono-tech text-[11px]"
              >
                <Link href="/terms">Terms of Service</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant={activeDoc === "privacy" ? "default" : "ghost"}
                className="font-mono-tech text-[11px]"
              >
                <Link href="/privacy">Privacy Policy</Link>
              </Button>
            </div>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Body: TOC sidebar + content */}
          <div className="grid grid-cols-1 items-start gap-8 py-10 lg:grid-cols-12">
            <aside className="hidden lg:col-span-4 lg:block">
              <Card className="sticky top-24 gap-0 rounded-lg border-white/[0.08] bg-brand-surface p-5 shadow-none">
                <div className="flex items-center justify-between pb-3">
                  <span className="font-mono-tech text-[10px] uppercase tracking-wider text-zinc-500">
                    Table of Contents
                  </span>
                  <span className="font-mono-tech text-[11px] text-zinc-500">
                    {String(toc.length).padStart(2, "0")} SECTIONS
                  </span>
                </div>
                <nav className="flex flex-col gap-1">
                  {toc.map((item, i) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono-tech text-xs text-zinc-400 transition-colors hover:bg-brand-surface-muted hover:text-zinc-100"
                    >
                      <span className="text-brand-purple">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </a>
                  ))}
                </nav>
                <Separator className="my-4 bg-white/[0.06]" />
                <ExportButtons title={title} toc={toc} />
              </Card>
            </aside>

            <div className="col-span-1 flex max-w-[680px] flex-col gap-10 lg:col-span-8">
              {children}

              {/* Enterprise CTA */}
              <Card className="flex flex-col justify-between gap-4 rounded-lg border-white/[0.08] bg-brand-surface p-5 shadow-none sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-zinc-100">
                    Need custom enterprise legal terms?
                  </span>
                  <span className="text-xs text-zinc-500">
                    We provide custom DPAs, BAA addendums, and on-premises
                    licensing agreements for enterprise teams.
                  </span>
                </div>
                <Button asChild size="sm" className="whitespace-nowrap">
                  <a href="mailto:sales@kairopro.dev">Request Enterprise DPA</a>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";

import { Download, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  title,
  toc,
}: {
  title: string;
  toc: { id: string; label: string }[];
}) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function downloadMarkdown() {
    const md =
      `# ${title}\n\n` +
      toc
        .map((s, i) => `${String(i + 1).padStart(2, "0")}. ${s.label}`)
        .join("\n");
    triggerDownload(new Blob([md], { type: "text/markdown" }), `${slug}.md`);
  }

  async function downloadAudit() {
    const data = new TextEncoder().encode(
      title + "|" + toc.map((t) => t.label).join("|"),
    );
    const digest = await crypto.subtle.digest("SHA-256", data);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    triggerDownload(
      new Blob(
        [
          JSON.stringify(
            { document: title, sha256, exportedAt: new Date().toISOString() },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      `${slug}-audit.json`,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between font-mono-tech text-[11px]"
        onClick={downloadMarkdown}
      >
        <span className="flex items-center gap-2">
          <Download className="h-3.5 w-3.5 text-brand-purple" />
          Export raw spec
        </span>
        <span className="text-zinc-500">.MD</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between font-mono-tech text-[11px]"
        onClick={downloadAudit}
      >
        <span className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-brand-purple" />
          Audit verification
        </span>
        <span className="text-zinc-500">SHA256</span>
      </Button>
    </div>
  );
}

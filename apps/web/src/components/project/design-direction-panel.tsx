"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, CloudUpload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Preset {
  id: string;
  name: string;
  descriptor: string;
  preview: ReactNode;
}

const PRESETS: Preset[] = [
  {
    id: "clean-saas",
    name: "Clean SaaS",
    descriptor: "Selected",
    preview: (
      <>
        <span className="h-2 w-2 rounded-full bg-brand-purple" />
        <span className="h-1 w-8 rounded bg-white/20" />
      </>
    ),
  },
  {
    id: "bold-marketing",
    name: "Bold Marketing",
    descriptor: "Vivid accent",
    preview: (
      <>
        <span className="h-2 w-2 rounded-full bg-brand-purple-light" />
        <span className="h-1.5 w-6 rounded bg-white/20" />
      </>
    ),
  },
  {
    id: "dense-dashboard",
    name: "Dense Grid",
    descriptor: "High density",
    preview: (
      <>
        <span className="h-1.5 w-1.5 bg-zinc-500" />
        <span className="h-1 w-10 bg-zinc-600" />
      </>
    ),
  },
  {
    id: "playful",
    name: "Playful",
    descriptor: "Expressive",
    preview: (
      <>
        <span className="h-2 w-2 rounded-full bg-brand-cyan" />
        <span className="h-1.5 w-6 rounded-full bg-brand-green" />
      </>
    ),
  },
];

const SWATCHES = [
  { hex: "#0A0A0F", name: "Canvas", tone: "muted" },
  { hex: "#131318", name: "Surface", tone: "muted" },
  { hex: "#26262F", name: "Border", tone: "muted" },
  { hex: "#6D5EF5", name: "Interactive", tone: "purple" },
  { hex: "#10B981", name: "Success", tone: "green" },
] as const;

function PanelLabel({ children }: { children: string }) {
  return (
    <label className="mb-2 block font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-zinc-100">
      {children}
    </label>
  );
}

export function DesignDirectionPanel() {
  const [selectedPreset, setSelectedPreset] = useState("clean-saas");

  return (
    <div className="relative overflow-hidden rounded-lg border border-brand-purple/40 bg-brand-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.1] pb-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-zinc-100">
            Design Direction
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Define visual style, component tokens, and structural density for
            this application.
          </p>
        </div>
        <span className="shrink-0 rounded-[3px] border border-brand-purple/30 bg-brand-purple/10 px-2 py-0.5 font-mono-tech text-[10px] uppercase tracking-wider text-brand-purple-light">
          Phase 1 Palette
        </span>
      </div>

      <div className="mt-6">
        <PanelLabel>Preset Theme Archetype</PanelLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" id="presetGroup">
          {PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                aria-pressed={isSelected}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-[3px] p-2 text-left transition-all",
                  isSelected
                    ? "border-2 border-brand-purple bg-white/[0.06]"
                    : "border border-white/[0.08] bg-brand-dark hover:border-zinc-500/50",
                )}
                data-preset={preset.id}
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset.id)}
              >
                {isSelected && (
                  <CheckCircle2
                    className="absolute right-1.5 top-1.5 h-4 w-4 text-brand-purple-light"
                    fill="currentColor"
                  />
                )}
                <div
                  className={cn(
                    "flex h-8 w-full items-center justify-center gap-1 rounded-[3px] border border-white/[0.06] px-1",
                    isSelected ? "bg-brand-dark" : "bg-brand-surface-muted",
                  )}
                >
                  {preset.preview}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-zinc-100">
                    {preset.name}
                  </div>
                  <div
                    className={
                      isSelected
                        ? "font-mono-tech text-[10px] text-brand-purple-light"
                        : "font-mono-tech text-[10px] text-zinc-400"
                    }
                  >
                    {preset.descriptor}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label
            className="mb-1 block font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-zinc-100"
            htmlFor="reference-site"
          >
            Reference site
          </label>
          <Input
            className="h-8 rounded-[3px] border-white/[0.1] bg-brand-dark px-2 font-mono-tech text-[11px] text-zinc-100 shadow-none focus-visible:border-brand-purple focus-visible:ring-0 dark:bg-brand-dark"
            defaultValue="https://linear.app"
            id="reference-site"
            placeholder="https://domain.com"
            type="url"
          />
          <p className="mt-1 text-xs text-zinc-400">
            We&apos;ll match its layout patterns and color relationships — not
            copy its brand.
          </p>
        </div>
        <div>
          <span className="mb-1 block font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-zinc-100">
            Logo (optional)
          </span>
          <div className="flex h-[58px] w-full cursor-pointer items-center justify-center gap-2 rounded-[3px] border border-dashed border-white/[0.12] bg-brand-dark px-2 text-zinc-400 transition-colors hover:border-zinc-500/50">
            <CloudUpload className="h-4 w-4" />
            <span className="font-mono-tech text-[10px]">
              Drop SVG / PNG file here
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            A text wordmark is used if you skip this.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-3">
        <PanelLabel>Extracted System Tokens</PanelLabel>
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {SWATCHES.map((swatch) => (
            <div className="flex flex-col items-center" key={swatch.hex}>
              <div
                className="h-10 w-full rounded-[3px] border border-white/[0.08] shadow-inner"
                style={{ backgroundColor: swatch.hex }}
              />
              <span
                className={cn(
                  "mt-1 font-mono-tech text-[10px]",
                  swatch.tone === "purple" &&
                    "font-semibold text-brand-purple-light",
                  swatch.tone === "green" && "font-semibold text-[#10B981]",
                  swatch.tone === "muted" && "text-zinc-400",
                )}
              >
                {swatch.hex}
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  swatch.tone === "purple" && "text-brand-purple-light",
                  swatch.tone === "green" && "text-[#10B981]",
                  swatch.tone === "muted" && "text-zinc-500",
                )}
              >
                {swatch.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-3">
        <PanelLabel>Typography Pairings</PanelLabel>
        <div className="grid grid-cols-1 gap-0 rounded-[3px] border border-white/[0.06] bg-brand-dark p-1 sm:grid-cols-3">
          <div className="border-white/[0.06] p-1 sm:border-r">
            <div className="text-xl font-bold leading-tight text-zinc-100">
              Inter Bold
            </div>
            <div className="mt-1 font-mono-tech text-[10px] text-zinc-400">
              Heading • 20px / -0.015em
            </div>
          </div>
          <div className="border-white/[0.06] p-1 sm:border-r">
            <div className="text-sm leading-normal text-zinc-100">
              Inter Regular 14px body specimen for dense readouts.
            </div>
            <div className="mt-1 font-mono-tech text-[10px] text-zinc-400">
              Body • 13px / -0.005em
            </div>
          </div>
          <div className="flex items-center justify-between p-1">
            <div className="text-[32px] font-bold leading-none tracking-tight text-brand-purple-light">
              Aa
            </div>
            <div className="text-right">
              <div className="font-mono-tech text-[11px] font-semibold text-zinc-100">
                Inter Sans
              </div>
              <div className="font-mono-tech text-[10px] text-zinc-400">
                Default UI Stack
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

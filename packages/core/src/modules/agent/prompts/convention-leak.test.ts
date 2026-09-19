import { describe, expect, it } from "vitest";
import { WORKFLOW_PHASES } from "../llm/router";
import { loadPrompt, type PromptName } from "./loader";

/**
 * Convention-leak test (Phase 8 / AI-3 exit criteria): no prompt may name a
 * specific stack convention. Conventions are injected from `template.json`
 * and the spec context at call time — that is what keeps a second template
 * cheap. If a term below shows up in a prompt, adding a second UI library
 * means editing prompts instead of adding a template.
 *
 * This list is this repo's own stack (apps/web's dependencies) — the
 * concrete things a prompt could accidentally leak by example.
 */
const BANNED_TERMS = [
  "shadcn",
  "tailwind",
  "radix",
  "lucide-react",
  "framer-motion",
  "class-variance-authority",
  "tanstack",
  "zustand",
  "react-hook-form",
  "next/link",
  "next/navigation",
  "next/image",
  "@/components",
  "@/lib",
];

const PROMPT_NAMES: PromptName[] = ["system", ...WORKFLOW_PHASES];

describe("convention-leak (AI-3)", () => {
  for (const name of PROMPT_NAMES) {
    it(`"${name}" contains no hardcoded stack convention`, () => {
      const source = loadPrompt(name).toLowerCase();
      for (const term of BANNED_TERMS) {
        expect(source).not.toContain(term.toLowerCase());
      }
    });
  }
});

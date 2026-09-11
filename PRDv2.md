# KairoPro — Product Requirements Document v2

> **Purpose of this document.** PRD.md describes KairoPro V1 as originally scoped. This document records the changes agreed after reviewing V1 end-to-end: a revised user flow with a PM agent and a design system phase, a decision on where true agent boundaries belong, and the concrete changes V1 must absorb now to keep V2 cheap. Where this document conflicts with PRD.md, **this document wins.**

---

## Table of Contents

1. [What Changed From v1](#1-what-changed-from-v1)
2. [Revised User Flow](#2-revised-user-flow)
3. [PM Agent](#3-pm-agent)
4. [Design System Phase](#4-design-system-phase)
5. [Agent Boundaries vs Workflow Phases](#5-agent-boundaries-vs-workflow-phases)
6. [Contract Freezing](#6-contract-freezing)
7. [Approval Gates and User Fatigue](#7-approval-gates-and-user-fatigue)
8. [Agent and Tool Ownership](#8-agent-and-tool-ownership)
9. [Testing Agent](#9-testing-agent)
10. [Updated MVP Scope](#10-updated-mvp-scope)
11. [V1 → V2 Migration Requirements](#11-v1--v2-migration-requirements)
12. [Open Questions](#12-open-questions)

---

## 1. What Changed From v1

| Area | v1 | v2 | Reason |
|------|----|----|--------|
| Requirements gathering | One-shot: input → PRD | PM agent asks 3-5 bounded questions first | Cheapest place to catch a misunderstanding |
| Spec artifacts | 3 (PRD, Data Model, App Structure) | 4 (+ Design System) | Design decisions must be captured before code, not improvised during it |
| Design input | None | Reference site + logo + preset → extracted tokens | A reference URL is worth more than interrogating the user about typography |
| Design output | None | Machine-consumable tokens (CSS vars + Tailwind config) | If design doesn't reach the code, the phase is theater |
| Agent architecture | Workflow + single agent per phase | Phases + **one** independent agent boundary (testing) | Separate agents only pay off for parallelism, independence, or context isolation |
| Testing | Fix loop consumes runtime errors | Independent test agent generates tests **from the spec** | Tests written from code test the implementation, not the requirements |
| Ownership model | `Project.userId` | `Organization` + `Membership` (personal org in V1) | Turns the largest V2 rewrite into an additive change |
| Metering | None | `UsageEvent` on every LLM call, build, container-minute | Turns V2 billing from retro-instrumentation into additive work |
| Template | Single hardcoded template | `templateId` on Project, conventions in spec object | Protects the HeroUI V2 path |
| Infrastructure seams | Direct `EventEmitter`, local paths | `EventBus` + `WorkspaceStore` interfaces | Protects the multi-host scaling path |

---

## 2. Revised User Flow

```
1. User logs in
        ↓
2. Input: requirements + features needed
   (free text + file uploads + optional form)
        ↓
3. PM Agent: 3-5 bounded questions
   (every question offers suggested answers)
   Only asks about things that materially change architecture
        ↓
4. PRD generated
   + Design System section
     (reference site, logo, preset → extracted tokens)
        ↓   [GATE 1: approve]
5. Data Model generated
        ↓   [GATE 2: approve]
6. App Structure generated
        ↓   [GATE 3: approve]
7. Build
   Design tokens → tailwind.config.ts + CSS variables
   Backend phase → API routes against frozen contracts
   Frontend phase → pages against frozen contracts + design spec
        ↓
8. Test Agent (independent)
   Generates unit / integration / e2e tests FROM THE SPEC
        ↓
9. Fix loop
   Consumes test failures + runtime errors
   Silent graceful degradation
        ↓
10. Preview → Deploy
```

**Interaction budget before any code is written:** 2 input rounds (requirements, design) + 3 approval gates. Design input is folded into the PRD gate rather than being its own gate.

---

## 3. PM Agent

### 3.1 Purpose

Resolve architectural ambiguity in the user's requirements before any spec is generated. Ambiguity resolved here costs one question; resolved later it costs a regeneration plus re-approval of every downstream artifact.

### 3.2 Rules

- **Bounded:** 3-5 questions maximum. Hard limit.
- **Suggested answers:** every question offers 2-4 concrete options. The user should mostly click, not type.
- **Architecture-relevant only.** Ask about:
  - Authentication model (who logs in, how)
  - User roles and permissions (flat vs. roles vs. admin hierarchies)
  - Multi-tenancy (single org vs. teams vs. workspaces)
  - Payments / monetization (if any)
  - External integrations (which services, which credentials)
  - Core entities and their relationships when the input is ambiguous
- **Never ask** about visual design, copy, button labels, colors, or anything that does not change the schema or API surface.
- **Never ask** what can be reasonably inferred and listed as an assumption in the PRD instead.

### 3.3 Question Delivery

Batch-first, with an option to interleave:

- **Batch (default):** all questions presented on one screen. Faster to answer, easier to build, easier for the user to see the whole picture.
- **Interleaved (V2):** one question at a time, each answer informing the next. Feels conversational, better for complex domains, more expensive and slower.

V1 ships batch.

### 3.4 Output

The PM agent's questions and answers become part of the spec context. Unanswered questions become explicitly labeled assumptions in the PRD, which the user can correct at Gate 1.

```json
{
  "questions": [
    {
      "id": "auth_model",
      "question": "How should users log in?",
      "options": [
        { "label": "Email + password", "value": "credentials" },
        { "label": "Google login", "value": "google" },
        { "label": "Both", "value": "credentials+google" },
        { "label": "Not sure — recommend one", "value": "auto" }
      ],
      "affects": ["schema", "api", "pages"]
    }
  ],
  "answers": { "auth_model": "credentials+google" },
  "assumptions": []
}
```

---

## 4. Design System Phase

### 4.1 Purpose

Capture the user's visual intent in a form that directly themes the generated application. Design is a **system** produced before build, not per-screen design improvised during it.

### 4.2 Placement

The design system is generated **after the PRD and before the Data Model**, and is presented as a **section of the PRD gate**, not as a separate approval gate.

Rationale: the design system is small and visual (swatches, a font sample, a radius sample). It does not need a full page and does not warrant its own gate. Folding it into Gate 1 keeps the gate count at three.

### 4.3 Inputs — Ask vs. Infer

The critical design principle: **ask for a little, infer the rest.**

**Ask (cheap, meaningful):**

| Input | Required | Notes |
|-------|----------|-------|
| Reference site(s) | Optional | 1-3 URLs. Highest-value input — the system infers most tokens from these. |
| Logo | Optional | Image upload. **Must have a text-wordmark fallback** so a missing logo never blocks the phase. |
| Preset | Optional | Named choice: Clean SaaS, Bold Marketing, Dense Dashboard, Playful, Minimal. |
| Freeform note | Optional | "Make it feel trustworthy" — used to pick a preset when none is chosen. |

**Infer (never interrogate):**

- Color palette (primary, accent, neutrals, semantic colors)
- Typography (family, scale, weights, line heights)
- Spacing rhythm
- Corner radius
- Shadow style
- Component density and shape
- Border and divider treatment

**Confirm (don't invent):**

Present the extracted tokens back as swatches, type samples, and shape samples. The user tweaks values; they are never asked to author values from nothing.

### 4.4 Reference Site Handling

Reference sites are used for **systematic extraction**, not reproduction.

- Extract: palette structure, type scale ratio, spacing rhythm, radius family, density, layout patterns
- Do **not** reproduce: brand identities, logos, copy, exact brand colors of a specific company
- Output is "inspired by these patterns," never "a clone of this site"

This is both an IP constraint and a quality constraint — copying a brand produces a worse result than extracting its systematic choices.

### 4.5 Output — Machine-Consumable (Non-Negotiable)

For the design phase to be real rather than decorative, its output must reach the code. shadcn/ui themes entirely through CSS custom properties and Tailwind configuration, so that is the output contract:

```css
/* app/globals.css — generated */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --radius: 0.5rem;
  /* ... */
}
```

```typescript
// tailwind.config.ts — generated
{
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', ...], },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)' },
      colors: { background: 'hsl(var(--background))', /* ... */ }
    }
  }
}
```

```json
// design spec — stored on the project, fed into every frontend generation call
{
  "preset": "clean-saas",
  "referenceSites": ["https://example.com"],
  "logo": { "url": "...", "fallback": "wordmark" },
  "tokens": {
    "colors": { "primary": "hsl(221 83% 53%)", "..." : "..." },
    "typography": { "family": "Inter", "scale": [12,14,16,20,24,32,48], "weights": [400,500,600] },
    "radius": "0.5rem",
    "density": "comfortable",
    "shadow": "soft"
  },
  "componentStyle": { "button": "solid", "card": "bordered", "input": "outlined" }
}
```

The design spec is stored like any other spec (`DesignSpec` type), approved with Gate 1, and injected into every frontend generation call so components are generated against the real design system.

### 4.6 Screen-Level Design

Per-screen layout decisions require knowing the pages, which is App Structure. Therefore:

- **Gate 1 (with PRD):** design *system* — tokens, type, shape, component style
- **During build (after App Structure):** per-screen layout, derived from the design system + the approved page list

The design system is global and stable. Screen layouts are downstream and mechanical.

### 4.7 If the User Skips Design

If the user provides no reference, no logo, no preset, and no note:

- Use a default preset (Clean SaaS)
- Use a text wordmark
- Use the default token set
- Proceed without comment — never block on missing design input

---

## 5. Agent Boundaries vs Workflow Phases

### 5.1 The Principle

Specialization buys **focused prompts, focused context, and scoped tools** — and all three are achievable with phases inside one agent loop. Separate agents are only justified when you need:

1. **Parallelism** — multiple domains working at the same time
2. **Independence** — a party that did not write the code judging it
3. **Context isolation** — one domain's exploration not polluting another's window

Everything else is a phase.

### 5.2 The Cost of Splitting

Separate agents do not just cost handoffs. They cost **contract drift**: two isolated contexts each invent half of an interface, and they disagree — `/api/tasks` returns `{ items: [] }` on one side and `[]` on the other; the form posts `dueDate` while the schema has `deadline`. Adding agents *causes* the class of bug it was meant to prevent unless contracts are frozen first.

### 5.3 The Decision

```
Contracts (approved, frozen):
  PRD (+ Design System)  →  Data Model  →  App Structure
        │
        ▼
Phases (focused prompt + focused context + scoped tools, one agent loop):
  1. Design       → Design Spec (tokens)
  2. Backend      → API routes + validation, against frozen contracts
  3. Frontend     → pages + components, against frozen contracts + Design Spec
  4. Fix loop     → consumes test failures and runtime errors

True agent boundary:
  5. Test Agent   → INDEPENDENT. Generates tests from the SPEC, not the code.
```

Only the testing phase is a separate agent. Everything else is a phase. Same specialization benefit, no handoff tax, no drift between agents that never spoke.

### 5.4 Why Frontend and Backend Are Not Separate Agents in V1

The chosen stack is Next.js full-stack: frontend and backend share one repository, one `lib/`, and one type system. Splitting them into competing agents therefore produces either:

- **Sequential execution** — you pay the drift cost and get no parallelism
- **Parallel execution** — requires a hard file-namespace partition plus a frozen contract file, with merge conflicts when they overlap

V1 uses phases with a frozen contract. Parallel domain agents are a V2+ option, and only if contract freezing proves reliable enough to make parallelism safe.

### 5.5 "AI Services" — Clarification Required

Three different things have been called an "AI services agent." They are not the same:

1. **Apps whose product is AI** (e.g., the user wants a chatbot, a summarizer, RAG search). This is a **capability extension**: template additions, prompt patterns, provider integration. Not an agent.
2. **KairoPro's own agent infrastructure.** This is the agent module itself. Not an agent.
3. **Deciding where the generated app should call an LLM.** This is a **design-time decision** made during App Structure, recorded like any other architectural choice. Not an agent.

Until this is disambiguated, no "AI services agent" is scoped. See [Open Questions](#12-open-questions).

---

## 6. Contract Freezing

### 6.1 The Rule

**No code is generated until the contracts between layers are frozen and machine-readable.** Contracts are the approved Data Model and App Structure.

### 6.2 What Must Be Frozen

| Contract | Source | Consumed By |
|----------|--------|-------------|
| Entity types and fields | Data Model (Prisma schema) | Backend, Frontend, Tests |
| API request/response shapes | App Structure | Backend, Frontend, Tests |
| Route list and methods | App Structure | Backend, Frontend, Tests |
| Auth model and roles | PRD | Backend, Frontend, Tests |
| Design tokens | Design Spec | Frontend, Tests |

### 6.3 Enforcement

- API response shapes are expressed as **shared TypeScript types** in a single generated module, imported by both API routes and frontend consumers. One definition, two consumers.
- Zod schemas are the runtime counterpart of those types, generated once and shared.
- Type checking at every step catches drift immediately rather than at the end of the build.

The practical effect: a frontend phase and a backend phase, run at different times, against the same frozen contract, converge without ever having communicated.

---

## 7. Approval Gates and User Fatigue

### 7.1 The Tradeoff

Each approval gate increases correctness and decreases activation. Section-by-section approval was chosen deliberately, but the cost is real: most users abandon around the third gate if every gate demands effort.

### 7.2 Mitigations

1. **Skippable with a default.** Show the artifact, make "Looks good" the prominent action and "Change something" the quiet one. A trusting user advances in one click per gate.
2. **Merge small artifacts.** The design system is presented inside Gate 1, not as its own gate.
3. **Never require authoring.** Every input offers options. The user picks; they rarely type.
4. **Show progress.** Make it visible that there are three gates, so the end is in sight.

### 7.3 Final Gate Count

```
Gate 1: PRD + Design System
Gate 2: Data Model
Gate 3: App Structure        → build starts
```

Three gates. Not four.

---

## 8. Agent and Tool Ownership

Each phase gets a scoped tool set. The agent cannot use tools irrelevant to its phase, which reduces both error surface and context size.

| Phase | Tools Available |
|-------|-----------------|
| PM Agent | none (pure conversation + structured output) |
| Design | none (pure analysis + structured output); may fetch reference site HTML |
| Backend | `read_file`, `write_file`, `edit_file`, `list_files`, `search_code`, `run_command`, `install_dependency` |
| Frontend | `read_file`, `write_file`, `edit_file`, `list_files`, `search_code`, `install_dependency` |
| Test Agent | `read_file`, `write_file`, `search_code`, `run_command`, `run_tests`, `list_files` |
| Fix loop | full tool set including `read_logs`, `inspect_error`, `start_server`, `stop_server`, `take_screenshot` |

Note that Backend and Frontend are denied `start_server` / browser tools — those belong to the run-and-test phase, not to code authoring.

---

## 9. Testing Agent

### 9.1 Why It Is a Separate Agent

This is the one handoff that pays for itself, for a specific reason: **tests written from the generated code test the implementation; tests written from the spec test the requirements.** An independent agent, given only the approved spec (and the shared contract types), catches a different class of error — it verifies that what was built is what was asked for, not merely that what was built is internally consistent.

### 9.2 Inputs

- Approved PRD (user stories → test cases)
- Approved Data Model (entities → fixtures)
- Approved App Structure (routes → flows)
- Shared contract types
- **Not** the generated implementation

### 9.3 Outputs

| Level | Scope | Example |
|-------|-------|---------|
| Unit | Pure functions, validation, business rules | "rejects a task with an empty title" |
| Integration | API routes against a real DB | "POST /api/tasks creates a task and returns 201" |
| E2E | Full user flows in a browser | "a manager can create a task and assign it" |

### 9.4 Flow

```
Code generated (backend + frontend phases)
        ↓
Test Agent generates tests FROM SPEC
        ↓
Run tests
        ↓
Failures + runtime errors → Fix loop
        ↓
Fix loop patches implementation (never the tests)
        ↓
Re-run
        ↓
Pass → preview
```

### 9.5 Rule: The Fix Loop Does Not Weaken Tests

If a test fails, the fix loop fixes the implementation. It may only modify a test when the test is provably testing a requirement that was not actually approved (a spec discrepancy), and that modification is logged as an internal event.

---

## 10. Updated MVP Scope

### 10.1 Added to V1 (relative to PRD.md)

- PM Agent (3-5 bounded questions, suggested answers, batch delivery)
- Design System phase (reference site, logo, preset → extracted tokens)
- Design spec as a stored, approved artifact
- Design tokens wired to `tailwind.config.ts` and CSS variables
- Independent Test Agent generating unit/integration/e2e from spec
- Shared contract types module (single definition, both consumers)
- `Organization` + `Membership` with auto-created personal org
- `UsageEvent` emission on every LLM call, build, and container-minute
- `templateId` on Project
- Conventions block in the spec object, not in prompt strings
- `EventBus` and `WorkspaceStore` interfaces with local implementations
- `ownerOf(project)` access helper replacing inline `userId` checks
- `retrieve(request) → files` as the single context-builder entry point

### 10.2 Unchanged from V1

- Auth (email/password + Google), generated stack (Next.js/Postgres/Prisma/shadcn/NextAuth)
- Docker per-project isolation, preview (iframe + URL), deploy + GitHub export
- Build view (status + terminal + code stream), cancel with checkpoint
- Silent graceful degradation, git-based version control with undo
- No billing

### 10.3 Still Postponed

- HeroUI
- Vector search
- Billing / payments
- Custom domains
- Firecracker / microVMs
- Collaborative editing
- Parallel frontend/backend agents
- Interleaved PM questioning
- Per-domain model routing

---

## 11. V1 → V2 Migration Requirements

Items marked **now** must be built into V1 as described; otherwise V2 becomes a rewrite rather than an addition.

| V2 Feature | V1 Must Have (now, cheap) | Without It (V2 cost) |
|-----------|---------------------------|----------------------|
| Billing / plans | `UsageEvent` on every LLM call + build + container-minute | Retro-instrument agent, build, execution modules — High |
| HeroUI | `templateId` on Project; conventions in spec object | Fork template, prompts, context, tests, all generated code — High |
| Team accounts | `Organization` + `Membership`, personal org auto-created | Rewrite schema, auth, every service, every route — High |
| Multi-host scaling | `EventBus` + `WorkspaceStore` interfaces | Rewrite every local-path and in-process-bus assumption — Medium |
| Vector search | `retrieve()` as single entry point | Edit every context call site — Low (already designed as a seam) |
| Custom domains | reverse proxy already supports it; add mapping table | Low either way |
| Multiple LLM providers | provider interface already abstract | None if interface is respected |

**Not convertible cheaply — remains a rewrite regardless:** collaborative editing. SSE is one-directional; real-time collaborative editing requires bidirectional sync (CRDT or OT), which replaces the real-time layer. Keep this out of V2 unless it is a core requirement.

---

## 12. Open Questions

1. **"AI services agent" disambiguation.** Is this about (a) generated apps whose product is AI, (b) KairoPro's own agent infrastructure, or (c) deciding where generated apps call an LLM? The answer determines whether this is a capability, a component, or a design-time decision.
2. **PM question delivery.** Batch confirmed for V1. Confirm whether interleaved is genuinely wanted in V2, since it changes the PM agent's prompt and the input UI.
3. **Reference site extraction.** Confirm the "inspired by patterns, never a clone" constraint, and whether the user should see the extracted tokens as an editable swatch set before approving.
4. **Logo handling.** Confirm text-wordmark fallback is acceptable when no logo is provided, rather than requiring a logo upload.
5. **Design system editing depth.** Should users be able to edit individual tokens (e.g., set the exact primary color), or only choose among generated options? Fuller editing is more power and more UI.
6. **Organization in V1.** Confirm introducing `Organization` + `Membership` now, given it is invisible to the user in V1 (single personal org) and exists purely to make V2 cheap.

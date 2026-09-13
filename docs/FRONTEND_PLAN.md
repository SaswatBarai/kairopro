# KairoPro — Frontend Implementation Plan

Phases FE-1 through FE-10. Builds entirely against mocked contracts; no phase depends on the backend.

> **Status (2026-09-13): shipped, differently than planned.** The visual surfaces of FE-1 … FE-9 are built and merged — ported directly from the Stitch exports in `designs/stitch/`, with mock data hardcoded in components. The MSW layer this plan assumed was never built and is skipped by decision. The data-layer rules below (RSC · TanStack Query · Zustand · contracts) are still the target — they now apply to the **backend-integration rewire** of each page, mapped phase-by-phase in `BACKEND_AI_PLAN.md §0`. FE-10 (hardening, screenshot diffing) remains future work.

**Screen IDs** (`A1`, `B1`, …) refer to `STITCH_PROMPTS.md`. **Tokens** refer to `DESIGN.md`.

---

## How to read this document

Each phase states its goal, dependencies, deliverables, exit criteria, tests, and notes. A phase is done when every exit criterion is verifiably true and its tests pass.

**Phase order matters.** Phases are sequenced so each one is independently demoable, and so the components a later phase needs already exist.

**All paths are repo-relative.** KairoPro is a monorepo: frontend code lives in `apps/web/`, shared contracts in `packages/contracts/`, and server-only domain logic in `packages/core/` — which this track never imports.

---

## FE-1: App shell

**Goal:** a navigable, themable application shell with the three route groups and the real design tokens applied.

**Depends on:** P0.1, P0.2, P0.3

**Deliverables**

- `apps/web/src/app/layout.tsx` — root layout: fonts, theme, providers
- `apps/web/src/app/globals.css` + `apps/web/src/app/theme.css` — the generated token file, imported
- `apps/web/src/app/icon.svg` — favicon, copied from `designs/brand/logo.svg`
- `apps/web/public/logo.svg` — the mark at full size, copied from `designs/brand/logo.svg`
- `apps/web/src/components/common/Logo.tsx` — the mark plus the `KairoPro` wordmark, sizes `sm` | `md`
- `apps/web/src/app/(marketing)/layout.tsx` — public shell, sticky top nav
- `apps/web/src/app/(auth)/layout.tsx` — minimal centered shell
- `apps/web/src/app/(dashboard)/layout.tsx` — sidebar + top bar shell
- `apps/web/src/components/common/AppShell.tsx` — the dashboard three-region layout
- `apps/web/src/components/common/Sidebar.tsx` — nav, collapsible, active state
- `apps/web/src/components/common/TopBar.tsx` — breadcrumb slot, status slot, action slot
- `apps/web/src/components/common/Providers.tsx` — TanStack Query client, session, theme
- `apps/web/src/stores/ui.store.ts` — sidebar collapsed, panel visibility
- Placeholder pages in each route group so navigation is testable

**Exit criteria**

- All three route groups render and are reachable by navigation
- Sidebar collapses and the collapsed state persists across navigation
- No hardcoded hex values anywhere in `apps/web/src/components/**`
- Inter and JetBrains Mono both load and are applied correctly
- The shell scrolls per-region; the page itself never scrolls
- `Logo` renders the mark at both sizes, and the wordmark is hidden when the sidebar is collapsed

**Tests**

- `Sidebar` — renders nav items, marks the active route, toggles collapse
- `Logo` — renders the mark; renders the wordmark at `md`; hides the wordmark at `sm`
- `AppShell` — renders children in the correct region; hides the right panel when absent
- `ui.store` — collapse toggle persists to `localStorage`
- Deliberately not tested: layout-only wrappers with no branching

**Notes**

- Providers wrap in this order: theme → query client → session. Query client must be created per-request in RSC contexts and once in the browser — use the standard `useState(() => new QueryClient())` pattern to avoid cross-request cache leakage.
- The three-region grid uses explicit sizes (240px sidebar, 360px panel) rather than `fr` units. This is deliberate: Stitch's four-region layouts collapse without fixed tracks.
- **The mark's cyan dot is the only permanent cyan in the product.** Every other cyan must be tied to live agent activity — see `DESIGN.md` and the FE-4 and FE-7 tests. A logo that looks like a status light attached to a control is a bug, not a style choice.
- The favicon is 32×32 and the K reads acceptably at that size. At 16×16 the 2.5px strokes and the dot will muddy — if the browser favicon matters, supply a simplified 16px variant with a thicker stroke and no dot.

---

## FE-2: Marketing pages

**Goal:** the six public pages, server-rendered, matching the Stitch designs.

**Depends on:** FE-1

**Deliverables**

- `apps/web/src/app/(marketing)/page.tsx` — `A1` home
- `apps/web/src/app/(marketing)/features/page.tsx` — `A2`
- `apps/web/src/app/(marketing)/pricing/page.tsx` — `A3` beta / free
- `apps/web/src/app/(marketing)/about/page.tsx` — `A4`
- `apps/web/src/app/(marketing)/legal/[doc]/page.tsx` — `A5`, renders Terms and Privacy from local content
- `apps/web/src/app/not-found.tsx` — `A6`
- `apps/web/src/components/marketing/` — `Hero.tsx`, `StepList.tsx`, `FeatureCard.tsx`, `CtaBand.tsx`, `LegalLayout.tsx`, `FaqList.tsx`
- Per-page `metadata` exports for title, description, Open Graph

**Exit criteria**

- All six routes render server-side with zero client JS except interactive disclosures
- Every page has a distinct `title` and `description`
- The pricing page states the product is free in beta and contains **no** prices, tiers, or payment UI
- No marketing screen depicts a UI that does not exist in the product
- `not-found.tsx` renders for an unknown route

**Tests**

- `Hero` — renders headline, subheadline, and both CTAs with correct hrefs
- `FaqList` — disclosure toggles independently; one open at a time
- `LegalLayout` — renders a table of contents and anchors resolve
- Page-level: each marketing page exports non-empty metadata (a small looping test over the route list)

**Notes**

- `A3` deliberately has no plan comparison. Do not add one — billing is V2 and the absence is intentional.
- The hero product screenshot is a static image of the build view. It must be regenerated if the build view changes materially (tracked as a task in FE-10).

---

## FE-3: Auth pages

**Goal:** login, register, and the honest forgot-password page, with validated forms.

**Depends on:** FE-1, P0.4

**Deliverables**

- `apps/web/src/app/(auth)/login/page.tsx` — `B1`
- `apps/web/src/app/(auth)/register/page.tsx` — `B2`
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — `B3`
- `apps/web/src/components/auth/LoginForm.tsx`
- `apps/web/src/components/auth/RegisterForm.tsx`
- `apps/web/src/components/auth/PasswordStrength.tsx` — four-segment meter
- `apps/web/src/components/auth/AuthSplitLayout.tsx` — the 50/50 split with the decorative panel
- `packages/contracts/src/auth.ts` — added to the contract set
- `apps/web/src/lib/queries/auth.ts` — mutation hooks

**Exit criteria**

- Invalid email and short password are rejected client-side before submit
- Field-level errors render inline beneath the offending input, never in a toast
- Password fields have working show/hide toggles
- The strength meter reflects the actual password and never claims a state it cannot justify
- `B3` contains **no** email input and never says a link was sent
- Submit failure renders a form-level message that does not leak a provider error
- Successful submit navigates to the dashboard

**Tests**

- `LoginForm` — rejects invalid email; rejects short password; submits valid credentials; renders a form-level error on rejection; error text contains no technical terms
- `RegisterForm` — same matrix, plus: the strength meter reads Weak/Fair/Good/Strong at the documented boundaries
- `PasswordStrength` — table-driven test over boundary inputs
- `B3` — asserts the absence of an email field and of the phrase "sent you"
- Auth query hooks — success path calls the right endpoint; failure path surfaces a safe message

**Notes**

- `B3` is intentionally a dead end. Password reset is V1.1; the page exists so users are not stranded.
- The right-hand decorative panel shows a real fragment of the build view. It duplicates `BuildProgress` visually — keep them in sync or extract a shared presentational component.

---

## FE-4: Dashboard

**Goal:** the project list in both empty and populated states.

**Depends on:** FE-1, P0.4, P0.5

**Deliverables**

- `apps/web/src/app/(dashboard)/dashboard/page.tsx` — RSC, fetches projects via service, passes `initialData`
- `apps/web/src/components/project/ProjectCard.tsx`
- `apps/web/src/components/project/ProjectGrid.tsx`
- `apps/web/src/components/project/StatusBadge.tsx` — all five statuses
- `apps/web/src/components/project/StatCards.tsx` — counts row
- `apps/web/src/components/common/EmptyState.tsx` — reusable, used by `F1` and elsewhere
- `apps/web/src/components/common/DeleteProjectDialog.tsx`
- `apps/web/src/lib/queries/projects.ts` — query options + delete mutation

**Exit criteria**

- Empty state renders `F1` with the three-step illustration and the "Free while in beta" line
- Populated state renders `F2` with stat cards and a responsive grid (3/2/1 columns)
- Every project status renders the correct badge variant: Draft (neutral), Building (agent cyan + pulsing), Ready (success), Deployed (success), Simplified (warning)
- Cyan appears only on the Building badge
- Delete asks for confirmation and navigates away on success
- No red is used for any project status

**Tests**

- `StatusBadge` — table-driven across all five statuses, asserting the expected variant class
- `ProjectCard` — renders name, status, and a preview URL when present; renders the placeholder when absent; renders the Building variant with a progress bar and no thumbnail
- `EmptyState` — renders title, body, and action; action navigates
- `deleteProject` mutation — optimistic removal, rollback on failure
- `dashboard/page` — RSC render test with each fixture (empty, populated)

**Notes**

- The dashboard is the reference implementation of the RSC → TanStack handoff. Get this pattern right here; every later phase copies it.
- `initialData` must be passed with a matching `queryKey`. A mismatched key silently produces a duplicate fetch — cover it with a test.

---

## FE-5: Input flow

**Goal:** capture requirements as text and files, then collect the agent's clarifying answers.

**Depends on:** FE-4

**Deliverables**

- `apps/web/src/app/(dashboard)/projects/new/page.tsx` — `C1`
- `apps/web/src/app/(dashboard)/projects/new/questions/page.tsx` — `C2`
- `apps/web/src/components/project/InputForm.tsx`
- `apps/web/src/components/project/FileDropzone.tsx`
- `apps/web/src/components/project/AttachedFileRow.tsx`
- `apps/web/src/components/project/ExampleChips.tsx`
- `apps/web/src/components/project/QuestionCard.tsx`
- `apps/web/src/components/project/ProjectSummaryPanel.tsx`
- `packages/contracts/src/input.ts`, `packages/contracts/src/question.ts`
- `apps/web/src/lib/queries/inputs.ts`, `apps/web/src/lib/queries/questions.ts`
- `apps/web/src/lib/validation/file.ts` — type, size, and count rules

**Exit criteria**

- Text input enforces a 10-character minimum and a 10,000-character maximum
- "Generate PRD" is disabled until the minimum is met
- File upload accepts PDF, DOCX, TXT, MD, PNG, JPG, SVG only
- Files over 10MB are rejected with a specific message
- A sixth file is rejected; five are accepted
- Dropping a file onto the zone and selecting via the picker produce identical results
- Attached files can be removed
- The summary panel reflects input state live
- `C2` renders exactly four questions, each with selectable options and no free-text field
- Selecting an option updates the answer set; the Continue button remains enabled when unanswered
- The affected-areas line renders in monospace

**Tests**

- `validateFile` — table-driven over accepted types, rejected types, oversize, and count overflow
- `FileDropzone` — accepts a drop; rejects with the correct message; fires removal
- `InputForm` — button disabled below minimum; enabled at minimum; submits text + files together
- `QuestionCard` — renders options; selection is single-select; keyboard-selectable
- `questions/page` — "Continue" proceeds with zero answers and surfaces the assumptions note
- `ProjectSummaryPanel` — reflects each combination of provided inputs

**Notes**

- Drag-and-drop must be tested with `DataTransfer` mocked, not by simulating a real drop. This is the single most brittle test in the frontend — keep it narrow.
- `C2` uses no agent-cyan anywhere. The agent is not working on this screen; the color must not appear.

---

## FE-6: Approval gates

**Goal:** the three-gate review flow with revision, optimistic approval, and staleness handling.

**Depends on:** FE-4

**Deliverables**

- `apps/web/src/app/(dashboard)/projects/[id]/spec/page.tsx` — hosts all three gates, selects by query param or segment
- `apps/web/src/components/spec/GateIndicator.tsx` — three-step progress, four states per step
- `apps/web/src/components/spec/PrdReview.tsx` — `D1`
- `apps/web/src/components/spec/DesignSystemSection.tsx` — `D1` design half
- `apps/web/src/components/spec/DataModelReview.tsx` — `D2`
- `apps/web/src/components/spec/AppStructureReview.tsx` — `D3`
- `apps/web/src/components/spec/EntityDiagram.tsx` — ER diagram, flat boxes and hairlines
- `apps/web/src/components/spec/SchemaBlock.tsx` — Prisma code with field annotation chips
- `apps/web/src/components/spec/EndpointTable.tsx` — method badges + mono endpoints
- `apps/web/src/components/spec/FeedbackPanel.tsx` — chat, revision history
- `apps/web/src/components/spec/StaleBanner.tsx`
- `apps/web/src/components/spec/ApproveBar.tsx` — single primary action
- `packages/contracts/src/spec.ts`, `design.ts`
- `apps/web/src/lib/queries/specs.ts` — fetch + approve + revise mutations

**Exit criteria**

- Gate indicator shows Pending, In progress, Complete, and Awaiting approval distinctly
- Approving gate 1 advances to gate 2 and persists
- Returning to an earlier gate and revising marks downstream gates STALE and shows the banner
- Writes to a STALE gate are blocked until re-approved
- Exactly one primary button exists per gate screen
- The approve action is optimistic and rolls back with a visible message on failure
- Design section renders selected preset, reference site input, logo dropzone with the wordmark fallback note, five swatches with hex in mono, and three type specimens
- `D3` tables render tight: 40px rows, 13px text, method badges as the only color

**Tests**

- `GateIndicator` — table-driven over all four states × three positions
- `specs` mutations — optimistic approve updates the cache immediately; rollback restores prior state on error
- `PrdReview` — renders all sections; assumptions list is present; approve calls the mutation once
- `StaleBanner` — renders for a STALE spec; blocks the approve action
- `AppStructureReview` — renders the page, endpoint, and component tables with correct row counts from fixture
- `FeedbackPanel` — submitting feedback calls the revise mutation and appends to history
- Design section — swatch count and hex rendering; logo dropzone shows the fallback note when empty

**Notes**

- **Staleness is the subtle part.** The rule is: approving a downstream gate while an upstream gate is STALE must be blocked. Test the block, not just the banner.
- The ER diagram is hand-built with absolutely positioned boxes and lines. Do not pull in a graph library — five nodes do not justify it.
- `D3` is the densest screen in the product. Verify at 1280px width that no horizontal scrollbar appears.

---

## FE-7: Build view

**Goal:** live build progress across three transparency layers, with cancel and both result variants.

**Depends on:** FE-4, P0.4

**Deliverables**

- `apps/web/src/app/(dashboard)/projects/[id]/build/page.tsx` — `E1`, `E2`
- `apps/web/src/components/build/BuildProgress.tsx` — seven-step status list
- `apps/web/src/components/build/TerminalOutput.tsx`
- `apps/web/src/components/build/CodeStream.tsx`
- `apps/web/src/components/build/OutputTabs.tsx` — Terminal / Code / Problems
- `apps/web/src/components/build/BuildResult.tsx` — `E2` complete
- `apps/web/src/components/build/SimplifiedNotice.tsx` — `E2` simplified variant
- `apps/web/src/components/build/CancelBuildDialog.tsx` — `E3`
- `apps/web/src/components/build/PreviewThumbnail.tsx`
- `apps/web/src/stores/build.store.ts` — ring buffers for terminal and code
- `apps/web/src/lib/sse/useBuildStream.ts` — EventSource client with `Last-Event-ID` resume
- `apps/web/src/lib/queries/builds.ts`

**Exit criteria**

- Seven build steps render with correct per-state treatment
- The in-progress row uses agent cyan, a pulsing dot, and a progress shimmer
- Terminal and code panels auto-scroll to the bottom while streaming
- Ring buffers cap at 5,000 lines; older lines are dropped, not the newest
- Code stream renders with monospace and syntax highlighting
- Cancel shows the confirmation modal, then issues cancel and reflects "stopping" until confirmed
- **The simplified notice contains no stack trace, filename, HTTP status, exception name, or the words error, failed, or unable**
- **The simplified notice never uses the danger color**
- A dropped SSE connection reconnects and resumes without duplicating lines
- The terminal cursor blinks only while the stream is live

**Tests**

- `build.store` — appends; caps at the limit dropping oldest; clears on new build; deduplicates by event id
- `BuildProgress` — table-driven over all seven steps × pending/in-progress/complete
- `TerminalOutput` — appends a line; auto-scrolls; renders ANSI-free text safely
- `CodeStream` — renders a file header and body; highlights a known snippet
- `SimplifiedNotice` — **asserts the rendered text contains none of a denylist of error terms**, and that no element carries the danger variant
- `CancelBuildDialog` — confirm issues cancel; dismiss does not
- `useBuildStream` — mocked `EventSource`; resume passes the last event id; reconnect dedupes
- `BuildResult` — complete and simplified variants render the correct panels

**Notes**

- **The simplified-notice test is a product requirement, not a style check.** It is the frontend half of the never-show-errors rule, and it must be an explicit denylist assertion so that a future copy change cannot quietly reintroduce error language.
- The build view is where the RSC/TanStack/Zustand split is most visible: initial build state arrives as `initialData`, status updates flow through TanStack, and high-frequency terminal output goes straight to Zustand. Do not route terminal lines through the query cache.
- MSW cannot stream for a full minute in tests — keep stream fixtures to a few events and assert behavior, not duration.

---

## FE-8: Project workspace

**Goal:** the four-region working view — file explorer, editor, agent chat, and history.

**Depends on:** FE-6

**Deliverables**

- `apps/web/src/app/(dashboard)/projects/[id]/page.tsx` — `G1`
- `apps/web/src/components/project/FileExplorer.tsx` — tree, type dots, selection
- `apps/web/src/components/project/CodeEditor.tsx` — Monaco wrapper, read-only in V1
- `apps/web/src/components/project/AgentChat.tsx`
- `apps/web/src/components/project/ChangePlanCard.tsx` — `G2`
- `apps/web/src/components/project/HistoryDrawer.tsx` — `G3`
- `apps/web/src/components/project/BottomPanel.tsx` — Terminal / Problems / Logs / Tests tabs
- `apps/web/src/components/project/ViewToggle.tsx` — Code | Preview
- `apps/web/src/lib/queries/files.ts`, `versions.ts`, `changes.ts`

**Exit criteria**

- File tree renders nested directories, marks the selected file, and shows type dots
- Selecting a file loads its contents into the editor
- Monaco loads lazily and does not block first paint
- The agent chat shows prior messages and accepts a new request
- Submitting a change request produces a plan card listing affected files with markdown paths in monospace
- The plan card shows a diff summary (+/− counts) and Apply / Edit actions
- History drawer lists entries newest-first with View and Undo per entry
- The initial-build entry has no Undo control
- **The history drawer always states that undo restores code and does not reverse database changes**
- Bottom panel tabs switch and preserve scroll position per tab

**Tests**

- `FileExplorer` — nested render; selection; expansion/collapse; type-dot variant per file kind
- `CodeEditor` — renders content for the selected path; is read-only; shows a loading state before Monaco resolves
- `AgentChat` — renders history; submits a request; disables input while pending
- `ChangePlanCard` — renders the file list, the diff summary, and both actions; Edit returns to the input
- `HistoryDrawer` — newest-first order; the initial entry has no Undo; **asserts the undo-scope sentence is present**
- `BottomPanel` — tab switching preserves state

**Notes**

- **The undo-scope sentence is asserted for the same reason as the simplified-notice denylist:** it is a correctness disclosure, and its removal would be a silent honesty regression.
- Monaco is heavy. Load it with `next/dynamic` and `ssr: false`, and assert the loading state so the lazy boundary is covered.
- The workspace is the densest layout in the product. Fixed tracks (240 / fluid / 360) plus per-region scroll — no `overflow: auto` on the shell.

---

## FE-9: Deploy and settings

**Goal:** deployment, GitHub export, and settings including credential management.

**Depends on:** FE-8

**Deliverables**

- `apps/web/src/app/(dashboard)/projects/[id]/deploy/page.tsx`
- `apps/web/src/components/project/DeployDialog.tsx` — `H1`
- `apps/web/src/components/project/GitHubExportDialog.tsx` — `H2`
- `apps/web/src/components/project/DeploySuccess.tsx` — `H3`
- `apps/web/src/components/settings/SettingsNav.tsx`
- `apps/web/src/app/(dashboard)/settings/page.tsx` — profile (`I1`)
- `apps/web/src/app/(dashboard)/settings/credentials/page.tsx` — `I2`
- `apps/web/src/components/settings/ProfileForm.tsx`
- `apps/web/src/components/settings/CredentialsTable.tsx`
- `apps/web/src/components/settings/CredentialEditor.tsx`
- `apps/web/src/components/settings/RevealField.tsx`
- `packages/contracts/src/credential.ts`, `deploy.ts`
- `apps/web/src/lib/queries/credentials.ts`, `deploy.ts`

**Exit criteria**

- Subdomain input validates format and availability, showing a live Available / Taken state
- The suffix `.kairopro.app` renders in monospace and is not editable
- Deploy cannot be submitted with an invalid subdomain
- The GitHub export dialog shows the connected account when present, and a single Connect action when absent — with no repository fields in the absent case
- Visibility is a two-option segmented control defaulting to Private
- Deploy success shows the URL in a monospace chip with a working copy action
- Credentials table shows Connected / Not configured / Not used badges
- **Secrets render as dots and are never present in the DOM as plaintext until revealed**
- The reveal toggle is the only way to display a value; masked values are not readable from the DOM
- The Remove action is the only danger-colored control on the credentials page

**Tests**

- `DeployDialog` — rejects an invalid subdomain; disables submit; accepts a valid one; renders the mono suffix
- `GitHubExportDialog` — connected state renders account + fields; disconnected state renders only Connect
- `DeploySuccess` — copy action writes the URL to the clipboard
- `CredentialsTable` — renders the correct badge per status; renders the Add-key affordance for unconfigured rows
- `CredentialEditor` — **asserts the secret value is absent from the DOM while masked**; reveal makes it present; hide removes it again
- `ProfileForm` — validates; saves; renders the email-immutable note

**Notes**

- The masked-value test is a security assertion, not a UI test. Query the DOM for the secret string directly and assert absence — do not trust a CSS class or an input `type`.
- Settings ships no danger-colored control except credential removal.

---

## FE-10: Polish and hardening

**Goal:** close the gaps that make the difference between a demo and a product.

**Depends on:** FE-1 … FE-9

**Deliverables**

- Loading skeletons for every async region
- Empty states for every list (projects, history, files, credentials, chat)
- Route-level `error.tsx` boundaries per route group
- `apps/web/src/components/common/ErrorBoundary.tsx` with a user-safe fallback
- Responsive passes: mobile nav, stacked gates, single-column workspace
- Accessibility pass: focus order, focus rings, ARIA labels, skip link, contrast verification against `DESIGN.md`
- `tests/e2e/` — Playwright smoke: sign up → create project → answer questions → approve three gates → build → preview → deploy
- Visual diff harness: generated screenshots compared against `designs/screenshots/`
- Regenerate the marketing hero image to match the final build view

**Exit criteria**

- No async region renders without a loading state
- No list renders an unstyled empty state
- Every route group has an error boundary that renders user-safe copy
- Keyboard-only navigation completes the full smoke flow
- `axe` reports no critical or serious violations on every route
- Every color pair used in the UI passes WCAG AA against `DESIGN.md`
- The Playwright smoke suite passes end to end
- Visual diffs are recorded and the remaining differences are explained, not ignored

**Tests**

- Playwright smoke — the full flow above, run against MSW-backed build
- `ErrorBoundary` — renders the fallback on a thrown child; fallback contains no technical detail; retry re-renders
- Accessibility — `axe` assertions per route
- Skeleton coverage — a test enumerating async routes and asserting a loading state exists

**Notes**

- **Contrast is verified against `DESIGN.md`, not against the rendered page.** The lint command is the source of truth:
  ```bash
  npx -p @google/design.md designmd lint DESIGN.md
  ```
- Playwright runs against MSW. Do not stand up a real backend for the frontend smoke suite; that coupling defeats the point of the contract layer.
- Any visual diff that cannot be explained should be treated as a regression until proven otherwise.

---

## Cross-phase conventions

### Data layer rules

| Situation                                             | Use                                                   |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Data for first paint, no interactivity                | RSC, direct service call, pass as props               |
| Data that refetches, polls, or is mutated             | TanStack Query                                        |
| Data the RSC already fetched and the client continues | TanStack with `initialData` and a matching `queryKey` |
| Append-only high-frequency output                     | Zustand ring buffer                                   |
| Ephemeral UI state                                    | Zustand                                               |

### Import conventions

```ts
import { ProjectSchema } from "@kairopro/contracts"; // isomorphic — safe anywhere
import { projectService } from "@kairopro/core"; // server-only
import { cn } from "@/lib/utils"; // app-internal
```

- `@/` maps to `apps/web/src/` and never reaches into a workspace package.
- **`@kairopro/core` is server-only.** Importing it from a client component pulls Prisma and dockerode into the browser bundle. Client components import types and schemas from `@kairopro/contracts` and call the API.
- `@kairopro/contracts` is safe everywhere: zero internal dependencies, no Node built-ins. That is what makes it usable by client components, RSC, and MSW handlers alike.

### Component conventions

- Every component with branching has a test.
- Variant-driven components (`StatusBadge`, `GateIndicator`) are tested with table-driven cases — never one case.
- User-facing copy that encodes a product rule is asserted explicitly, not snapshotted.

### Styling conventions

- All colors, radii, spacing, and type come from `DESIGN.md` tokens.
- **Never hand-edit `apps/web/src/app/theme.css`** — it is generated from `DESIGN.md` by `pnpm design:export`. Change the token, re-export.
- No hardcoded hex values in `apps/web/src/components/**`. A lint rule enforces this from P0.2.
- Cyan (`--color-agent`) appears only on live agent activity, plus the brand mark's presence dot. Enforced by review and by the specific tests noted per phase.
- Danger color appears only on destructive user actions, never on system failure.

### Testing conventions

- Vitest + React Testing Library + MSW. No Jest.
- MSW reuses the handlers from P0.5 — no per-test ad-hoc mocks of fetch.
- Tests assert behavior and copy, not implementation details or CSS classes, except where a class encodes a rule (the status badge variants) and is called out as such.
- No coverage target.

---

## Frontend definition of done

- [ ] FE-1 through FE-10 complete, each with passing tests
- [ ] Every screen in `STITCH_PROMPTS.md` implemented and reachable
- [ ] No hardcoded color values
- [ ] Cyan used only for live agent activity
- [ ] Danger used only for destructive actions
- [ ] The simplified-notice error denylist test passes
- [ ] The undo-scope disclosure is present and asserted
- [ ] The masked-credential DOM absence test passes
- [ ] Playwright smoke flow passes
- [ ] `axe` clean on all routes
- [ ] Visual diffs recorded against Stitch exports

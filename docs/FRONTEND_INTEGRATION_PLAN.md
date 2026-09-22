# Frontend Integration Plan

Companion to `docs/BACKEND_AI_PLAN.md`. That plan built the backend
(Phases 0–20, BE-1…BE-11 / AI-1…AI-9) against its own tests and gates —
this plan is about the other half: the frontend (`apps/web/src`) was built
in parallel as UI mockups and is, today, almost entirely disconnected from
that backend. This document is the audit of exactly what's wired and what
isn't, the backend gaps that block wiring the rest, and a phase-by-phase
plan to close the gap — one phase at a time, each independently shippable.

**Method:** every page under `apps/web/src/app` and every component it
renders was read directly, not sampled, to find every real `fetch`/hook
call vs. every hardcoded constant, `setTimeout`-faked flow, and
`useState`-only interaction. See §1 for the full inventory this plan is
built from.

---

## Status

- **F0 — done.** Workspace route now threads real `projectId`/project data through `WorkspacePage` → `WorkspaceApp`; `HistoryDrawer` is live; deploy/export modal titles use the real project name.
- **F1 — done.** Attachment delete/reload wired to the real inputs API; the clarification-questions page now actually triggers `POST .../specs/generate` instead of doing nothing.
- **F2 — done**, with one scope note found along the way: `POST .../specs/[specId]/revise` takes a fully-formed replacement `content` object, not free text — it's a direct content-replacement endpoint, not an LLM-mediated "regenerate from feedback" one. Wiring a chat box to it as originally described would either require an LLM call from the frontend (wrong layer) or silently produce garbage content. **Left unwired for now**, rather than force a fake-looking real call — `agent-chat-panel.tsx`, `agent-review-sidebar.tsx`, and `agent-structure-sidebar.tsx` remain local-only pending a decision on this (either a real conversational revise endpoint gets added server-side, or these become a structured editor that calls `revise` with actual edited content). Everything else in F2 is real: PRD/data-model/app-structure pages fetch and render real generated specs (data-model's rich mock cards were replaced with a generic real-schema renderer since there's no way to fit an arbitrary real Prisma schema into hand-tuned demo card layouts), all three gate bars call the real approve endpoint, and "Start build" now also calls the real `POST .../builds` (pulled forward from F3, since the UI only ever had one button for both steps).
- **F3–F10 — not started.**

---

## 0. TL;DR

**Actually wired to a real backend call today:** login/register, project
list/create/delete, initial project creation, saving requirements text,
uploading requirement files.

**Everything else** — clarification questions, PRD/design/data-model/app-
structure review and approval, build start and live streaming, build
complete, the entire in-project workspace (file explorer, code viewer,
terminal, deploy, GitHub export, "request changes" chat), and every
Settings tab (profile, credentials, billing, team) — is either fully
hardcoded UI or a `setTimeout`-driven fake flow, even though the backend
already has real endpoints for most of it (specs, builds + SSE, changes,
credentials, deploy, GitHub export).

**One quick, no-backend-work win:** `HistoryDrawer` (version history/revert)
already calls the real API through correctly-built React Query hooks — it
just never receives a `projectId`, because the workspace route
(`app/(dashboard)/projects/[id]/page.tsx`) reads `params` and discards it.
Fixing that one plumbing bug alone makes an entire feature go live.

**Biggest structural gap:** there is no `EventSource`/SSE client anywhere
in the frontend. The build-stream Zustand store
(`stores/use-build-stream-store.ts`) is already shaped correctly for it
and is simply never fed.

---

## 1. Current-state inventory (source of truth for this plan)

### 1a. Wired today

| Feature                                   | Frontend                                                        | Backend route                                          |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Login (credentials + Google)              | `components/auth/login-form.tsx`                                | NextAuth `/api/auth/[...nextauth]`                     |
| Register                                  | `components/auth/register-form.tsx`                             | `POST /api/auth/register`                              |
| List projects (SSR seed + client refresh) | `app/(dashboard)/dashboard/page.tsx`, `lib/queries/projects.ts` | `GET /api/projects`                                    |
| Create project                            | `projects-dashboard.tsx`                                        | `POST /api/projects`                                   |
| Delete project                            | `projects-dashboard.tsx`                                        | `DELETE /api/projects/[id]`                            |
| Create project + save requirements text   | `new-project-workspace.tsx`                                     | `POST /api/projects`, `POST /api/projects/[id]/inputs` |
| Upload requirement file(s)                | `new-project-workspace.tsx`                                     | `POST /api/projects/[id]/inputs` (multipart)           |

### 1b. Wired but unreachable (fix, don't rebuild)

| Feature                                         | Problem                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version history / revert (`history-drawer.tsx`) | Correctly calls `useVersionsQuery`/`useRevertMutation` → real `GET/POST .../versions*` routes, but is rendered without a `projectId` because `app/(dashboard)/projects/[id]/page.tsx` never reads `params.id` and never passes it down through `WorkspacePage` → `WorkspaceApp`. |
| Version diff (`useVersionDiffQuery`)            | Hook exists and is correct; no component calls it yet.                                                                                                                                                                                                                           |
| Delete attachment (`useDeleteInputMutation`)    | Hook exists and is correct; `new-project-workspace.tsx`'s remove-file handler only touches local state.                                                                                                                                                                          |

### 1c. Fully mocked or missing, despite a real backend endpoint existing

| Feature                                                                     | Frontend                                                                                                        | Real backend route that exists and is unused                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| PRD / Design / Data model / App structure review                            | `prd-document.tsx`, `schema-canvas.tsx`, `architecture-surface.tsx`                                             | `GET /api/projects/[id]/specs`, `POST .../specs/generate`                                                |
| Gate approvals                                                              | `spec-gate-bar.tsx`, `data-model-gate-bar.tsx`, `app-structure-gate-bar.tsx` (all fake `setTimeout` animations) | `POST .../specs/[specId]/approve`                                                                        |
| "Request changes" chat (3 places)                                           | `agent-chat-panel.tsx`, `agent-review-sidebar.tsx`, `agent-structure-sidebar.tsx` (all canned replies)          | `POST .../specs/[specId]/revise`                                                                         |
| Start build                                                                 | `app-structure-gate-bar.tsx` (fakes provisioning, navigates)                                                    | `POST /api/projects/[id]/builds`                                                                         |
| Live build progress                                                         | `execution-pipeline.tsx`, `build-console.tsx`, `build-top-bar.tsx` (hardcoded arrays)                           | `GET /api/projects/[id]/builds/[buildId]/stream` (SSE) — **no `EventSource` exists anywhere in the app** |
| Cancel build                                                                | `cancel-build-modal.tsx`                                                                                        | `POST .../builds/[buildId]/cancel`                                                                       |
| Build complete summary                                                      | `build-complete-workspace.tsx` + children                                                                       | `GET .../builds/[buildId]`, `GET .../builds`                                                             |
| Deploy                                                                      | `deploy-modal.tsx` (fabricates a URL)                                                                           | `POST /api/projects/[id]/deploy`                                                                         |
| GitHub export                                                               | `export-modal.tsx` (fabricates a repo URL)                                                                      | `POST /api/projects/[id]/export/github`                                                                  |
| Request an agent change                                                     | _(nothing — the chat panels above fake it instead)_                                                             | `POST/GET .../changes`, `.../[changeId]/approve`, `.../[changeId]/cancel`                                |
| Project credentials                                                         | `credentials-settings.tsx` (hardcoded services incl. fake secret text, not project-scoped)                      | `GET/PUT/DELETE .../credentials`, `.../credentials/[service]`                                            |
| Load a project's real name/status anywhere in the gate/build/workspace flow | _(nothing — every one of these components hardcodes "TaskFlow")_                                                | `GET /api/projects/[id]`                                                                                 |
| Clarification questions                                                     | `clarification-form.tsx` (4 hardcoded questions, no persistence)                                                | **none — see backend gap in §2**                                                                         |
| Whole in-project IDE (file explorer, code viewer)                           | `components/workspace/*`                                                                                        | **none — see backend gap in §2**                                                                         |
| Terminal / sandbox panel                                                    | `sandbox-panel.tsx`                                                                                             | **none by design — see §2**                                                                              |
| Profile settings                                                            | `profile-settings.tsx` (writes to local Zustand only)                                                           | **none — see backend gap in §2**                                                                         |
| Team settings                                                               | `team-settings.tsx` (local state only)                                                                          | **none — see backend gap in §2**                                                                         |
| Billing/usage settings                                                      | `billing-settings.tsx` (100% invented numbers)                                                                  | **none — see backend gap in §2**                                                                         |

### 1d. Routes that 404 today

- `/projects/[id]/deploy` — only a `.gitkeep`, no `page.tsx`.
- `/projects/[id]/spec` — only a `.gitkeep`, no `page.tsx`.

(Deploy and spec review are reachable today only through the `new/*`
wizard and the in-workspace modals, not as standalone project pages —
decide in F2/F4 whether these should be built or removed as dead routes.)

---

## 2. Backend gaps found while reading the frontend

These block real integration even after the frontend code is rewritten to
call something — the "something" doesn't fully exist yet.

| #   | Gap                                                                                                                                                                                                                                                                                                                                                                                                      | Why it blocks the frontend                                                                                                                                                                                                            | Needed for phase                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| G1  | **No pm-questions answer flow.** `spec/generator.ts` runs pm-questions → PRD in one uninterrupted pass and says so explicitly in its own doc comment: _"There is no interactive 'submit pm-question answers' route yet."_ Every question is always treated as unanswered (becomes an assumption in the PRD). There's also no `SpecType` or table to persist generated questions.                         | The clarification-questions page has literally nothing to call. Either the UI drops from "editable Q&A" to "read-only assumptions preview" (fast), or a real pause-for-answers step gets added to the generator (proper fix, bigger). | F1                                             |
| G2  | **No spec-generation progress feed exposed over HTTP.** `spec/generator.ts` publishes step-by-step progress on an internal event bus channel (`spec-generation:${projectId}`), but no route subscribes an SSE stream to it the way builds do.                                                                                                                                                            | The frontend can't show live "generating PRD… generating data model…" progress without polling `GET .../specs` in a loop.                                                                                                             | F2                                             |
| G3  | **GitHub export requires an access token the frontend has no way to obtain.** `github.service.ts`'s own doc says the OAuth authorization-code exchange was explicitly out of Phase 19's scope; the export route takes an already-obtained token in the request body.                                                                                                                                     | The Export-to-GitHub modal can't do a real "Connect GitHub" button without either a real OAuth App + callback route (real fix) or a "paste a personal access token" fallback UI (fast, worse UX).                                     | F4                                             |
| G4  | **No HTTP-exposed workspace file browser.** `WorkspaceStore.listFiles`/`readFile` exist in `packages/core` but nothing exposes them over an API route; there's no `GET /api/projects/[id]/files` today.                                                                                                                                                                                                  | The in-project file explorer/code viewer has nothing real to read from.                                                                                                                                                               | F4                                             |
| G5  | **No terminal/exec endpoint exposed to end users.** `ContainerRuntime.exec`/`execStream` and `execution/terminal/session.ts` exist for internal agent/build use only, with no public HTTP surface and no obvious auth/rate-limit story for arbitrary user-typed commands in a container.                                                                                                                 | The sandbox/terminal panel can't be wired without deciding this is an intentional product feature (it's a real security surface, not just missing plumbing).                                                                          | F4 (decision point, likely a non-goal for now) |
| G6  | **No user-profile update route or service.** Only NextAuth session read exists; there's no `updateUserProfile`-style service and no `PATCH` route. SSH keys have no backend model (`User` has no such field) at all.                                                                                                                                                                                     | Profile settings can only ever be a local-state mock until this exists.                                                                                                                                                               | F7                                             |
| G7  | **No team-management API.** `membership.repository.ts` has `createMembership`/`findMembership`/`listUserMemberships` only — no invite-by-email, no remove, no role change, no email delivery, and no route exposes even the read path.                                                                                                                                                                   | Team settings can't show real members without at least a new `GET` route; invite/remove is a real feature to build, not a wiring task.                                                                                                | F8                                             |
| G8  | **No usage-totals aggregation or route.** `usage.repository.ts`'s `listUsageByOrg` returns raw `UsageEvent` rows; nothing sums them into plan-relevant totals, and no `app/api/**` route exposes usage at all. Actual billing (plan, invoices, payment method) has no backend whatsoever — the `stripe` `CredentialService` entry is for a _generated project's_ Stripe key, not KairoPro's own billing. | Billing settings can show real per-org usage once G8's aggregation + route exist; plan/invoices/payment are out of scope unless explicitly requested.                                                                                 | F9                                             |
| G9  | **Credentials are per-project in the backend but the settings UI treats them as one global list**, with no project selector and no `projectId` passed anywhere.                                                                                                                                                                                                                                          | Needs a UI decision (move credentials into the project workspace, or add a project picker to the global settings tab) before it can call the real per-project API.                                                                    | F6                                             |

None of G1–G9 block the phases that don't depend on them — F0/F3/F5/F6(partial) can proceed immediately with zero new backend work.

---

## 3. Phased integration plan

Each phase lists: what it delivers, the frontend files it touches, the
exact backend calls it wires up, any backend gap (§2) it depends on, and
how to know it's done. Phases are ordered so early ones unblock later ones
and ship value independently — this is not an all-or-nothing sequence.

### F0 — Foundation: real project identity everywhere

**Goal:** every project-scoped page/component knows the real project id,
name, and status. Nothing downstream can be "real" until this exists.

- Fix `app/(dashboard)/projects/[id]/page.tsx` to actually read
  `params.id` and pass it into `WorkspacePage`/`WorkspaceApp`.
- Add a small `useProjectQuery(projectId)` hook (mirror
  `lib/queries/projects.ts`'s existing pattern) calling
  `GET /api/projects/[id]` (already exists), and use it to replace every
  hardcoded `"TaskFlow"` title across `build-top-bar.tsx`,
  `build-complete-workspace.tsx`, `data-model-gate-bar.tsx`,
  `app-structure-gate-bar.tsx`, `deploy-modal.tsx`, `export-modal.tsx`.
- Thread `projectId` down to `HistoryDrawer` — this alone makes version
  history/revert/diff fully real with no other changes needed.

**Backend work:** none — `GET /api/projects/[id]` already exists.

**Done when:** the workspace page shows the real project's name, and
opening History shows real version rows for that project.

---

### F1 — Requirements intake completion

**Goal:** the intake step (`/projects/new`) is fully real, including the
parts that currently silently no-op.

- Wire the "remove attachment" button to the existing
  `useDeleteInputMutation`.
- Load previously-saved inputs on return visits via the existing
  `useInputsQuery` (currently defined, never called).
- Decide and implement one of G1's two options for
  `clarification-form.tsx`:
  - **Fast path (recommended for this phase):** turn it into a read-only
    "here's what the agent will assume" preview, sourced from nothing new
    — just remove the fake editable Q&A and replace with copy explaining
    unanswered questions become PRD assumptions (matches actual backend
    behavior exactly, ships with zero backend work).
  - **Full path (separate follow-up):** add question persistence + a
    pause-for-answers step to `spec/generator.ts`, a `GET`/`POST` answers
    route, and rebuild this page as real Q&A. Track as its own backend
    task, not bundled into this phase.

**Backend work:** none for the recommended fast path.

**Done when:** attachments can be removed and reloaded for real; the
questions step accurately reflects real generator behavior instead of
faking an interaction the backend doesn't support.

---

### F2 — Spec review gates (PRD, Design, Data model, App structure)

**Goal:** the three gate screens show the project's real generated specs
and really approve/revise them.

- Trigger `POST /api/projects/[id]/specs/generate` (currently never
  called by anything) at the point the user leaves the questions step.
- Replace `prd-document.tsx`'s hardcoded `FEATURES`/`ROLES`/
  `USER_STORIES`/`ASSUMPTIONS` with the real `PRD` spec fetched from
  `GET /api/projects/[id]/specs`.
- Same for `schema-canvas.tsx` (`DATA_MODEL` spec) and
  `architecture-surface.tsx` (`APP_STRUCTURE` spec).
- Show generation progress: simplest correct option is polling
  `GET .../specs` until each type appears; closing G2 (an SSE route
  mirroring the build stream) is the smoother option if it's worth the
  backend work now.
- Wire `spec-gate-bar.tsx` / `data-model-gate-bar.tsx` /
  `app-structure-gate-bar.tsx`'s "Approve" buttons to
  `POST .../specs/[specId]/approve`, replacing every `setTimeout` fake.
- Wire all three "Request changes" chat panels
  (`agent-chat-panel.tsx`, `agent-review-sidebar.tsx`,
  `agent-structure-sidebar.tsx`) to `POST .../specs/[specId]/revise`,
  replacing the canned-reply fakes.
- `design-direction-panel.tsx` has no backend counterpart beyond the
  `DESIGN` spec's markdown — fold its selections into the revise-request
  text, or keep it purely cosmetic and say so explicitly in the UI.

**Backend work:** optional G2 (SSE progress route) if polling isn't good
enough; otherwise none.

**Done when:** a real project's real PRD/data-model/app-structure render
on these pages, "Approve" actually moves the spec to `APPROVED`, and
"Request changes" actually creates a new spec revision.

---

### F3 — Build kickoff and live streaming

**Goal:** builds are real, from click to completion, with real live logs.

- Wire `app-structure-gate-bar.tsx`'s "Start build" to
  `POST /api/projects/[id]/builds`, replacing the fake provisioning
  animation.
- Build a small `useBuildStream(buildId)` hook that opens a real
  `EventSource` against `GET /api/projects/[id]/builds/[buildId]/stream`
  and feeds `stores/use-build-stream-store.ts` — this store is already
  correctly shaped (status, current step, ring-buffer logs, container
  status), it just needs a real producer for once.
- Replace `execution-pipeline.tsx`, `build-console.tsx`,
  `build-top-bar.tsx`'s hardcoded arrays with store-driven rendering.
- Wire `cancel-build-modal.tsx` to `POST .../builds/[buildId]/cancel`.
- Wire `build-complete-workspace.tsx` and its children to
  `GET .../builds/[buildId]` (final status, commit hash, preview URL) and
  `GET .../builds` (history/checklist), replacing every hardcoded number.

**Backend work:** none — every route this needs already exists and is
fully built and gated (Phases 15–18).

**Done when:** clicking "Start build" on a real project starts a real
build, the console shows real streamed log lines, and the complete page
shows that build's real result.

---

### F4 — In-workspace actions: deploy, GitHub export, file browser, change requests

**Goal:** the project workspace's action modals do what they claim.

- **Deploy:** wire `deploy-modal.tsx` to real `POST .../deploy`
  (subdomain input already exists in the UI) — no backend gap, straight
  wiring.
- **GitHub export:** resolve G3 first (decide OAuth-App-and-callback vs.
  paste-a-token fallback), then wire `export-modal.tsx` to real
  `POST .../export/github`.
- **File explorer / code viewer:** close G4 (add a read-only
  `GET /api/projects/[id]/files` [+ a single-file read route]) before
  `file-explorer.tsx`/`code-editor.tsx` can show anything real. Keep this
  read-only — file _writing_ belongs to the change-request flow below,
  not a raw file-write API (that would bypass every fix-loop/typecheck/
  test guarantee Phases 16–18 built).
- **Terminal/sandbox:** decide G5 explicitly — recommend treating this as
  a non-goal for this pass rather than exposing raw container exec to end
  users without a considered security/rate-limit design.
- **"Request changes" agent chat:** replace all three canned-chat
  components' fake replies with the real, already-built Phase 20 system —
  `POST /api/projects/[id]/changes` to submit, poll or display the
  returned plan, `POST .../changes/[changeId]/approve` to apply,
  `POST .../changes/[changeId]/cancel` to cancel. This is the single
  biggest "backend already did the work, frontend just needs to use it"
  item in the whole audit.

**Backend work:** G3 (pick an approach) and G4 (new read-only files
route) before their respective sub-items; change requests need nothing
new.

**Done when:** Deploy and GitHub export produce real URLs; the file
explorer shows a real project's real files; submitting a change request
through the chat panel produces a real plan and applying it produces a
real commit.

---

### F5 — Version history & diff polish

**Goal:** finish what F0 unblocked.

- Add a diff view UI wired to the already-existing, already-unused
  `useVersionDiffQuery` hook.

**Backend work:** none.

**Done when:** clicking a version in history shows its real diff.

---

### F6 — Settings: Credentials (project-scoped, real)

**Goal:** the credentials tab manages a real project's real credentials.

- Resolve G9: either move credentials into the project workspace (a tab
  there, with `projectId` naturally in scope) or add an explicit project
  picker to the global settings tab.
- Replace `credentials-settings.tsx`'s hardcoded `INITIAL_SERVICES`
  (including the fake-looking secret strings baked into source — remove
  those regardless of sequencing, they read as real leaked keys) with
  `GET /api/projects/[id]/credentials`, and wire save/remove to
  `PUT`/`DELETE .../credentials/[service]`.

**Backend work:** none beyond the UI-scoping decision.

**Done when:** setting a credential for a real project actually encrypts
and stores it, and reloading the page shows its real masked status.

---

### F7 — Settings: Profile

**Goal:** profile edits persist for real.

- Close G6: add an `updateUserProfile` service + a `PATCH` route (name,
  avatar at minimum). Decide separately whether SSH keys are an
  in-scope feature (needs a new model) or should be dropped from the UI.
- Wire `profile-settings.tsx`'s save to the new route instead of only
  updating the local Zustand store.

**Backend work:** G6 (new route + service; new model only if SSH keys stay
in scope).

**Done when:** editing a display name persists across a reload/re-login.

---

### F8 — Settings: Team

**Goal:** team membership is visible for real; invite/remove is a
tracked follow-up.

- Close G7's read path: a `GET` route listing an org's real members via
  `listUserMemberships`/`findMembership`.
- Wire `team-settings.tsx`'s member list to it.
- Track invite-by-email, role change, and remove as a separate follow-up
  — they need real service functions and (for invites) email delivery,
  not just a route.

**Backend work:** G7 (new read route now; write operations later).

**Done when:** the team tab shows a real org's real members.

---

### F9 — Settings: Billing/Usage

**Goal:** usage numbers are real; billing/invoices stay explicitly
out of scope unless requested.

- Close G8's read path: a `getUsageTotals(orgId)` aggregation + a
  `GET /api/usage` route.
- Wire `billing-settings.tsx`'s usage bars and per-project usage table to
  it; leave plan/invoices/payment-method sections either removed or
  clearly marked as not-yet-available rather than showing invented data.

**Backend work:** G8 (new aggregation + route). Real billing (Stripe
integration for KairoPro's own plans) is a separate, larger, not-yet-
requested feature.

**Done when:** the usage numbers shown match real `UsageEvent` totals for
the signed-in org.

---

### F10 — Cleanup

- Remove or repurpose the dashboard's "Deployments" nav item (today it
  just navigates into the build wizard) once F3/F4 make a real
  deployed-projects view possible, or drop it if out of scope.
- Decide the fate of `/projects/[id]/deploy` and `/projects/[id]/spec`
  (currently 404 `.gitkeep` stubs) — build real pages or delete the
  routes.
- Sweep for any remaining hardcoded "TaskFlow" strings missed by F0.

---

## 4. Suggested order of execution

F0 → F1 → F2 → F3 → F5 (cheap, unblocked by F0) → F4 → F6 → F7 → F8 → F9 → F10.

F5 is a two-line addition once F0 lands and can be done anytime after it,
independent of F1–F3. Everything else follows the natural product flow:
you can't approve a spec that isn't real (F2) before you can start a real
build (F3), and the in-workspace actions (F4) are naturally last among the
core flow because GitHub export and the file browser carry their own
backend gaps (G3, G4) worth deciding deliberately rather than rushing.

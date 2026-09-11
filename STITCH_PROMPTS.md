# KairoPro — Google Stitch Prompt Pack (V1)

Complete prompt set for generating KairoPro's marketing pages and application UI in Google Stitch.

---

## How to use this document

**Stitch does not work with one big prompt.** It reads every prompt as a *fresh description of the whole screen* rather than an edit to the previous one, so a long prompt combining many changes makes it silently rebuild layouts and forget earlier decisions. This pack is therefore split into:

1. **One foundation prompt** — establishes the product, the vibe, and the shell
2. **~25 single-screen prompts** — one screen per prompt, each with context, goal, layout, components, states, and copy
3. **Refinement patterns** — reusable sentence templates for iterating safely

Work through them in order. Do not batch.

### The seven rules

1. **Start broad, then refine.** Foundation first, then one screen at a time.
2. **One change per prompt.** Never combine a layout change with a component change.
3. **Name the component before describing the change.** "On the login card, change the primary button…" not "change the button."
4. **Use UI vocabulary.** Sidebar, top bar, hero section, card, panel, modal, call-to-action, empty state.
5. **Set the vibe with adjectives.** Adjectives drive palette, spacing, and personality more than explicit instructions.
6. **Reference screens by name.** Stitch loses track across a long project otherwise.
7. **Treat output as a first draft.** Stitch is weakest on dense data screens — expect to correct spacing and table layouts by hand.

### Workflow

| Step | Action |
|------|--------|
| 0 | Import / paste `DESIGN.md` into the project |
| 1 | Run the Foundation prompt (Section 1) |
| 2 | Generate marketing screens (Section 2) |
| 3 | Generate auth screens (Section 3) |
| 4 | Generate onboarding and gate screens (Section 4) |
| 5 | Generate build and workspace screens (Section 5) |
| 6 | Generate deploy and settings screens (Section 6) |
| 7 | Refine using Section 7 patterns |
| 8 | Export HTML/Tailwind, then port to Next.js + shadcn/ui |

### Screen inventory

| # | Screen | Surface | Tier |
|---|--------|---------|------|
| A1 | Home / landing | Marketing | Core |
| A2 | Features | Marketing | Core |
| A3 | Pricing (beta) | Marketing | Core |
| A4 | About | Marketing | Secondary |
| A5 | Legal (Terms / Privacy) | Marketing | Secondary |
| A6 | 404 | Marketing | Secondary |
| B1 | Login | Auth | Core |
| B2 | Register | Auth | Core |
| B3 | Forgot password | Auth | Secondary |
| C1 | New project — input | App | Core |
| C2 | Agent questions | App | Core |
| D1 | Gate 1 — PRD + design system | App | Core |
| D2 | Gate 2 — data model | App | Core |
| D3 | Gate 3 — app structure | App | Core |
| E1 | Build in progress | App | Core |
| E2 | Build complete / simplified | App | Core |
| E3 | Cancel confirmation | App | Secondary |
| F1 | Dashboard — empty | App | Core |
| F2 | Dashboard — populated | App | Core |
| G1 | Project workspace | App | Core |
| G2 | Change request plan | App | Core |
| G3 | History and undo | App | Secondary |
| H1 | Deploy modal | App | Core |
| H2 | GitHub export modal | App | Core |
| H3 | Deploy success | App | Secondary |
| I1 | Settings — profile | App | Secondary |
| I2 | Settings — credentials | App | Core |

---

## 0. Before you start — import the design system

Upload or paste the contents of `DESIGN.md` from this repo into the Stitch project before running any prompt. It contains the tokens (colors, typography, radii, spacing, components) and the design rationale that every screen prompt below assumes.

If Stitch does not accept the file directly, paste the **Overview**, **Colors**, **Typography**, and **Shapes** sections into the project context, and re-state the critical constraint in each prompt:

```
Visual identity: dark-first developer tool. Near-black background (#0A0A0F),
violet (#6D5EF5) means "the user can act here", cyan (#22D3EE) means "the agent
is acting here" and appears nowhere else. Inter for UI, JetBrains Mono for all
code, file paths, commands and terminal output. Modest radii, hairline borders,
no drop shadows, no gradients, no glassmorphism, no emoji in the interface.
```

---

## 1. Foundation prompt

Run this once, first. It sets the product, the audience, and the shell that later screens inherit.

```
Create a web application called KairoPro.

Context: KairoPro is an AI-powered development platform. A developer describes
an application — or uploads a PRD, spec, or design file — and KairoPro generates
a complete full-stack web app (Next.js, PostgreSQL, Prisma, authentication),
runs it, tests it, fixes its own errors, and gives them a live preview URL they
can deploy or export to GitHub.

Audience: professional developers who want to bootstrap production applications
faster. They read code. They are impatient with decoration.

Vibe: precise, calm, technical, confident. A precision instrument, not a consumer
SaaS product. Think professional developer tooling with editorial restraint.

Two surfaces that must look clearly different:
- Marketing pages: spacious, confident, large type, one idea per section.
- Application pages: dense, quiet, information-rich, built for daily work.

Application shell: a 240px collapsible left sidebar, a fluid center workspace,
and an optional 360px right panel for agent chat. A 56px top bar with breadcrumb,
project status, and one primary action. Each region scrolls independently — the
shell itself never scrolls.

Type: Inter for all interface text, JetBrains Mono for code, file paths,
commands, and terminal output.

Start with: a dark near-black canvas (#0A0A0F), violet (#6D5EF5) as the only
interaction color, cyan (#22D3EE) reserved strictly for live agent activity,
hairline borders instead of drop shadows.
```

---

## 2. Marketing screens

### A1 — Home / landing

```
Screen: KairoPro marketing homepage. Web, desktop-first, responsive.

Goal: convince a developer that KairoPro produces real, working, ownable
full-stack code — not a toy.

Layout, top to bottom:
1. Sticky top nav: KairoPro wordmark left; links "Features", "Pricing", "Docs";
   "Log in" text link and a primary "Start building" button on the right.
2. Hero section, centered, max 800px wide. Large headline. One-sentence
   subheadline. Two buttons: primary "Start building", ghost "See how it works".
3. Product screenshot: a realistic browser frame showing the KairoPro build view
   — a vertical list of build steps with completed and in-progress states, above
   a dark terminal panel streaming output. This is the proof, so make it large
   and prominent.
4. "How it works" — four numbered steps in a horizontal row:
   1. Describe it or drop in your PRD
   2. Approve the spec, data model, and app structure
   3. The agent builds, runs, and tests it
   4. Preview, deploy, or export to GitHub
5. Three feature cards:
   - "Spec-first" — Bring a PRD, a spec, or a Figma file. You approve three
     artifacts before a single line of code is written.
   - "Real code you own" — Next.js, PostgreSQL, Prisma, NextAuth. Export the
     repository to GitHub at any time. No lock-in.
   - "It runs its own code" — KairoPro starts the app, runs the tests, reads the
     errors and fixes them before handing it over.
6. Closing call to action band with a primary "Start building" button.

Copy:
Headline: "From spec to deployed app."
Subheadline: "KairoPro reads your product docs and builds the full stack —
Next.js, Postgres, auth, tests — then runs it, fixes it, and deploys it."
Primary button: "Start building"
Secondary: "See how it works"

Constraints: no gradients, no glowing effects, no stock photography of people.
Use the product interface itself as the imagery.
```

### A2 — Features

```
Screen: KairoPro Features page. Web, desktop-first.

Goal: explain what the product actually does, in enough technical detail that a
developer believes it.

Layout: sticky top nav (same as homepage). Page title "Everything you need to
ship a first version." Then alternating two-column sections — text on one side,
a product interface detail on the other, alternating left and right down the
page.

Sections:
1. "Bring your requirements" — reference site, uploaded PRD, screenshot of the
   input screen with a drag-and-drop upload zone and a large text area.
2. "Approve three artifacts" — reference the approval gate screen showing a
   three-step indicator: PRD, Data Model, App Structure.
3. "Watch it build" — reference the build view: status step list beside a
   streaming terminal and a code stream panel.
4. "It tests itself" — reference a test results panel showing passing tests
   grouped as unit, integration, and end-to-end.
5. "Preview and deploy" — reference the workspace with a live preview in the
   main area.
6. "Take the code with you" — reference the GitHub export modal.

Each section: an h3, two or three sentences of body copy, and a small
monospace list of the specific technologies involved.

Constraints: no fabricated UI — every mock must be a screen that exists in the
product. Keep the mono lists genuinely monospace.
```

### A3 — Pricing (beta)

```
Screen: KairoPro Pricing page. Web, desktop-first.

Important context: KairoPro is free during the beta. There is no billing yet,
so no plan comparison table, no monthly/annual toggle, and no payment UI.

Goal: state clearly that the product is free while in beta and set expectations
about what happens later.

Layout: sticky top nav. Centered page title "Free while we're in beta." One
paragraph: "Every feature is available at no cost while KairoPro is in beta:
unlimited projects, deployment, and GitHub export. Paid plans with usage limits
will be introduced later — beta users will be told in advance."

Below that, a single wide panel listing what's included as a two-column checklist
with check icons:
- Unlimited projects
- Unlimited AI generations
- Full-stack code generation
- Live preview environments
- One-click deploy
- GitHub export

Below the panel, an FAQ of four collapsible rows:
- "Will it stay free?" — "No. Paid plans are planned. Beta users will be
  notified before anything changes."
- "Do you use my code for training?" — "No."
- "Can I export my project?" — "Yes, to GitHub at any time."
- "What stack does it generate?" — "Next.js, PostgreSQL, Prisma, NextAuth,
  and shadcn/ui."

Call to action: primary "Start building".

Constraints: do not invent prices, tiers, or a comparison table. The absence of
pricing is deliberate and should read as confidence, not as an empty state.
```

### A4 — About

```
Screen: KairoPro About page. Web, desktop-first.

Goal: explain why the product exists, briefly and without a founder photo grid.

Layout: sticky top nav. Centered narrow column, max 680px. Page title "Why
KairoPro exists." Three short paragraphs of body copy. Then a single line of
labelled metadata in monospace — "Built with: Next.js, PostgreSQL, Prisma".
Then a primary "Start building" call to action.

Tone: plain, technically credible, no marketing superlatives.

Constraints: no team photos, no investor logos, no testimonials section.
```

### A5 — Legal shell (Terms / Privacy)

```
Screen: KairoPro legal page template, used for both Terms of Service and
Privacy Policy. Web, desktop-first.

Goal: a readable long-form document page.

Layout: sticky top nav. A two-column layout — a sticky left table of contents
listing section numbers and titles, and a right column of body text with a
maximum width of 680px. Page title "Terms of Service" with a monospace
"Last updated" date beneath it. Alternating heading and paragraph content down
the right column.

Constraints: comfortable reading typography — 16px body, 1.7 line height,
generous paragraph spacing. This page is the one exception to the dense
application type scale.
```

### A6 — 404

```
Screen: KairoPro 404 page. Web, desktop-first.

Goal: recover the user, not amuse them.

Layout: centered on the page, vertically and horizontally. A large monospace
"404" in muted text (not red). Heading "This page doesn't exist." One sentence:
"The link may be broken, or the page may have moved." One primary button
"Back to dashboard" and one ghost link "Go to homepage".

Constraints: no illustration, no joke copy, no emoji.
```

---

## 3. Auth screens

### B1 — Login

```
Screen: KairoPro login page. Web, split-screen layout, responsive.

Goal: fast sign-in for a returning developer.

Layout: two columns, each 50% on desktop. Collapse to a single column on mobile.

Left column — the form. Centered vertically, max 380px wide:
- KairoPro wordmark at the top
- Heading "Sign in to KairoPro"
- Subtext "Welcome back."
- Button, full width, secondary style, with a Google mark and label
  "Continue with Google"
- A divider with the word "or" centered
- Label "Email", input with placeholder "you@company.com"
- Label "Password", input with a show/hide eye toggle, and a "Forgot password?"
  text link aligned right beneath the field
- Primary button, full width: "Sign in"
- Bottom line: "Don't have an account?" followed by a "Create one" link

Right column — a dark panel displaying a stylized but realistic fragment of the
KairoPro build view: three build steps with the first two in a completed state
and the third in an in-progress state with a pulsing cyan indicator, above a
short terminal excerpt in monospace. This is decorative but must depict a real
screen.

States to show in the form: default, and an inline validation error state on the
Email field — red hairline border plus small helper text beneath reading
"Enter a valid email address."

Constraints: no social login options other than Google. No "Remember me"
checkbox.
```

### B2 — Register

```
Screen: KairoPro registration page. Web, split-screen layout, responsive.

Goal: create an account in under thirty seconds.

Layout: mirror the login page exactly — same two-column split, same right-hand
panel — so the transition between the two feels continuous.

Left column, centered, max 380px:
- KairoPro wordmark
- Heading "Create your account"
- Subtext "Start building in a few minutes. Free while in beta."
- Button "Continue with Google" with the Google mark, secondary style, full width
- Divider with "or"
- Label "Full name", input, placeholder "Ada Lovelace"
- Label "Work email", input, placeholder "you@company.com"
- Label "Password", input with a show/hide toggle, and helper text beneath in
  muted small type reading "At least 10 characters."
- A live password strength meter: a thin four-segment bar beneath the field,
  filling progressively, with a text label that reads "Weak", "Fair", "Good",
  or "Strong"
- Primary button, full width: "Create account"
- Bottom line: "Already have an account?" followed by a "Sign in" link

Constraints: no terms checkbox — put "By continuing you agree to our Terms and
Privacy Policy" as a single small muted line beneath the primary button.
```

### B3 — Forgot password

```
Screen: KairoPro forgot-password page. Web, single centered column.

Important context: password reset is not implemented in the first version.
This page does not send an email — it tells the user to contact support.

Goal: set an honest expectation rather than implying an email was sent.

Layout: centered vertically and horizontally, max 380px wide.
- KairoPro wordmark
- Heading "Reset your password"
- Body: "Password reset isn't available yet. Email support@kairopro.dev from
  the address on your account and we'll help you regain access."
- A primary button "Email support" that opens a mail client
- A ghost link beneath: "Back to sign in"

Constraints: do not include an email input field, and do not say "we've sent you
a link" — no email is sent.
```

---

## 4. Onboarding, input, and approval gates

### C1 — New project — input

```
Screen: KairoPro "New project" input screen. Application shell with the left
sidebar present. Web, desktop-first.

Goal: capture the user's requirements in whatever form they already have them.

Layout: two columns. Left, 60% — "Tell us what to build." Right, 40% — a live
"Project summary" panel that updates as they type.

Left column contents:
- Page heading "Tell us what to build"
- Subtext "Describe the app, or upload what you already have."
- A large text area, minimum eight rows, placeholder: "A task management app for
  small teams. Projects, tasks with priority and due dates, comments, and an
  admin role that can manage members."
- Beneath it, a row of clickable example chips: "Task manager", "CRM",
  "Booking system", "Internal dashboard"
- Below that, a labelled section "Attachments" with a large dashed-border
  drag-and-drop zone, centered icon, and the text "Drag files here or browse.
  PDF, DOCX, TXT, MD, PNG, JPG, SVG — up to 10MB each, 5 files maximum."
- Show one attached file already present: a small row with a file-type icon,
  filename "product-requirements.pdf", a size "482 KB", and a remove control
- Primary button, bottom right of the left column: "Generate PRD"

Right column "Project summary" panel — a vertical checklist that shows what has
been provided so far, each row with a check or hollow circle:
- Requirements text — complete
- Attachments — 1 file
- Reference site — not yet
- Design direction — not yet
Below the list, a muted line: "Next: three short questions about your app."

Constraints: no step indicator on this screen — it is the first screen and the
progress indicator begins on the next one.
```

### C2 — Agent questions

```
Screen: KairoPro clarification questions. Application shell, no sidebar — this
is a focused, full-width flow.

Goal: resolve architectural ambiguity in a few clicks, before any documents are
generated.

Layout: a centered column, max 720px. At the top, a slim three-step progress
indicator: "1 Questions" (current), "2 Review spec", "3 Build". Beneath it, a
heading "A few questions before I plan" and subtext "These change the data model
and API, so it's worth getting them right."

Then a stacked list of four question cards. Each card contains:
- The question as an h3
- A row of selectable option pills beneath it
- A small monospace line at the bottom listing what it affects, e.g.
  "affects: schema, api, pages"

Question 1 — "How should users sign in?"
Options: "Email and password", "Google", "Both", "Recommend one for me"
Selected: "Both"

Question 2 — "Does the app need multiple organizations or teams?"
Options: "Single user", "One team", "Multiple teams or workspaces",
"Recommend one for me"
Selected: "One team"

Question 3 — "What roles exist?"
Options: "No roles — everyone has full access", "Admin and member",
"Admin, manager, member", "Custom"
Selected: "Admin, manager, member"

Question 4 — "Will this take payments?"
Options: "No payments", "Stripe subscriptions", "Not sure yet"
Selected: "No payments"

At the bottom: primary button "Continue to spec" and a ghost link
"Skip and let me review the assumptions". Above the button, muted small text:
"Unanswered questions become assumptions you can edit in the PRD."

Visual notes: the selected pill uses a violet tinted background with a violet
border and a check mark. Unselected pills use the surface-raised background.
Do not use the cyan agent color on this screen — the agent is not working yet.

Constraints: exactly four questions, each with suggested answers. No free-text
question fields.
```

### D1 — Gate 1 — PRD and design system

```
Screen: KairoPro approval gate 1 — the PRD review. Application shell, full width.

Goal: let the user verify that the AI understood their requirements, and choose
a visual direction, in one review.

Layout: a 720px-wide document column on the left and a 360px fixed feedback panel
on the right.

Top of the page: a three-step progress indicator reading "1 PRD" (current),
"2 Data Model", "3 App Structure", and a right-aligned primary button
"Approve and continue".

Left document column:
- Heading "Product Requirements — TaskFlow"
- A muted metadata line: "Generated from your description and 1 attachment"
- Section "Overview" with two short paragraphs
- Section "Must-have features" as a checklist of eight items with check icons:
  user accounts, teams, create and edit tasks, assign tasks, priorities, statuses,
  comments, an admin role
- Section "User roles" as a small three-row table: Admin, Manager, Member with a
  one-line description each
- Section "User stories" as a numbered list of five stories written in the
  "As a [role], I want to [action], so that [benefit]" form
- Section "Integrations" listing "Google sign-in — credentials required"
- Section "Assumptions" listing three items with a small note that they can be
  edited

Below the document, inside the same column: a distinct bordered panel with the
heading "Design direction." Inside it:
- A row of four selectable preset cards, each with a small abstract preview
  swatch: "Clean SaaS" (selected), "Bold marketing", "Dense dashboard",
  "Playful"
- A labelled input "Reference site" with a URL placeholder and helper text
  "We'll match its layout patterns and color relationships — not copy its brand."
- A labelled upload row "Logo (optional)" with a small dashed drop target and the
  note "A text wordmark is used if you skip this."
- A row of five color swatches showing the extracted palette, each a rounded
  square with its hex value in monospace beneath
- A row of three type samples: a heading specimen in Inter, a body specimen, and
  a "Aa" specimen with the word "Inter" in monospace beneath

Right feedback panel: a chat-style panel. Heading "Request changes". Above the
input, two existing exchange bubbles — one user bubble reading "Add subtasks to
tasks" and one agent reply reading "Done — added a Subtask model with a
self-reference to Task. This also adds subtask endpoints to the API." At the
bottom, a multiline input with placeholder "Ask for a change…" and a send button.

Constraints: exactly one primary button on the page. The design panel must be
visually distinct from the spec document above it, but clearly part of the same
approval step, not a separate page.
```

### D2 — Gate 2 — data model

```
Screen: KairoPro approval gate 2 — the data model review. Application shell.

Goal: let the user catch schema mistakes before any code is written.

Layout: same structure as gate 1 — 720px document column left, 360px feedback
panel right. Progress indicator now reads "1 PRD" (completed, with a check),
"2 Data Model" (current), "3 App Structure". Primary button remains
"Approve and continue".

Left column, top: a heading "Data Model" and a muted line "5 models, 3 enums".

Then a two-part body:

Part 1 — an entity relationship diagram. Five boxes labelled User, Team, Task,
Comment, and Attachment, connected by labelled lines: User to Team ("belongs to"),
Team to Task ("has many"), User to Task ("assigned to"), Task to Comment
("has many"), Task to Attachment ("has many"). Draw it in flat boxes with
hairline borders and monospace labels — no 3D, no shadows.

Part 2 — the schema as a code block, in JetBrains Mono, with syntax coloring:

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      Status   @default(TODO)
  priority    Priority @default(MEDIUM)
  assigneeId  String?
  assignee    User?    @relation(fields: [assigneeId], references: [id])
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  comments    Comment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

Beneath the code, three inline annotation chips at the field level: a chip on
`status` reading "enum", a chip on `assigneeId` reading "optional", and a chip
on `teamId` reading "indexed".

Right panel: identical feedback chat to gate 1.

Constraints: make the diagram and the code feel like two views of the same thing,
aligned to the same left edge and sharing the same width.
```

### D3 — Gate 3 — app structure

```
Screen: KairoPro approval gate 3 — the app structure review. Application shell.

Goal: let the user confirm the pages and API surface before generation begins.

Layout: same shell as gates 1 and 2. Progress indicator reads "1 PRD" and
"2 Data Model" completed, "3 App Structure" current. The primary button
changes to "Start build" — this is the final gate before code generation.

Left column, three stacked sections:

Section "Pages" — an eight-row table with columns Route, Description, and Access.
Routes in monospace: /dashboard, /tasks, /tasks/new, /tasks/[id], /team,
/settings, /login, /register. The Access column uses small badges: "any", "member",
"admin".

Section "API endpoints" — a nine-row table with columns Method, Endpoint, and
Purpose. Method rendered as a small badge: GET in a neutral badge, POST in a
violet badge, PATCH in a warning badge, DELETE in a danger badge. Endpoints in
monospace: /api/tasks, /api/tasks/[id], /api/team, /api/team/[id], /api/comments.

Section "Components" — a wrapped grid of fourteen component name chips in
monospace: TaskCard, TaskForm, TaskList, TaskStatusBadge, PriorityBadge,
CommentThread, TeamMemberRow, InviteMemberDialog, DashboardStats, Sidebar,
TopBar, EmptyState, ConfirmDialog, AvatarGroup.

Right panel: same feedback chat.

Constraints: this screen carries the most information in the product. Keep row
heights tight at 40px, use 13px text inside tables, hairline separators between
rows, and no vertical padding beyond what is needed. The method badges are the
only color in the tables.
```

---

## 5. Build and workspace screens

### E1 — Build in progress

```
Screen: KairoPro build view. Application shell, full width, no right panel.

Goal: show that the agent is working, and what exactly it is doing, with enough
detail that a developer trusts it and enough clarity that a non-developer is not
lost.

Layout, top to bottom:

1. A top bar with the project name "TaskFlow" on the left, a live status pill
   beside it reading "Building" with a pulsing cyan dot, and a secondary
   "Cancel build" button on the right.

2. A build steps panel — a vertical list of seven steps, each with a state icon
   on the left, the step label, and a right-aligned duration in monospace:
   - check, "Understanding requirements", "2s"
   - check, "Generating database schema", "6s"
   - pulsing cyan dot, "Creating API routes", "in progress"
   - hollow circle, "Building pages", muted
   - hollow circle, "Setting up authentication", muted
   - hollow circle, "Running tests", muted
   - hollow circle, "Preparing preview", muted
   The in-progress row has a violet-tinted background band and a subtle animated
   progress shimmer along its bottom edge.

3. A tabbed output panel below, occupying the remaining height. Three tabs:
   "Terminal" (selected), "Code", "Problems". Each tab shows a small count badge.

4. The Terminal tab content — a dark monospace panel, auto-scrolled to the
   bottom, showing realistic output:
   Creating file src/app/api/tasks/route.ts
   Writing prisma/schema.prisma
   Running: npm install
   added 412 packages in 18s
   Running: npx prisma migrate dev
   Migration applied: 20240115_init
   Generating Prisma Client
   Starting dev server on :3000
   Ready in 1.8s
   The final line has a blinking cyan block cursor at the end.

Constraints: use cyan only for live activity — the pulsing dot, the active step
row accent, and the streaming cursor. Everything already finished uses the
success color. Nothing on this screen may show an error state.
```

### E2 — Build complete and build simplified

```
Screen: KairoPro build result, two variants. Application shell.

Variant 1 — "Build complete". Show this state:
- Top bar project name "TaskFlow" with a green "Ready" status pill.
- A centered success panel with a large check icon in the success color.
- Heading "Your app is ready."
- Subtext "Built in 2 minutes 14 seconds. 34 files, 412 dependencies."
- A row of two buttons: primary "Open preview", secondary "Deploy".
- A muted line beneath: "Last build: just now".
- Below, a collapsed summary row reading "34 files changed" with a chevron to
  expand.
- A small preview thumbnail of the running app in a browser frame with a
  monospace URL beneath it: taskflow-a1b2.preview.kairopro.dev

Variant 2 — "Build complete with simplifications". This is the same screen but
with an additional panel above the success panel. Show this state:
- A warning-tinted panel with a warning icon, heading
  "Two features were simplified", and body text: "Your app is ready to use.
  Google sign-in is set to email and password for now, and file attachments
  aren't included yet. Both can be added from project settings."
- A chevron to expand a list of two rows, each with a small warning badge:
  "Google sign-in — using email and password" and "File attachments — not
  included".
- The success panel beneath remains unchanged.

Constraints — this is important: this panel must never contain a stack trace,
an exception name, an HTTP status code, a filename, or the words "error",
"failed", or "unable". Red must not appear. The tone is a note about scope, not
a report of failure. Never use the danger color on this screen.
```

### E3 — Cancel confirmation

```
Screen: KairoPro cancel-build confirmation modal. Rendered over the build view
with a blurred dark scrim.

Goal: confirm the destructive action and explain what happens to the work.

Layout: a centered modal, 420px wide, surface-raised background, hairline
border, large radius.
- Heading "Cancel this build?"
- Body: "KairoPro will stop at the end of the current step. Everything generated
  so far is kept, and you can continue from that point later."
- Buttons, right aligned: ghost "Keep building" and danger "Cancel build"

Constraints: the destructive button is on the right and uses the danger color.
The safe action is the ghost button — do not make the destructive action the
visually primary one.
```

### F1 — Dashboard — empty

```
Screen: KairoPro dashboard, empty state. Application shell with left sidebar.

Goal: get a first-time user to start a project with zero hesitation.

Layout: left sidebar with the KairoPro wordmark, nav items "Projects" (selected),
"Deployments", "Settings", and a primary "New project" button at the top of the
sidebar. Top bar with the page title "Projects" and a user avatar on the right.

Main area — centered, max 560px, vertically centered:
- A simple line-art illustration of the three-step flow: a document, an arrow,
  a code bracket, an arrow, a browser window. Monochrome, hairline strokes,
  violet accents only on the arrows.
- Heading "Create your first project"
- Body: "Describe what you want to build, or upload a PRD. KairoPro will plan
  it with you, then build and run it."
- Primary button "New project"
- A muted line beneath: "Free while in beta. No card required."

Constraints: no screenshot mock here — this state is about intention, not proof.
No feature comparison, no upsell.
```

### F2 — Dashboard — populated

```
Screen: KairoPro dashboard with existing projects. Application shell with left
sidebar.

Goal: let the user see the status of every project at a glance and get back into
one quickly.

Layout: left sidebar as before. Top bar with "Projects", a search input, and an
avatar. Main area:

- A summary row of three small stat cards across the top: "3 projects",
  "1 deployed", "2 previews".
- A grid of project cards, three across on desktop, two on tablet, one on mobile.
  Show four cards.

Card 1 — "TaskFlow": status pill "Deployed" in success color. A small browser
thumbnail of the app. Metadata rows in muted type: "Deployed 2 days ago" and a
monospace URL taskflow.kairopro.app. A row of three ghost icon buttons at the
bottom: open, copy URL, more.

Card 2 — "Invoice CRM": status pill "Ready" in success color. Thumbnail. Rows:
"Built 4 hours ago", monospace URL invoice-crm-a1b2.preview.kairopro.dev. Same
action row.

Card 3 — "Booking System": status pill "Building" in agent cyan with a pulsing
dot. No thumbnail — instead a dimmed placeholder with the text "Building…" and a
slim indeterminate progress bar. Metadata: "Started 1 minute ago".

Card 4 — "Internal Dashboard": status pill "Draft" in neutral. No thumbnail —
a dimmed placeholder reading "No preview yet". Metadata: "Spec approved 3 days
ago". The action row shows "Continue setup" as a secondary button instead of
icon buttons.

Constraints: the "Building" card is the only one allowed to use cyan. Do not use
red on any card.
```

### G1 — Project workspace

```
Screen: KairoPro project workspace — the main working view. Application shell,
four functional regions.

Goal: let a developer inspect and modify the generated project with the agent
alongside.

Layout — four regions:
- Left: a 240px collapsible file explorer
- Center: the code editor, fluid
- Right: a 360px collapsible agent chat panel
- Bottom: a full-width tabbed panel, collapsible

Top bar: breadcrumb "TaskFlow / app / api / tasks", a status pill "Ready", and on
the right a segmented control "Code | Preview" with "Code" selected, plus a
primary "Deploy" button.

Left — File explorer. A monospace tree:
src/
  app/
    api/
      tasks/route.ts
    tasks/page.tsx
    layout.tsx
  components/
  lib/
prisma/
  schema.prisma
One file, route.ts, is selected with a violet-tinted row. A small colored dot
precedes each file indicating type: violet for pages, cyan for API routes,
neutral for config.

Center — Code editor. A tab strip at the top with two open files, one active.
Line numbers in muted monospace down the left. Realistic TypeScript content:

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tasks = await prisma.task.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tasks);
}

Right — Agent chat panel. Header "Agent". A scrollable thread of three messages:
a user bubble "Add a due date field to tasks", an agent bubble listing four
planned changes as a checklist, and a user bubble "Do it". At the bottom, a
multiline input with placeholder "Describe a change…" and a send button, with a
small muted line beneath reading "The agent will show you a plan before changing
anything."

Bottom — Tabbed panel, collapsed to a 40px header. Tabs: "Terminal", "Problems"
with a small count badge, "Logs", "Tests". A chevron on the right expands it.

Constraints: this is the densest screen in the product. Use 13px text throughout
the panels, 32px tree row heights, hairline dividers, and no padding beyond what
separates content. Cyan appears only on the API route markers.
```

### G2 — Change request plan

```
Screen: KairoPro change-request confirmation, shown inside the workspace's right
agent panel as an expanded plan state.

Goal: let the user approve the plan before the agent touches anything.

Layout: the agent chat panel expanded to fill the right column, with a plan card
occupying most of it.

Plan card contents:
- Header "Proposed changes" with a small violet count badge reading "5"
- Subtext: "Add a due date to tasks."
- A checklist of five items, each with an unchanged-then-changed file path in
  monospace:
  1. Add `dueDate DateTime?` to the Task model — prisma/schema.prisma
  2. Create a migration — prisma/migrations
  3. Accept dueDate on create and update — app/api/tasks/route.ts
  4. Add a date picker to the task form — components/TaskForm.tsx
  5. Display the due date on task cards — components/TaskCard.tsx
- Beneath, a collapsed row "View diff" with a chevron, showing a compact
  added/removed line summary: "+18 −2"
- A row of two buttons at the bottom: primary "Apply changes" and ghost "Edit
  plan"
- A muted line beneath the buttons: "You can undo this after it's applied."

Constraints: this must read as a confirmation gate, not as a chat message.
Give the plan card a raised surface and a clear boundary.
```

### G3 — History and undo

```
Screen: KairoPro project history panel, shown as a slide-over drawer from the
right side of the workspace, 420px wide.

Goal: show what changed, when, and let the user reverse the last change.

Layout: drawer header "History" with a close control. Beneath it, a vertical
timeline of six entries, most recent first. Each entry:
- A small circular node on a connecting vertical line, in the success color for
  applied changes
- A bold one-line description
- A muted timestamp
- A right-aligned row of two ghost text buttons: "View" and "Undo"

Entries:
- "Add due date to tasks" — "2 minutes ago"
- "Fix task creation validation" — "18 minutes ago"
- "Add team member invitations" — "yesterday"
- "Add comment threads" — "2 days ago"
- "Initial build" — "2 days ago" — this entry has no Undo button and is marked
  with a neutral node instead of a success node

At the bottom of the drawer, a sticky footer with a secondary button
"Undo last change" and a muted line beneath reading "Undo restores code.
Database changes are not reversed."

Constraints: that final line is required and must not be omitted — the undo
scope is deliberately honest. Do not use red anywhere in this drawer.
```

---

## 6. Deploy and settings screens

### H1 — Deploy modal

```
Screen: KairoPro deploy modal, shown over the workspace with a blurred dark
scrim.

Goal: deploy in one action with minimal decisions.

Layout: centered modal, 480px wide, raised surface, hairline border, large
radius.
- Heading "Deploy TaskFlow"
- Body: "Your app will be published at the address below with HTTPS."
- Label "Subdomain" with a composite input: the editable text "taskflow" in a
  bordered input, followed by a muted monospace suffix ".kairopro.app". A small
  success check and the text "Available" in the success color to the right.
- A summary list of three rows with small check icons:
  "Preview verified", "Database migrations applied", "SSL certificate issued"
- A muted note: "Deployed apps stay online. Preview environments sleep after
  two hours of inactivity."
- Buttons right aligned: ghost "Cancel" and primary "Deploy"

Constraints: no environment selector, no region selector, no advanced options.
Keep the decision to exactly one field.
```

### H2 — GitHub export modal

```
Screen: KairoPro GitHub export modal, shown over the workspace with a blurred
dark scrim.

Goal: hand the code to the user's own repository.

Layout: centered modal, 480px wide.
- Heading "Export to GitHub"
- Body: "Push this project to a new repository in your GitHub account."
- A connected-account row: a small GitHub mark, the username "adalovelace",
  and a ghost text button "Change".
- Label "Repository name", input containing "taskflow"
- Visibility as a two-option segmented control: "Private" (selected) and "Public"
- Checkbox row, checked: "Include a README with setup instructions"
- A muted note: "This creates a new public or private repository. Existing
  repositories are never overwritten."
- Buttons right aligned: ghost "Cancel" and primary "Create repository"

Constraints: if the user has not connected GitHub, the modal instead shows a
single centered secondary button "Connect GitHub" with a short explanatory line
above it and no repository fields.
```

### H3 — Deploy success

```
Screen: KairoPro deploy success, full application shell replaced by a centered
celebration state.

Goal: confirm the app is live and give the user the one thing they need — the URL.

Layout: centered column, max 560px.
- A large check icon in the success color
- Heading "TaskFlow is live."
- A prominent URL chip: monospace text "taskflow.kairopro.app" in a raised
  bordered panel, with a copy icon button on the right
- A row of buttons: primary "Open app", secondary "View deployment", ghost
  "Export to GitHub"
- A muted line beneath: "Deployed 12 seconds ago"

Constraints: no confetti, no animation beyond a single subtle fade-in. No upsell
panel.
```

### I1 — Settings — profile

```
Screen: KairoPro settings page, profile tab. Application shell with left sidebar.

Goal: manage account details.

Layout: left sidebar with "Settings" selected. Main area with a vertical sub-nav
on the left (Profile, Connections, Credentials, Billing — Billing shown as
disabled with a small "later" badge) and a content column max 640px on the right.

Profile content:
- A section heading "Profile"
- An avatar row: a circular avatar with the initials "AL" and two buttons,
  ghost "Upload" and ghost "Remove"
- Label "Full name", input containing "Ada Lovelace"
- Label "Email", input containing "ada@company.com" with a muted note beneath
  reading "Used for sign-in. Contact support to change it."
- A hairline divider
- Section heading "Password"
- Two buttons: secondary "Change password" and ghost "Sign out of all devices"
- A sticky footer bar with a primary "Save changes" button

Constraints: no danger-colored controls on this tab — nothing here is
destructive.
```

### I2 — Settings — credentials

```
Screen: KairoPro settings page, credentials tab. Application shell.

Goal: let the user supply and manage third-party service keys for a project.

Layout: same sub-nav as the profile tab, with "Credentials" selected. Main
content column wider here, 760px, since this is tabular.

Content:
- A project selector at the top: a dropdown reading "TaskFlow"
- Heading "Service credentials"
- Body: "Keys are encrypted at rest and injected as environment variables when
  your app runs. They are never written into your source code."
- A table of four rows with columns Service, Status, Configured, and Actions:
  - "Google OAuth" — badge-success "Connected" — "2 days ago" — ghost "Manage"
  - "Stripe" — badge-success "Connected" — "yesterday" — ghost "Manage"
  - "SendGrid" — badge-warning "Not configured" — "—" — primary-style text
    action "Add key"
  - "AWS S3" — badge-neutral "Not used" — "—" — ghost "Add key"
- Above the table on the right, a secondary button "Add service"

Below the table, an expanded inline edit panel for one service, showing:
- Heading "Google OAuth"
- Label "Client ID" with an input containing masked text and a reveal toggle
- Label "Client Secret" with an input containing a masked value as dots, a
  reveal toggle, and a muted note "Last four characters: 8f2a"
- A row of buttons: primary "Save", ghost "Cancel", and a danger text button
  "Remove"

Constraints: masked values must render as dots, never as readable text. The
reveal toggle is the only way to show a value. Use red only on the "Remove"
action.
```

---

## 7. Refinement patterns

Use these sentence shapes when iterating. Name the screen and the component, and change one thing.

**Tighten a layout**
```
On the <screen name> screen, reduce the vertical gap between the <component>
and the <component> below it to 24px. Do not change anything else.
```

**Adjust a single component**
```
On the <screen name> screen, in the <component name>, increase the button height
to 44px and keep the label and colors exactly as they are.
```

**Fix state visibility**
```
On the <screen name> screen, make the <in-progress / completed / pending> state
of the <component> clearly distinguishable. Use a filled cyan dot for in
progress, a check mark in the success color for completed, and a hollow circle in
muted grey for pending. Keep all other elements unchanged.
```

**Enforce the palette**
```
On the <screen name> screen, replace every use of cyan with the neutral surface
color except for the live agent activity indicator, which stays cyan. Do not
change layout, spacing, or typography.
```

**Improve density**
```
On the <screen name> screen, set all body and panel text to 13px, set row heights
to 32px, and reduce table cell padding. Keep the visual style identical.
```

**Draft user-facing copy**
```
On the <screen name> screen, rewrite the body text so it describes the outcome in
plain language. Remove all technical terms, file names, error names, and status
codes. Keep the same length and layout.
```

**Add a responsive breakpoint**
```
On the <screen name> screen, add a mobile layout: collapse the left sidebar into
a hamburger menu, stack the two columns vertically, and make the primary button
full width. Keep the desktop layout unchanged.
```

### Things to avoid when refining

- Combining a layout change and a component change in one prompt
- Saying "improve the design" or "make it nicer" — this triggers a full rebuild
- Referring to a screen as "it" or "this screen" after switching context
- Asking for dense tables with many columns in one pass (see limitations below)

---

## 8. Copy deck — exact strings

Use these verbatim so the copy stays consistent across screens.

**Status labels:** Draft · Building · Ready · Deployed · Simplified

**Build steps:** Understanding requirements · Generating database schema ·
Creating API routes · Building pages · Setting up authentication ·
Running tests · Preparing preview

**Gate names:** PRD · Data Model · App Structure

**Primary actions:** Start building · Generate PRD · Continue to spec ·
Approve and continue · Start build · Open preview · Deploy · Apply changes ·
Create repository

**The three load-bearing sentences:**

- Simplified outcome: *"Your app is ready. Some features were simplified — you
  can add them later from project settings."*
- Undo scope: *"Undo restores code. Database changes are not reversed."*
- Non-failure retry: *"Something interrupted the build. You can pick up where it
  stopped."*

**Words that must never appear in user-facing copy:** error, failed, failure,
exception, stack trace, traceback, 500, 404 (except the 404 page title),
TypeError, undefined, null, "unable to", "could not", "something went wrong"
unless followed immediately by a recovery action.

---

## 9. Known limitations and what to fix by hand

Per Stitch's documented weak spots, expect to correct these manually after
generation:

| Area | Likely problem | Fix |
|------|----------------|-----|
| D3 (App Structure) tables | Column spacing and alignment drift | Re-align by hand; set fixed column widths |
| G1 (Workspace) | Four-region layout collapses or overflows | Rebuild the grid manually with explicit sizes |
| E1 (Build view) terminal | Monospace wrapping and scroll behavior | Set explicit overflow and line-height |
| I2 (Credentials) table | Masked input widths inconsistent | Fix input widths manually |
| All screens | Excess container padding at small sizes | Apply the 8px grid by hand |

Stitch also does not produce production React — it exports HTML and Tailwind
scaffolding. Expect to port every screen to Next.js App Router components using
shadcn/ui primitives. The token names in `DESIGN.md` map directly onto shadcn's
CSS variables, so the visual result should survive the port without redrawing.

---

## 10. After export — wiring tokens into the app

`DESIGN.md` is a real, lintable spec, not just prose. Once the screens are
approved, the same file becomes the source of truth for the generated app's
theme:

```bash
# Validate the design system
npx -p @google/design.md designmd lint DESIGN.md

# Emit a Tailwind v3 theme.extend config
npx -p @google/design.md designmd export --format json-tailwind DESIGN.md > tailwind.theme.json

# Emit Tailwind v4 @theme CSS custom properties
npx -p @google/design.md designmd export --format css-tailwind DESIGN.md > theme.css

# Emit W3C DTCG tokens for the KairoPro design-spec artifact
npx -p @google/design.md designmd export --format dtcg DESIGN.md > tokens.json
```

This is the mechanism that makes the design phase real rather than decorative:
the user's approved design tokens export directly into the generated
application's `tailwind.config.ts` and CSS variables, with no manual
translation and no drift between the design review and the code.

---
version: "alpha"
name: KairoPro
description: Design system for KairoPro — an AI full-stack development platform for developers who want to bootstrap production apps faster.
colors:
  background: "#0A0A0F"
  surface: "#12121A"
  surface-raised: "#1A1A24"
  border: "#26262F"
  border-strong: "#3A3A47"
  text-primary: "#F5F5F7"
  text-secondary: "#B4B4C0"
  text-muted: "#7E7E8F"
  primary: "#6D5EF5"
  primary-hover: "#5A4AE0"
  on-primary: "#FFFFFF"
  primary-subtle: "#1B1836"
  agent: "#22D3EE"
  agent-subtle: "#0B2A31"
  success: "#34D399"
  success-subtle: "#0C2A22"
  warning: "#FBBF24"
  warning-subtle: "#2E2410"
  danger: "#F87171"
  danger-subtle: "#2E1416"
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.02em
  display:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.015em
  h2:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.background}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 40px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  panel-terminal:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: 16px
  row-selected:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
  text-helper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    typography: "{typography.body-sm}"
    padding: 4px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
    width: 100%
  divider-strong:
    backgroundColor: "{colors.border-strong}"
    height: 1px
    width: 100%
  badge-neutral:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-agent:
    backgroundColor: "{colors.agent-subtle}"
    textColor: "{colors.agent}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-success:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-warning:
    backgroundColor: "{colors.warning-subtle}"
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 6px
  badge-danger:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 6px
---

## Overview

Precision Instrument. KairoPro is a tool for people who read code, so the
interface behaves like a well-machined instrument: dark, quiet, high-contrast
where it matters, and never decorative for its own sake. The reference points
are developer tooling with editorial restraint — not consumer SaaS, not a
marketing splash page with a gradient hero.

Two moods coexist and must stay clearly separated:

- **Marketing surfaces** (landing, features, pricing) are confident and
  spacious. Generous white space, large type, one idea per section, and a
  single call to action. The product is the proof, so show the interface.
- **Application surfaces** (dashboard, gates, build view, workspace) are dense
  and calm. These are working tools. Reduce ornamentation, increase
  information density, and make state unmistakable.

**The governing rule:** the interface is a status display for an agent that is
doing work on the user's behalf. At any moment the user should be able to answer
"what is happening right now?" without reading carefully. Live agent activity
is the one thing allowed to draw the eye — that is what `colors.agent` (cyan)
exists for, and apart from the brand mark below, it is used nowhere else.

**The mark.** KairoPro's logo is the letterform K in `colors.primary` violet on a
`colors.surface` tile, with a small `colors.agent` cyan dot to its right. The dot
is the brand's signature: it reads as a presence light, and it is the one place
cyan is permanently allowed. It must never be repositioned to look like a status
indicator attached to a specific control — it belongs to the mark, not to the UI.
The mark's tile is `rounded.sm` (6px), matching the standard small-control radius.

Dark-first. The dark palette is the canonical identity; a light theme is a
documented override of the same token names and must preserve the same
relationships (surface < surface-raised in elevation, muted text still passing
contrast).

## Colors

A deep near-black foundation with a single violet interaction color and a
single cyan agent-activity color. The discipline is that violet means "the user
can act here" and cyan means "the agent is acting here." They never trade jobs.

- **Background (#0A0A0F):** The canvas. Slightly blue-shifted near-black, not
  pure black, so that borders and surfaces can layer above it without muddying.
- **Surface (#12121A) / Surface-raised (#1A1A24):** Two elevation steps for
  cards, panels, and dialogs. Raised implies "closer to the user" — use it for
  interactive containers and anything floating.
- **Border (#26262F) / Border-strong (#3A3A47):** Default dividers are
  quiet; border-strong is for focused inputs and selected states.
- **Text-primary (#F5F5F7):** Headings, labels, values, and anything the user
  must read first.
- **Text-secondary (#B4B4C0):** Body copy and supporting sentences.
- **Text-muted (#7E7E8F):** Metadata, timestamps, helper text, disabled labels.
  Never use it for anything actionable.
- **Primary (#6D5EF5):** The only color for interactive affordances — primary
  buttons, links, focus rings, selected nav, active toggles.
- **Primary-subtle (#1B1836):** Tinted fills behind primary elements, selected
  rows, and highlight backgrounds.
- **Agent (#22D3EE):** Reserved for live agent activity — the in-progress build
  step, streaming output cursor, the agent's chat avatar ring, "agent is
  working" indicators. The single exception is the brand mark's presence dot,
  which is always cyan (see Overview). Outside that dot, if the agent is not
  currently doing something, this color should not appear on screen.
- **Success (#34D399):** Completed steps, approved gates, passing checks,
  healthy deployment.
- **Warning (#FBBF24):** Degraded or simplified outcomes, quota proximity,
  anything the user should notice but that is not a failure.
- **Danger (#F87171):** Destructive actions only — delete project, cancel
  build, remove credential. Never used to report a system error to the user;
  see Do's and Don'ts.

## Typography

Two families with a hard division of labour.

- **Inter** for all interface and marketing text. Use the full negative
  letter-spacing at display sizes so large headings read as engineered rather
  than generic.
- **JetBrains Mono** for anything that is literally code, a file path, a
  command, a diff, or terminal output. Never use monospace for stylistic
  effect on non-code text.

Scale is deliberately tight at the small end, because the application surfaces
are information-dense. `body` (14px) is the default interface size, not 16px.
`body-sm` (13px) is the default inside panels, tables, and the terminal
adjacent chrome.

Display sizes are for marketing and empty states only. Inside the application,
`h3` is the practical ceiling — a working tool does not shout.

## Layout

Spacing is a 4px base with a comfortable rhythm: `sm` (8px) between related
inline elements, `md` (16px) inside components, `lg` (24px) as the standard
gap, `xl` (32px) between sections inside a panel, and `2xl`+ (48/64/96px)
between marketing sections.

Two layout shells:

**Marketing shell.** Max content width 1200px, centered. Section vertical
rhythm of 96px on desktop, 64px on mobile. Generous side padding (24px
minimum). A single sticky top navigation with the wordmark left, three to four
links center, and "Log in" plus a primary "Start building" button right.

**Application shell.** Three regions: a 240px collapsible left sidebar, a
fluid center workspace, and an optional 360px right panel for agent chat or
metadata. Top bar is 56px and holds breadcrumb, project status, and the
primary action for the current context. The shell never scrolls as a whole —
each region scrolls independently. Density is intentional: 32px row heights,
13px panel text.

Grid: 12 columns on desktop, 8 on tablet, 4 on mobile. Application panels snap
to a 8px grid.

## Elevation & Depth

Depth is communicated with surface steps and hairline borders, not with heavy
shadow. The dark palette makes large drop shadows read as grey smudges.

- **Flat (default):** background, no border. Page-level containers.
- **Surface:** one step up, 1px `border`. Standard cards and panels.
- **Surface-raised:** two steps up, 1px `border-strong`. Popovers, dropdowns,
  modals, and anything that overlaps other content.
- **Focus:** a 2px ring in `primary` with 2px offset. Never rely on a border
  color change alone to indicate focus.

Overlays use a scrim of the background color at 70% opacity with a 4px blur.
Modals are `surface-raised` with `rounded.lg` and a `border-strong` hairline —
never a heavy shadow.

## Shapes

Corner radius is modest and consistent, signalling precision rather than
friendliness: `sm` (6px) for inputs and small controls, `md` (10px) for
buttons, popovers, and terminal panels, `lg` (14px) for cards, panels, and
modals, and `full` for pills, badges, and avatars.

Never mix radii within a single component. Buttons are `md`; the card they sit
in is `lg`; that contrast is intentional and should stay consistent.

## Components

Buttons follow a strict hierarchy — exactly one `button-primary` per view, and
it belongs to the single most likely next action. Everything else is
`button-secondary` or `button-ghost`. `button-danger` appears only in
confirmations of destructive actions.

Inputs are `input` with a `border` hairline, becoming `border-strong` plus a
`primary` focus ring on focus. Error state changes the border to `danger` and
adds `body-sm` helper text in `danger` below — for form validation only.

Cards are the default container for grouped content. `card` for static groups,
`card-raised` for interactive or selectable ones.

`panel-terminal` is the standard container for any streaming or command output —
terminal, build log, and code stream all share it, differing only in which
typography they render.

Badges carry status. `badge-agent` for anything the agent is actively doing,
`badge-success` for complete and approved, `badge-warning` for simplified or
degraded outcomes, `badge-danger` for failed or destructive, `badge-neutral`
for inert metadata.

Gate indicators are a distinct component family and should be visually
unmistakable at a glance, because the entire product flow depends on users
understanding where they are:

- **Pending** — `badge-neutral`, hollow dot, muted text
- **In progress** — `badge-agent`, pulsing filled dot, with `agent` accent
- **Complete** — `badge-success`, checkmark
- **Awaiting approval** — `badge-warning`, with the primary action adjacent

## Do's and Don'ts

**Do**

- Do reserve `agent` cyan for live agent activity. Its scarcity is what makes it
  readable as "something is happening." The only other place it may appear is
  the brand mark's presence dot.
- Do show the agent's work in progress rather than hiding it behind a spinner.
  Status, terminal output, and streaming code are the product's proof.
- Do keep exactly one `button-primary` per view.
- Do use monospace for every file path, command, identifier, and code fragment.
- Do make gate state visible at all times during the approval flow.
- Do write user-facing messages in plain language about outcomes, never about
  mechanisms.

**Don't**

- Don't show stack traces, exception names, HTTP status codes, file-and-line
  references, or any raw technical error to the user. When something cannot be
  built, the interface reports the *outcome* ("Email/password sign-in is
  ready. Google sign-in can be added later."), never the *failure*.
- Don't use red (`danger`) to communicate that a build or feature failed. Red
  is reserved for destructive user actions. A simplified feature is a
  `warning` at most.
- Don't use gradients on text, glassmorphism, glow effects, or animated
  backgrounds. The brand is precision, not spectacle.
- Don't use emoji in product chrome. Status is communicated with shape, color,
  and icon.
- Don't introduce a third accent color. Violet is interaction, cyan is agent
  activity, and the semantic trio (success/warning/danger) is status. That is
  the whole palette.
- Don't use drop shadows heavier than a hairline in the dark theme.
- Don't let marketing pages show fabricated UI. Every screenshot or mock in
  marketing must depict a screen that actually exists in the product.

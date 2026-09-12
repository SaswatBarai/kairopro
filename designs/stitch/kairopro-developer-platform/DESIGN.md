---
name: KairoPro Developer Platform
colors:
  surface: "#131318"
  surface-dim: "#131318"
  surface-bright: "#39383e"
  surface-container-lowest: "#0e0e13"
  surface-container-low: "#1b1b20"
  surface-container: "#1f1f25"
  surface-container-high: "#2a292f"
  surface-container-highest: "#35343a"
  on-surface: "#e4e1e9"
  on-surface-variant: "#c8c4d7"
  inverse-surface: "#e4e1e9"
  inverse-on-surface: "#303036"
  outline: "#928ea1"
  outline-variant: "#474555"
  surface-tint: "#c5c0ff"
  primary: "#c5c0ff"
  on-primary: "#2600a1"
  primary-container: "#6d5ef5"
  on-primary-container: "#fffdff"
  inverse-primary: "#5544dc"
  secondary: "#5de6ff"
  on-secondary: "#00363e"
  secondary-container: "#00cbe6"
  on-secondary-container: "#00515d"
  tertiary: "#4edea3"
  on-tertiary: "#003824"
  tertiary-container: "#00865c"
  on-tertiary-container: "#fafff9"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#e4dfff"
  primary-fixed-dim: "#c5c0ff"
  on-primary-fixed: "#150067"
  on-primary-fixed-variant: "#3c24c5"
  secondary-fixed: "#a2eeff"
  secondary-fixed-dim: "#2fd9f4"
  on-secondary-fixed: "#001f25"
  on-secondary-fixed-variant: "#004e5a"
  tertiary-fixed: "#6ffbbe"
  tertiary-fixed-dim: "#4edea3"
  on-tertiary-fixed: "#002113"
  on-tertiary-fixed-variant: "#005236"
  background: "#131318"
  on-background: "#e4e1e9"
  surface-variant: "#35343a"
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: "600"
    lineHeight: 20px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 18px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
    letterSpacing: 0em
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: -0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 18px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: "400"
    lineHeight: 15px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.03em
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: "600"
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-mobile: 0.5rem
  margin: 1rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a disciplined, high-density environment engineered for elite software engineers and infrastructure architects managing autonomous AI agents. The aesthetic rejects decorative trends—there are no blurry backdrops, exaggerated dropshadows, or novelty illustrations. Instead, it embodies a technical instrument: rigorous, structural, calm, and hyper-legible under prolonged focus.

Visual principles:

- **Absolute Precision**: Interfaces rely strictly on geometric alignment, crisp 1px hairline segmentations, and semantic surface contrast.
- **Instrumental Restraint**: Color is never decorative. It functions purely as status, authority, or execution feedback.
- **Information Density**: Information architecture favors data throughput, code-level readability, and minimal structural chrome over hollow negative space.
- **Strict Semantic Differentiation**: Distinct separations between user-invoked interactions, autonomous background agent work, and system states.

## Colors

The palette is engineered strictly for a dark-first terminal-grade interface. The canvas anchors at `#0A0A0F`, stacked with sequential surface tiers for contextual hierarchy.

### Surface Architecture

- **Canvas Base**: `#0A0A0F` — Root window background, deep terminal backdrops.
- **Surface Tier 1**: `#12121A` — Primary application panes, navigation panels, sidebar containers.
- **Surface Tier 2**: `#181824` — Secondary cards, code block wrappers, nested viewports.
- **Surface Tier 3**: `#222233` — Hovered states, modal dialogs, contextual overlays, popovers.

### Hairline Borders

- **Border Default**: `#1E1E2E` — Standard structural division, table boundaries, pane dividers.
- **Border Focus / Subtle Highlight**: `#2A2A3C` — Interactive borders, active pane perimeters, input outlines.

### Semantic Accents

- **Primary Violet (`#6D5EF5`)**: Exclusively signifies user agency—"the user can act here" (primary triggers, focus rings, selected menu items, user command submission).
- **Agent Activity Cyan (`#22D3EE`)**: Hard-reserved for autonomous system states—live agent execution, token streaming indicators, active thread ripples, background compilation. Never apply to standard buttons or generic highlights.
- **Success Emerald (`#10B981`)**: Deterministic completion, test pass, verified build, connected daemon.
- **Warning Amber (`#F59E0B`)**: Degraded performance, rate limits approached, deprecation warnings.
- **Danger Rose (`#EF4444`)**: Hard termination, destructive actions, build failures, process interrupts.

### Typography & Content Neutrals

- **Text High Contrast**: `#F3F4F6` (Headings, active values, focused code lines).
- **Text Primary**: `#D1D5DB` (Standard UI body, labels, terminal output).
- **Text Muted**: `#9CA3AF` (Secondary metadata, inactive parameters, timestamps).
- **Text Subtle**: `#4B5563` (Comments, gutter line numbers, placeholder values).

## Typography

Typography establishes an uncompromising hierarchy between structural interface text and technical system payloads.

- **Inter**: Handles all conversational UI text, system titles, tooltips, dialogs, and high-level workflow navigation. Sizing is intentionally compact to maintain information density.
- **JetBrains Mono**: Dispatched across all terminal logs, inline code, status badges, metrics, execution counters, git SHAs, agent run parameters, and file trees.
- **Stylistic Restraint**: Uppercase is reserved strictly for `label-xs` tokens (e.g., table column identifiers, environment flags, HTTP methods). Sizing remains tight; desktop layouts rarely exceed `24px` for headers to preserve viewable workstation area.

## Layout & Spacing

The layout model implements an IDE-style split pane layout anchored to a strict multi-tier fluid grid system.

- **Grid Architecture**: Multi-column responsive grid utilizing 12 columns on desktop (`>= 1280px`), 8 columns on tablet (`768px - 1279px`), and 4 columns on mobile (`< 768px`). Panes collapse into collapsible bottom sheets or swipeable tabs on sub-tablet viewports.
- **Gutter & Margin Rhythm**: Base modular grid derived from 4px increments. Internal UI density prioritizes 4px (`space-xs`), 8px (`space-sm`), and 12px (`space-md`) paddings to avoid ballooning element heights.
- **Pane Subdivision**: Structural segments must rely on 1px borders rather than empty whitespace gaps to demarcate workspaces, mimicking advanced code editors and terminal multiplexers.

## Elevation & Depth

This system avoids ambient blur shadows, diffusion layers, and simulated light sources. Depth is communicated strictly via tonal surface stepping and low-contrast borders.

- **Level 0 (Root)**: `#0A0A0F` canvas.
- **Level 1 (Docked Panes & Workspaces)**: `#12121A` paired with a 1px border of `#1E1E2E`.
- **Level 2 (Active Cards, Editors, Sub-tools)**: `#181824` with 1px border of `#2A2A3C`.
- **Level 3 (Floating Overlays, Command Palette, Tooltips)**: `#222233` with 1px border of `#2A2A3C`. Absolutely no dropshadows; separation is achieved by sharp boundary contrast and precise overlay scrims (`#000000` at 60% opacity).
- **Active Agent Elevation**: Active tasks retain flat elevation but incorporate a 1px `#22D3EE` solid or pulsing hairline accent border to signify execution without altering z-index geometry.

## Shapes

Shapes adhere strictly to a `rounded-md` (4px to 6px) visual envelope, reinforcing structural stability, tooling precision, and modular interlocking blocks.

- **Controls & Elements**: Standard buttons, inputs, tabs, dropdowns, and status badges take `4px` (`0.25rem`) border radii.
- **Containers & Overlays**: Floating modal windows, command bars, and primary modular cards take `6px` (`0.375rem`) border radii.
- **Prohibitions**: Fully rounded capsules (pills) and circle action buttons are strictly forbidden. Badges and chips remain crisp rectangles with subtle 3px or 4px radii.

## Components

### Buttons

- **Primary (User Action)**: Background `#6D5EF5`, foreground `#FFFFFF`, border none. Hover: `#5C4EE5`. Active: `#4F42D1`. Font: `Inter` 12px Medium.
- **Secondary (Tooling)**: Background `#181824`, foreground `#D1D5DB`, border 1px `#1E1E2E`. Hover: Background `#222233`, border `#2A2A3C`.
- **Destructive**: Background transparent, border 1px `#EF4444`, foreground `#EF4444`. Hover: Background `#EF4444` at 10% opacity.
- **Agent Controls**: Background `#12121A`, foreground `#22D3EE`, border 1px `#22D3EE` (active/pause streaming).

### Badges & Technical Chips

- **Implementation**: Structured with `JetBrains Mono` at `label-xs` (10px). Height locked to 20px. Horizontal padding 6px.
- **Agent Running State**: Background `#22D3EE` at 10% fill, border 1px `#22D3EE` at 40%, text `#22D3EE`. Includes a 4px static cyan dot that pulses during token reception.
- **System States**:
  - Success: Fill `#10B981` at 10%, text `#10B981`, border `#10B981` at 30%.
  - Warning: Fill `#F59E0B` at 10%, text `#F59E0B`, border `#F59E0B` at 30%.
  - Critical: Fill `#EF4444` at 10%, text `#EF4444`, border `#EF4444` at 30%.

### Form Inputs & Terminal Controls

- **Input Fields**: Background `#0A0A0F`, border 1px `#1E1E2E`, typography `JetBrains Mono` 12px, text `#F3F4F6`. Focus state: border 1px `#6D5EF5`, no box shadow. Placeholder: `#4B5563`.
- **Checkboxes & Radios**: 14x14px squares (radii 2px for checkboxes, circles for radios). Border 1px `#2A2A3C`. Checked: background `#6D5EF5`, border `#6D5EF5`, inner tick in `#FFFFFF`.

### Terminal & Code Output

- **Log Stream Container**: Background `#0A0A0F`, border 1px `#1E1E2E`. Left-aligned line numbers in `#4B5563`.
- **Streaming Cursor**: 7px wide by 14px high block cursor `#22D3EE`, pulsing at 1Hz during agent stream generation.

### Card & Panels

- **Layout**: Background `#12121A`, border 1px `#1E1E2E`, padding `space-md` (12px). Header segmented with a horizontal 1px hairline divider (`#1E1E2E`).
- **Interactive Variant**: Hover triggers border shift to `#2A2A3C` without vertical translation or shadow generation.

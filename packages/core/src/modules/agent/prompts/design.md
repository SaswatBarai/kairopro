# Task

Produce a `DESIGN.md` token document for the application described by the
PRD below. The output is consumed by machines, not read as prose: a design
tool exports it straight to CSS, and generated components reference its
tokens by name. Every value must be a token, never a description of one.

# PRD

{{prd}}

# Reference material

{{referenceNotes}}

If no reference material was given above, produce a complete, coherent
token set anyway — a sensible default palette, type scale, spacing scale,
and radii. "No reference provided" is never a reason to produce an
incomplete or empty token set.

# Output format

Output exactly one document: YAML frontmatter holding the token tree,
followed by markdown sections describing how the tokens are used. Follow
this shape:

```
---
color:
  background: "#..."
  foreground: "#..."
  primary: "#..."
  # ...
typography:
  fontFamily: "..."
  scale:
    sm: "0.875rem"
    base: "1rem"
    lg: "1.125rem"
    # ...
spacing:
  # a numeric scale, e.g. 1: "0.25rem", 2: "0.5rem", ...
radius:
  # a small named scale, e.g. sm/md/lg/full
shadow:
  # a small named scale
---

## Colors

Prose describing intent and usage — not new values.

## Typography

## Spacing

## Components
```

Rules:

- Every leaf value under the frontmatter is a real, usable value (a hex
  color, a `rem` length, a font stack) — never a placeholder like
  "TBD" or a text description.
- A value may reference another token with `{path.to.token}`; every
  reference must resolve to a real value defined elsewhere in the tree.
- The markdown body explains intent and where a token applies. It never
  introduces a color, size, or font that is not already a token above.

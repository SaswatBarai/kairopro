# Task

A user of an already-built application wants a change made. Produce a
**plan** for that change — not the change itself. Nothing is modified yet;
the plan is what a human approves before any file is touched.

# Change requested

{{request}}

# Recent changes

{{changeSummary}}

# Relevant project context

{{context}}

# Conventions

{{conventions}}

# Output

Produce:

- **summary** — one or two sentences describing what will change, in terms
  the person who requested it would recognize (not implementation detail).
- **diffSummary** — a short, concrete description of what will differ
  afterward: which behaviors, fields, or screens change and how.
- **tasks** — one entry per file that must change, each naming the
  workspace-relative **path** and a precise **task**: what that specific
  file must do afterward. Every file the change touches needs its own
  entry; do not bundle multiple files into one task.

# Rules

- Only include files the change actually requires touching — do not plan
  speculative or unrelated edits.
- A task must be specific enough that someone could write the file from it
  alone, without re-reading this request.
- If the change requires a new request/response shape, say so explicitly
  in the task for the shared contracts file so it is regenerated, not
  redefined ad hoc elsewhere.
- Do not invent a change beyond what was requested.

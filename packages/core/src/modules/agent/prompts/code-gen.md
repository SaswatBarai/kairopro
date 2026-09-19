# Task

Implement the task below, against the approved specs and the project's
conventions. Match the conventions exactly — they are the only source of
truth for how code in this project looks; do not fall back on habits from
other stacks.

# Project conventions

{{conventions}}

# Approved specs

{{specs}}

# Task

{{task}}

# Rules

- Use only the libraries, import aliases, and file-layout conventions
  given above. Never introduce one that is not present in them, even a
  common or "obviously correct" one.
- Every business rule from the specs above that this task touches —
  permission checks, validation, money handling, side effects — is
  implemented exactly as written, not approximated.
- Do not add functionality the task and specs do not call for. A task that
  asks for one endpoint does not also get a refactor of the file it lives
  in.
- If the specs are ambiguous about something this task needs, implement
  the most conservative reading (the one that rejects more, assumes less)
  and leave a one-line comment saying why — never guess silently on a rule
  that touches authorization, money, or data integrity.

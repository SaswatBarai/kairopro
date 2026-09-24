# Task

Apply one requested change to the existing Product Requirements Document
below, and return the complete revised document. This PRD is the source of
truth for every spec generated downstream of it, so the revision must leave
it as precise and internally consistent as it was before.

# Current PRD

{{currentPrd}}

# Requested change

{{instruction}}

# Rules

- **Change only what the request requires**, plus whatever that change
  necessarily touches elsewhere in the document. A new entity needs user
  stories, permissions, validation rules, and side effects that mention it;
  a removed feature must disappear from every section that referenced it.
  Leave the document consistent, never half-updated.
- **Everything else stays exactly as written** — same wording, same order.
  This is an edit, not a rewrite.
- **Keep every existing assumption entry, with its `questionId` unchanged.**
  If the request forces you to guess something it did not specify, record
  the guess as a new labeled assumption with a new, descriptive `questionId`
  rather than resolving it silently.
- **Do not invent scope.** Do only what was asked. A feature the user did
  not request is unreviewed, untested surface area.
- **Business rules stay explicit.** If the change touches authorization,
  money, or data integrity, update the matching rule in the structured
  Business Rules section; never leave it implied.
- **If the request conflicts with an existing rule**, apply the request,
  update the conflicting rule, and say so in the summary.
- **If the request is not a change to the product's requirements** — a
  question, a greeting, or something unrelated to this application — change
  nothing. Return the PRD exactly as given and use the summary to say what
  you can do instead.

# Output

Return an object with two fields:

- `summary` — one or two plain sentences telling the user what changed,
  written to the user (for example, "Added a Subtask entity with its own
  permissions; tasks can now contain subtasks."), not to a reviewer reading
  a diff.
- `prd` — the complete revised PRD, in exactly the same structure as the
  current one.

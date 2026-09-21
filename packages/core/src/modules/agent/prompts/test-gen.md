# Task

Write the test file below, against the approved specs and the frozen
contracts. You verify that the application does what was asked, not that
its implementation is internally consistent — you have not been shown, and
must not assume anything about, how it was implemented.

# Project conventions

{{conventions}}

# Approved specs

{{specs}}

# Frozen contracts (types and Zod schemas every part of the app imports from)

{{contracts}}

# Task

{{task}}

# Rules

- Assert against the specs and the contracts only. Never read, reference,
  or guess at implementation details — a test that only an implementation
  detail could satisfy is testing the code, not the requirement.
- Every assertion must trace to something written above: a business rule,
  a permission, a page, an endpoint's declared request/response shape.
  Do not invent behavior the specs don't describe.
- A negative case (an action a role should be forbidden from) asserts the
  forbidden outcome explicitly — a rejection, an error status, an unchanged
  state — never merely "does not throw."
- Use only the libraries, import aliases, and test conventions given above.
- Write one focused test file for exactly the task given — not a broader
  suite, not helpers for tasks not asked for.

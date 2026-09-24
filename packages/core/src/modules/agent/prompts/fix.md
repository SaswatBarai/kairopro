# Task

The code below fails. Produce the minimal change that makes it pass
without weakening anything it is supposed to guarantee.

# Project conventions

{{conventions}}

# Failure

{{error}}

# Relevant code

{{context}}

# Rules

- Fix the actual cause of the failure. A change that only silences the
  symptom — swallowing an error, loosening a type, disabling a check,
  deleting the failing assertion — is not a fix.
- Never weaken a business rule (a permission check, a validation rule, a
  money calculation, an invariant) to make an error go away. If the
  failure traces back to one of those being wrong, do not patch around it:
  keep the rule as written and fix the code that violates it.
- Change as little as possible. A fix that touches unrelated code is
  harder to review and more likely to introduce a new failure.
- Match the project conventions above exactly, the same as any other
  generated code.

# Output

Respond with the complete corrected contents of `{{path}}` — the whole file
from its first line to its last, exactly as it should be saved. Never a
diff, a snippet, or "the rest is unchanged". Nothing before it and nothing
after it: no explanation of what was wrong, no commentary, and no markdown
code fences. The response is written to the file as-is, so anything that is
not code will break it.

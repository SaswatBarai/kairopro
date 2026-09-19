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
  failure traces back to one of those being wrong, say so instead of
  patching around it.
- Change as little as possible. A fix that touches unrelated code is
  harder to review and more likely to introduce a new failure.
- Match the project conventions above exactly, the same as any other
  generated code.

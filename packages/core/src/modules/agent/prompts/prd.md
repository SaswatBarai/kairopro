# Task

Write the Product Requirements Document for the application described
below. This PRD is the source of truth for every spec, and later for every
test, generated downstream of it — write it as precisely as you would want
it if you were the engineer implementing it with no further access to the
user.

# Project description

{{projectDescription}}

# Clarifying answers

{{pmAnswers}}

# Unanswered questions

{{assumptions}}

Every item listed above must appear, verbatim or near-verbatim, as a
labeled assumption in the Assumptions section below — never silently
dropped, never silently resolved without being marked as an assumption.

# Required sections, in order

1. **Overview** — what the application is and who it is for, in a few
   sentences.
2. **Goals & Non-Goals** — what this version of the product must do, and
   what it explicitly does not do yet.
3. **Personas** — the distinct types of user and what each one needs.
4. **User Stories** — concrete, testable stories per persona.
5. **Assumptions** — every unanswered question from above, restated as an
   explicit, labeled assumption.
6. **Business Rules** — the structured section below. This is the most
   important section in the document: it is what makes the generated
   application testable against what was actually asked for, not just
   against what the code happens to do.

# Business Rules — required subsections

Write all six, even when a subsection is short. A missing subsection is a
missing requirement, not an implied "none."

- **Invariants** — statements that must always hold, regardless of how the
  state was reached (e.g. "a completed order's total never changes").
- **State Machine** — the states an entity can be in and the transitions
  allowed between them; note which transitions are forbidden.
- **Permission Matrix** — which role can perform which action on which
  entity.
- **Validation Rules** — constraints on input beyond basic type checking
  (ranges, formats, cross-field rules, uniqueness).
- **Money Rules** — how amounts are calculated, rounded, and who is
  authorized to change them; write "N/A — no monetary values" if genuinely
  none apply.
- **Side Effects** — what else happens as a consequence of an action
  (notifications sent, records created, external calls made).

# Task

Produce a Prisma schema modeling the entities and relations implied by the
PRD below — its user stories, its state machine, and in particular its
business rules. The schema is later handed straight to `prisma validate`;
it must parse.

# PRD

{{prd}}

# Output format

Output only `model` and `enum` blocks — no `datasource` or `generator`
block; those are added by the project scaffold and are not yours to write.

# Rules

- Every entity named or clearly implied by the PRD's user stories or
  business rules gets a model.
- Every state named in the PRD's State Machine subsection becomes an enum
  value, and the entity it belongs to carries a field of that enum type.
- Every relationship implied by the Permission Matrix or the user stories
  (who owns what, what belongs to what) is a real relation field, with the
  foreign key and the opposite relation both declared.
- Fields implied by the Validation Rules subsection carry the closest
  matching Prisma-level constraint (`@unique`, `@db.VarChar`, etc.) where
  Prisma can express it; constraints Prisma cannot express are left as a
  comment on the field, not silently dropped.
- Every model has an `id`, and timestamps where the PRD's business rules
  depend on ordering or recency.

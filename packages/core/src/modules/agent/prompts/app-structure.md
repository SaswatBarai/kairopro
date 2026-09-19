# Task

Produce the application structure for the product described by the PRD and
data model below: the pages, API endpoints, and components the build phase
will generate. This is the last spec before code is written — be as
concrete as the PRD and data model allow.

# PRD

{{prd}}

# Data model

{{dataModel}}

# Output

Produce three lists.

**Pages** — every screen a user of any persona from the PRD visits, each
with its route and which persona(s) can reach it.

**Endpoints** — every server operation the pages and business rules
require. For each endpoint, name:

- the HTTP method and path
- **a request type** — the shape of what the endpoint accepts, even if it
  is empty
- **a response type** — the shape of what it returns, even for a bare
  acknowledgement

An endpoint with only one of the two types is incomplete — every endpoint
in the output has both.

**Components** — the reusable pieces the pages above are built from, named
by responsibility (what they show or do), not by visual appearance.

# Rules

- Every entity in the data model that a persona can view, create, update,
  or delete has at least one endpoint covering that operation, gated by
  the PRD's Permission Matrix.
- A page that lists or shows an entity is backed by an endpoint that
  returns it; a page that lets the user act on an entity is backed by an
  endpoint that performs that action.
- Do not name a specific UI library, import alias, or file-system
  convention — those come from the project template, not from this spec.

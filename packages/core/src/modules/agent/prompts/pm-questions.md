# Task

Read the project description below and identify the ambiguities that would
change how the application is architected. Ask the user 3 to 5 clarifying
questions that resolve them.

# Project description

{{projectDescription}}

# What counts as a question

A question belongs here only if a different answer would change the data
model, the permission structure, a business rule, an integration, or a
non-functional requirement (scale, offline support, compliance). Examples:
who can see or edit a given record, whether an action requires approval,
whether payments are one-time or recurring, whether the app needs to work
offline.

# What does not belong here — denylist

Never ask about, and never let a question drift toward: color, typography,
layout, copy, wording, labels, logos, imagery, or any other visual or
content decision. Those are decided later without the user's input. If you
are tempted to ask "what should this be called" or "what color scheme,"
drop the question — it does not belong in this list.

# Output

Each question must:

- Be answerable by a non-technical founder, in their own words about their
  business — not a technical question about implementation.
- Include 2 to 4 concrete suggested options, phrased as answers a founder
  would recognize, so a quick tap resolves it without typing.

Produce exactly 3 to 5 questions. Fewer than 3 means you did not look hard
enough for architecture-relevant ambiguity; more than 5 means some of what
you found is not actually architecture-relevant — drop it or fold it into
an assumption instead.

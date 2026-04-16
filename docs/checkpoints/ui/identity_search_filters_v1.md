## Identity Search + Filters V1

### Context

- Display Identity V1 is now visible across web and app surfaces.
- Users can distinguish cards visually, but they still cannot search and filter by identity cleanly.

### Decision

- Search + Filters V1 derives behavior from existing identity fields only.
- Web and Flutter must use matching token semantics and matching filter labels.

### Invariants

- No canonical identity changes.
- No schema or migration changes.
- No hidden heuristics beyond explicit token rules and existing identity fields.

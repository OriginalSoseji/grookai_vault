# Stamped child classification local V1

Status: Active local qualification boundary; no production execution authority.

This prototype admits only the same 33 existing parent/child targets in the
stamped child-image intake manifest. Originals, consumed intake attempts and
the executed intake source remain retained. Classification may propose only
`PRINTING_ONLY` / `ATTACH_PRINTING` / `ENRICH_CARD_PRINTING_IMAGE`, ending in
`REVIEW_READY`. It may not propose a card or printing create, identity change,
founder approval, staging, image publication or pricing mutation.

The ordinary classifier retains its per-candidate transaction wrapper. Its
existing registered write/proof body is also available to a caller-owned
transaction. The local coordinator uses that same body for all 33 candidates
inside one serializable transaction and compares the complete candidate,
evidence, raw, original event, parent, child, identity and synthetic owner rows.
The intended effects are 99 update statements on 33 warehouse candidates and
99 SYSTEM events. Only the documented classification summary fields and
forward-moving trigger timestamps may change. Founder and promotion fields stay
exact and unapproved. No new source-backed extraction is manufactured.

Execution rejects production and historical labs before SQL. Only loopback
PostgreSQL17 databases with the new classification qualification name are
accepted. Rollback, apply and read-only replay are separate local modes.
SQL failure must roll back the entire batch. Lost commit or rollback responses
are uncertain outcomes requiring independent diagnosis; no automatic retry or
successful receipt may be fabricated. Failure recording uses the existing
registered executor with an independent local ledger connection.

Before any later production path, implement and qualify its bounded authority,
source, complete preservation comparison, named attempts and durable outcome
handling; pass normal and hosted source checks; obtain a fresh exact production
plan and separate scoped owner decision. This local prototype provides none of
that authority and exposes no production CLI. Real metadata extraction, image
normalization, founder review and governed image-only promotion remain later
gates. `NORMALIZED_PARTIAL` does not assert a normalized image asset exists.

Preserve the 298 held parents, 20 finish cases, 32 identity holds, original149
never-repeat boundary and excluded additional Cinderace photograph.

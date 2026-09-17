# Master Index Printing Authority V1

Date: 2026-09-17
Status: Contract and local implementation candidate; not a production apply.

## Why

The retrospective found parent-only imports, missing secondary finishes, missing
printing GV-IDs and a monitoring query that excluded default-public Pokemon.
Existing source-governance contracts were not consistently enforced at the
collector-readiness boundary. This contract strengthens those existing rules;
it does not create a competing index or make database presence into evidence.

## Authority Order

Preserved source evidence -> reviewed language/game Master Index -> frozen
printing authority manifest -> database delta -> public options -> Vault/client.

Stricter `VERIFIED_MASTER_SET_INDEX_V1`, `MASTER_INDEX_GOVERNANCE_CONTRACT_V1`,
`PRINTING_TRUTH_CONTRACT_V1` and `INGESTION_PIPELINE_CONTRACT_V1` rules still win.
Historical index facts remain candidates when their evidence is superseded,
contradictory, ambiguous or incomplete. Never infer a finish from a price bucket,
rarity, era, generic API flag, missing finish token or existing database row.

## Scope And Identity

Each scope binds game, language, canonical set ID/code, identity policy, exact
parent IDs/GV-IDs, printed coordinates, names, variant keys and printed identity
modifiers. Each supported child binds the parent, exact finish, expected printing
GV-ID and evidence. Resolve existing IDs before planning; do not mint replacement
parents merely because a spelling or set alias differs.

An authoritative base release may retain explicit outside-base review leads.
A claim of whole-set completion may not have unresolved variants. Special
products, stamps and replicas are not silently folded into a base scope.
Japanese, English Pokemon, MTG paper and One Piece have separate policy bindings.
New languages/games require an explicit policy extension and tests, not fallback
to an English Pokemon policy.

## Frozen Manifest

Extend `PRINTING_COMPLETENESS_GATE_V1` with `authority`:

- `version: MASTER_INDEX_PRINTING_AUTHORITY_V1`
- `status: verified_scope`
- exact `set_id`
- `source_artifacts`: unique ref, SHA-256, evidence kind, source URL/identifier,
  retrieval timestamp; every printing reference binds an artifact
- `review`: reference and SHA-256 of the immutable review record
- explicit `protected_facts`, `forbidden_facts`, `conflicts`

The review record binds reviewer/time, game/language/set/scope, Master Index file
hash and the complete manifest projection hash excluding only its review link
and outer fingerprint. Hash actual file bytes, not a file path or an assertion
that evidence was checked. Every file must be present and hash-match locally.
Source hashes preserve provenance; they do not prove source claims by themselves.
Review records must only be issued after source adjudication, never auto-generated
solely to convert a failed candidate into a verified manifest.

Source kinds: checked checklist, official printing, image-confirmed printing,
exact printing mapping. Price-only and unreviewed provider metadata are not
printing authority. Every expected fact must pass the existing source standard.

## Reconciliation

The reader requires a bounded set snapshot with complete parent/child/public
options, a collision inventory of printing IDs/GV-IDs, explicit scope, project,
observation timestamp and fingerprint. Default evidence freshness is 24 hours.
Freshness is not a substitute for immediate transactional preflight.

Classifications:

| Difference | Permitted preparation |
|---|---|
| Missing supported child | Additive candidate; source-bound exact finish |
| Missing printing GV-ID | Candidate update retaining child UUID |
| Different existing GV-ID | Identity conflict; no automatic rename |
| Parent identity/variant differs | Block child proposals for that parent |
| Missing provenance/review | Evidence recovery or review; do not fabricate proof |
| Unexpected/forbidden child | Review-only; no deletion or visibility mutation |
| Missing/incorrect public option | Delivery discrepancy; repair after identity proof |
| Matching row | Preserve IDs and content |

Count equality is insufficient. Exact identity equality and locked suppression/
protection profiles are mandatory. At least one child per parent is only a
structural diagnostic: it misses the absent McDonald's Holo lane.

## Mutation Boundary

`buildMasterPrintingRepairPlan` prepares additive children, append-only reviews
and compare-and-swap recovery of wholly absent provenance. Partial provenance,
provisional rows, adverse/historical reviews and identity conflicts require
separate adjudication. It preserves complete before rows, existing UUIDs and
image fields; no parent, ownership, mapping or pricing patches are emitted.
Dependency artifact bytes and the exact set of UUID collision checks are bound
into the candidate. A no-change replay proposes zero raw-evidence writes too.
The candidate is not an executor or a declaration of complete dependency proof.

The reconciler emits no executable SQL and always reports `write_ready:false`.
The founder's program approval permits implementation and safe preparation;
existing bounded production-apply contracts still govern mutation authority.

Before any production batch: freeze exact scope/counts/hashes, inventory all FK
and application-level dependencies, prove ownership/pricing/mapping preservation,
check collisions, test rollback, bind execution authority, and rerun preflight
inside the transaction. Preserve existing parent/child UUIDs. Never delete,
merge, rename, reassign ownership or reinterpret variants as a blanket backfill.
Unknown COMMIT outcome requires readback, not blind retry. After commit require
exact manifest readback, public RPC parity and zero-row idempotency.

The collision inventory may be scoped to all existing children in the set plus
every database row matching any expected printing GV-ID. It must not be scoped
only to the set's own IDs, which would miss cross-set collisions. Record the
reader query and its hash. Proposed UUID collisions are additionally checked by
the bounded writer before any insert.

## Continuous Operation

Run discovery/index drift daily or more frequently. Preserve source outages as
outages, not deletions. Reconciliation must cover every supported game/language,
with uncovered or unverified scopes reported explicitly. Pokemon's lack of a
game-control row must not exclude its default-public catalog from monitoring.
Hidden set overrides remain hidden. Missing manifest is not a passing manifest.

No new public visibility, downstream pricing authority or automatic production
writer is introduced by this contract. Rollout is complete only after the
scheduled code and source-backed scope registry are deployed and verified.

## Done

Every in-scope discrepancy is repaired or explicitly unresolved; no unresolved
scope is advertised as collector-ready. Expected identities, public choices and
ownership behavior agree. Tests, frozen evidence, mutation receipts and daily
monitoring prove the result. Existing incomplete data alone cannot satisfy this.

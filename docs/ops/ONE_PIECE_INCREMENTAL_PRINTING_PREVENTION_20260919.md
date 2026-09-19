# One Piece Incremental Printing Prevention

Date: 2026-09-19. Status: local implementation and verification, NOT deployed.

## Isolated Release Preparation

Release branch: `fix/one-piece-master-printing-prevention-20260919`, based on
merged main `3fc72b0e3df4b3e2290582846f9c7959c45ae78e`. Only the One Piece
implementation and its shared admission/phone contracts were copied from the
dirty cross-game worktree. No Japanese implementation or old master snapshot
is included. The included `20260919054500_one_piece_source_product_foil_scope_v1.sql`
records the previously applied migration, not a new apply request.

Fresh targeted tests on this branch: 197 pass with one opt-in local test skipped;
the opt-in local PostgreSQL suite was then run separately and passed. Receipts:
`one-piece-incremental-v2-release-local/` under the operator artifact root.
Full release hooks, GitHub checks and deployed read-only plan verification remain.

Current database checkpoint is V75, not V72 below: Prismatic's 352 provenance
repairs are completed. English provenance backlog is 1,459; One Piece still has
176 missing-parent printing families. This release does not resolve those held
families or certify pricing mappings. Do not replay earlier completed applies.

## Cause And Repair

The deployed-style incremental planner explicitly deferred child printing creation.
The new V2 wrapper preserves its parent identity rules but requires exact archived
product finish evidence and a supported registry key before admitting a parent.
It builds a hash-bound master manifest first, then writes parents, identities,
evidence, source mappings, exact children and printing reviews in one transaction.
Unresolved families stay held. It does not invent a finish, merge treatments or
change existing parents. Existing-set additions stay suppressed; new sets stay hidden.

The workflow now passes the reviewed payload fingerprint that apply already
required. Transport verifies certificates, rejects other database targets and
permits non-TLS only for explicitly isolated local rehearsal databases. A private
CA can be supplied through SUPABASE_DB_CA_CERT; no verification bypass is allowed.
Runtime CA availability still requires verification before rollout.

Frozen plan, parsed records, exact official HTML and artifact hashes are saved
before mutation. Files are exclusive-create. Lost commit responses preserve an
unknown outcome and require readback, never automatic retries or assumed rollback.
Exact readback includes sets and release controls as well as every inserted row.

## Verified

- 138 tests across admission, local PostgreSQL, workflow, supervisor,
  founder-outcome and transaction-state contracts.
- Local SQL: exact insertion/readback, rollback absence, injected review failure
  rolling back all parents/children, durable readback, collision prevention,
  zero-write repeat preparation and same-count wrong-value rejection.
- Local schema uses existing PostgreSQL column types plus explicit FK/unique
  constraints. It does not certify production triggers, RLS or deployment.
- Offline replay of 169 captured OP17 warehouse products prepares 169 parents,
  169 children and 169 reviews. Repeating with existing product IDs prepares zero
  writes. Removing finish evidence also prepares zero writes.
- Replay uses preserved structured official authority, not a fresh source fetch.

Receipts under
`C:/grookai_vault_operator_artifacts/retrospective_printing_audit_20260917/`:
`one-piece-incremental-v2-local/` and `one-piece-incremental-v2-offline/`.
The first rehearsal's SQL case passed but its older mock readback fixture failed
after set-level verification was added. The fixture was corrected; the subsequent
whole suite passed. Preserve both receipts and isolated databases.

## Remaining

The supervisor now selects a distinct V2 writer registry entry. Phone outcome
packages bind child and review counts; V1 parent-only producer/counts cannot be
accepted as V2. Historical V1 package semantics remain unchanged.

A local candidate performed a read-only production plan with verified TLS and
fresh official-source HTML. It inspected 186 warehouse products: 169 numbered
cards already present, ten DON and seven sealed products outside this writer.
It proposed zero writes. Receipt: `one-piece-incremental-v2-runtime-plan/` under
the operator root. This is not a deployed-runner receipt.

The pinned, previously verified Supabase CA certificate was added to GitHub as
SUPABASE_DB_CA_CERT; metadata readback confirmed it exists. Discovery, standalone
promotion and phone executor workflows now pass this optional trust input. Those
workflow changes remain local. No credential value was printed.

No production data, deployment, commit or push occurred for this implementation.
Queue V72 remains the latest production reconciliation. Existing 176 One Piece
parent gaps, exact pricing mappings and collector verification remain open.
Finish frozen release preparation, production-schema rollback rehearsal and
runtime TLS/entry-point verification before deploying this worker. Do not replay
the completed DON, archived32 or original printing repair applies.

The full English/Japanese/MTG repair goal is unchanged. This change prevents one
recurring ingestion defect; it does not certify the entire database.

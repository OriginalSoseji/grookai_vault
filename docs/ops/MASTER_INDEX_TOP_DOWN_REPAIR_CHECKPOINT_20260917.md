# Master Index Top-Down Repair Checkpoint

Date: 2026-09-17 UTC (September 16 evening, America/Denver)
Status: Local implementation and read-only reconciliation; not database-wide completion.

## Follow-Up: Release Checks And First Repair Package

The full local shipcheck passed: 3,514 contract tests passed, three skipped,
zero failed; web typecheck, lint and production build passed; Flutter analysis
and 728 Flutter tests passed. The later additive planner has 40/40 combined
authority/planner contract tests. The normal pre-commit hook must rerun the full
shipcheck before the code commit; no bypass is permitted.

The direct production Postgres route timed out. Management API read-only access
worked. Release checks use the existing loopback database on port 54330 and local
API on port 54321, not production credentials. The first broad test attempt only
failed because this worktree lacked web dependencies; lockfile installation
resolved that without source/lockfile changes.

Fresh schema inventory found 84 foreign keys targeting parents/printings, with
13 directly targeting printings, and 101 conventionally named logical reference
columns. Only the five explicitly listed tables received scoped row fingerprints;
this is not a claim that all JSON or application-level references were enumerated.
No child insert/update triggers were found. Review updates have a timestamp trigger.

McDonald's repair candidate V2:
`366f34d80eb484e390abe9a4137c3dbe66e90cfb30eaf8100fef8d4d749af8a3`

- 25 supported Holo inserts, 25 existing-row provenance-only updates, 50 new
  truth reviews and one raw evidence record are proposed, not applied.
- Zero proposed child UUID collisions. No existing reviews to override.
- Scoped Vault instances, binder slots and dispositions: zero; parent mappings:
  25, fingerprinted and preserved. This does not authorize ownership changes.
- A local PostgreSQL temporary-table simulation proved the exact 50-printing
  result, provenance-only preservation, successful rollback and rollback after
  a forced ID collision. All temporary objects were removed by rollback.
- That simulation does not prove raw-ingress execution or the full production
  transaction/public RPC. Those remain execution gates.
- Initial simulation compared JavaScript timestamps with PostgreSQL microseconds;
  the corrected receipt compares PostgreSQL JSON on both sides. Both receipts
  are preserved. No production writes occurred.

New receipts: `C:/grookai_vault_operator_artifacts/master_index_repair_release_20260917/`
Read `mcd21-repair-plan-v2.json`, `local-rollback-receipt-v2.json`,
`dependency-read-response.json`, `mcd21-state-read-response.json`, and
`shipcheck-local.log`. Candidate V1 is superseded because V2 retains the oldest
snapshot component timestamp and checks the fresh parent binding explicitly.

Remaining immediate work: finish code release through normal checks; implement
and freeze the bounded raw-ingress transaction, full rollback/readback/idempotency
proof and execution authority. The database repair remains unapplied.

## Request And Scope

The founder requested Master Index-level rules, a future-ingestion playbook and
top-down reconciliation of the entire catalog. Existing rules required printing
truth, but parent-only imports, weak child admission and incomplete monitoring
allowed discrepancies to accumulate. Do not address this with inferred finishes
or a blanket SQL backfill.

Worktree: `C:/grookai_vault_ingestion_printing_gate_20260917`
Branch: `fix/ingestion-printing-completeness-20260917`
Base main: `8bf503314431c0de89d362f15d2c0a48e62cb4b6`
Production: `ycdxbpibncqcchqiihfz`; organization `rksadomjkuoxvrbhsmxu`.

No production mutation, deployment, commit or push occurred during this step.
All prior local ingestion-gate changes remain preserved in this worktree.

## Implemented Locally

- `MASTER_INDEX_PRINTING_AUTHORITY_V1` extends existing contracts. Source bytes,
  hashes, exact game/language/identity policy and a projection-bound review are
  required. A source hash by itself is not proof of its claims.
- Offline reconciliation checks exact identities, missing second finishes,
  missing GV-IDs, collisions, unexpected children, provenance, reviews and public
  options. Stale/incomplete snapshots fail closed. No executable repair SQL is
  emitted; `write_ready` remains false.
- Existing child UUIDs are retained. Null GV-ID assignments are proposals only;
  different non-null IDs go to identity adjudication, never automatic renaming.
- The locked ME04 truth profile is checked by the new authority validator.
- Legacy collector ingestion requires source artifacts and reviewed authority
  before plan preparation. Identity-only ingestion remains explicitly incomplete.
- The scheduled publication reader now uses left-joined controls with Pokemon's
  real default-public rule and explicit set overrides. Structural coverage is a
  diagnostic, not proof that every expected finish exists.
- The operator playbook and agent entry point link to this checkpoint.

## Verification

187/187 tests passed across 13 targeted contract files, including language-index,
English-refresh, discovery, ME04 truth, public-option and printing-writer tests.
Changed JavaScript syntax checks, module imports and `git diff --check` passed.
The full repository shipcheck, merge and deployed workflow were not run here.

Read-only live SQL verified eight visibility cases and parity with the current
database visibility function for all 3,399 sets: zero mismatches. The corrected
reader selects 2,389 public sets, including 1,382 Pokemon sets.
Environment sanity: 170,658 parent cards, 3,399 sets, 32,903 traits.
No visibility control was changed.

## First Reviewed Scope: McDonald's 2021

Fresh preserved sources:
- https://bulbapedia.bulbagarden.net/wiki/McDonalds_Collection_2021_(TCG)
- https://www.pokebeach.com/2021/02/mcdonalds-25th-anniversary-set-will-actually-contain-50-cards-ahh

The checklist and contemporaneous report establish 25 numbered cards with both
non-Holo and Holo editions. This agrees with the historical 50-printing master
shard. Confetti Holo maps to the existing Holo finish, not Reverse Holo. Scope is
the English base release, not every possible regional/error variant.

Manifest: `43a3cb1d42323acbc4ef03d3ed331e4429f16ae08ae8e421d6f0ed72075c42a8`
Reconciliation: `adea32a1ce980a1196e90ee74e4a5950ed5b1bb92b5c328af2cf8990566f37ee`
Fresh read at `2026-09-17T05:09:55.635383Z`:
- 25 parents, 25 existing Normal children and 25 public options.
- 25 missing Holo proposals; all 25 existing printing UUIDs retained.
- 25 existing children need provenance recovery and 25 need truth review.
- No identity conflicts, destructive proposals or database writes.

The 75 findings are three classes across this scope, not 75 incorrect cards.
The source-adjudication record is not founder mutation approval. Existing Normal
rows are not to be recreated just to attach provenance.

## Catalog Worklist

The frozen retrospective inventory covers 3,399 sets and 170,658 parents.
After reviewing McDonald's, one scope has the new verified authority format;
1,937 populated scopes still need authority enrollment/adjudication. This does
NOT mean 1,937 sets are incorrect or have no historical evidence. The other
scopes are empty/discovery entries. 912 sets carry structural/provenance flags;
intentional deferred, provisional and hidden lanes must be distinguished from
incorrect public data.

## Remaining Work In Order

1. Complete repository release checks and merge the isolated safeguards. Verify
   the deployed read-only schedule includes Pokemon and produces actionable
   per-set findings; local SQL proof is not deployed automation.
2. Prepare the bounded McDonald's apply package: dependency inventory, retained
   row hashes, deterministic child IDs, provenance/review recovery, collision
   checks and rollback proof. Bind production authority before mutation. Then
   fresh transactional preflight, exact readback and zero-row idempotency.
3. Adjudicate missing base children for ME05, 30c-classic and the two HGSS trainer
   kits using current sources. Preserve the already-completed 161-card 30c Holo
   repair and ME04 protected/forbidden facts.
4. Resolve the remaining historical Master Index discrepancies with sources;
   old provider/price flags are not sufficient to create a finish.
5. Recover 60 missing printing GV-IDs while preserving UUIDs. Separately review
   the 25 existing parent/child prefix conflicts; do not blanket rename aliases.
6. Reconcile stamped/product identities, World Championship replicas, Japanese
   identity domains and other supported languages under explicit policies.
   One Piece's deferred child lane and MTG's full expected-finish parity require
   their own source-backed manifests, not Pokemon defaults.
7. Integrate every active writer's admission checks, enroll reviewed manifests
   in daily exact reconciliation, and verify alerts distinguish acquisition,
   authority, database and client failures. Direct SQL paths are not intercepted
   by the local shared-writer repair alone.
8. For each repaired batch, prove public options and Vault/client selection,
   pricing/mapping/ownership preservation and idempotency. Report unresolved
   scopes honestly. Only then declare top-down repair complete.

## Artifacts And Resume

Root: `C:/grookai_vault_operator_artifacts/master_index_top_down_20260917/`

- `verification.json`: live visibility parity and environment sanity.
- `read-plan.json`, `read-response.json`: frozen read-only SQL and raw response.
- `verification/results.json`: local syntax/import/test/diff receipts.
- `catalog_reconciliation_worklist.json`: initial uncovered-scope inventory.
- `mcd21/catalog_worklist_with_reviewed_scope.json`: updated one-scope inventory.
- `mcd21/source_receipts.json`, source HTML, `master.json`, `review.json`:
  actual preserved evidence, source hashes and scoped adjudication.
- `mcd21/manifest.json`, `artifact-map.json`, `snapshot.json`:
  exact inputs for the offline reconciler.
- `mcd21/snapshot-read-plan.json`, `snapshot-read-response.json`: fresh raw read.
- `mcd21/reconciliation/reconciliation.json`: all 75 findings and 25 proposals.

Never overwrite frozen outputs. Reread current production state for any future
apply; the snapshot's default 24-hour validity is not transactional authority.
No Vault, pricing, Storage, image, visibility or ownership changes were made.

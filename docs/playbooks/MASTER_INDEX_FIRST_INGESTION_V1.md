# Master Index First Ingestion V1

Date: 2026-09-17
Applies to new releases, historical repairs and incremental variant discovery.
Contract: `docs/contracts/MASTER_INDEX_PRINTING_AUTHORITY_V1.md`.

## Standard Procedure

1. Identify game/language/set and its existing canonical aliases. Check for
   folded subsets, reprints, special products and previously suppressed facts.
2. Preserve source snapshots and hashes. Build on prior evidence; source failure
   does not justify dropping an old fact or inventing a replacement.
3. Reconcile the Master Index first. Review exact parent identities, each finish,
   product treatments and exceptions. Unknown remains unknown.
4. Freeze expected identities/counts and reviewed source bindings. Create a
   projection-bound authority review only after evidence checks. For incomplete
   scopes emit a review queue, not a fabricated verified release.
5. Read a scoped production snapshot in a read-only transaction with environment
   sanity, exact parent/child/public-option coverage and global identity collision
   inventory. Record time and hash; do not use a months-old snapshot for apply.
6. Run the offline reconciler below. Inspect every discrepancy, including extra
   children and absent second finishes. Do not route conflicts into inserts.
7. Freeze separate bounded mutation packages for additive admission, missing-ID
   assignment and identity conflict resolution. Inventory dependencies; prove
   UUID, Vault, transaction, pricing, mapping and image preservation.
8. Execute only under the existing production apply contract. Fresh in-transaction
   preflight, rollback proof, exact readback and idempotency are mandatory.
9. Verify public options and Vault selection. Mark collector-ready only after
   those checks, not after a successful import job or image download.
10. Enroll the exact released manifest in recurring reconciliation. Source,
    authority, execution and readback failures remain separate operational states.

## Offline Command

```powershell
node scripts/ingest/master_index_printing_reconcile_v1.mjs --manifest=C:/evidence/authority.json --snapshot=C:/evidence/db-snapshot.json --artifact-map=C:/evidence/artifacts.json --as-of=2026-09-17T05:00:00Z --out-dir=C:/evidence/reconciliation-new
```

`artifacts.json` is an array of `{ref,path}`. Paths resolve relative to that map.
The command checks actual bytes against authority hashes, writes a fresh immutable
artifact directory and performs no network calls. Exit 0 means printing parity,
2 means discrepancies, 1 means invalid evidence/input. None grants write authority.

The legacy new-set collector route now additionally requires
`--printing-artifact-map <file>` and `assertMasterPrintingAuthority` before plan
preparation. `--identity-only` cannot claim collector-ready completion. It is not
a back door to printing writes or public promotion.

## Repair Priority

1. Monitoring selection and source/authority coverage.
2. Missing base printings: Pitch Black, Classic Collection and trainer kits.
3. Missing secondary finishes: start with McDonald's 2021; preserve all 33
   historical master discrepancies for current source adjudication.
4. Missing printing GV-IDs; separately adjudicate parent/child prefix conflicts.
5. Stamped/product identities, World Championship replicas and Japanese lanes.
6. One Piece finish admission under its own contract; MTG full source parity.

The order does not permit skipping proof or overriding unresolved source claims.
Do not repeat the completed 161-card 30c Holo repair or regress locked ME04 facts.

## Recurring Failure Handling

- Source unavailable: preserve last evidence, notify, retry acquisition only.
- Missing/changed authority: halt promotion for that scope, retain candidate.
- Dependency/collision drift: stop before mutation; regenerate the bounded plan.
- Public/Vault mismatch: keep scope incomplete; investigate the exact boundary.
- Failed or ambiguous apply: preserve logs, read back, do not blindly rerun.

Daily automation may discover, preserve and prepare evidence without micro-approval.
Production mutation still follows the governing scoped authority; no broad
"fix all" SQL, bulk deletion, inferred Normal or automatic GVID renaming.

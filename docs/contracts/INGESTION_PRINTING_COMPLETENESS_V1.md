# Ingestion Printing Completeness V1

Date: 2026-09-17
Status: Implemented candidate; not a production deployment receipt.

## Reason

The legacy new-set runner could report `complete` after parent identity, mapping,
and image work without creating any purchasable/ownable child printings. A single
finish is still an exact printing. UI fallback is not a database repair.

## Required Lifecycle

1. Preserve source receipts and reconcile to the language-specific Master Index.
2. Freeze the supported per-parent finishes and exact printing GV-IDs in a
   fingerprinted `PRINTING_COMPLETENESS_GATE_V1` manifest.
3. Prepare a collision-checked child-printing delta. Reuse existing exact IDs.
4. Use the governing bounded writer, pre-commit truth assertion and rollback
   procedure. This contract or a prepared plan does not grant mutation authority.
5. Verify exact parents, child identities, verified reviews and public options.
6. Prove Vault add and client selection before declaring collector readiness.

The legacy runner does not acquire a new child-printing writer through this
change. Its `--identity-only` mode explicitly reports printings pending. Its
normal mode requires a printing manifest and cannot report generic completion.
Collector-scope `--apply` stops before acquisition/writes if exact children are
not already admitted by the bounded writer. New sets use explicit identity-only
intake and bounded printing admission; this runner can refresh admitted sets.
Preparation and post-apply readback are not atomic parent/child admission.

## Manifest

Required scope fields: `version`, `game`, `language`, `set_code`, `scope`,
`identity_policy_version`, `master_index_ref`, `master_index_sha256`.

Required lists: `parents`, `printings`, `unresolved_variants`,
`suppressed_printing_facts`. Required exact counts: `expected.parents`,
`expected.printings`, `expected.finishes`. The fingerprint hashes the complete
manifest body with recursively sorted object keys; array order is preserved.

Every parent retains its ID, GV-ID, printed coordinate and name. Every printing
binds parent ID, finish key, printing GV-ID, verified review and source evidence.
Each evidence entry contains its kind, reference, SHA-256, parent ID and finish.
Permitted evidence kinds are checked checklist, official printing,
image-confirmed printing and exact printing mapping. Price buckets do not prove
a finish. The reviewed game-specific identity adapter supplies expected GV-IDs;
the generic planner does not guess them.

Unknown finishes must not become Normal. A Holo-only base scope has one Holo
child per parent, not fabricated Normal or Reverse Holo children. Additional
product variants remain explicit review leads. `base_release` may preserve
outside-base leads; `complete_set` may not contain unresolved variants.

The existing printing-truth contract's protected facts, suppression checks,
source authority, approval and pre-commit checks still apply. This manifest is
an additional readiness gate, not a replacement for that mutation contract.

## Enforcement

- The shared three-finish writer requires an exact parent and printing GV-ID,
  finish-bound reviewed evidence with a source hash, matching provenance, and
  live canonical-parent readback before writing. Price buckets, provider variant
  flags and provisional evidence cannot enter through this writer.
- The new-set runner checks its manifest before acquisition or write-capable
  work. Applying collector scope requires tests and readbacks.
- The public readback must return every exact child once with the expected
  finish/GV-ID. Parent count or image count alone cannot pass.
- The six-hour shadow publication audit includes read-only printing coverage.
  Missing coverage is not zero gaps. Failures use the existing GitHub issue.
- Audit failure does not hide live cards or mutate their data. The audit is not
  a database constraint and cannot intercept arbitrary SQL writers.
- Legacy rows with provenance and no adverse active review are accepted only
  by the minimum coverage diagnostic, not the exact verified-manifest readback.
- Missing price does not invalidate an otherwise proven printing.

No new founder/Pulse notification route or automatic canonical apply is added.
Frozen historical repair scripts are preserved; callers missing the new shared
writer requirements fail closed rather than silently inventing identity.

## Offline Preparation

```powershell
node scripts/ingest/printing_admission_plan_v1.mjs --manifest=C:/evidence/manifest.json --existing=C:/evidence/children.json --readback=C:/evidence/readback.json --out-dir=C:/evidence/new-plan
```

The output directory must be new. `existing` and `readback` are optional input
snapshots. No credentials, network or database writes are used. Existing rows
with conflicting GV-IDs block the plan; new IDs are deterministic proposals.
Fresh production collision checks are still required before a bounded apply.

Deployment status and evidence: `docs/ops/INGESTION_PRINTING_GATE_CHECKPOINT_20260917.md`.

# Sealed Ownership Schema Applied

Date: 2026-09-07 America/Denver. Applied: 2026-09-08 03:56 UTC.
Status: APPROVED SCHEMA BATCH APPLIED AND INDEPENDENTLY VERIFIED.
Ownership remains disabled. Clients were NOT deployed or activated by this gate.

## Authority

The founder approved the replacement four-migration schema-only plan in chat.
Execution source: `d5f308dac7ced5d706103cfb708ebe5a29686e39`.
Branch: `feature/sealed-owned-collectibles-v1`; source was clean at execution.
Production project: `ycdxbpibncqcchqiihfz`.
Plan fingerprint: `76e430e8fd4e1dc7e2131245dd51c473b430dd2eea46b1845fb7894f08e94809`.
Plan file SHA-256: `0cfc93dedc0c4062eeb2a17bed74525f7b92063ce024601a1ebb7652c1eda613`.

| Migration | Exact SQL SHA-256 |
| --- | --- |
| `20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql` | `d98f08ba73afcac510b1ae052ac35b0747c34816018900c6dba006f497f3f30e` |
| `20260907160000_production_function_source_replay_reconciliation_v1.sql` | `ebaf5677fd4a20357dcb67340aaa50f0f1f0aa361d60cc386f10d819cd636755` |
| `20260907180000_sealed_owned_instances_v1.sql` | `d0f5974830f7e45e9a6180586b12eba5f1983557579471a39b801945c5c87581` |
| `20260907183000_sealed_owned_read_models_v1.sql` | `43ebdcc3d1eb2d964315cf00da32c46b51b031f00df97d61c3bd3664c18ca555` |

## Execution And Readback

- Fresh sanity: 170,404 cards, 3,397 sets, 32,903 traits.
- Repeated two-ID baseline replay/audit from prerequisite `b939f4bfe`: 873
  security objects match under the existing scoped rule. No widened exception.
- Then four-ID PrePush/full replay passed in 36.526 seconds and 33 local
  rollback scenarios passed. Only the isolated database on port 55430 was reset.
- Fresh diagnostic retained approved hash `c129bcedaf328af211101cbda35b2077c7fc74d7717b2ab421487439c3475077`.
- Rehearsed the atomic executor locally and rolled it back.
- Applied only four frozen migration bodies and four ledger insertions in one
  transaction, reusing the existing migration wrapper/parser. Lock timeout 5s,
  statement timeout 30s, idle transaction timeout 60s. No retries or forced sessions.
- Inside-transaction readback matched replay before commit. A separate connection
  verified exact ledger names/statements and target schema afterward.
- A second full comparison found EMPTY reconciled public schema diff, all 888
  security objects identical, zero Storage policy differences, and 391/391 ledger
  parity. Known physical column order was normalized only in inspection metadata.
- Target snapshot hash: `c9843f111b243cf78fab8c6b8ec8c30913e5451ec95ef9a555ed85b5d63fb398`.

## Protected State

Before, inside-transaction after, and independent post-commit fingerprints match:
3,401 owned copies, three disposition records, three sealed price pointers, two
sealed image pointers, three sealed game controls and four catalog game controls.
Existing-column fingerprints exclude only the new nullable columns. No existing
row values changed.

Only the approved default-off singleton was initialized. Ownership is false;
zero sealed copies and zero request journal rows exist. Exact service grants:
controls SELECT/UPDATE, journal SELECT/INSERT, evidence view SELECT. No inventory,
catalog, pricing, release pointer, Storage upload/delete, visibility, device,
deployment or TestFlight changes occurred.

## Evidence And Resume

Root: `C:/grookai_vault_operator_artifacts/sealed_ownership/`.

- `20260908_approved_baseline_audit/`: fresh strict baseline proof.
- `2026-09-08T03-54-41-701Z_replay/`: strict four-ID replay and rollback tests.
- `20260907_least_privilege_rollout_plan/2026-09-08T03-55-40-419Z_footprint/`: fresh approved footprint.
- Same plan directory, `2026-09-08T03-55-29-208Z--local-rollback/`: local rehearsal.
- `2026-09-08T03-56-03-416Z--apply/`: committed transaction and protected fingerprints.
- `2026-09-08T03-56-18-253Z--readback/`: separate-connection readback.
- `2026-09-08T03-56-21-900Z_footprint/`: full post-apply schema/security/Storage parity.

The preserved executor `approved_schema_apply.mjs` has a production start marker
preventing repeat apply. Do not remove it or reuse this authority for activation.
Frozen `run_plan.json` remains unchanged. Generated diagnostic SQL was never executed.
The detached `C:/grookai_vault_sealed_apply_baseline` worktree preserves prerequisite
proof; its local config and node_modules junction must not be deployed, committed
or recursively deleted. Original populated local Supabase remains untouched.

Next: reconcile the committed source into the release branch, deploy clients with
ownership flags off, then a bounded authorized owner lifecycle canary and native
share/print/iOS acceptance before enablement. Do not reapply these migrations.
Older worktrees/main lacking them must reconcile before later schema operations.
Known client scope differences remain in the local acceptance checkpoint.

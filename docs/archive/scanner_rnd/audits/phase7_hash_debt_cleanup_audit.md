# Phase 7 Hash Debt Cleanup Audit

## 1. Executive Summary

Safe:

- The Phase 7 contracts, checkpoints, and audits should be preserved as project memory.
- The canonical exact-image dHash work is useful as research evidence, but it should not be trusted as a production scanner fast path.
- JustTCG remains a support system only; it does not provide image recognition, perceptual hashes, or scanner similarity matching.

Unsafe:

- The scanner screen currently calls `fingerprint_lookup_v1` before upload and can return a match without running upload, AI, or resolver.
- The local lookup function currently checks `scanner_fingerprint_index` first, before `card_fingerprint_index`.
- `scanner_fingerprint_index` contains synthetic scanner rows even though calibration showed wrong cards closer than true cards.
- The synthetic bootstrap worker is runnable from `package.json`.

Must be cleaned before the next scanner architecture:

- Remove or disable the scanner fast path in `lib/screens/scanner/native_scanner_phase0_screen.dart`.
- Revert or disable the scanner-lane lookup path in `supabase/functions/fingerprint_lookup_v1/index.ts`.
- Remove the package script that can run the synthetic bootstrap worker.
- Quarantine or remove Phase 7 hash workers and migrations before they drift into production use.
- Clean or quarantine live Phase 7 fingerprint rows after runtime callers are disabled.

## 2. File Classification Table

| file | classification | reason | later action |
|---|---|---|---|
| `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql` | QUARANTINE | Adds `card_fingerprint_index` anchored to `card_print_id` with exact/alt/representative lanes. The canonical dHash lane is not production-viable for camera photos, but the schema may remain useful as research evidence. | Do not apply in a production cleanup path unless a new architecture explicitly keeps canonical exact-image hashes. If already applied, leave inactive or drop with a planned cleanup migration after callers are disabled. |
| `supabase/migrations/20260427110000_scanner_fingerprint_index_v1.sql` | REMOVE | Adds `scanner_fingerprint_index` for synthetic/real_scan rows. The known decision says the synthetic scanner lane must not remain active in lookup or scanner-critical flow. | Remove the migration if unapplied. If applied, create an explicit cleanup migration/drop plan after disabling runtime callers. |
| `backend/fingerprint/fingerprint_hash_v1.mjs` | QUARANTINE | Implements shared dHash normalization and hash generation. It is useful for reproducing the failed experiment, but should not be part of the next production scanner path by default. | Move behind research-only ownership or delete with the rest of the Phase 7 hash lane if no successor architecture uses it. |
| `backend/fingerprint/fingerprint_index_worker_v1.mjs` | QUARANTINE | Builds canonical `card_fingerprint_index` rows from `card_prints.image_url` / `image_alt_url`. Calibration proved canonical hashes do not match real camera photos reliably. | Keep only as research until a successor architecture decides whether canonical exact-image fingerprints have any offline use. |
| `backend/fingerprint/scanner_fingerprint_bootstrap_worker_v1.mjs` | REMOVE | Runnable synthetic scanner fingerprint generator. Current version uses `scanner_synthetic_v2`, but synthetic dHash calibration still failed the safety requirement. | Delete or move to a research quarantine folder; remove all runnable entry points. |
| `supabase/functions/fingerprint_lookup_v1/index.ts` | REVERT | Local function checks `scanner_fingerprint_index` first and can return high-confidence scanner candidates before canonical fallback. This is experimental scanner-lane behavior in the lookup path. | Remove scanner-lane query/short-circuit, or remove/decommission the whole function if scanner no longer uses dHash lookup. Redeploy only after verification. |
| `supabase/functions/fingerprint_lookup_v1/config.toml` | REVERT | Function config has `verify_jwt = false`; the function implements its own bearer validation, but this should not survive if the function is removed or reverted. | Revert with the function cleanup or restore a standard verified deployment config if a lookup function is retained. |
| `lib/screens/scanner/native_scanner_phase0_screen.dart` | REVERT | Tracked diff adds Supabase import, `_tryFingerprintIndexFastPath`, and a pre-upload call that can bypass upload/AI/resolver. | Revert the Phase 7 fast-path additions while preserving existing scanner capture, recent-cache, upload, AI, resolver, and result flow. |
| `package.json` | REVERT | Adds `scanner-fingerprint:bootstrap`, making the synthetic worker easy to run. | Remove only this script entry during cleanup. |
| `docs/contracts/phase7_fingerprint_index_contract_v1.md` | KEEP_AS_RESEARCH | Strict contract records the intended Phase 7A guardrails and failure behavior. | Preserve as historical contract/evidence. |
| `docs/contracts/phase7b_scanner_fingerprint_lane_contract_v1.md` | KEEP_AS_RESEARCH | Records the no-latency scanner-lane contract and the no blind threshold rule. | Preserve as historical contract/evidence. |
| `docs/checkpoints/fingerprint_index_v1.md` | KEEP_AS_RESEARCH | Checkpoint explains why the Phase 7A system was separated from ingestion and how failure should fall back. | Preserve as project memory. |
| `docs/audits/phase7_fingerprint_index_l2_audit.md` | KEEP_AS_RESEARCH | L2 audit evidence for schema, ingestion, scanner, and worker ownership. | Preserve as project memory. |
| `docs/audits/phase7_contract_enforcement_audit.md` | KEEP_AS_RESEARCH | Contract-to-code enforcement audit that caught lookup completeness issues. | Preserve as project memory. |
| `docs/audits/phase7_fingerprint_match_failure_root_cause.md` | KEEP_AS_RESEARCH | Proves canonical-image hash matches itself but fails real warped camera photos. | Preserve as the primary root-cause record. |
| `docs/audits/phase7b_synthetic_lane_calibration_audit.md` | KEEP_AS_RESEARCH | Proves wrong synthetic candidates were closer than true cards and threshold increase is unsafe. | Preserve as the safety blocker record. |
| `docs/audits/justtcg_capability_audit.md` | KEEP_AS_RESEARCH | Establishes JustTCG as a support system, not an image recognition system. | Preserve for scanner architecture planning. |
| `.tmp/fingerprint_test/run_local_tests.mjs` | REMOVE | Local generated diagnostic runner for the failed dHash lane. | Remove after results are captured in docs. |
| `.tmp/fingerprint_test/*.canonical_download` and `.tmp/fingerprint_test/*.downloaded_image` | REMOVE | Generated diagnostic downloads. | Delete as temp artifacts after audit preservation. |
| `.tmp/testimages4.26_extracted_20260426_214833/` | KEEP_AS_RESEARCH | Physical image test set that exposed the dHash failure. | Preserve or archive deliberately; do not treat as app/runtime artifact. |
| `docs/audits/phase7_hash_debt_cleanup_audit.md` | KEEP_AS_RESEARCH | This cleanup audit records what must be kept, reverted, removed, or quarantined. | Preserve as the cleanup source of truth. |

## 3. Active Runtime Risk

Experimental dHash can currently affect scanner behavior.

Evidence:

- Scanner UI calls `_tryFingerprintIndexFastPath` after local fingerprint generation and before `_startIdentityHandoff`: `lib/screens/scanner/native_scanner_phase0_screen.dart:286`.
- `_tryFingerprintIndexFastPath` invokes Supabase function `fingerprint_lookup_v1`: `lib/screens/scanner/native_scanner_phase0_screen.dart:415-416`.
- On `confidence == high`, `ambiguous == false`, and non-empty candidates, the scanner sets match state and returns `true`, skipping upload/AI/resolver: `lib/screens/scanner/native_scanner_phase0_screen.dart:428-449`.
- The lookup function queries `scanner_fingerprint_index` first: `supabase/functions/fingerprint_lookup_v1/index.ts:170-178`.
- The lookup falls back to `card_fingerprint_index` afterward: `supabase/functions/fingerprint_lookup_v1/index.ts:286-295`.
- `scanner_fingerprint_index` exists in migration: `supabase/migrations/20260427110000_scanner_fingerprint_index_v1.sql:1`.
- The synthetic worker is runnable from `package.json:21`.

Specific checks:

| check | answer |
|---|---|
| scanner UI currently calls `fingerprint_lookup_v1` | yes |
| lookup currently checks `scanner_fingerprint_index` first | yes |
| lookup still checks `card_fingerprint_index` | yes |
| `scanner_fingerprint_index` exists in migrations | yes |
| synthetic worker is runnable from `package.json` | yes |
| any hash fast-path can bypass AI/resolver | yes |
| local function has experimental scanner-lane behavior | yes |
| deployed function has experimental scanner-lane behavior | treat as active until redeployed/verified clean; prior work targeted the live project and no cleanup deploy has occurred in this audit |
| migration/table creates schema debt if kept | yes, especially `scanner_fingerprint_index` |
| rows need cleanup later | yes, after runtime callers are disabled |

## 4. Schema/Data Debt

Read-only database evidence from the current configured Supabase DB:

| table | rows | details | cleanup classification |
|---|---:|---|---|
| `card_fingerprint_index` | 613 | All 613 rows are ME rows with `source_type = exact`. | QUARANTINE |
| `scanner_fingerprint_index` | 5315 | All 5315 rows are ME synthetic rows. | REMOVE |
| `scanner_fingerprint_index` / `scanner_synthetic_v1` | 2443 | Synthetic rows from the first bootstrap pass. | REMOVE |
| `scanner_fingerprint_index` / `scanner_synthetic_v2` | 2872 | Synthetic rows from the camera-domain bootstrap patch. | REMOVE |
| scanner representative contamination | 0 | No representative contamination was found. | KEEP as evidence only |

Schema debt:

- `card_fingerprint_index` is isolated and anchored to `card_print_id`, but it is not proven useful for real scanner recognition.
- `scanner_fingerprint_index` is higher-risk because the active lookup function checks it first.
- If either table is already applied remotely, cleanup should be a planned migration or rollback, not manual table deletion.
- Data cleanup must happen only after scanner UI and deployed lookup callers no longer depend on these tables.

## 5. Code Debt

- `lib/screens/scanner/native_scanner_phase0_screen.dart`: remove Phase 7 fast-path code and Supabase function call so scanner always uses the established upload -> AI -> resolver path unless a future architecture is approved.
- `supabase/functions/fingerprint_lookup_v1/index.ts`: remove scanner-lane lookup and any ability to return synthetic dHash matches. If the whole function is unused after scanner cleanup, decommission it.
- `backend/fingerprint/scanner_fingerprint_bootstrap_worker_v1.mjs`: remove or quarantine because it generates failed synthetic dHash rows.
- `backend/fingerprint/fingerprint_index_worker_v1.mjs`: quarantine because it generates canonical dHash rows that do not solve camera recognition.
- `backend/fingerprint/fingerprint_hash_v1.mjs`: quarantine with the workers unless a new architecture explicitly reuses its normalization for diagnostics.
- `package.json`: remove `scanner-fingerprint:bootstrap`.
- `.tmp/fingerprint_test/run_local_tests.mjs`: delete after this audit and calibration evidence are preserved.

## 6. Documentation To Preserve

Preserve these as project memory:

- `docs/contracts/phase7_fingerprint_index_contract_v1.md`
- `docs/contracts/phase7b_scanner_fingerprint_lane_contract_v1.md`
- `docs/checkpoints/fingerprint_index_v1.md`
- `docs/audits/phase7_fingerprint_index_l2_audit.md`
- `docs/audits/phase7_contract_enforcement_audit.md`
- `docs/audits/phase7_fingerprint_match_failure_root_cause.md`
- `docs/audits/phase7b_synthetic_lane_calibration_audit.md`
- `docs/audits/justtcg_capability_audit.md`
- `docs/audits/phase7_hash_debt_cleanup_audit.md`

Do not preserve these docs as active architecture. Preserve them as evidence that dHash-only fast-path recognition is not safe for production real-camera scans.

## 7. Recommended Cleanup Plan

1. Snapshot current branch and evidence.
   - Keep the audit docs and calibration notes.
   - Confirm no pending non-Phase-7 scanner work is mixed into the same files.

2. Disable runtime risk first.
   - Revert the Phase 7 fast-path additions in `lib/screens/scanner/native_scanner_phase0_screen.dart`.
   - Verify scanner capture still flows through upload -> AI -> resolver.

3. Disable function risk.
   - Revert scanner-lane lookup in `supabase/functions/fingerprint_lookup_v1/index.ts`, or remove/decommission the function if no caller remains.
   - Redeploy only a verified cleanup function if a deployed function currently exists.

4. Remove runnable synthetic generation.
   - Remove `scanner-fingerprint:bootstrap` from `package.json`.
   - Remove or quarantine `backend/fingerprint/scanner_fingerprint_bootstrap_worker_v1.mjs`.

5. Quarantine or remove Phase 7 hash code.
   - Quarantine `fingerprint_hash_v1.mjs` and `fingerprint_index_worker_v1.mjs`, or delete them if the next architecture does not use them.
   - Remove temp test runners and generated downloads.

6. Clean schema/data only after callers are disabled.
   - If migrations were never applied to a production baseline, remove the migration files.
   - If tables exist remotely, create a planned cleanup migration or rollback to drop/quarantine `scanner_fingerprint_index` first.
   - Delete or quarantine `scanner_fingerprint_index` synthetic rows.
   - Decide separately whether to keep or drop `card_fingerprint_index` after the next architecture is defined.

7. Preserve docs.
   - Keep contracts/audits/checkpoints listed above.
   - Add a short pointer from the next scanner architecture doc back to this audit.

## 8. Stop Conditions

- Do not remove `RecentScanCache` or `PerceptualImageHash` from the app unless a separate audit proves they are only Phase 7 remote-index code. They may be part of local scanner cache behavior outside the failed remote dHash index.
- Do not remove backend condition fingerprint files under `backend/condition/`; those are a separate condition subsystem, not this scanner-recognition hash lane.
- Do not drop `card_fingerprint_index` or `scanner_fingerprint_index` while any deployed function or app build can still query them.
- Do not remove identity scanner upload, AI border, AI identity, resolver, or scan event result code.
- Do not delete JustTCG pricing/mapping tables or workers; JustTCG is a support system for text/ID/pricing, not part of the failed dHash scanner lane.
- Do not increase thresholds as a cleanup shortcut. Calibration showed wrong cards closer than true cards.
- Do not treat any representative image or synthetic fingerprint as identity truth.

## 9. Final Verdict

CLEANUP REQUIRED BEFORE NEXT PHASE

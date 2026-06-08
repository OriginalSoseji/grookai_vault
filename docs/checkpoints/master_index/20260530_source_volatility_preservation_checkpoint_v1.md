# Source Volatility Preservation Checkpoint V1

Date: 2026-05-30

Audit mode: read-only reports and fixtures only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

## Purpose

This checkpoint records the guarded Master Index promotion after source-volatility handling was tightened.

The key invariant is:

```text
Retrying a volatile or reset-style source must not delete previously accepted evidence from the promoted Master Index.
```

## Changes

- Added URL-decoding to shared card-number normalization so encoded source numbers like `%3F` canonicalize with `?`.
- Fixed the source batch runner's default source ID normalization.
- Added exact source-key preservation for `pkmncards_identity_gap`.
- Added a Windows `curl.exe --ssl-no-revoke` fallback to the official legacy checklist PDF acquisition lane.
- Reacquired official legacy checklist evidence after the Node fetch path failed.
- Promoted the final Master Index only through guarded staging after the evidence-row regression was eliminated.

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T03-34-16-714Z-number-decode-normalization-official-preserved-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-05-30T03-34-16-714Z-number-decode-normalization-official-preserved-v1 --min-master-verified-printings 38378 --min-master-verified-cards 21521 --min-evidence-rows 232119 --max-candidate-printings 32 --max-conflicts 0 --allow-canonical-dedupe --promote
```

Result:

```json
{
  "passed": true,
  "master_verified_cards": 21521,
  "master_verified_printings": 38378,
  "evidence_rows": 232120,
  "candidate_printings": 32,
  "conflicts": 0
}
```

## Current Completion State

```json
{
  "complete_master_index_sets": 102,
  "incomplete_sets": 101,
  "master_admissible_card_identity_facts": 21532,
  "master_admissible_printing_facts": 38378,
  "candidate_card_identity_facts": 6,
  "candidate_printings": 32,
  "human_source_verified_printings": 428,
  "finish_absence_facts": 22,
  "write_ready_now": 0
}
```

## Source Attempts

The conservative batch and reset-style source retries were audit-only.

Key outcomes:

- Default merge/preservation source batch found no useful unabsorbed gap-closing evidence.
- PriceCharting CSV found near-match context but no exact finish-validating rows.
- Official modern checklist PDFs produced rows already present in the promoted index.
- Official legacy checklist fetch initially failed; after curl fallback it generated 20 official rows.
- PkmnCards identity retry failed, so `pkmncards_identity_gap` preservation now protects prior accepted identity evidence from reset-source volatility.

## Safety Confirmation

```json
{
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false,
  "write_ready_now": 0
}
```

## Verification

Passed:

```powershell
node --check scripts\audits\english_master_index_source_batch_acquisition_v1.mjs
node --check scripts\audits\english_master_index_preserve_source_from_index_v1.mjs
node --check scripts\audits\english_master_index_official_legacy_checklist_acquisition_v1.mjs
node --check scripts\audits\verified_master_set_index_v1\shared.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
npm run preflight
git status --short -- supabase\migrations
```

Notes:

- `git diff --check` emitted line-ending warnings for generated publishable files only and exited successfully.
- `npm run preflight` returned `PASS_WITH_DEFERRED_DEBT` with `critical_fail_checks: 0`.
- Supabase migrations were unchanged.

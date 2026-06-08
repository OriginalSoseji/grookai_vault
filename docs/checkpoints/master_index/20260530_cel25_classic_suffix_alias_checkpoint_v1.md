# Celebrations Classic Collection Suffix Alias Checkpoint V1

Date: 2026-05-30

Audit mode: read-only reports and fixtures only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

## Purpose

This checkpoint records the guarded promotion that normalized TCGdex/Eyevo-style Celebrations Classic Collection suffix numbers.

The rule is:

```text
cel25 card numbers matching /^(\d+)A\d*$/ are Classic Collection aliases and canonicalize to cel25c with the numeric card number.
```

Examples:

```text
cel25 9A   -> cel25c 9
cel25 15A3 -> cel25c 15
cel25 24A  -> cel25c 24
cel25 86A  -> cel25c 86
```

## Changes

- Added narrow known-source alias normalization for `cel25` Classic Collection suffix numbers in the Master Index builder.
- Added the same canonicalization to guarded rebuild canonical metrics, behind `--allow-canonical-dedupe`.
- Rejected the first staging where only TCGdex rows moved and Eyevo rows were stranded as human-only facts.
- Promoted only after all source rows using the suffix convention moved together.

## Guarded Promotion

Rejected staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T08-30-00-000Z-tcgdex-cel25-classic-suffix-alias-v1
```

Reason rejected:

```text
Only TCGdex suffix rows moved. Eyevo suffix rows remained under cel25, producing 21 human_source_verified rows and a raw master-card regression without canonical guard support.
```

Accepted staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T09-00-00-000Z-cel25-classic-suffix-alias-all-sources-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-05-30T09-00-00-000Z-cel25-classic-suffix-alias-all-sources-v1 --min-master-verified-printings 38378 --min-master-verified-cards 21524 --min-evidence-rows 232127 --max-candidate-printings 32 --max-conflicts 0 --allow-canonical-dedupe --promote
```

Result:

```json
{
  "passed": true,
  "master_verified_cards": 21503,
  "canonical_master_verified_cards": 21503,
  "master_verified_printings": 38378,
  "canonical_master_verified_printings": 38378,
  "evidence_rows": 232127,
  "candidate_printings": 32,
  "conflicts": 0,
  "canonical_dedupe_notes": [
    "raw master_verified_cards decreased, but canonical master_verified_cards did not decrease"
  ]
}
```

## Before And After

```json
{
  "raw_master_verified_cards": {
    "before": 21524,
    "after": 21503
  },
  "canonical_master_verified_cards": {
    "before": 21503,
    "after": 21503
  },
  "master_verified_printings": {
    "before": 38378,
    "after": 38378
  },
  "evidence_rows": {
    "before": 232127,
    "after": 232127
  },
  "card_identity_second_source_needed": {
    "before": 5,
    "after": 1
  }
}
```

## Current Completion State

```json
{
  "complete_master_index_sets": 102,
  "incomplete_sets": 101,
  "master_admissible_card_identity_facts": 21513,
  "master_admissible_printing_facts": 38378,
  "candidate_card_identity_facts": 1,
  "candidate_printings": 32,
  "human_source_verified_printings": 428,
  "write_ready_now": 0
}
```

## Remaining Gaps

```json
{
  "total_gap_facts": 2070,
  "by_gap_type": {
    "card_identity_second_source_needed": 1,
    "finish_human_checklist_evidence_needed": 32,
    "finish_second_source_needed": 428,
    "suppressed_structured_claim_reviewed": 1609
  },
  "remaining_card_identity_gap": {
    "set_key": "exu",
    "set_name": "Unseen Forces Unown Collection",
    "card_number": "%3F",
    "card_name": "Unown",
    "sources": ["tcgdex"]
  }
}
```

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
node --check scripts\audits\verified_master_set_index_v1_build_english_master_index.mjs
node --check scripts\audits\english_master_index_guarded_rebuild_v1.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
npm run preflight
git status --short -- supabase\migrations
```

Notes:

- `git diff --check` emitted line-ending warnings for generated publishable files only and exited successfully.
- `npm run preflight` returned `PASS_WITH_DEFERRED_DEBT` with `critical_fail_checks: 0`.
- Supabase migrations were unchanged.

# PkmnCards LV.X E4 Alias Preservation Checkpoint V1

Date: 2026-05-30

Audit mode: read-only reports and fixtures only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

## Purpose

This checkpoint records a guarded Master Index promotion after tightening PkmnCards identity-gap handling for Rising Rivals LV.X names.

The accepted improvement closes two card identity gaps:

```text
pl2 | Rising Rivals | #106 | Gallade 4 LV. X
pl2 | Rising Rivals | #108 | Infernape 4 LV. X
```

PkmnCards evidence:

```text
https://pkmncards.com/card/gallade-e4-lv-x-rising-rivals-rr-106/
https://pkmncards.com/card/infernape-e4-lv-x-rising-rivals-rr-108/
```

## Changes

- Added a PkmnCards source-acquisition-only alias so `E4 LV.X` can validate existing `4 LV. X` gap facts when set and card number also match.
- Kept the alias local to the PkmnCards identity-gap acquisition lane; it was not promoted as a global identity law.
- Detected and blocked an initial staged rebuild where the reset-style PkmnCards fixture would have dropped prior PL2 #95 evidence.
- Refreshed `pkmncards_identity_gap` preservation from the last promoted Master Index before promoting.
- Promoted only through guarded staging after preservation proved non-regression.

## Guarded Promotion

Rejected staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T07-20-00-000Z-pkmncards-lvx-e4-alias-pl2-106-108-v1
```

Reason rejected:

```text
The reset PkmnCards fixture added #106 and #108 but dropped prior #95 pkmncards_identity_gap evidence, producing only a +1 net master-card gain and a candidate-card regression.
```

Accepted staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T07-45-00-000Z-pkmncards-lvx-e4-alias-preserved-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-05-30T07-45-00-000Z-pkmncards-lvx-e4-alias-preserved-v1 --min-master-verified-printings 38378 --min-master-verified-cards 21522 --min-evidence-rows 232125 --max-candidate-printings 32 --max-conflicts 0 --promote
```

Result:

```json
{
  "passed": true,
  "master_verified_cards": 21524,
  "master_verified_printings": 38378,
  "evidence_rows": 232127,
  "candidate_printings": 32,
  "conflicts": 0
}
```

## Preservation Proof

The accepted staging retained all three relevant PkmnCards identity-gap facts:

```json
[
  {
    "set_key": "pl2",
    "card_number": "95",
    "card_name": "Team Galactic's Invention G-107 Technical Machine",
    "status": "master_verified",
    "sources": ["pkmncards_identity_gap", "tcgdex"]
  },
  {
    "set_key": "pl2",
    "card_number": "106",
    "card_name": "Gallade 4 LV. X",
    "status": "master_verified",
    "sources": ["pkmncards_identity_gap", "pokellector_set_checklist"]
  },
  {
    "set_key": "pl2",
    "card_number": "108",
    "card_name": "Infernape 4 LV. X",
    "status": "master_verified",
    "sources": ["pkmncards_identity_gap", "pokellector_set_checklist"]
  }
]
```

## Before And After

```json
{
  "master_verified_cards": {
    "before": 21522,
    "after": 21524
  },
  "master_verified_printings": {
    "before": 38378,
    "after": 38378
  },
  "evidence_rows": {
    "before": 232125,
    "after": 232127
  },
  "remaining_gap_facts": {
    "before": 2076,
    "after": 2074
  },
  "card_identity_second_source_needed": {
    "before": 7,
    "after": 5
  }
}
```

## Current Completion State

```json
{
  "complete_master_index_sets": 102,
  "incomplete_sets": 101,
  "master_admissible_card_identity_facts": 21534,
  "master_admissible_printing_facts": 38378,
  "candidate_card_identity_facts": 5,
  "candidate_printings": 32,
  "human_source_verified_printings": 428,
  "write_ready_now": 0
}
```

## Remaining Gaps

```json
{
  "total_gap_facts": 2074,
  "by_gap_type": {
    "card_identity_second_source_needed": 5,
    "finish_human_checklist_evidence_needed": 32,
    "finish_second_source_needed": 428,
    "suppressed_structured_claim_reviewed": 1609
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
node --check scripts\audits\english_master_index_pkmncards_identity_gap_acquisition_v1.mjs
node --check scripts\audits\english_master_index_preserve_source_from_index_v1.mjs
node --check scripts\audits\english_master_index_build_guarded_staging_v1.mjs
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
- PkmnCards source delta now reports `useful_candidate_matches: 0` and `already_in_current_index: 2`.

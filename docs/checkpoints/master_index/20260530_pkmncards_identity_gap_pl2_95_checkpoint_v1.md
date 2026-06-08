# PkmnCards Identity Gap PL2 95 Checkpoint V1

Date: 2026-05-30

Audit mode: read-only reports and fixtures only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

## Purpose

This checkpoint records a guarded Master Index promotion from the PkmnCards identity-gap lane.

The accepted improvement is one additional second-source card identity match for Rising Rivals:

```text
pl2 | Rising Rivals | #95 | Team Galactic's Invention G-107 Technical Machine
```

PkmnCards evidence:

```text
https://pkmncards.com/card/team-galactics-invention-g-107-technical-machine-g-rising-rivals-rr-95/
```

The source page labels the card as:

```text
Team Galactic's Invention G-107 Technical Machine G - Rising Rivals (RR) #95
```

## Changes

- Added a Windows `curl.exe --ssl-no-revoke` fallback to the PkmnCards identity-gap acquisition lane.
- Kept Node TLS behavior strict by default; the fallback is reported when used.
- Normalized encoded card numbers before PkmnCards search/direct URL construction.
- Re-ran the PkmnCards identity-gap source lane in audit-only mode.
- Promoted only through guarded staging after the result improved the Master Index without evidence regression.

## Guarded Promotion

Staging directory:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-30T06-46-14-528Z-pkmncards-identity-gap-pl2-95-v1
```

Guard command:

```powershell
node scripts/audits/english_master_index_guarded_rebuild_v1.mjs --staging-dir docs\audits\verified_master_set_index_v1\english_master_index_v1_guarded_staging\2026-05-30T06-46-14-528Z-pkmncards-identity-gap-pl2-95-v1 --min-master-verified-printings 38378 --min-master-verified-cards 21521 --min-evidence-rows 232120 --max-candidate-printings 32 --max-conflicts 0 --promote
```

Result:

```json
{
  "passed": true,
  "master_verified_cards": 21522,
  "master_verified_printings": 38378,
  "evidence_rows": 232125,
  "candidate_printings": 32,
  "conflicts": 0
}
```

## Before And After

```json
{
  "master_verified_cards": {
    "before": 21521,
    "after": 21522
  },
  "master_verified_printings": {
    "before": 38378,
    "after": 38378
  },
  "evidence_rows": {
    "before": 232120,
    "after": 232125
  },
  "remaining_gap_facts": {
    "before": 2078,
    "after": 2076
  },
  "card_identity_second_source_needed": {
    "before": 8,
    "after": 7
  },
  "suppressed_structured_claim_reviewed": {
    "before": 1610,
    "after": 1609
  }
}
```

## Current Completion State

```json
{
  "complete_master_index_sets": 102,
  "incomplete_sets": 101,
  "master_admissible_card_identity_facts": 21532,
  "master_admissible_printing_facts": 38378,
  "candidate_card_identity_facts": 5,
  "candidate_printings": 32,
  "human_source_verified_card_identity_facts": 2,
  "human_source_verified_printings": 428,
  "write_ready_now": 0
}
```

## Remaining Gaps

```json
{
  "total_gap_facts": 2076,
  "by_gap_type": {
    "card_identity_second_source_needed": 7,
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
node --check scripts\audits\english_master_index_source_batch_acquisition_v1.mjs
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

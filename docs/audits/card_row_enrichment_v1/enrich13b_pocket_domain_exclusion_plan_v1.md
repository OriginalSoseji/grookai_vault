# ENRICH-13B Pocket Domain Exclusion Plan V1

Read-only governance plan for the 203 Pocket-like rows currently blocking core identity enrichment.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- This report is not apply authority.

## Summary

- Target rows: 0
- Target sets: 0
- Unexpected Pocket-classified rows: 0
- Write-ready now: false
- Recommended policy: `exclude_from_english_physical_enrichment_until_dedicated_tcg_pocket_domain_contract_exists`

## Set Status

_None._

## Dependency Totals

_None._

## Governance Decision

Decision: `do_not_backfill_as_english_physical`

Rows belong to TCG Pocket-like source IDs and were previously policy-blocked from public physical GV-ID backfill. Current sets still have pokemon_eng_standard identity defaults, so applying physical enrichment would mix non-physical rows into the English physical canon.

Allowed future work:

- read-only Pocket/domain inventory
- dedicated TCG Pocket exclusion/domain contract
- guarded dry-run for set/card_print domain reclassification only after contract approval
- public route exclusion verification

Forbidden without a new contract:

- card_prints.set_code or number backfill as English physical
- GV-ID minting under public physical namespace
- child printing GV-ID enrichment
- active identity insertion in pokemon_eng_standard
- deletion or cleanup of dependency-bearing rows

## Future Package Shape

Package: `ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION-READINESS`

Current status: `not_write_ready_contract_required`

Required before dry-run:

- authoritative Pocket/non-physical domain contract
- visibility/public-route impact audit
- active identity uniqueness plan for non-physical domain
- rollback proof for set and parent domain fields

## Conclusion

No Pocket-like row should be backfilled as English physical. The next safe move is a dedicated TCG Pocket/non-physical domain contract before any reclassification dry-run.

Fingerprint: `7375c5dd6d76832fafe3c45c59149404358a6c6d3a680f32cdc22b28d72a4e48`

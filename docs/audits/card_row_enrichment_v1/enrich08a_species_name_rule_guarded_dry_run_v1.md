# ENRICH-08A Species Name Rule Guarded Dry Run V1

Package: `ENRICH-08A-SPECIES-NAME-RULE-BACKFILL`

## Result

- Pass: true
- Missing-species parents scanned: 3808
- Target species inserts: 67
- Target parent rows: 67
- Dry-run status: completed_rolled_back_no_durable_change
- Inserted inside transaction: 67
- Before hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- After rollback hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- Package fingerprint: `240724ddd2897956a15453ca0e66629b477364de821d95b07881c505d7c5a1ad`

## Classification Counts

| status | rows |
| --- | --- |
| unmapped | 3740 |
| mapped | 67 |
| non_completion_candidate | 1 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-08A-SPECIES-NAME-RULE-BACKFILL apply only. Fingerprint: 240724ddd2897956a15453ca0e66629b477364de821d95b07881c505d7c5a1ad. Scope: 67 card_print_species inserts across 67 English physical parents using grookai_dex_name_rule_v1. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No parent writes. No child writes. No identity writes. No mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.`

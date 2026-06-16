# Card Row Enrichment Overnight Write Readiness V1

Post-ENRICH02B checkpoint. ENRICH-04, ENRICH-06A2, ENRICH-03B, ENRICH-06C2, ENRICH-08A, and ENRICH-02B have been applied; no migrations, image writes, quarantine, or global apply were performed.

## Applied Packages

| package | scope | fingerprint |
| --- | --- | --- |
| ENRICH-04-CRACKED-ICE-PRINTING-GV-ID-SUFFIX | 131 cracked_ice child `printing_gv_id` updates using suffix `CRACKED-ICE` | `5d6f8cbe955c4ca31029e440ffff4f2ff521d0ebabfe6c8ab4ffcb664f5734f3` |
| ENRICH-06A2-EMPTY-DUPLICATE-PRICE-PARENT-DELETE | 940 zero-child empty duplicate parent deletes; active prices are derived view rows and were not directly deleted | `da0c9a329af530b55a168069d81f6501060635250b248fa64bbaa0afef3d23d0` |
| ENRICH-03B-ACTIVE-IDENTITY-BACKFILL-POST-DUPLICATE-DELETE | 940 active `card_print_identity` inserts | `0c72e3998ba3544d7b335961fd3c4cb015619930caf498c8401bb44c01de6aab` |
| ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT | 530 child `card_printings` inserts across 354 source-mapped childless parents | `7a901d3842ccffee2588fd7fe26722dbebc053caea2ba16d75bf9acc398f5442` |
| ENRICH-08A-SPECIES-NAME-RULE-BACKFILL | 680 `card_print_species` inserts | `28d38aa417685d31193e2c2902d48ebd01bfdd1fbcd4f544121b50ed2e4ba678` |
| ENRICH-02B-CHILD-PRINTING-GV-ID-BACKFILL-POST-CHILD-INSERT | 430 child `printing_gv_id` updates | `ec870044eefe28ee10bda2bddc655e841101b016a101691691a656798b97c9c0` |

## Write-Ready Packages

_None from the current cleanup plan._

## Stale Dry-Runs Requiring Refresh

_None._

## Blocked Lanes

| lane | status | reason |
| --- | --- | --- |
| ENRICH-07 external mapping payload | blocked | 15 scalar `tcgdex`/`pokemonapi` payloads collide with existing active source/external mappings |
| ENRICH-06C generic stamped finish rows | blocked | 5 rows use generic `stamped` as a finish; generic stamped is not an active canonical finish |
| no-child dependency-bearing parents | manual review | 645 rows |
| no-child mapping transfer or duplicate resolution | source-specific design needed | 429 rows |
| vault-referenced childless parent | manual review | 1 row |

## Projected Reduction

If all write-ready packages are applied tomorrow and verified afterward:

- child `printing_gv_id` gaps reduce by 0; ENRICH-04 already reduced this lane by 131
- no-child parent gaps reduce by 0; ENRICH-06A2 already removed 940 stale empty duplicate parents
- species gaps reduce by 0; ENRICH-08A already inserted the current 680-row lane
- child printings increase by 0; ENRICH-06C2 already inserted the current 530-row lane
- duplicate parent rows decrease by 0; ENRICH-06A2 already removed the 940-row duplicate parent lane

## Morning Rule

Apply one package at a time with exact approval text, then rerun:

```powershell
node scripts\audits\card_row_enrichment_status_v1.mjs
node scripts\audits\card_row_enrichment_cleanup_plan_v1.mjs
```

Do not combine blocked lanes into the write-ready packages.

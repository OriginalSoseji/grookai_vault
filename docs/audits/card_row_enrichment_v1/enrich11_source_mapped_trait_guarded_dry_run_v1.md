# ENRICH-11 Source-Mapped Trait Guarded Dry Run V1

Package: `ENRICH-11-SOURCE-MAPPED-TRAIT-BACKFILL`

## Result

- Pass: true
- Source candidates examined: 274
- Accepted parent rows: 260
- Blocked candidate rows: 14
- Projected trait inserts: 1787
- Inserted inside transaction: 1787
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- After rollback hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- Package fingerprint: `7ea04006b15e994d57ed265765149905f0bbf1e9117322f90a492fcae25cc6f2`

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Simulated writes were rolled back.
- No parent, child printing, identity, external mapping, species, delete, merge, migration, or image writes were performed.
- Live API fetches used `curl.exe --ssl-no-revoke` only for the local Windows certificate revocation-check limitation.

## Accepted By Source

| source | rows |
| --- | --- |
| pokemonapi | 260 |

## Blocked By Reason

| reason | rows |
| --- | --- |
| source_fetch_failed | 14 |

## Accepted By Set

| set_code | rows |
| --- | --- |
| sv4pt5 | 243 |
| bw11 | 12 |
| col1 | 2 |
| bwp | 1 |
| cel25c | 1 |
| svp | 1 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-11-SOURCE-MAPPED-TRAIT-BACKFILL apply only. Fingerprint: 7ea04006b15e994d57ed265765149905f0bbf1e9117322f90a492fcae25cc6f2. Scope: 260 parent rows, 1787 card_print_traits inserts from exact active pokemonapi source mappings. Dry-run proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. No parent writes. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`

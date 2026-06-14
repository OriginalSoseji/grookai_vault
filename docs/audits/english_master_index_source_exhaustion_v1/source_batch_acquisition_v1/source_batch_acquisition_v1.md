# English Master Index Source Batch Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Generated: 2026-06-12T05:38:07.614Z

## Summary

| Metric | Value |
| --- | --- |
| selected_sources | 4 |
| excluded_sources | 0 |
| acquisition_completed | 0 |
| acquisition_failed | 0 |
| delta_completed | 4 |
| candidate_records_loaded | 2916 |
| useful_candidate_matches | 0 |
| guarded_rebuild_recommended | false |
| guarded_rebuild_command | null |
| guarded_promote_command | null |
| delta_summary | {"sources_reviewed":40,"candidate_records_loaded":106616,"matched_gap_facts":77,"useful_candidate_matches":0,"already_in_current_index":100829,"unmatched_candidate_records":5710,"useful_unabsorbed_source_lanes":0,"conclusion":"Existing generated source lanes do not contain useful unabsorbed evidence for current gaps; continue with new or retried source acquisition."} |

## Selected Sources

| source | key | kind | fixture mode |
| --- | --- | --- | --- |
| tcgcollector | tcgcollector_card_variants | collector_reference | merge |
| tcgcsv_finish | tcgcsv_tcgplayer_catalog | marketplace_checklist | merge |
| pokemoncard_io | pokemoncard_io_price_breakdown | marketplace_checklist | merge |
| tcdb | tcdb_checklist | collector_reference | merge |

## Excluded Sources

None.

## Delta Results

| source | status | loaded | matched gaps | useful | already in index | unmatched |
| --- | --- | --- | --- | --- | --- | --- |
| tcgcollector | completed | 1533 | 0 | 0 | 1181 | 352 |
| tcgcsv_finish | completed | 1360 | 0 | 0 | 1035 | 325 |
| pokemoncard_io | completed | 18 | 0 | 0 | 3 | 15 |
| tcdb | completed | 5 | 0 | 0 | 3 | 2 |

## Safety Confirmation

```json
{
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false
}
```

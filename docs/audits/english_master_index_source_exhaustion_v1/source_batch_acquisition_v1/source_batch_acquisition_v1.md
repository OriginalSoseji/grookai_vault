# English Master Index Source Batch Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Generated: 2026-06-08T12:44:51.987Z

## Summary

| Metric | Value |
| --- | --- |
| selected_sources | 8 |
| excluded_sources | 1 |
| acquisition_completed | 8 |
| acquisition_failed | 0 |
| delta_completed | 8 |
| candidate_records_loaded | 26927 |
| useful_candidate_matches | 0 |
| guarded_rebuild_recommended | false |
| guarded_rebuild_command | null |
| guarded_promote_command | null |
| delta_summary | {"sources_reviewed":32,"candidate_records_loaded":106354,"matched_gap_facts":78,"useful_candidate_matches":1,"already_in_current_index":100567,"unmatched_candidate_records":5709,"useful_unabsorbed_source_lanes":1,"conclusion":"Review useful source lanes before any guarded rebuild."} |

## Selected Sources

| source | key | kind | fixture mode |
| --- | --- | --- | --- |
| bulbapedia_card_page | bulbapedia_card_page_release_info | human_readable_checklist | merge |
| bulbapedia_build_battle | bulbapedia_build_battle_product | human_readable_checklist | merge |
| cardtrader | cardtrader_blueprint_index | marketplace_checklist | merge |
| elitefourum_alternate | elitefourum_alternate_checklist | collector_reference | merge |
| pokemoncard_io | pokemoncard_io_price_breakdown | marketplace_checklist | merge |
| reverseholo | reverseholo_set_checklist | collector_reference | merge |
| tcgcsv_finish | tcgcsv_tcgplayer_catalog | marketplace_checklist | merge |
| tcgcsv_identity | tcgcsv_tcgplayer_catalog_identity | marketplace_checklist | merge |

## Excluded Sources

| source | key | mode | reason |
| --- | --- | --- | --- |
| tcgplayer_pricedex_link | tcgplayer_pricedex_link | reset | fixture_reset_source_requires_--include-resetting-sources |

## Delta Results

| source | status | loaded | matched gaps | useful | already in index | unmatched |
| --- | --- | --- | --- | --- | --- | --- |
| bulbapedia_card_page | completed | 317 | 0 | 0 | 275 | 42 |
| bulbapedia_build_battle | completed | 118 | 0 | 0 | 95 | 23 |
| cardtrader | completed | 1292 | 1 | 0 | 1180 | 111 |
| elitefourum_alternate | completed | 50 | 0 | 0 | 50 | 0 |
| pokemoncard_io | completed | 17 | 0 | 0 | 2 | 15 |
| reverseholo | completed | 23765 | 0 | 0 | 18933 | 4832 |
| tcgcsv_finish | completed | 1359 | 0 | 0 | 1034 | 325 |
| tcgcsv_identity | completed | 9 | 0 | 0 | 9 | 0 |

## Safety Confirmation

```json
{
  "db_writes_performed": false,
  "migrations_created": false,
  "cleanup_performed": false,
  "quarantine_performed": false
}
```

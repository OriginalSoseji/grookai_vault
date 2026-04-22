# Series 2 Official Source Fallback Acquisition V1

Status: READY_BATCH_CANDIDATE_CREATED

## Source

- fallback_source_used: https://web.archive.org/web/20251006052846id_/https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf
- source_type: archive
- official_source_url: https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf
- raw_pdf: temp/prize_pack_series_2_official_raw.pdf
- raw_pdf_header: %PDF-1.4
- raw_pdf_sha256: 61899877C13D57DDD6D9AA8B16AA4F707A78869DEB481E205B0165F75161AA59
- byte_identical_second_capture: true

The archived capture is of the exact pokemon.com PDF URL. The raw file is a real PDF and the extracted footer identifies it as the Pokémon TCG Prize Pack Series Two card list from pokemon.com with Pokémon/Nintendo copyright text.

## Normalized JSON

- path: docs/checkpoints/warehouse/prize_pack_series_2_official.json
- series_2_entry_count: 146
- skipped_no_printed_number_count: 8

The skipped lines are basic-energy checklist rows where the extracted PDF text contains no printed number. They were not guessed.

## Validation

- schema_validated: YES
- existing_upgrade_script_exit_code: 0
- series_2_status_in_existing_upgrade_script: ready

The existing upgrade script accepts the Series 2 JSON and marks the source ready. Its historical V5 selector still targets the older Series 1 source-upgrade slice, so the bounded Series 2 fallback helper processed the current acquisition-blocked rows.

## Source Upgrade Result

- rows_investigated: 88
- tier_upgraded_count: 22
- new_ready_count: 22
- new_do_not_canon_count: 0
- still_wait_count: 66
- ready_batch_candidate: docs/checkpoints/warehouse/prize_pack_ready_batch_v7_source_upgrade_series_2_candidate.json

## READY Rows

- Oricorio | 042/264 | swsh8
- Inteleon V | 078/264 | swsh8
- Inteleon VMAX | 079/264 | swsh8
- Boltund V | 103/264 | swsh8
- Boltund VMAX | 104/264 | swsh8
- Mew V | 113/264 | swsh8
- Mew VMAX | 114/264 | swsh8
- Meloetta | 124/264 | swsh8
- Gengar V | 156/264 | swsh8
- Gengar VMAX | 157/264 | swsh8
- Genesect V | 185/264 | swsh8
- Latias | 193/264 | swsh8
- Latios | 194/264 | swsh8
- Dunsparce | 207/264 | swsh8
- Adventurer's Discovery | 224/264 | swsh8
- Battle VIP Pass | 225/264 | swsh8
- Cram-o-matic | 229/264 | swsh8
- Elesa's Sparkle | 233/264 | swsh8
- Power Tablet | 236/264 | swsh8
- Fusion Strike Energy | 244/264 | swsh8
- Leafeon VSTAR | SWSH195 | swshp
- Glaceon VSTAR | SWSH197 | swshp

## Next Step

PRIZE_PACK_READY_BATCH_V7_SOURCE_UPGRADE_SERIES_2

# LOCAL_OFFICIAL_CHECKLIST_IMPORT_FOR_PRIZE_PACK_V1

Generated: 2026-04-20T21:54:24.9507230-06:00

## Result

- official_source_files_acquired = 1
- series_1_official_source = `temp/prize_pack_series_1_official_raw.pdf`
- series_2_official_source = NOT_ACQUIRED
- local_json_created = PARTIAL
- schema_validated = PARTIAL
- tier_upgraded_count = 19
- new_ready_count = 19
- still_wait_count = 0 for the source-upgrade target rows
- ready_batch_v6_candidate_created = YES

## Script Contract

The upgrade script at `backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs` accepts:

- top-level required: `entries[]`
- top-level optional: `source_name`, `source_url`, `evidence_tier`, `imported_at`, `status`
- each entry must include one name-bearing field from: `name`, `card_name`, `base_card_name`
- each entry must include one number-bearing field from: `printed_number`, `number`, `number_plain`

Normalized JSON shape used:

```json
{
  "source_name": "Pokemon.com Prize Pack Series One official checklist",
  "source_url": "https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf",
  "evidence_tier": "TIER_1",
  "imported_at": "2026-04-21T03:53:14.810010+00:00",
  "status": "official_pdf_local_import",
  "entries": [
    {
      "name": "Victini VMAX",
      "printed_number": "022"
    }
  ]
}
```

## Acquisition

### Series 1

- source_url = https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf
- raw_artifact = `temp/prize_pack_series_1_official_raw.pdf`
- result = official PDF acquired
- local_json = `docs/checkpoints/warehouse/prize_pack_series_1_official.json`
- entry_count = 162
- skipped_no_printed_number_count = 8
- skipped_no_printed_number_reason = official energy checklist lines did not expose a printed number in the extracted PDF text, so they were not inferred

### Series 2

- source_url = https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf
- raw_artifact = `temp/prize_pack_series_2_official_raw.pdf`
- result = NOT_ACQUIRED
- blocker = file body is HTML from the Imperva challenge, not PDF bytes
- local_json = not created
- entry_count = 0

## Normalization

Normalizer added:

- `backend/warehouse/import_prize_pack_official_checklists_v1.py`

Created:

- `docs/checkpoints/warehouse/prize_pack_series_1_official.json`

Not created:

- `docs/checkpoints/warehouse/prize_pack_series_2_official.json`

No Series 2 JSON was created because doing so would require guessed rows or a non-official transcription.

## Validation And Upgrade

Command:

```bash
node backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs
```

Result:

- status = PARTIAL_SUCCESS
- target_rows = 19
- tier_upgraded = 19
- ready_for_warehouse = 19
- still_wait = 0
- Series 1 official source status = ready
- Series 2 official source status = missing_local_json

The script accepted the Series 1 local JSON and produced:

- `docs/checkpoints/warehouse/prize_pack_evidence_v6.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v6.md`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_candidate.json`

The source-upgrade script also had a markdown reporting bug when `blocker = null`; that was patched without changing evidence or identity rules.

## Ready Rows Produced

- Victini VMAX | 022/163 | swsh5
- Empoleon V | 040/163 | swsh5
- Orbeetle | 065/163 | swsh5
- Crobat | 091/163 | swsh5
- Tyranitar V | 097/163 | swsh5
- Corviknight V | 109/163 | swsh5
- Corviknight VMAX | 110/163 | swsh5
- Exp. Share | 126/163 | swsh5
- Blaziken V | 020/198 | swsh6
- Blaziken VMAX | 021/198 | swsh6
- Froslass | 036/198 | swsh6
- Zeraora V | 053/198 | swsh6
- Gardevoir | 061/198 | swsh6
- Lycanroc | 087/198 | swsh6
- Spiritomb | 103/198 | swsh6
- Single Strike Urshifu | 108/198 | swsh6
- Avery | 130/198 | swsh6
- Impact Energy | 157/198 | swsh6
- Spiral Energy | 159/198 | swsh6

## Remaining Blocker

Series 2 still requires a real official PDF/page acquisition. The local `temp/prize_pack_series_2_official_raw.pdf` file is not a valid source artifact because it starts with `<!DOCTYPE html>`.

## Recommended Next Step

Run `PRIZE_PACK_READY_BATCH_V6_SOURCE_UPGRADE_SERIES_1` only after a live pre-intake audit confirms the generated 19-row candidate has not already been promoted by newer Prize Pack batches. Separately, rerun `MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1` for Series 2 only when a real browser session can download or print the official checklist.

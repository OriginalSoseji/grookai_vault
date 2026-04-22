# prize_pack_evidence_source_upgrade_v1

## 1. Purpose

`prize_pack_evidence_source_upgrade_v1.mjs` upgrades Prize Pack evidence using local official Series 1 and Series 2 checklist JSON files. It validates official-source imports, marks rows with stronger evidence where exact entries match, and isolates newly READY rows into candidate batch artifacts.

## 2. Why it exists

Several high-value Prize Pack rows were blocked by unavailable official checklist access. The source-upgrade worker gives those rows a deterministic path from official local JSON to READY or still-WAIT without lowering the evidence bar or using unofficial substitutions.

## 3. Inputs

- CLI: `node backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs`
- Local official JSON files such as:
  - `docs/checkpoints/warehouse/prize_pack_series_1_official.json`
  - `docs/checkpoints/warehouse/prize_pack_series_2_official.json`
- Prior evidence checkpoint target, historically `docs/checkpoints/warehouse/prize_pack_evidence_v5.json` and source-upgrade target artifacts.
- JSON entries with `name` and `printed_number`.

## 4. Outputs

- Evidence upgrade JSON and markdown checkpoints.
- READY candidate JSON when exact official entries unlock rows.
- Counts for tier upgrades, new READY rows, new DO_NOT_CANON rows, and still-WAIT rows.
- No DB writes.
- No canon writes.

## 5. Safe usage

- Run only after the local official JSON file has been validated as official or official-equivalent.
- Preserve printed numbers exactly as source text.
- Include only entries actually present in the source PDF.
- Use the resulting candidate JSON as the only input to a READY batch closure.

## 6. Unsafe usage

- Creating official JSON from a wiki, marketplace, or community list.
- Guessing missing checklist rows.
- Combining Series 1 and Series 2 rows without source provenance.
- Treating a validation-only result as permission to promote.
- Reusing the old V5 target blindly when the current unresolved surface has changed.

## 7. Governing contracts

- `EVIDENCE_TIER_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `WAREHOUSE_SOURCE_IDENTITY_CONTRACT_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/local_official_checklist_import_for_prize_pack_v1.md`
- `docs/checkpoints/warehouse/series_2_official_source_fallback_acquisition_v1.md`
- `docs/checkpoints/warehouse/prize_pack_series_2_source_upgrade_fallback_v1.md`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v6_source_upgrade_series_1.json`
- `docs/checkpoints/warehouse/prize_pack_ready_batch_v7_source_upgrade_series_2.json`

## 9. Common failure modes

- Missing local JSON file.
- Raw `.pdf` is actually an HTML challenge page.
- JSON schema mismatch.
- Entries are missing printed numbers because PDF text extraction did not expose them.
- Historical target selection does not match the current backlog and requires a bounded successor helper.

## 10. Verification checklist

- Schema validates.
- Source file is official or official-equivalent.
- `tier_upgraded_count` is recorded.
- Every READY row has exact name plus printed-number evidence.
- Candidate batch contains only newly unlocked rows.
- No promotion, mapping, image, or canon writes occurred.

# Prize Pack Source Acquisition Guide V1

## 1. Why Source Acquisition Matters

Prize Pack rows cannot move to READY unless exact source evidence proves a stamped printed identity. For Series 1 and Series 2, automation was blocked by Pokemon.com protection, so local official checklist imports were required. The milestone proved that official local JSON can unlock READY rows without weakening evidence rules.

Source acquisition is not promotion work. It only makes evidence available for later bounded upgrade or evidence passes.

## 2. Acceptable Tier 1 Sources

Acceptable Tier 1 sources:

- Official Pokemon.com checklist PDFs.
- First-party Play! Pokemon distributed PDFs.
- Official CDN-hosted PDFs.
- Archive captures of official checklist URLs when the captured file is a real PDF and preserves the official source content.
- Byte-valid copies that can be traced to the official URL or first-party distribution path.

Accepted milestone examples:

- `docs/checkpoints/warehouse/prize_pack_series_1_official.json`
- `docs/checkpoints/warehouse/prize_pack_series_2_official.json`
- `docs/checkpoints/warehouse/series_2_official_source_fallback_acquisition_v1.md`

## 3. Unacceptable Sources

Unacceptable as Tier 1:

- Wiki transcriptions.
- Marketplace pages.
- Community curated set lists.
- Search snippets.
- Screenshots without source provenance.
- HTML challenge pages saved as `.pdf`.
- Guessed rows.
- Inferred rows from neighboring numbers.

Lower-tier sources may inform near-hit or corroboration notes, but they cannot replace official checklist proof where Tier 1 is required.

## 4. PDF Validation Rules

Before normalizing any PDF:

- Confirm the file begins with `%PDF`.
- Confirm it is not `<!DOCTYPE html>`.
- Confirm it is not an Incapsula, Imperva, hCaptcha, or other challenge page.
- Confirm the visible title and contents are for the intended Prize Pack series.
- Confirm the card list is complete enough to transcribe exact rows.
- Spot-check several rows against known milestone evidence.

Stop if any of these fail.

## 5. Archive / CDN Fallback Rules

Archive or CDN fallback is allowed only when:

- the URL is an official or first-party distributed asset path, or an archived capture of that path
- the file is a real PDF
- the content matches expected checklist format
- no user-edited content is present
- no rows are inferred from surrounding context

Archive copies are not automatically Tier 1. They become acceptable only when they are official URL captures or byte-valid official-equivalent PDFs.

## 6. JSON Normalization Rules

Normalize to this shape:

```json
{
  "source_name": "Official Prize Pack Series 2 Checklist",
  "source_url": "<official source url>",
  "evidence_tier": "TIER_1",
  "imported_at": "<ISO timestamp>",
  "status": "official_manual_import",
  "entries": [
    {
      "name": "Card Name",
      "printed_number": "123/456"
    }
  ]
}
```

Rules:

- Include only cards actually present in the official source.
- Preserve printed numbers exactly as shown.
- Preserve names as shown except for minimal JSON-safe normalization.
- Do not infer set codes unless the official source provides them or the validated path already expects them.
- Do not merge unofficial sources into the file.

## 7. Validation Command

Run:

```bash
node backend/warehouse/prize_pack_evidence_source_upgrade_v1.mjs
```

Expected:

- no missing-file error for intended local JSON
- no schema mismatch
- source-upgrade path recognizes usable entries
- new READY/DO_NOT/WAIT rows are isolated into checkpoints

If validation fails, fix only file shape or transcription defects. Do not invent evidence content.

## 8. Upgrade Workflow

1. Save raw official PDF under `C:\grookai_vault\temp\`.
2. Normalize to `docs/checkpoints/warehouse/prize_pack_series_<n>_official.json`.
3. Run source-upgrade validation.
4. Inspect `tier_upgraded_count`, `new_ready_count`, and `new_do_not_canon_count`.
5. If READY rows exist, create an exact candidate JSON.
6. Close that candidate through the ready batch family.

## 9. Common Failure Modes

- Saved `.pdf` is actually an HTML challenge page.
- Source is a community list, not first-party evidence.
- Rows are guessed from near hits.
- Series 1 and Series 2 rows are mixed into one import without provenance.
- JSON uses unexpected field names.
- Printed numbers are normalized too aggressively and lose exact source shape.
- READY batch is widened beyond source-upgraded rows.

## 10. Truthfulness Requirements

- Missing official rows remain missing.
- Near hits remain near hits.
- Official acquisition does not change identity rules.
- A source upgrade can unlock rows only when exact evidence is present.
- If no new READY rows appear, checkpoint that result rather than forcing an execution batch.

# ENRICH-02B Child Printing GV-ID Real Apply V1

Package: `ENRICH-02B-CHILD-PRINTING-GV-ID-BACKFILL-POST-CHILD-INSERT`

## Result

- Pass: true
- Target rows: 430
- Updated rows: 430
- Package fingerprint: `ec870044eefe28ee10bda2bddc655e841101b016a101691691a656798b97c9c0`
- Dry-run proof: `d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b == d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b`
- Before rows without printing_gv_id: 430
- After rows with printing_gv_id: 430

## Safety

- Durable DB writes performed: true
- Writes performed: `card_printings.printing_gv_id` only
- Parent writes: false
- Identity writes: false
- Deletes/merges: false
- Migrations created: false
- Image writes: false
- Global apply: false

## By Finish

| finish | rows |
| --- | --- |
| reverse | 171 |
| normal | 142 |
| holo | 117 |

## Stop Findings

_None._

# ENRICH-02B Child Printing GV-ID Guarded Dry Run V1

Package: `ENRICH-02B-CHILD-PRINTING-GV-ID-BACKFILL-POST-CHILD-INSERT`

## Result

- Pass: true
- Target rows: 430
- Updated inside transaction: 430
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b`
- After rollback hash: `d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b`
- Package fingerprint: `ec870044eefe28ee10bda2bddc655e841101b016a101691691a656798b97c9c0`

## By Finish

| finish | rows |
| --- | --- |
| reverse | 171 |
| normal | 142 |
| holo | 117 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-02B-CHILD-PRINTING-GV-ID-BACKFILL-POST-CHILD-INSERT apply only. Fingerprint: ec870044eefe28ee10bda2bddc655e841101b016a101691691a656798b97c9c0. Scope: 430 child card_printing printing_gv_id updates from current governed finish suffixes. Dry-run proof: d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b == d7740ec8f4be5b7da7b200cac612ae474f065f4d36f4727e54f27021d0ff9d2b. No parent writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`

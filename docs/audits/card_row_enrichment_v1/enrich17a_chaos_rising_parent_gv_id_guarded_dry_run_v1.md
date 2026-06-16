# ENRICH-17A Chaos Rising Parent GV-ID Guarded Dry Run V1

Package: `ENRICH-17A-CHAOS-RISING-PARENT-GV-ID-BACKFILL`

## Result

- Pass: true
- Target set: me04 / Chaos Rising
- Target rows: 122
- Updated inside transaction: 122
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `d9e2e75b390ace20abf619b78e2f0a2b115a9f7cc23a2fc0caf249273ae4bd9d`
- After rollback hash: `d9e2e75b390ace20abf619b78e2f0a2b115a9f7cc23a2fc0caf249273ae4bd9d`
- Package fingerprint: `73c20cf43f85043a8cf6bb5f1cf0160842224b9e83e6948e64675219d000bbcd`

## Namespace Evidence

- Source: `public.sets.source.tcgdex.raw.abbreviation.official`
- Value: `CRI`
- Governance: uses source-backed `CRI`, not default `me04`.

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Child writes: false
- Identity writes: false
- External mapping/species writes: false
- Deletes/merges: false
- Image writes: false

## Proposed GV-ID Samples

| number | card_name | proposed_gv_id |
| --- | --- | --- |
| 001 | Weedle | GV-PK-CRI-001 |
| 002 | Kakuna | GV-PK-CRI-002 |
| 003 | Beedrill ex | GV-PK-CRI-003 |
| 004 | Carnivine | GV-PK-CRI-004 |
| 005 | Chespin | GV-PK-CRI-005 |
| 006 | Quilladin | GV-PK-CRI-006 |
| 007 | Chesnaught | GV-PK-CRI-007 |
| 008 | Vulpix | GV-PK-CRI-008 |
| 009 | Ninetales | GV-PK-CRI-009 |
| 010 | Ho-Oh | GV-PK-CRI-010 |
| 011 | Fennekin | GV-PK-CRI-011 |
| 012 | Braixen | GV-PK-CRI-012 |
| 013 | Delphox | GV-PK-CRI-013 |
| 014 | Litleo | GV-PK-CRI-014 |
| 015 | Mega Pyroar ex | GV-PK-CRI-015 |
| 016 | Remoraid | GV-PK-CRI-016 |
| 017 | Octillery | GV-PK-CRI-017 |
| 018 | Delibird | GV-PK-CRI-018 |
| 019 | Keldeo | GV-PK-CRI-019 |
| 020 | Froakie | GV-PK-CRI-020 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-17A-CHAOS-RISING-PARENT-GV-ID-BACKFILL apply only. Fingerprint: 73c20cf43f85043a8cf6bb5f1cf0160842224b9e83e6948e64675219d000bbcd. Scope: 122 Chaos Rising parent card_print gv_id updates using source-backed CRI namespace. Dry-run proof: d9e2e75b390ace20abf619b78e2f0a2b115a9f7cc23a2fc0caf249273ae4bd9d == d9e2e75b390ace20abf619b78e2f0a2b115a9f7cc23a2fc0caf249273ae4bd9d. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`

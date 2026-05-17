# GrookaiVault Public Display Audit - 2026-05-17

Status: read-only public website verification after the approved Lane A 247 number-normalization execution. No DB writes, migrations, deploys, production env changes, card backfills, variant work, or scanner work were performed by this audit.

## Correction: Set Name Display Rule

Blank or hidden `card_prints.set_code` is not a user-facing defect. Grookai product display intentionally defaults to set name, not set code. Set code is internal routing/debug identity and is not required for normal public display.

The remaining public issue is `gv_id` and public addressability coverage: whether public web views/routes surface normalized cards with card name, set name, card number, image, and a stable public route. The earlier set-level interpretation below is superseded by this rule; the raw findings remain for traceability.

## Alias Route Checks

| Query | Expected set | Initial | Redirect | Final status | Cards visible | Status |
| --- | --- | --- | --- | --- | --- | --- |
| shiny-vault | sma | 307 | https://grookaivault.com/sets/sma | 200 | true | PASS |
| shiny vault | sma | 307 | https://grookaivault.com/sets/sma | 200 | true | PASS |
| rm | ru1 | 307 | https://grookaivault.com/sets/ru1 | 200 | true | PASS |
| sv3pt5 | sv03.5 | 307 | https://grookaivault.com/sets/sv03.5 | 200 | true | PASS |
| sm35 | sm3.5 | 307 | https://grookaivault.com/sets/sm3.5 | 200 | true | PASS |

## Hard-Stop Alias Safety Checks

| Query | Paired code | Redirect | Accidental paired route | Status |
| --- | --- | --- | --- | --- |
| sv04.5 | sv4pt5 | https://grookaivault.com/explore?q=sv04.5&sort=relevance | false | PASS |
| sv4pt5 | sv04.5 | https://grookaivault.com/sets/sv4pt5 | false | PASS |
| pgo | swsh10.5 | https://grookaivault.com/sets/pgo | false | PASS |
| swsh10.5 | pgo | https://grookaivault.com/explore?q=swsh10.5&sort=relevance | false | PASS |
| sv08.5 | sv8pt5 | https://grookaivault.com/explore?q=sv08.5&sort=relevance | false | PASS |
| sv8pt5 | sv08.5 | https://grookaivault.com/sets/sv8pt5 | false | PASS |
| sv06.5 | sv6pt5 | https://grookaivault.com/explore?q=sv06.5&sort=relevance | false | PASS |
| sv6pt5 | sv06.5 | https://grookaivault.com/sets/sv6pt5 | false | PASS |

## Card Sample Checks

| GV-ID | Name | Set | Card set_code | Number | Card page | Search API match | Image tag | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GV-PK-MCD-1 | Bulbasaur | 2021swsh |  | 1 | 200 | true | true | PASS |
| GV-PK-MCD-2 | Chikorita | 2021swsh |  | 2 | 200 | true | true | PASS |
| GV-PK-MCD-3 | Treecko | 2021swsh |  | 3 | 200 | true | true | PASS |
| GV-PK-MCD-4 | Turtwig | 2021swsh |  | 4 | 200 | true | true | PASS |
|  | Petilil | A3a |  | 1 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Lilligant | A3a |  | 2 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Rowlet | A3a |  | 3 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Dartrix | A3a |  | 4 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
| GV-PK-SK-4 | Articuno | ecard3 |  | 4 | 200 | true | true | PASS |
| GV-PK-SK-6 | Crobat | ecard3 |  | 6 | 200 | true | true | PASS |
| GV-PK-SK-8 | Flareon | ecard3 |  | 8 | 200 | true | true | PASS |
| GV-PK-SK-9 | Forretress | ecard3 |  | 9 | 200 | true | true | PASS |
|  | Pikachu on the Ball | fut2020 |  | 1 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Eevee on the Ball | fut2020 |  | 2 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Grookey on the Ball | fut2020 |  | 3 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Scorbunny on the Ball | fut2020 |  | 4 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Meganium | mep |  | 1 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Inteleon | mep |  | 2 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Alakazam | mep |  | 3 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Lunatone | mep |  | 4 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Potion | P-A |  | 1 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | X Speed | P-A |  | 2 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Hand Scope | P-A |  | 3 |  | false | false | FAIL_NO_PUBLIC_GV_ID |
|  | Pokédex | P-A |  | 4 |  | false | false | FAIL_NO_PUBLIC_GV_ID |

## Set-Level Checks

| Set | Route | DB rows | Executed rows | Blank card_print set_code rows | Page status | API items | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2021swsh | 2021swsh | 25 | 25 | 25 | 200 | 0 | FAIL |
| A3a | a3a | 103 | 103 | 103 | 200 | 0 | FAIL |
| ecard3 | ecard3 | 186 | 4 | 15 | 200 | 36 | FAIL |
| fut2020 | fut2020 | 5 | 5 | 5 | 200 | 0 | FAIL |
| P-A | p-a | 100 | 100 | 100 | 200 | 0 | FAIL |

## Mismatches

Mismatches are present in `grookaivault_public_display_matrix_20260517.json`. No web or DB fix was applied. The card sample mismatches are rows without public `gv_id`; the set-level mismatches are affected set routes whose public set APIs do not expose the executed rows, commonly because `card_prints.set_code` is blank while the authoritative set is available through `sets.code`.

Correction: missing visible set code is not a product display failure when `sets.name` is available. The follow-up `gv_id_public_coverage_audit_20260517.md` supersedes the display interpretation and isolates the remaining public addressability issue to missing `gv_id` coverage and image-only gaps.

## TLS Note

Node fetch required NODE_TLS_REJECT_UNAUTHORIZED=0 in this local environment due local certificate chain verification failure. Browser-facing HTTPS responses were still fetched from https://grookaivault.com.

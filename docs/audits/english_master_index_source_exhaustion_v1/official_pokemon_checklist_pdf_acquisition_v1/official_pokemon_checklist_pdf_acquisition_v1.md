# Official Pokemon Checklist PDF Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Generated: 2026-06-08T12:47:30.936Z

## Safety Rule

Official checklist PDFs are used only for exact card identity rows and exact holo presence rows with an explicit H marker. Checkbox layout is not interpreted as reverse, normal, or parallel truth. Full acquisition uses pdftotext only; legacy stream fallback is not automatic.

## Summary

- Sets attempted: 20
- Records generated: 16
- Fixture files written: 0
- Status counts: {"source_unavailable_or_unparseable":7,"generated":5,"no_target_rows_matched":8}
- Record type counts: {"card_identity":16}

## Results

| set | status | official id | method | rows parsed | records | url/error |
| --- | --- | --- | --- | --- | --- | --- |
| ex6 FireRed & LeafGreen | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/ex6_web_cardlist_en.pdf |
| dp3 Secret Wonders | generated | dp3 | pdftotext_layout | 132 | 2 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/dp3_web_cardlist_en.pdf |
| cel25 Celebrations | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/cel25_web_cardlist_en.pdf |
| hgss2 HS—Unleashed | no_target_rows_matched | hgss2 | pdftotext_layout | 95 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/hgss2_web_cardlist_en.pdf |
| ex9 Emerald | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/ex9_web_cardlist_en.pdf |
| hgss1 HeartGold & SoulSilver | no_target_rows_matched | hgss1 | pdftotext_layout | 123 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/hgss1_web_cardlist_en.pdf |
| ex1 Ruby & Sapphire | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/ex1_web_cardlist_en.pdf |
| sm10 Unbroken Bonds | no_target_rows_matched | sm10 | pdftotext_layout | 214 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/sm10_web_cardlist_en.pdf |
| pl1 Platinum | generated | pl1 | pdftotext_layout | 130 | 4 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/pl1_web_cardlist_en.pdf |
| bw8 Plasma Storm | no_target_rows_matched | bw8 | pdftotext_layout | 135 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/bw8_web_cardlist_en.pdf |
| sm3 Burning Shadows | no_target_rows_matched | sm3 | pdftotext_layout | 147 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/sm3_web_cardlist_en.pdf |
| dp1 Diamond & Pearl | generated | dp1 | pdftotext_layout | 130 | 3 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/dp1_web_cardlist_en.pdf |
| bw6 Dragons Exalted | no_target_rows_matched | bw6 | pdftotext_layout | 124 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/bw6_web_cardlist_en.pdf |
| xyp XY Black Star Promos | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/xyp_web_cardlist_en.pdf |
| dp5 Majestic Dawn | generated | dp5 | pdftotext_layout | 100 | 4 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/dp5_web_cardlist_en.pdf |
| sv03.5 151 | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/sv3pt5_web_cardlist_en.pdf \| curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/sv03.5_web_cardlist_en.pdf \| curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/sv035_web_cardlist_en.pdf |
| swsh1 Sword & Shield | no_target_rows_matched | swsh1 | pdftotext_layout | 202 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/swsh1_web_cardlist_en.pdf |
| pl2 Rising Rivals | generated | pl2 | pdftotext_layout | 111 | 3 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/pl2_web_cardlist_en.pdf |
| bw2 Emerging Powers | no_target_rows_matched | bw2 | pdftotext_layout | 98 | 0 | https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/bw2_web_cardlist_en.pdf |
| neo1 Neo Genesis | source_unavailable_or_unparseable |  |  | 0 | 0 | curl_not_pdf: https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/neo1_web_cardlist_en.pdf |

# 🔍 PT5 CANONICAL ANCHOR AUDIT

**Date:** 2025-12-17  
**Mode:** Read-only  
**Question:** Are PT5 codes (pt5*) the canonical anchors vs sv10.5*?

## 1) Tables/Views Queried (SQL + outputs)

- Tooling: Node + Supabase backend client (read-only SELECTs).
- Queries run (representative):
  - `select code, name, printed_total, release_date, source from public.sets where code in ('sv10.5b','sv10.5w','pt5','pt5b','pt5w');`
  - `select * from public.set_code_classification where set_code in ('sv10.5b','sv10.5w','pt5','pt5b','pt5w');`
  - `select payload->>'_external_id' as ext_id, source, count(*) from public.raw_imports where payload->>'_external_id' in ('sv10.5b','sv10.5w','pt5','pt5b','pt5w') group by ext_id, source;`
  - `select set_code, count(*) from public.card_prints where set_code in ('sv10.5b','sv10.5w','pt5','pt5b','pt5w') group by set_code;`
  - `select * from public.v_special_set_reconstruction_gate where set_code in ('sv08.5','sv10.5b','sv10.5w');`

Observed outputs (summarized):
- `sets` rows exist for `sv10.5b` (Black Bolt) and `sv10.5w` (White Flare); both have printed_total null in sets.source (tcgdex raw shows cardCount.official=86; totals 172/173). No rows for pt5/pt5b/pt5w in `sets`.
- `set_code_classification` contains canonical rows for `sv10.5b` and `sv10.5w` (is_canon=true, canon_source=manual, pokemonapi_set_id=zsv10pt5/rsv10pt5, tcgdex_set_id=sv10.5b/sv10.5w, canonical_set_code self). No entries for pt5/pt5b/pt5w.
- `raw_imports` grouped by `_external_id`: entries for `sv10.5b`, `sv10.5w` (tcgdex source; no pokemonapi rows); no pt5 variants present.
- `card_prints` grouped by set_code: rows exist only for `sv10.5b` (multiple entries), none for `sv10.5w` or any pt5 codes.
- `v_special_set_reconstruction_gate` for sv10.5b/sv10.5w: classification_present=true, raw_present=true (tcgdex only), printed_total_known=true (from pokemonapi_printed_total 86 via classification), overflow_detected=true, status=PASS.

## 2) Candidate Codes Found

- Present in `sets`: `sv10.5b`, `sv10.5w`.
- Missing in `sets`: `pt5`, `pt5b`, `pt5w`.
- Classification rows present: `sv10.5b`, `sv10.5w`; none for pt5/pt5b/pt5w.

## 3) Canonical vs Alias Mapping (set_code_classification evidence)

- `sv10.5b`: is_canon=true, canon_source=manual, canonical_set_code=sv10.5b, pokemonapi_set_id=zsv10pt5, tcgdex_set_id=sv10.5b.
- `sv10.5w`: is_canon=true, canon_source=manual, canonical_set_code=sv10.5w, pokemonapi_set_id=rsv10pt5, tcgdex_set_id=sv10.5w.
- No alias rows for pt5/pt5b/pt5w; pt5* codes are absent from classification table.

## 4) Data Impact (raw_imports + card_prints distribution)

- raw_imports:
  - tcgdex source present for sv10.5b (172 cards) and sv10.5w (173 cards) via special-set views; pokemonapi raw not present.
  - No raw_imports for pt5/pt5b/pt5w.
- card_prints:
  - sv10.5b has prints in DB (multiple rows).
  - sv10.5w has 0 prints.
  - No pt5* prints.
- Gate view (`v_special_set_reconstruction_gate`): PASS for sv10.5b/sv10.5w with overflow_detected=true (raw > printed_total from pokemonapi printed totals 86).

## 5) Conclusion (evidence-based)

Status: PT5 absent; SV10.5 is canonical (per set_code_classification and presence in sets/raw_imports/card_prints). No pt5/pt5b/pt5w anchors or aliases exist in the current classification or data. Evidence shows sv10.5b/sv10.5w are the canonical anchors in the database. No writes performed; audit only.

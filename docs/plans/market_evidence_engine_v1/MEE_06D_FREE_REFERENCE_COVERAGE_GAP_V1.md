# MEE-06D Free Reference Coverage Gap V1

Status: Draft implementation

## Purpose

Compare free/reference evidence coverage across `tcgcsv_reference` and `pokemontcg_io_reference` before any warehouse write is proposed.

This answers:

- Which cards have model-eligible free reference evidence?
- Which cards are covered by both lanes?
- Which cards are covered only by TCGCSV?
- Which cards still have no usable free-reference evidence?
- Are misses caused by TCGCSV product gaps, PokemonTCG mapping gaps, or both?

## Boundary

- Local artifact only.
- No provider calls.
- No source page fetches.
- No database writes.
- No pricing rollups.
- No migration apply.
- No public price publication.

## Inputs

- MEE-04C acquisition batch
- MEE-06B TCGCSV acquisition artifact
- MEE-06C normalized artifact for TCGCSV
- MEE-06A PokemonTCG.io acquisition artifact
- MEE-06C normalized artifact for PokemonTCG.io

## Output

- target-level coverage rows
- coverage bucket counts
- miss reason counts
- status pair counts
- samples for uncovered rows and mapping gaps

## Command

```bash
npm run mee:free-reference-gap
```

Explicit artifact paths can be supplied when comparing a specific run:

```bash
npm run mee:free-reference-gap -- \
  --batch=docs/audits/market_evidence_engine_v1/batch.json \
  --tcgcsv-acquisition=docs/audits/market_evidence_engine_v1/tcgcsv.json \
  --tcgcsv-normalized=docs/audits/market_evidence_engine_v1/tcgcsv-normalized.json \
  --pokemontcg-acquisition=docs/audits/market_evidence_engine_v1/pokemontcg.json \
  --pokemontcg-normalized=docs/audits/market_evidence_engine_v1/pokemontcg-normalized.json
```

## Next Step

Use this report to decide whether the next improvement should be:

- TCGCSV product/number matching
- PokemonTCG external mapping backfill
- source precedence and warehouse storage policy
